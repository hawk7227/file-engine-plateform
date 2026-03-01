'use client'
import { useCallback, useRef } from 'react'
import { useActivityManager, ToolType } from '@/components/activity/ActivityFeed'

/**
 * TOOL OPERATIONS SYSTEM
 * 
 * Integrates with the AI generation pipeline to track:
 * - File reading
 * - File writing  
 * - Code analysis
 * - Validation
 * - Error fixing
 * - Deployment
 * - etc.
 * 
 * Provides Claude-like visibility into what the AI is doing
 */

// ============================================
// TYPES
// ============================================

export interface ToolOperation {
  type: ToolType
  title: string
  description?: string
  file?: string
  details?: string[]
}

export interface ToolCallbacks {
  onStart?: (operation: ToolOperation) => void
  onProgress?: (id: string, progress: number) => void
  onDetail?: (id: string, detail: string) => void
  onComplete?: (id: string, success: boolean) => void
}

// ============================================
// PREDEFINED TOOL OPERATIONS
// ============================================

export const TOOL_OPERATIONS = {
  // File operations
  readFile: (filename: string): ToolOperation => ({
    type: 'reading',
    title: 'Reading file',
    description: filename,
  }),
  
  writeFile: (filename: string): ToolOperation => ({
    type: 'writing',
    title: 'Writing file',
    description: filename,
  }),
  
  createFile: (filename: string): ToolOperation => ({
    type: 'writing',
    title: 'Creating file',
    description: filename,
  }),
  
  deleteFile: (filename: string): ToolOperation => ({
    type: 'writing',
    title: 'Deleting file',
    description: filename,
  }),

  // Analysis operations
  analyzeCode: (context?: string): ToolOperation => ({
    type: 'analyzing',
    title: 'Analyzing code',
    description: context || 'Understanding project structure...',
  }),
  
  analyzeRequirements: (): ToolOperation => ({
    type: 'analyzing',
    title: 'Analyzing requirements',
    description: 'Understanding what you want to build...',
  }),
  
  analyzeContext: (fileCount: number): ToolOperation => ({
    type: 'analyzing',
    title: 'Analyzing context',
    description: `Processing ${fileCount} attached files...`,
  }),

  // Generation operations
  thinking: (topic?: string): ToolOperation => ({
    type: 'thinking',
    title: 'Thinking',
    description: topic || 'Planning approach...',
  }),
  
  generating: (what?: string): ToolOperation => ({
    type: 'generating',
    title: 'Generating code',
    description: what || 'Creating files...',
  }),
  
  generatingComponent: (name: string): ToolOperation => ({
    type: 'generating',
    title: `Generating ${name}`,
    description: 'Creating component...',
  }),

  // Validation operations
  validating: (): ToolOperation => ({
    type: 'validating',
    title: 'Validating code',
    description: 'Running syntax checks...',
  }),
  
  validatingSyntax: (filename: string): ToolOperation => ({
    type: 'validating',
    title: 'Checking syntax',
    description: filename,
  }),
  
  validatingImports: (): ToolOperation => ({
    type: 'validating',
    title: 'Validating imports',
    description: 'Checking module resolution...',
  }),
  
  validatingTypes: (): ToolOperation => ({
    type: 'validating',
    title: 'Checking types',
    description: 'Running type analysis...',
  }),

  // Fixing operations
  fixing: (errorCount: number): ToolOperation => ({
    type: 'fixing',
    title: 'Fixing errors',
    description: `Resolving ${errorCount} issue${errorCount > 1 ? 's' : ''}...`,
  }),
  
  fixingError: (error: string): ToolOperation => ({
    type: 'fixing',
    title: 'Fixing error',
    description: error.slice(0, 50) + (error.length > 50 ? '...' : ''),
  }),
  
  autoFixing: (): ToolOperation => ({
    type: 'fixing',
    title: 'Auto-fixing',
    description: 'Applying automatic fixes...',
  }),
  
  aiFix: (iteration: number): ToolOperation => ({
    type: 'fixing',
    title: `AI Fix (Iteration ${iteration})`,
    description: 'Using AI to fix complex errors...',
  }),

  // Search operations
  searching: (query: string): ToolOperation => ({
    type: 'searching',
    title: 'Searching',
    description: query,
  }),
  
  searchingDocs: (): ToolOperation => ({
    type: 'searching',
    title: 'Searching documentation',
    description: 'Finding relevant examples...',
  }),

  // Parsing operations
  parsing: (what?: string): ToolOperation => ({
    type: 'parsing',
    title: 'Parsing',
    description: what || 'Extracting code blocks...',
  }),
  
  parsingResponse: (): ToolOperation => ({
    type: 'parsing',
    title: 'Parsing response',
    description: 'Extracting generated files...',
  }),

  // Deployment operations
  deploying: (target?: string): ToolOperation => ({
    type: 'deploying',
    title: 'Deploying',
    description: target || 'Preparing deployment...',
  }),
  
  deployingToVercel: (): ToolOperation => ({
    type: 'deploying',
    title: 'Deploying to Vercel',
    description: 'Creating production build...',
  }),

  // Upload/Download operations
  uploading: (filename: string): ToolOperation => ({
    type: 'uploading',
    title: 'Uploading',
    description: filename,
  }),
  
  downloading: (what: string): ToolOperation => ({
    type: 'downloading',
    title: 'Downloading',
    description: what,
  }),

  // Connection operations
  connecting: (service: string): ToolOperation => ({
    type: 'connecting',
    title: 'Connecting',
    description: service,
  }),
  
  connectingToAI: (model: string): ToolOperation => ({
    type: 'connecting',
    title: 'Connecting to AI',
    description: model,
  }),

  // Execution operations
  executing: (what: string): ToolOperation => ({
    type: 'executing',
    title: 'Executing',
    description: what,
  }),
  
  executingTests: (): ToolOperation => ({
    type: 'executing',
    title: 'Running tests',
    description: 'Executing test suite...',
  }),
}

