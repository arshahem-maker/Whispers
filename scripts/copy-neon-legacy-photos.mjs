import { requireStagingTarget } from "./staging-target.mjs";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import postgres from "postgres";

const sources = process.argv.slice(2);
if (sources.length === 0) throw new Error("Pass the downloaded JPEG or JPEG ZIP files.");
const databaseUrl = process.env.DATABASE_URL_UNPOOLED;
const storageEndpoint = process.env.AWS_ENDPOINT_URL_S3;
if (!databaseUrl || !storageEndpoint || !new URL(databaseUrl).hostname.endsWith(".neon.tech")
    || !new URL(storageEndpoint).hostname.endsWith(".neon.tech")) {
  throw new Error("The Neon database and private object storage endpoint are required.");
}
requireStagingTarget("database", databaseUrl);
requireStagingTarget("storage", storageEndpoint);
const database = postgres(databaseUrl, { max: 1, ssl: "require" });
const storage = new S3Client({ endpoint: storageEndpoint, region: process.env.AWS_REGION, forcePathStyle: true });

try {
  const [snapshot] = await database`
    select source_payload->'file_manifest' as files
    from whispers_legacy_import.snapshots order by imported_at desc limit 1
  `;
  if (!Array.isArray(snapshot?.files)) throw new Error("No migration photo manifest found.");
  let verified = 0;
  for (const source of sources) {
    const filename = basename(source).replace(/\.zip$/i, "");
    if (!/^[a-f0-9-]{36}\.jpg$/i.test(filename)) throw new Error("Use the original downloaded photo filename.");
    const matches = snapshot.files.filter((entry) => typeof entry.name === "string" && entry.name.endsWith("/" + filename));
    if (matches.length !== 1) throw new Error("The photo must match one manifest entry.");
    const bytes = source.toLowerCase().endsWith(".zip")
      ? execFileSync("unzip", ["-p", source, filename], { maxBuffer: 2_000_000 })
      : await readFile(source);
    if (bytes.length < 4 || bytes.length > 1_500_000 || bytes.readUInt16BE(0) !== 0xffd8) {
      throw new Error("Invalid JPEG payload.");
    }
    const target = { Bucket: "whispers-private", Key: matches[0].name };
    let existing;
    try {
      existing = await storage.send(new GetObjectCommand(target));
    } catch (error) {
      if (error.$metadata?.httpStatusCode !== 404) throw error;
      await storage.send(new PutObjectCommand({
        ...target, Body: bytes, ContentType: "image/jpeg", IfNoneMatch: "*",
      }));
    }
    const saved = existing ?? await storage.send(new GetObjectCommand(target));
    assert.deepEqual(Buffer.from(await saved.Body.transformToByteArray()), bytes, "Existing object failed integrity check.");
    verified++;
  }
  console.log(`Verified ${verified} private photo(s) in Neon at their original storage paths.`);
} finally {
  storage.destroy();
  await database.end();
}
