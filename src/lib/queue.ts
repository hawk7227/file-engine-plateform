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
