import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
export const Route = createFileRoute("/api/public/retention")({server:{handlers:{POST:async({request})=>{
  const denied=await authenticateCronRequest(request);if(denied)return denied;
  try {
    const result = process.env["WHISPERS_PILOT_BACKEND"] === "neon"
      ? await (await import("@/lib/whispers/neon-retention.server")).runNeonRetention()
      : await (await import("@/lib/whispers/retention.server")).runRetention();
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  }
  catch { return Response.json({message:"Retention cleanup needs retrying."},{status:503,headers:{"Cache-Control":"no-store"}}); }
}}}});