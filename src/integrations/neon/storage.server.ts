import { S3Client } from "@aws-sdk/client-s3";

export const NEON_PHOTO_BUCKET = "whispers-private";
let storage: S3Client | undefined;

export function neonStorage(): S3Client {
  const endpoint = process.env["AWS_ENDPOINT_URL_S3"];
  const region = process.env["AWS_REGION"];
  if (!endpoint || !region || !process.env["AWS_ACCESS_KEY_ID"] || !process.env["AWS_SECRET_ACCESS_KEY"]) {
    throw new Error("Neon storage is unavailable.");
  }
  return (storage ??= new S3Client({ endpoint, region, forcePathStyle: true }));
}
