import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

const isR2Configured = R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_ACCOUNT_ID && R2_BUCKET_NAME;

if (!isR2Configured) {
  console.warn("Cloudflare R2 environment variables not configured. Image sharing functionality will be disabled.");
}

const s3Client = isR2Configured ? new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
}) : null;

export async function uploadToR2(fileBuffer, fileName, contentType) {
  if (!isR2Configured) {
    throw new Error("Cloudflare R2 is not configured. Please set up R2 environment variables to enable image sharing.");
  }

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: fileName, // e.g., 'what-x-are-you/share-image-fid-timestamp.png'
    Body: fileBuffer,
    ContentType: contentType,
    // Note: R2 doesn't support ACL - public access must be configured at bucket level
  });

  try {
    await s3Client.send(command);
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;
    return publicUrl;
  } catch (error) {
    console.error("Error uploading to R2:", error);
    throw error;
  }
}

export function isCloudflareR2Configured() {
  return isR2Configured;
} 