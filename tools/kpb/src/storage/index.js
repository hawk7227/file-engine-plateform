import { getEnv } from "../env.js";
import { SupabaseStorage } from "./supabase.js";
import { S3Storage } from "./s3.js";

export function getStorage() {
  const provider = (getEnv("STORAGE_PROVIDER", "supabase")).toLowerCase();
  if (provider === "supabase") return new SupabaseStorage();
  if (provider === "s3") return new S3Storage();
  throw new Error(`Unknown STORAGE_PROVIDER: ${provider}`);
}
