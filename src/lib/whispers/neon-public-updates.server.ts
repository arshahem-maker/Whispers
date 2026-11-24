import { neonDatabase } from "@/integrations/neon/database.server";

export interface PublicUpdateRow {
  id: string;
  title: string | null;
  summary: string | null;
  known: string | null;
  uncertain: string | null;
  sources: unknown;
  published_at: string | Date;
  withdrawn: boolean;
}

export async function readNeonPublicUpdates(): Promise<PublicUpdateRow[]> {
  return neonDatabase()<PublicUpdateRow[]>`
    select id, title, summary, known, uncertain, sources, published_at, withdrawn
    from public.whispers_public_updates
    order by published_at desc
    limit 100
  `;
}
