// ═══════════════════════════════════════════════════════════════
// QUEUE SYSTEM DISABLED
// Redis is not configured. All background jobs are disabled.
// ═══════════════════════════════════════════════════════════════

export const queuesEnabled = false;

// Dummy queue placeholders so imports don't break
export const aiQueue = null;
export const imageQueue = null;
export const videoQueue = null;

// Dummy helper functions (no-op)
export async function addAIJob() {
  console.warn("Queue disabled: addAIJob skipped");
}

export async function addImageJob() {
  console.warn("Queue disabled: addImageJob skipped");
}

export async function addVideoJob() {
  console.warn("Queue disabled: addVideoJob skipped");
}