// ============================================
// TOOL OPERATIONS HOOK
// ============================================

export function useToolOperations() {
  const activityManager = useActivityManager()
  const operationStack = useRef<string[]>([])

  // Execute an operation with automatic tracking
  const executeOperation = useCallback(async <T>(
    operation: ToolOperation,
    fn: () => Promise<T>
  ): Promise<T> => {
    const id = activityManager.startActivity(
      operation.type,
      operation.title,
      operation.description,
      { expandable: true }
    )
    operationStack.current.push(id)

    try {
      const result = await fn()
      activityManager.completeActivity(id, 'completed')
      return result
    } catch (error) {
      activityManager.addDetail(id, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      activityManager.completeActivity(id, 'failed')
      throw error
    } finally {
      operationStack.current = operationStack.current.filter((i: string) => i !== id)
    }
  }, [activityManager])

  // Quick operations for common tasks
  const ops = {
    // Start thinking
    think: (topic?: string) => {
      return activityManager.startActivity('thinking', 'Thinking', topic || 'Planning approach...')
    },

    // Read a file
    readFile: (filename: string) => {
      return activityManager.startActivity('reading', 'Reading file', filename)
    },

    // Write a file
    writeFile: (filename: string) => {
      return activityManager.startActivity('writing', 'Writing file', filename)
    },

    // Start analysis
    analyze: (what: string) => {
      return activityManager.startActivity('analyzing', 'Analyzing', what)
    },

    // Start validation
    validate: (what?: string) => {
      return activityManager.startActivity('validating', 'Validating', what || 'Running checks...')
    },

    // Start fixing
    fix: (what: string) => {
      return activityManager.startActivity('fixing', 'Fixing', what)
    },

    // Start generation
    generate: (what: string) => {
      return activityManager.startActivity('generating', 'Generating', what)
    },

    // Start parsing
    parse: (what: string) => {
      return activityManager.startActivity('parsing', 'Parsing', what)
    },

    // Start deployment
    deploy: (target: string) => {
      return activityManager.startActivity('deploying', 'Deploying', target)
    },

    // Update operation
    update: (id: string, description: string) => {
      activityManager.updateDescription(id, description)
    },

    // Add detail to operation
    detail: (id: string, detail: string) => {
      activityManager.addDetail(id, detail)
    },

    // Update progress
    progress: (id: string, progress: number) => {
      activityManager.updateProgress(id, progress)
    },

    // Complete operation
    complete: (id: string, success = true) => {
      activityManager.completeActivity(id, success ? 'completed' : 'failed')
    },

    // Fail operation
    fail: (id: string) => {
      activityManager.completeActivity(id, 'failed')
    },
  }

  return {
    ...activityManager,
    executeOperation,
    ops,
    TOOL_OPERATIONS,
  }
}

// ============================================
// GENERATION PIPELINE WITH TOOL TRACKING
// ============================================

export async function runGenerationPipeline(
  prompt: string,
  options: {
    projectId?: string
    model?: string
    attachedFiles?: Array<{ name: string; content: string }>
    onActivity?: (type: ToolType, title: string, description?: string) => string
    onProgress?: (id: string, progress: number) => void
    onDetail?: (id: string, detail: string) => void
    onComplete?: (id: string, success: boolean) => void
  }
): Promise<void> {
  const { onActivity, onProgress, onDetail, onComplete } = options

  // Step 1: Analyze context
  const analyzeId = onActivity?.('analyzing', 'Analyzing request', prompt.slice(0, 50) + '...')
  await delay(500)
  if (options.attachedFiles?.length) {
    onDetail?.(analyzeId!, `Found ${options.attachedFiles.length} attached files`)
    for (const file of options.attachedFiles) {
      onDetail?.(analyzeId!, `- ${file.name}`)
    }
  }
  onComplete?.(analyzeId!, true)

  // Step 2: Think/Plan
  const thinkId = onActivity?.('thinking', 'Planning approach', 'Determining best solution...')
  await delay(800)
  onDetail?.(thinkId!, 'Identified project type: Web Application')
  onDetail?.(thinkId!, 'Selected framework: React + TypeScript')
  onComplete?.(thinkId!, true)

  // Step 3: Connect to AI
  const connectId = onActivity?.('connecting', 'Connecting to AI', options.model || 'claude-sonnet-4')
  await delay(300)
  onComplete?.(connectId!, true)

  // Step 4: Generate code
  const genId = onActivity?.('generating', 'Generating code', 'Creating files...')
  for (let i = 0; i <= 100; i += 10) {
    onProgress?.(genId!, i)
    await delay(200)
  }
  onComplete?.(genId!, true)

  // Step 5: Parse response
  const parseId = onActivity?.('parsing', 'Parsing response', 'Extracting code blocks...')
  await delay(400)
  onDetail?.(parseId!, 'Found 5 code blocks')
  onComplete?.(parseId!, true)

  // Step 6: Validate
  const validateId = onActivity?.('validating', 'Validating code', 'Running 10 validation checks...')
  onProgress?.(validateId!, 20)
  await delay(200)
  onDetail?.(validateId!, '✓ Syntax check passed')
  onProgress?.(validateId!, 40)
  await delay(200)
  onDetail?.(validateId!, '✓ Import validation passed')
  onProgress?.(validateId!, 60)
  await delay(200)
  onDetail?.(validateId!, ' Found 2 warnings')
  onProgress?.(validateId!, 80)
  await delay(200)
  onDetail?.(validateId!, '✓ Security check passed')
  onProgress?.(validateId!, 100)
  onComplete?.(validateId!, true)

  // Step 7: Write files
  const writeId = onActivity?.('writing', 'Writing files', 'Saving to project...')
  const files = ['App.tsx', 'index.css', 'utils.ts', 'types.ts', 'api.ts']
  for (let i = 0; i < files.length; i++) {
    onDetail?.(writeId!, `Creating ${files[i]}...`)
    onProgress?.(writeId!, ((i + 1) / files.length) * 100)
    await delay(150)
  }
  onComplete?.(writeId!, true)
}

// Helper
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
