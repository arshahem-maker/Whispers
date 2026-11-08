import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { pilotStaff, pilotCommand } from "@/lib/whispers/pilot.functions";
import type { pilotCommandSchema } from "@/lib/whispers/pilot-schema";
import type { z } from "zod";
import { tr } from "@/lib/whispers/translation";

const obj = (value: unknown): Record<string,unknown> => value && typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
export function PilotWorkspace() {
  const read=useServerFn(pilotStaff);const command=useServerFn(pilotCommand);const cache=useQueryClient();
  const query=useQuery({queryKey:["pilot-staff"],queryFn:()=>read(),retry:false});
  const [text,setText]=useState("");const [selected,setSelected]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  const [packet,setPacket]=useState({claim:"",context:"",period:"",materials:"",question:""});
  const [update,setUpdate]=useState({title:"",summary:"",known:"",uncertain:"",sources:""});
  const act=async(data:z.infer<typeof pilotCommandSchema>)=>{setBusy(true);setError("");try{await command({data});await cache.invalidateQueries({queryKey:["pilot-staff"]});setText("");}catch(e){setError(e instanceof Error?e.message:"Operation failed.");}finally{setBusy(false);}};
  if(query.isPending)return <p role="status">{tr("Loading…")}</p>;
  if(query.error)return <p role="alert">{tr("Sign in to open the connected pilot workspace.")}</p>;
  const data=query.data;if(!data)return null;
  if(!data.membership.length)return <p>{tr("Signed in, but no staff role has been granted. An administrator must provision access.")}</p>;
  const admin=data.membership.some((m)=>m.role==="admin");
  return <div className="grid gap-8">
    <p className="text-warning">{tr("Connected pilot — fictional data only. Real-source intake remains disabled.")}</p>
    {error&&<p role="alert" className="text-destructive">{error}</p>}
    <section><h2>{tr("Reports")}</h2><select aria-label={tr("Select report")} className="field mt-3" value={selected} onChange={(e)=>setSelected(e.target.value)}><option value="">{tr("Select report")}</option>{data.reports.map((r)=><option key={r.id} value={r.id}>{r.workspace} · {r.received_at.slice(0,10)} · {String(obj(r.body)['category'])}</option>)}</select>
      {data.reports.filter((r)=>r.id===selected).map((r)=><div key={r.id} className="mt-4"><p className="whitespace-pre-wrap">{String(obj(r.body)['text'])}</p><p className="hint mt-2">{String(obj(r.body)['processingState'])} · {String(obj(r.body)['sensitivity'])} · {tr("Access expires")}: {r.expires_at.slice(0,10)}</p>
        <ul className="mt-4 grid gap-2">{data.records.filter((x)=>x.report_id===r.id).map((x)=><li key={x.id}><span className="hint">{x.kind}: </span>{String(obj(x.body)['text']??obj(x.body)['processed']??"")}</li>)}</ul>
      </div>)}
      {selected&&<><label className="label block mt-5">{tr("Message, note or evidence")}<textarea className="field mt-2" value={text} onChange={(e)=>setText(e.target.value)} maxLength={2000}/></label><div className="flex flex-wrap gap-2 mt-3">{([['reply','Send reply'],['note','Save private note'],['evidence','Add evidence']] as const).map(([action,label])=><Button key={action} disabled={busy||!text.trim()} variant="secondary" onClick={()=>void act({action,id:selected,text})}>{tr(label)}</Button>)}
        {([['in_review','In review'],['awaiting_contributor','Ask for information'],['complete','Complete']] as const).map(([state,label])=><Button key={state} disabled={busy} variant="outline" onClick={()=>void act({action:"assess",id:selected,state})}>{tr(label)}</Button>)}
        {admin&&<Button disabled={busy} variant="destructive" onClick={()=>{if(window.confirm(tr("Remove this report and its private material?")))void act({action:"remove",id:selected});}}>{tr("Remove report")}</Button>}
      </div></>}
    </section>
    {selected&&<section><h2>{tr("Redacted expert request")}</h2><div className="grid gap-3 mt-3">{Object.keys(packet).map((key)=><label key={key} className="label">{tr(key)}<textarea className="field mt-1" value={packet[key as keyof typeof packet]} onChange={(e)=>setPacket({...packet,[key]:e.target.value})}/></label>)}</div><Button className="mt-3" disabled={busy||!packet.claim||!packet.question} onClick={()=>void act({action:"request_experts",id:selected,packet})}>{tr("Send redacted packet")}</Button></section>}
    <section><h2>{tr("Expert assignments")}</h2>{data.packets.map((p)=><div key={p.id} className="border-b py-4"><h3>{String(obj(p.packet)['claim'])}</h3><p className="mt-2">{String(obj(p.packet)['question'])}</p>{p.mine?<><p className="mt-2">{p.mine.choice}: {p.mine.explanation}</p>{p.aggregate&&<p className="hint mt-2">{tr("Panel counts")}: {JSON.stringify(p.aggregate)}</p>}</>:<><textarea aria-label={tr("Independent explanation")} className="field mt-3" value={text} maxLength={600} onChange={(e)=>setText(e.target.value)}/><div className="flex flex-wrap gap-2 mt-2">{(["consistent","conflicting","cannot_assess"] as const).map((choice)=><Button key={choice} disabled={busy||!text.trim()||p.state!=="open"} variant="secondary" onClick={()=>void act({action:"expert_response",id:p.id,choice,text})}>{tr(choice)}</Button>)}</div></>}</div>)}</section>
    {data.requests.length>0&&<section><h2>{tr("Moderator interpretation")}</h2>{data.requests.map((x)=><div key={x.id} className="border-b py-4"><p>{String(obj(x.packet)['claim'])}</p><p className="hint">{x.interpretation}</p><Button disabled={busy||!text.trim()} variant="secondary" onClick={()=>void act({action:"interpret",id:x.id,text})}>{tr("Save interpretation and close")}</Button></div>)}</section>}
    {selected&&<section><h2>{tr("New reviewed public update")}</h2><div className="grid gap-3 mt-3">{Object.keys(update).map((key)=><label className="label" key={key}>{tr(key)}<textarea className="field mt-1" value={update[key as keyof typeof update]} onChange={(e)=>setUpdate({...update,[key]:e.target.value})}/></label>)}</div><Button className="mt-3" disabled={busy||!update.title||!update.summary||!update.uncertain} onClick={()=>void act({action:"draft_update",id:selected,update:{...update,sources:update.sources.split('\n').map((s)=>s.trim()).filter(Boolean)}})}>{tr("Save draft")}</Button></section>}
    <section><h2>{tr("Publication review")}</h2>{data.updates.map((u)=><div className="border-b py-4" key={u.id}><h3>{String(obj(u.body)['title'])}</h3><p className="mt-2">{String(obj(u.body)['summary'])}</p><p className="hint">{u.state}</p><div className="flex flex-wrap gap-2 mt-3">{([['submit_update','Submit for review'],['disclosure','Record disclosure review'],['approve','Approve'],['publish','Publish'],['withdraw','Withdraw']] as const).map(([action,label])=><Button key={action} disabled={busy} variant="secondary" onClick={()=>void act({action,id:u.id})}>{tr(label)}</Button>)}</div></div>)}</section>
    {admin&&<section><h2>{tr("Audit")}</h2><ul className="text-sm mt-3 grid gap-1">{data.audit.map((a)=><li key={a.id}>{a.at.slice(0,19)} · {a.action} · {a.outcome}</li>)}</ul><Button variant="outline" className="mt-4" onClick={()=>{if(window.confirm(tr("Resume voice processing only if provider access and credits have been restored?")))void act({action:"resume_voice"});}}>{tr("Resume voice service after access restored")}</Button></section>}
  </div>;
}