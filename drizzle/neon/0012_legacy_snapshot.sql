-- Restricted staging area for a verified legacy export. Never expose this
-- schema to browser roles; report content and identity mappings are private.
CREATE SCHEMA IF NOT EXISTS whispers_legacy_import;
REVOKE ALL ON SCHEMA whispers_legacy_import FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS whispers_legacy_import.snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_payload jsonb NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON TABLE whispers_legacy_import.snapshots FROM PUBLIC, anon, authenticated, service_role;
