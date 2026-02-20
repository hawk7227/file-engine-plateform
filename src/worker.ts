/**
 * Build Worker Process
 * 
 * Run with: npm run worker
 * 
 * This process picks up build jobs from the Redis queue
 * and processes them by calling the AI API.
 * 
 * For production, run multiple worker instances:
 * - pm2 start src/worker.ts -i 4 --name "file-engine-worker"
 */

import { createBuildWorker } from './lib/queue'

console.log('🚀 Starting File Engine Build Worker...')
console.log(`   Concurrency: ${process.env.WORKER_CONCURRENCY || 5}`)
console.log(`   Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`)

const worker = createBuildWorker()

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing worker...')
  await worker.close()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing worker...')
  await worker.close()
  process.exit(0)
})

console.log('✅ Worker started and listening for jobs')
