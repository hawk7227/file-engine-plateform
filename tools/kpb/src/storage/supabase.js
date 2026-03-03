import { getSupabaseAdmin } from "../supabaseClient.js";
import { requireEnv } from "../env.js";

export class SupabaseStorage {
  constructor() {
    this.sb = getSupabaseAdmin();
    this.bucket = requireEnv("SUPABASE_STORAGE_BUCKET");
  }

  async putObject(path, bytes, contentType = "application/octet-stream") {
    const { data, error } = await this.sb.storage.from(this.bucket).upload(path, bytes, {
      upsert: true,
      contentType,
    });
    if (error) throw error;
    return { bucket: this.bucket, path: data.path };
  }
}
