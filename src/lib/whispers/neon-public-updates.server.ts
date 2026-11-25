import { neon } from "@neondatabase/serverless";

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
  const connection = process.env["DATABASE_URL"];
  if (!connection) throw new Error("Neon updates are unavailable.");
  const sql = neon(connection);
  const rows = await sql`
    select id, title, summary, known, uncertain, sources, published_at, withdrawn
    from public.whispers_public_updates
    order by published_at desc
    limit 100
  `;
  return rows as PublicUpdateRow[];
}
