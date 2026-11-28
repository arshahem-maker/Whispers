import app from "./index.mjs";

export default {
  fetch: app.fetch,
  async scheduled(_controller, env, context) {
    const secret = env.WHISPERS_RETENTION_SECRET;
    if (typeof secret !== "string" || secret.length < 32) {
      throw new Error("Retention schedule is not configured.");
    }
    const request = new Request("https://retention.internal/api/public/retention", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });
    const response = await app.fetch(request, env, context);
    if (!response.ok) throw new Error(`Retention cleanup failed with status ${response.status}.`);
    await response.body?.cancel();
  },
};
