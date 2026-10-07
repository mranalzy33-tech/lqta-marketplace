// Supabase Storage helpers used by the marketplace server.
import { ENV } from "./_core/env";
import { getSupabaseAdmin } from "./supabase/client";

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const client = getSupabaseAdmin();
  const body = typeof data === "string" ? Buffer.from(data) : data;
  const { error } = await client.storage.from(ENV.storageBucket).upload(key, body, { contentType, upsert: false });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data: publicData } = client.storage.from(ENV.storageBucket).getPublicUrl(key);
  return { key, url: publicData.publicUrl };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const { data } = getSupabaseAdmin().storage.from(ENV.storageBucket).getPublicUrl(key);
  return { key, url: data.publicUrl };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  const { data, error } = await getSupabaseAdmin().storage.from(ENV.storageBucket).createSignedUrl(key, 60 * 10);
  if (error || !data?.signedUrl) throw new Error(`Storage signed URL failed: ${error?.message ?? "empty URL"}`);
  return data.signedUrl;
}
