import { Queue, Worker, Job } from 'bullmq'
import { supabase } from './supabase'
import { generate, parseCodeBlocks, AIModel } from './ai'

// Redis connection
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined
}

// Build job data type
export interface BuildJobData {
  buildId: string
  projectId: string
  userId: string
  prompt: string
  model: AIModel
  apiKey?: string
  context?: string
}

// Build job result type
export interface BuildJobResult {
  success: boolean
  filesCount: number
  error?: string
}

// Create build queue
export const buildQueue = new Queue<BuildJobData, BuildJobResult>('builds', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: 100,
    removeOnFail: 50
  }
})

// Add job to queue
export async function queueBuild(data: BuildJobData): Promise<Job<BuildJobData, BuildJobResult>> {
  const job = await buildQueue.add('generate', data, {
    jobId: data.buildId
  })
  return job
}

// Get job status
export async function getBuildStatus(buildId: string) {
  const job = await buildQueue.getJob(buildId)
  if (!job) return null

  const state = await job.getState()
  const progress = job.progress

  return {
    id: job.id,
    state,
    progress,
    data: job.data,
    result: job.returnvalue,
    failedReason: job.failedReason
  }
}

// Create worker (run in separate process)
export function createBuildWorker() {
  const worker = new Worker<BuildJobData, BuildJobResult>(
    'builds',
    async (job: any) => {
      const { buildId, projectId, userId, prompt, model, apiKey, context } = job.data

      console.log(`[Worker] Processing build ${buildId}`)

      try {
        // Update status to running
        await supabase
          .from('builds')
          .update({ status: 'running', started_at: new Date().toISOString() })
          .eq('id', buildId)

        await job.updateProgress(10)

        // Generate code
        let fullResponse = ''
        let chunkCount = 0

        for await (const chunk of generate(prompt, model, apiKey, context)) {
          fullResponse += chunk
          chunkCount++

          // Update progress based on chunks received
          const progress = Math.min(10 + Math.floor((chunkCount / 100) * 80), 90)
          await job.updateProgress(progress)
        }

        await job.updateProgress(90)

        // Parse files
        const parsedFiles = parseCodeBlocks(fullResponse)
        console.log(`[Worker] Parsed ${parsedFiles.length} files from response`)

        // Save files to database
        if (parsedFiles.length > 0) {
          // Delete old generated files
          await supabase
            .from('files')
            .delete()
            .eq('project_id', projectId)
            .eq('type', 'generated')

          // Insert new files
          const filesToInsert = parsedFiles.map(file => ({
            project_id: projectId,
            user_id: userId,
            name: file.filepath.split('/').pop() || file.filepath,
            path: file.filepath,
            content: file.content,
            type: 'generated',
            mime_type: getMimeType(file.language)
          }))

          await supabase.from('files').insert(filesToInsert)
        }

        await job.updateProgress(95)

        // Update build status to completed
        await supabase
          .from('builds')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', buildId)

        // Update project status
        await supabase
          .from('projects')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', projectId)

        await job.updateProgress(100)

        console.log(`[Worker] Build ${buildId} completed successfully`)

        return {
          success: true,
          filesCount: parsedFiles.length
        }
      } catch (error) {
        console.error(`[Worker] Build ${buildId} failed:`, error)

        // Update build status to failed
        await supabase
          .from('builds')
          .update({
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString()
          })
          .eq('id', buildId)

        throw error
      }
    },
    {
      connection: redisConnection,
      concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5')
    }
  )

  worker.on('completed', (job: any, result: any) => {
    console.log(`[Worker] Job ${job.id} completed with result:`, result)
  })

  worker.on('failed', (job: any, err: any) => {
    console.error(`[Worker] Job ${job?.id} failed with error:`, err.message)
  })

  worker.on('progress', (job: any, progress: any) => {
    console.log(`[Worker] Job ${job.id} progress: ${progress}%`)
  })

  return worker
}

// Queue stats
export async function getQueueStats() {
  const [waiting, active, completed, failed] = await Promise.all([
    buildQueue.getWaitingCount(),
    buildQueue.getActiveCount(),
    buildQueue.getCompletedCount(),
    buildQueue.getFailedCount()
  ])

  return { waiting, active, completed, failed }
}

// Helper function
function getMimeType(language: string): string {
  const map: Record<string, string> = {
    typescript: 'text/typescript',
    javascript: 'text/javascript',
    tsx: 'text/typescript-jsx',
    jsx: 'text/javascript-jsx',
    python: 'text/x-python',
    html: 'text/html',
    css: 'text/css',
    json: 'application/json',
    yaml: 'text/yaml',
    markdown: 'text/markdown',
    sql: 'text/x-sql'
  }
  return map[language.toLowerCase()] || 'text/plain'
}
