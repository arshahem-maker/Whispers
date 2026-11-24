import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { supabaseAdmin as admin } from "@/integrations/supabase/client.server";
import { hashCode, isWellFormedCode, normalizeCode, sha256Hex } from "./crypto";
import { PILOT_COUNTRIES, workspaceFor, broadAreaLabel } from "./locations";
import { pilotSubmitSchema, pilotCommandSchema } from "./pilot-schema";
import type { TimeBucket } from "./types";
import type { z } from "zod";
import jpeg from "jpeg-js";
import { canInvite } from "./staff-invitations";
type Client = SupabaseClient<Database>;
type Row = Database['public']['Tables']['whispers_reports']['Row'];
const json = (value: unknown): Json => JSON.parse(JSON.stringify(value));
const object = (value: Json): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const checked = <T>(result: { data: T; error: unknown }): T => { if (result.error) throw new Error("The operation could not be completed."); return result.data; };

async function audit(user: string | null, action: string, workspace: string, target?: string) {
  checked(await admin.from("whispers_audit").insert({ actor_id:user, action, workspace, target_id:target ?? null }));
}
async function roles(client: Client, user: string) {
  return checked(await client.from("user_roles").select("role,contexts").eq("user_id",user).eq("active",true)) ?? [];
}
async function allowed(client: Client, user: string, ws: string, role: string) {
  if (!(await roles(client,user)).some((r) => r.role===role && r.contexts.includes(ws))) throw new Error("Access required.");
}
async function report(client: Client,user: string,id: string,role="reviewer") {
  // Role and workspace validation precedes privileged reads.
  const rows = await roles(client,user);
  const scopes = rows.filter((r)=>r.role===role).flatMap((r)=>r.contexts);
  if (!scopes.length) throw new Error("Access required.");
  const r = checked(await admin.from("whispers_reports").select("*").eq("id",id).in("workspace",scopes).is("revoked_at",null).gt("expires_at",new Date().toISOString()).maybeSingle());
  if (!r) throw new Error("Report unavailable.");
  return r;
}
// Pilot quotas are separate from voice limits (see drizzle/proposed/0006).
export const PILOT_QUOTAS = { intake:{limit:6,window:3600}, receipt:{limit:30,window:3600}, message:{limit:10,window:3600}, removal:{limit:3,window:3600}, upload:{limit:12,window:3600} } as const;
type QuotaKind = keyof typeof PILOT_QUOTAS;
// New RPCs are not in generated types until the proposed migration is applied.
const rpc = (name: string, args: Record<string, unknown>) => (admin.rpc as unknown as (n: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)(name, args);
async function quota(kind: QuotaKind, key: string) {
  const q = PILOT_QUOTAS[kind];
  return checked(await rpc("whispers_reserve_pilot_quota", { p_bucket: kind + ":" + key, p_limit: q.limit, p_window_seconds: q.window })) === true;
}
async function update(r:Row,body:Record<string,unknown>) {
  const success=checked(await admin.rpc("whispers_update_report",{p_id:r.id,p_version:r.version,p_body:json(body)}));
  if(!success) throw new Error("This report changed. Refresh before saving.");
}
export async function submitPilot(input: z.infer<typeof pilotSubmitSchema>, request: Request) {
  const secret = process.env['WHISPERS_INTAKE_SECRET'] ?? process.env['LOVABLE_API_KEY'];
  if (!secret) throw new Error("Connected reporting unavailable.");
  const signingKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", signingKey, new TextEncoder().encode(":intake:" + (request.headers.get("cf-connecting-ip") ?? "local-preview")));
  const bucket = Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
  const p=input.payload;
  const payloadHash=await sha256Hex(JSON.stringify(p)+input.codeHash);
  // Idempotent retries of an accepted submission never consume intake quota.
  const earlier=checked(await admin.from("whispers_reports").select("payload_hash").eq("idempotency_key",input.idempotencyKey).maybeSingle());
  if(earlier){ if(earlier.payload_hash===payloadHash) return {accepted:true as const}; throw new Error("Report was not saved; the attempt may conflict with an earlier draft."); }
  if (!(await quota("intake", bucket))) throw new Error("Submission limit reached. Please try later.");
  const pilot=PILOT_COUNTRIES.find((c)=>c.code===p.countryCode);
  if(p.areaId!=="unknown" && !pilot?.areas.some((a)=>a.id===p.areaId)) throw new Error("Select a matching broad area.");
  const body={...p,processingState:"received",evidenceState:"unassessed",sensitivity:p.category==="safety"||p.category==="aid_concern"?"restricted":"standard",fictional:true};
  const saved=await admin.from("whispers_reports").insert({workspace:workspaceFor(p.countryCode),body:json(body),code_hash:input.codeHash,idempotency_key:input.idempotencyKey,payload_hash:payloadHash}).select("id").single();
  if(saved.error) {
    const prior=checked(await admin.from("whispers_reports").select("payload_hash").eq("idempotency_key",input.idempotencyKey).maybeSingle());
    if(!prior||prior.payload_hash!==payloadHash) throw new Error("Report was not saved; the attempt may conflict with an earlier draft.");
  } else await audit(null,"pilot_submit",workspaceFor(p.countryCode),saved.data.id);
  return {accepted:true as const};
}
async function capability(code:string,kind:QuotaKind="receipt") {
  const n=normalizeCode(code); if(!isWellFormedCode(n)) return null;
  const hash=await hashCode(n);
  if(kind !== "upload" && !(await quota(kind,hash))) return null;
  return checked(await admin.from("whispers_reports").select("*").eq("code_hash",hash).is("revoked_at",null).gt("expires_at",new Date().toISOString()).maybeSingle());
}
async function contributor(r:Row) {
  const records=checked(await admin.from("whispers_records").select("id,body,created_at,kind").eq("report_id",r.id).in("kind",["message","photo"]).order("created_at")) ?? [];
  const b=object(r.body);
  return {text:String(b['text']??""),area:broadAreaLabel(String(b['countryCode']??"not_shared"),String(b['areaId']??"unknown")),time: String(b['timeBucket'] ?? "not_sure") as TimeBucket,receivedAt:r.received_at,state:String(b['processingState']??"received"),removalRequested:!!r.removal_requested_at,messages:records.filter((x)=>x.kind==="message").map((x)=>({id:x.id,text:String(object(x.body)['text']??""),sender:String(object(x.body)['sender']??""),at:x.created_at})),photos:records.filter((x)=>x.kind==="photo").length};
}
export async function receiptPilot(data:{code:string;action:"open"|"message"|"removal";text?:string | undefined}) {
  const r=await capability(data.code,data.action==="open"?"receipt":data.action); if(!r) return null;
  if(data.action==="message") {
    const text=data.text?.trim(); if(!text||r.removal_requested_at) throw new Error("Cannot add this message.");
    checked(await admin.from("whispers_records").insert({report_id:r.id,workspace:r.workspace,kind:"message",body:{sender:"contributor",text}}));
    await audit(null,"contributor_message",r.workspace,r.id);
  }
  if(data.action==="removal") {
    if(checked(await rpc("whispers_request_removal",{p_id:r.id}))!==true) return null;
    r.removal_requested_at=r.removal_requested_at??new Date().toISOString();
  }
  return contributor(r);
}
export async function uploadPilot(data:{code:string;bytes:number[];uploadId:string}) {
  const r=await capability(data.code,"upload");if(!r||r.removal_requested_at) throw new Error("Report unavailable.");
  const prior=checked(await admin.from("whispers_records").select("id").eq("report_id",r.id).eq("upload_id",data.uploadId).maybeSingle());
  if(prior)return {ok:true};
  if (!(await quota("upload", r.id))) throw new Error("Photo upload limit reached.");
  const existing=checked(await admin.from("whispers_records").select("id").eq("report_id",r.id).eq("kind","photo"))??[];
  if(existing.length>=3) throw new Error("At most three photos are permitted.");
  const decoded=jpeg.decode(new Uint8Array(data.bytes),{useTArray:true,maxResolutionInMP:3,maxMemoryUsageInMB:32,tolerantDecoding:false});
  if(decoded.width*decoded.height>1600*1600) throw new Error("Photo is too large.");
  const encoded=jpeg.encode({width:decoded.width,height:decoded.height,data:decoded.data},80).data;
  if(encoded.length>1500000) throw new Error("Processed photo is too large.");
  const key=r.id+"/"+crypto.randomUUID()+".jpg";
  checked(await admin.storage.from("whispers-private").upload(key,encoded,{contentType:"image/jpeg"}));
  const save=await admin.from("whispers_records").insert({report_id:r.id,workspace:r.workspace,kind:"photo",upload_id:data.uploadId,body:{key,width:decoded.width,height:decoded.height,processed:"server-reencoded"}});
  if(save.error){const cleanup=await admin.storage.from("whispers-private").remove([key]);if(cleanup.error)checked(await admin.from("whispers_media_cleanup").upsert({report_id:r.id}));const retry=checked(await admin.from("whispers_records").select("id").eq("report_id",r.id).eq("upload_id",data.uploadId).maybeSingle());if(retry)return {ok:true};throw new Error("Photo was not saved.");}
  return {ok:true};
}
export async function readPilot(client:Client,user:string, page: number) {
  const membership=await roles(client,user);
  const pageSize = 50;
  const reports=checked(await client.from("whispers_reports")
    .select("id,workspace,received_at,expires_at,category:body->>category")
    .order("received_at",{ascending:false}).order("id").range(page * pageSize, (page + 1) * pageSize))??[];
  const requests=checked(await client.from("whispers_expert_requests").select("*"))??[];
  const assignments=checked(await client.from("whispers_expert_assignments").select("request_id").eq("expert_id",user))??[];
  const packets=[];
  for(const assignment of assignments){
    const x=checked(await admin.from("whispers_expert_requests").select("*").eq("id",assignment.request_id).maybeSingle());
    if(!x||!membership.some((m)=>m.role==="expert"&&m.contexts.includes(x.workspace)))continue;
    const responses=checked(await admin.from("whispers_expert_responses").select("choice,explanation,expert_id").eq("request_id",x.id))??[];
    const mine=responses.find((a)=>a.expert_id===user);
    packets.push({id:x.id,packet:x.packet,state:x.state,mine:mine?{choice:mine.choice,explanation:mine.explanation}:null,aggregate:mine&&responses.length>=5?{consistent:responses.filter((a)=>a.choice==="consistent").length,conflicting:responses.filter((a)=>a.choice==="conflicting").length,cannot_assess:responses.filter((a)=>a.choice==="cannot_assess").length}:null});
  }
  const updates=checked(await client.from("whispers_updates").select("*"))??[];
  const auditRows=checked(await client.from("whispers_audit").select("*").order("at",{ascending:false}).limit(100))??[];
  const isAdmin=membership.some((m)=>m.role==="admin");
  const adminScopes=membership.filter((m)=>m.role==="admin").flatMap((m)=>m.contexts);
  const staff=isAdmin?(checked(await admin.from("user_roles").select("user_id,role,contexts,active"))??[]).filter((s)=>s.contexts.some((ws)=>adminScopes.includes(ws))).map((s)=>({...s,contexts:s.contexts.filter((ws)=>adminScopes.includes(ws))})):[];
  const invitations=isAdmin?checked(await client.from("whispers_staff_invitations").select("id,email,role,workspace,expires_at,accepted_at,revoked_at").order("created_at",{ascending:false}).limit(100))??[]:[];
  const release=isAdmin?checked(await admin.from("whispers_release").select("*").eq("id","pilot").maybeSingle()):null;
  const reviews=isAdmin?checked(await client.from("whispers_release_reviews").select("*"))??[]:[];
  return {userId:user,membership,reports: reports.slice(0, pageSize), hasMoreReports: reports.length > pageSize,requests,packets,updates,audit:auditRows,staff,release,reviews,invitations};
}
export async function readPilotReport(client: Client, user: string, id: string) {
  const report = checked(await client.from("whispers_reports")
    .select("id,workspace,body,received_at,expires_at,removal_requested_at,version")
    .eq("id", id).maybeSingle());
  if (!report) return null;
  const records = checked(await client.from("whispers_records")
    .select("id,report_id,kind,body,created_at").eq("report_id", report.id)
    .order("created_at").limit(250)) ?? [];
  await audit(user, "read_report", report.workspace, report.id);
  return { report, records };
}

export async function readPilotAssessments(client: Client, user: string, requestId: string) {
  const request = checked(await client.from("whispers_expert_requests")
    .select("workspace").eq("id", requestId).maybeSingle());
  if (!request) throw new Error("Assessment unavailable.");
  await allowed(client, user, request.workspace, "reviewer");
  return checked(await client.from("whispers_expert_responses")
    .select("choice,explanation").eq("request_id", requestId).limit(100)) ?? [];
}

export async function commandPilot(client:Client,user:string,d:z.infer<typeof pilotCommandSchema>) {
  if(d.action==="invite_staff"||d.action==="revoke_invitation") {
    const scopes=(await roles(client,user)).filter((m)=>m.role==="admin").flatMap((m)=>m.contexts);
    if(d.action==="invite_staff") {
      if(!d.invitation||!canInvite(scopes,d.invitation.workspace))throw new Error("Select an authorised workspace.");
      checked(await admin.from("whispers_staff_invitations").insert({...d.invitation,invited_by:user}));
      await audit(user,"invite_staff",d.invitation.workspace);
    } else {
      if(!d.id)throw new Error("Invitation required.");
      const invite=checked(await client.from("whispers_staff_invitations").select("workspace,accepted_at").eq("id",d.id).maybeSingle());
      if(!invite||!canInvite(scopes,invite.workspace)||invite.accepted_at)throw new Error("Invitation unavailable.");
      checked(await admin.from("whispers_staff_invitations").update({revoked_at:new Date().toISOString()}).eq("id",d.id).is("accepted_at",null));
      await audit(user,"revoke_invitation",invite.workspace,d.id);
    }
    return {ok:true};
  }
  if(["staff_role","release_review","operator"].includes(d.action)) {
    const membership=await roles(client,user);
    const scopes=membership.filter((m)=>m.role==="admin").flatMap((m)=>m.contexts);
    if(!scopes.length)throw new Error("Administrator access required.");
    if(d.action==="staff_role") {
      if(!d.staff||d.staff.contexts.some((ws)=>!scopes.includes(ws)))throw new Error("Select an authorised workspace.");
      const staff=d.staff;
      if(d.staff.userId===user&&d.staff.role==="admin")throw new Error("Another administrator must change your own admin access.");
      const account=await admin.auth.admin.getUserById(d.staff.userId);if(account.error||!account.data.user)throw new Error("This staff account must sign in first.");
      // Atomic: only the selected workspaces change; the function audits each workspace.
      checked(await rpc("whispers_set_staff_scope",{p_actor:user,p_target:staff.userId,p_role:staff.role,p_contexts:staff.contexts,p_active:staff.active}));
      return {ok:true};
    } else if(d.action==="release_review") {
      if(!d.review)throw new Error("Human review reference required.");
      checked(await admin.from("whispers_release_reviews").insert({...d.review,reviewer_id:user}));
    } else {
      if(!d.operator)throw new Error("Operator details required.");
      checked(await admin.from("whispers_release").upsert({id:"pilot",operator_name:d.operator.name,operator_contact:d.operator.contact,live_intake:false}));
    }
    await audit(user,d.action,scopes[0]??"general");return {ok:true};
  }
  if(d.action==="resume_voice") {
    if(!(await roles(client,user)).some((r)=>r.role==="admin"))throw new Error("Administrator access required.");
    checked(await admin.from("voice_service_controls").update({paused:false,reason:null,status:null}).eq("id","voice"));return {ok:true};
  }
  if(!d.id)throw new Error("A record is required.");
  if(["reply","assess","note","evidence","request_experts","draft_update","remove","extend"].includes(d.action)) {
    const r=await report(client,user,d.id,["remove","extend"].includes(d.action)?"admin":"reviewer");
    const b=object(r.body);
    if(d.action==="reply"||d.action==="note"||d.action==="evidence"){
      if(!d.text?.trim())throw new Error("Text is required.");
      checked(await admin.from("whispers_records").insert({workspace:r.workspace,report_id:r.id,kind:d.action==="reply"?"message":d.action,body:{text:d.text,sender:d.action==="reply"?"reviewer":user}}));
    }
    if(d.action==="assess"){
      if(!["in_review","awaiting_contributor","awaiting_expert","complete"].includes(d.state??""))throw new Error("Invalid review state.");
      await update(r,{...b,processingState:d.state});
    }
    if(d.action==="request_experts"){
      if(!d.packet)throw new Error("Redacted packet required.");
      checked(await rpc("whispers_create_expert_request", { p_id: r.id, p_actor: user, p_packet: json(d.packet) }));
      return { ok: true };
    }
    if(d.action==="draft_update"){
      if(!d.update)throw new Error("Update content required.");
      checked(await admin.from("whispers_updates").insert({workspace:r.workspace,source_report_ids:[r.id],body:json(d.update),author_id:user}));
    }
    if(d.action==="remove"){
      checked(await admin.rpc("whispers_revoke_private",{p_id:r.id}));
    }
    if(d.action==="extend"){
      const next=d.nextReview?new Date(d.nextReview).getTime():0;
      if(!d.nextReview||!d.text?.trim()||next<=Date.now()||next>Date.now()+30*86400000)throw new Error("Provide an extension reason and next review within 30 days.");
      checked(await rpc("whispers_extend_retention",{p_id:r.id,p_actor:user,p_until:d.nextReview,p_reason:d.text}));
      return {ok:true};
    }
    await audit(user,d.action,r.workspace,r.id);return {ok:true};
  }
  if (d.action === "expert_response" || d.action === "interpret") {
    const saved = checked(await rpc("whispers_resolve_expert_request", {
      p_id: d.id, p_actor: user, p_action: d.action, p_text: d.text?.trim() ?? "", p_choice: d.choice ?? null,
    }));
    if (saved !== true) throw new Error("The assessment could not be saved. Refresh the request and check your access.");
    return { ok: true };
  }
  const transitioned=checked(await admin.rpc("whispers_publication_transition",{p_id:d.id,p_actor:user,p_action:d.action}));
  if(!transitioned)throw new Error("Publication state changed. Refresh before retrying.");
  return {ok:true};
}