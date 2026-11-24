import postgres from "postgres";

type Database = ReturnType<typeof postgres>;
let db: Database | undefined;

export function neonDatabase(): Database {
  const connection = process.env["DATABASE_URL"];
  if (!connection) throw new Error("Neon database is unavailable.");
  return (db ??= postgres(connection, { max: 3, connect_timeout: 5, prepare: false }));
}
