import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Declare your Neon services here
  preview: {
    realtime: true,
  },
  auth: true,
  buckets: { "whispers-private": {} },
  aiGateway: true,
  functions: {
    whispersapi: {
      name: "Whispers private backend",
      source: "./whispers-api.ts",
      env: {
        WHISPERS_BACKEND_SECRET: { value: process.env.WHISPERS_BACKEND_SECRET, required: true },
        WHISPERS_APP_ORIGIN: { value: process.env.WHISPERS_APP_ORIGIN, required: true },
        // Staging-only allowlist. Missing means no connected pilot submissions
        // are accepted; production must not need this setting to provision.
        WHISPERS_PILOT_TESTER_IDS: { value: process.env.WHISPERS_PILOT_TESTER_IDS, required: false },
      },
    },
    hello: { name: "Whispers database health", source: "./hello.ts" },
  },
  triggers: {
    "whispers-retention": {
      type: "schedule",
      function: "whispersapi",
      cron: "0 * * * *",
      functionPath: "/scheduled-retention",
    },
  },
  // Keep the named staging branch durable. Only short-lived dev branches expire.
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (branch.name === "staging") {
      // Staging is a persistent environment; do not apply a TTL.
      return {};
    }
    if (!branch.exists && branch.name.startsWith("dev-")) {
      // Short-lived development branches expire after one week.
      return { ttl: "7d" };
    }
    // Other branches use project defaults unless explicitly configured.
    return {};
  },
});
