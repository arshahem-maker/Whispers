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
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
