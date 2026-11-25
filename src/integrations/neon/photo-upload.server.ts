const headers = { "Cache-Control": "no-store" };
const maxPhotoBytes = 1_500_000;
const maxRequestBytes = maxPhotoBytes + 4096;

export async function handleNeonPhoto(request: Request, origin: string | undefined) {
  if (request.method !== "POST") return new Response(null, { status: 405, headers });
  if (!origin || request.headers.get("Origin") !== origin) {
    return new Response(null, { status: 403, headers });
  }
  const contentType = request.headers.get("Content-Type");
  if (!contentType?.startsWith("multipart/form-data;") || !request.body) {
    return new Response(null, { status: 400, headers });
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxRequestBytes) {
        await reader.cancel();
        return new Response(null, { status: 413, headers });
      }
      chunks.push(value);
    }
  } catch {
    return new Response(null, { status: 400, headers });
  } finally {
    reader.releaseLock();
  }

  let form: FormData;
  try {
    const raw = new Blob(chunks.map((chunk) => new Uint8Array(chunk)));
    form = await new Response(raw, { headers: { "Content-Type": contentType } }).formData();
  } catch {
    return new Response(null, { status: 400, headers });
  }
  const code = form.get("code"),
    uploadId = form.get("uploadId"),
    photo = form.get("photo");
  if (
    typeof code !== "string" ||
    code.length > 80 ||
    typeof uploadId !== "string" ||
    uploadId.length < 1 ||
    uploadId.length > 100 ||
    !(photo instanceof File) ||
    photo.type !== "image/jpeg" ||
    !photo.size ||
    photo.size > maxPhotoBytes
  ) {
    return new Response(null, { status: 400, headers });
  }

  try {
    const { uploadNeonPilot } = await import("@/lib/whispers/neon-citizen.server");
    return Response.json(
      await uploadNeonPilot({
        code,
        uploadId,
        bytes: new Uint8Array(await photo.arrayBuffer()),
      }),
      { headers },
    );
  } catch {
    return new Response(null, { status: 409, headers });
  }
}
