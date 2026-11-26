export function callWhispersBackend(
  path: "/receipt" | "/submit" | "/intake-status",
  data: object,
  authorization?: string | null,
): Promise<unknown> | undefined {
  const backend = process.env["WHISPERS_BACKEND_URL"];
  const secret = process.env["WHISPERS_BACKEND_SECRET"];
  if (!backend || !secret) return undefined;
  const headers = new Headers({ "Content-Type": "application/json", "X-Whispers-Backend": secret });
  if (authorization) headers.set("Authorization", authorization);
  return fetch(new URL(path, backend), {
    method: "POST",
    headers,
    body: JSON.stringify(data),
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  }).then((response) => {
    if (!response.ok) throw new Error("The pilot request could not be completed.");
    return response.json();
  });
}
