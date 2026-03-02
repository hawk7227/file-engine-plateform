// src/lib/queue.ts
// QUEUES DISABLED — Redis not configured. BullMQ disabled.

export const queuesEnabled = false;

// Keep the same named exports your app expects.
// Adjust names if your app imports different ones.
export const buildQueue = null;

export type BuildJobData = unknown;
export type BuildJobResult = unknown;

export async function enqueueBuildJob() {
  console.warn("Queues disabled: enqueueBuildJob skipped");
  return null;
}
