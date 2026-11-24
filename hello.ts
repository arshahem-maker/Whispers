import postgres from "postgres";

let database: ReturnType<typeof postgres> | undefined;

export default async function health(): Promise<Response> {
  const connection = process.env.DATABASE_URL;
  const headers = { "Cache-Control": "no-store" };
  if (!connection) return Response.json({ ok: false }, { status: 503, headers });

  try {
    database ??= postgres(connection, { max: 2, connect_timeout: 5 });
    const [result] = await database`
      select to_regprocedure('public.whispers_private_photo_key(uuid)') is not null as ready
    `;
    const ready = result?.ready === true;
    return Response.json({ ok: ready }, { status: ready ? 200 : 503, headers });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers });
  }
}
