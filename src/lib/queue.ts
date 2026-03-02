// src/lib/queue.ts
// QUEUES DISABLED — Redis not configured. BullMQ disabled.

export const queuesEnabled = false;

type AddFn = (name: string, data: unknown, opts?: unknown) => Promise<{ id: string }>;

const nullAdd: AddFn = async () => {
  // Pretend job was enqueued so callers can proceed
  return { id: `disabled-${Date.now()}` };
};

export const buildQueue: { add: AddFn } = {
  add: nullAdd,
};
export type BuildStatus =
  | { status: "disabled"; message: string }
  | { status: "queued" | "running" | "succeeded" | "failed"; progress?: number; result?: unknown; error?: string };

export async function getBuildStatus(_buildId: string): Promise<BuildStatus> {
  return { status: "disabled", message: "Queues are disabled (Redis not configured)." };
}
