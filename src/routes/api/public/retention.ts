import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
export const Route = createFileRoute("/api/public/retention")({server:{handlers:{POST:async({request})=>{
  const denied=await authenticateCronRequest(request);if(denied)return denied;
  const {supabaseAdmin:admin}=await import("@/integrations/supabase/client.server");
  const due=await admin.from("whispers_reports").select("id").lte("expires_at",new Date().toISOString()).limit(100);
  if(due.error)return Response.json({message:"Retention lookup failed."},{status:503});
  for(const r of due.data??[]){
    const files=await admin.storage.from("whispers-private").list(r.id,{limit:100});
    if(files.error)return Response.json({message:"Private media cleanup failed."},{status:503});
    if(files.data.length){const removed=await admin.storage.from("whispers-private").remove(files.data.map((f)=>r.id+"/"+f.name));if(removed.error)return Response.json({message:"Private media cleanup failed."},{status:503});}
  }
  const expired=await admin.rpc("whispers_expire_private");
  if(expired.error)return Response.json({message:"Private record cleanup failed."},{status:503});
  const limits=await admin.from("voice_request_limits").delete().lt("started_at",new Date(Date.now()-86400000).toISOString());
  if(limits.error)return Response.json({message:"Request metadata cleanup failed."},{status:503});
  return Response.json({ok:true},{headers:{"Cache-Control":"no-store"}});
}}}});