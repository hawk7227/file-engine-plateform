import { requireEnv } from "../env.js";

// Skeleton. Implement using AWS SDK v3 or your S3-compatible client.
export class S3Storage {
  constructor() {
    this.endpoint = requireEnv("S3_ENDPOINT");
    this.bucket = requireEnv("S3_BUCKET");
    this.accessKey = requireEnv("S3_ACCESS_KEY");
    this.secretKey = requireEnv("S3_SECRET_KEY");
  }

  async putObject(path, bytes, contentType = "application/octet-stream") {
    throw new Error("S3Storage.putObject not implemented. Wire AWS SDK v3 here.");
  }
}
