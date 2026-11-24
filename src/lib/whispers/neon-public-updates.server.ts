import postgres from "postgres";

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

let database: ReturnType<typeof postgres> | undefined;

export async function readNeonPublicUpdates(): Promise<PublicUpdateRow[]> {
  const connection = process.env["DATABASE_URL"];
  if (!connection) throw new Error("Neon updates are unavailable.");
  database ??= postgres(connection, { max: 3, connect_timeout: 5, prepare: false });
  return database<PublicUpdateRow[]>`
    select id, title, summary, known, uncertain, sources, published_at, withdrawn
    from public.whispers_public_updates
    order by published_at desc
    limit 100
  `;
}
