import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
export const Route = createFileRoute("/api/public/retention")({server:{handlers:{POST:async({request})=>{
  const denied=await authenticateCronRequest(request);if(denied)return denied;
  const {runRetention}=await import("@/lib/whispers/retention.server");
  try { return Response.json(await runRetention(),{headers:{"Cache-Control":"no-store"}}); }
  catch { return Response.json({message:"Retention cleanup needs retrying."},{status:503,headers:{"Cache-Control":"no-store"}}); }
}}}});