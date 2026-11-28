import { copyFile, mkdir } from "node:fs/promises";

await mkdir(new URL("../.output/server/", import.meta.url), { recursive: true });
await copyFile(
  new URL("../workers/worker-entry.mjs", import.meta.url),
  new URL("../.output/server/worker-entry.mjs", import.meta.url),
);
