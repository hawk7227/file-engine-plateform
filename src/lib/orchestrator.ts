// =====================================================
// FILE ENGINE - ORCHESTRATOR
// The "brain" that decides what actions to take
// This is how Claude knows what to do in different scenarios
// =====================================================

import { ToolRegistry, ToolCallProcessor, ToolResult } from './tools'
import { analyzeCode, SemanticAnalysisResult } from './semantic'
import { getRelevantMemories } from './memory'
import { smartSearch, SearchResult } from './search'

// =====================================================
// TYPES
// =====================================================

export interface Task {
  id: string
  type: TaskType
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  priority: number
  dependencies: string[]
  result?: any
  error?: string
}

export type TaskType =
  | 'analyze_request'      // Understand what user wants
  | 'gather_context'       // Get relevant info (memory, search, files)
  | 'plan_approach'        // Decide how to accomplish task
  | 'generate_code'        // Write the code
  | 'validate_code'        // Check for errors
  | 'fix_errors'           // Fix any issues
  | 'run_tests'            // Execute and verify
  | 'create_artifact'      // Generate preview/artifact
  | 'deploy'               // Deploy to production
  | 'respond'              // Send response to user

export interface OrchestratorContext {
  userId: string
  projectId?: string
  conversationId?: string
  userMessage: string
  attachments?: Attachment[]
  memories?: any
  previousMessages?: Message[]
}

export interface Attachment {
  type: 'image' | 'pdf' | 'code' | 'url'
  content: string
  filename?: string
  mimeType?: string
}

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

export interface ActionPlan {
  tasks: Task[]
  estimatedTime: number
  confidence: number
  reasoning: string
}

export interface OrchestratorResult {
  success: boolean
  response: string
  files?: { path: string; content: string }[]
  artifacts?: Artifact[]
  actions?: ActionLog[]
  error?: string
}

export interface Artifact {
  type: 'react' | 'html' | 'mermaid' | 'svg' | 'markdown'
  content: string
  title?: string
}

export interface ActionLog {
  action: string
  tool?: string
  input?: any
  output?: any
  timestamp: string
  duration: number
}

// =====================================================
// INTENT DETECTION
// Figures out what the user is trying to do
// =====================================================

export type UserIntent =
  | 'generate_code'
  | 'fix_error'
  | 'explain_code'
  | 'refactor'
  | 'add_feature'
  | 'create_from_image'
  | 'search_info'
  | 'deploy'
  | 'general_question'
  | 'continue_previous'

interface IntentAnalysis {
  primaryIntent: UserIntent
  confidence: number
  entities: {
    language?: string
    framework?: string
    fileType?: string
    errorMessage?: string
    feature?: string
  }
  requiresCode: boolean
  requiresSearch: boolean
  requiresMemory: boolean
  requiresImage: boolean
}

function detectIntent(message: string, attachments?: Attachment[]): IntentAnalysis {
  const lowerMessage = message.toLowerCase()

  // Check for image attachments
  const hasImage = attachments?.some(a => a.type === 'image')
  const hasPdf = attachments?.some(a => a.type === 'pdf')
  const hasCode = attachments?.some(a => a.type === 'code')

  // Intent patterns
  const patterns: { intent: UserIntent; patterns: RegExp[]; score: number }[] = [
    {
      intent: 'create_from_image',
      patterns: [/convert.*to code/i, /generate.*from.*image/i, /build.*like this/i, /recreate/i],
      score: hasImage ? 0.95 : 0
    },
    {
      intent: 'fix_error',
      patterns: [/fix/i, /error/i, /bug/i, /not working/i, /broken/i, /issue/i, /problem/i],
      score: 0.8
    },
    {
      intent: 'generate_code',
      patterns: [/create/i, /build/i, /make/i, /generate/i, /write/i, /code/i, /implement/i],
      score: 0.85
    },
    {
      intent: 'explain_code',
      patterns: [/explain/i, /what does/i, /how does/i, /understand/i, /mean/i],
      score: 0.75
    },
    {
      intent: 'refactor',
      patterns: [/refactor/i, /improve/i, /optimize/i, /clean up/i, /better/i],
      score: 0.8
    },
    {
      intent: 'add_feature',
      patterns: [/add/i, /include/i, /feature/i, /also/i, /additionally/i],
      score: 0.7
    },
    {
      intent: 'search_info',
      patterns: [/search/i, /find/i, /look up/i, /what is/i, /how to/i, /documentation/i],
      score: 0.7
    },
    {
      intent: 'deploy',
      patterns: [/deploy/i, /publish/i, /launch/i, /ship/i, /go live/i],
      score: 0.9
    },
    {
      intent: 'continue_previous',
      patterns: [/continue/i, /keep going/i, /more/i, /next/i, /also/i],
      score: 0.6
    }
  ]

  // Score each intent
  let bestIntent: UserIntent = 'general_question'
  let bestScore = 0

  for (const { intent, patterns: intentPatterns, score } of patterns) {
    for (const pattern of intentPatterns) {
      if (pattern.test(lowerMessage) && score > bestScore) {
        bestIntent = intent
        bestScore = score
      }
    }
  }

  // Override for image
  if (hasImage && bestScore < 0.9) {
    bestIntent = 'create_from_image'
    bestScore = 0.95
  }

  // Extract entities
  const entities: IntentAnalysis['entities'] = {}

  // Language detection
  const languages = ['typescript', 'javascript', 'python', 'react', 'nextjs', 'vue', 'html', 'css']
  for (const lang of languages) {
    if (lowerMessage.includes(lang)) {
      entities.language = lang
      break
    }
  }

  // Framework detection
  const frameworks = ['react', 'nextjs', 'next.js', 'vue', 'angular', 'svelte', 'express', 'fastapi']
  for (const fw of frameworks) {
    if (lowerMessage.includes(fw)) {
      entities.framework = fw
      break
    }
  }

  return {
    primaryIntent: bestIntent,
    confidence: bestScore,
    entities,
    requiresCode: ['generate_code', 'fix_error', 'refactor', 'add_feature', 'create_from_image'].includes(bestIntent),
    requiresSearch: ['search_info', 'general_question'].includes(bestIntent) || lowerMessage.includes('latest') || lowerMessage.includes('best practice'),
    requiresMemory: true, // Always check memory for context
    requiresImage: hasImage || false
  }
}

// =====================================================
// TASK PLANNER
// Creates a plan of action based on intent
// =====================================================

function createTaskPlan(intent: IntentAnalysis, context: OrchestratorContext): ActionPlan {
  const tasks: Task[] = []
  let taskId = 0

  const addTask = (type: TaskType, description: string, deps: string[] = []): string => {
    const id = `task_${taskId++}`
    tasks.push({
      id,
      type,
      description,
      status: 'pending',
      priority: taskId,
      dependencies: deps
    })
    return id
  }

  // Always start with analysis
  const analyzeId = addTask('analyze_request', 'Analyze user request and extract requirements')

  // Gather context based on needs
  const contextTasks: string[] = [analyzeId]

  if (intent.requiresMemory) {
    const memoryId = addTask('gather_context', 'Retrieve user preferences and coding style', [analyzeId])
    contextTasks.push(memoryId)
  }

  if (intent.requiresSearch) {
    const searchId = addTask('gather_context', 'Search for relevant documentation and examples', [analyzeId])
    contextTasks.push(searchId)
  }

  // Plan the approach
  const planId = addTask('plan_approach', 'Determine best approach for the task', contextTasks)

  // Execute based on intent
  switch (intent.primaryIntent) {
    case 'generate_code':
    case 'create_from_image':
    case 'add_feature': {
      const generateId = addTask('generate_code', 'Generate code based on requirements', [planId])
      const validateId = addTask('validate_code', 'Validate generated code', [generateId])
      const fixId = addTask('fix_errors', 'Fix any validation errors', [validateId])
      const testId = addTask('run_tests', 'Run code in sandbox to verify', [fixId])
      const artifactId = addTask('create_artifact', 'Create preview artifact', [testId])
      addTask('respond', 'Send response with code and preview', [artifactId])
      break
    }

    case 'fix_error': {
      const analyzeErrorId = addTask('gather_context', 'Analyze error details', [planId])
      const fixId = addTask('fix_errors', 'Apply fix for the error', [analyzeErrorId])
      const validateId = addTask('validate_code', 'Validate the fix', [fixId])
      const testId = addTask('run_tests', 'Test the fix works', [validateId])
      addTask('respond', 'Send response with fixed code', [testId])
      break
    }

    case 'refactor': {
      const analyzeCodeId = addTask('gather_context', 'Analyze current code structure', [planId])
      const generateId = addTask('generate_code', 'Generate refactored code', [analyzeCodeId])
      const validateId = addTask('validate_code', 'Validate refactored code', [generateId])
      addTask('respond', 'Send response with refactored code and explanation', [validateId])
      break
    }

    case 'explain_code': {
      const analyzeCodeId = addTask('gather_context', 'Analyze the code in detail', [planId])
      addTask('respond', 'Send detailed explanation', [analyzeCodeId])
      break
    }

    case 'search_info': {
      const searchId = addTask('gather_context', 'Search for information', [planId])
      addTask('respond', 'Send search results and summary', [searchId])
      break
    }

    case 'deploy': {
      const prepareId = addTask('validate_code', 'Prepare code for deployment', [planId])
      const deployId = addTask('deploy', 'Deploy to production', [prepareId])
      addTask('respond', 'Send deployment status and URL', [deployId])
      break
    }

    default: {
      addTask('respond', 'Send helpful response', [planId])
    }
  }

  return {
    tasks,
    estimatedTime: tasks.length * 2000, // Rough estimate
    confidence: intent.confidence,
    reasoning: `Detected intent: ${intent.primaryIntent} with ${(intent.confidence * 100).toFixed(0)}% confidence. Created ${tasks.length} tasks to complete the request.`
  }
}

// =====================================================
// ORCHESTRATOR CLASS
// The main coordinator that runs everything
// =====================================================

export class Orchestrator {
  private toolProcessor: ToolCallProcessor
  private actionLog: ActionLog[] = []

  constructor() {
    this.toolProcessor = new ToolCallProcessor()
  }

  async process(context: OrchestratorContext): Promise<OrchestratorResult> {
    const startTime = Date.now()

    try {
      // Step 1: Detect user intent
      const intent = detectIntent(context.userMessage, context.attachments)
      this.log('analyze_intent', { intent })

      // Step 2: Create action plan
      const plan = createTaskPlan(intent, context)
      this.log('create_plan', { plan: plan.reasoning, taskCount: plan.tasks.length })

      // Step 3: Execute tasks in order
      const files: { path: string; content: string }[] = []
      const artifacts: Artifact[] = []
      let response = ''

      for (const task of plan.tasks) {
        // Check dependencies
        const depsComplete = task.dependencies.every(depId => {
          const depTask = plan.tasks.find(t => t.id === depId)
          return depTask?.status === 'completed'
        })

        if (!depsComplete) continue

        task.status = 'running'
        const taskStart = Date.now()

        try {
          const result = await this.executeTask(task, context, { files, artifacts })
          task.status = 'completed'
          task.result = result

          // Collect outputs
          if (result.files) files.push(...result.files)
          if (result.artifacts) artifacts.push(...result.artifacts)
          if (result.response) response = result.response

          this.log(task.type, { task: task.description, result: 'success' }, Date.now() - taskStart)
        } catch (err: any) {
          task.status = 'failed'
          task.error = err.message
          this.log(task.type, { task: task.description, error: err.message }, Date.now() - taskStart)
        }
      }

      return {
        success: true,
        response: response || 'Task completed successfully.',
        files: files.length > 0 ? files : undefined,
        artifacts: artifacts.length > 0 ? artifacts : undefined,
        actions: this.actionLog
      }

    } catch (err: any) {
      return {
        success: false,
        response: `I encountered an error: ${err.message}`,
        error: err.message,
        actions: this.actionLog
      }
    }
  }

  private async executeTask(
    task: Task,
    context: OrchestratorContext,
    accumulated: { files: any[]; artifacts: any[] }
  ): Promise<{ files?: any[]; artifacts?: any[]; response?: string }> {

    switch (task.type) {
      case 'analyze_request':
        // Already done in intent detection
        return {}

      case 'gather_context': {
        // Get memories
        if (task.description.includes('preference') || task.description.includes('style')) {
          const memories = await getRelevantMemories(context.userId, {
            prompt: task.description
          })
          context.memories = memories
        }

        // Search if needed
        if (task.description.includes('Search') || task.description.includes('documentation')) {
          const results = await smartSearch(context.userMessage)
          return { response: `Found ${(results as any).results?.length || (results as any).length || 0} relevant results.` }
        }

        return {}
      }

      case 'plan_approach':
        // Planning happens in createTaskPlan
        return {}

      case 'generate_code': {
        // This would call the AI to generate code
        // For now, return placeholder
        return {
          response: 'Code generation would happen here using lib/ai.ts'
        }
      }

      case 'validate_code': {
        if (accumulated.files.length > 0) {
          const analysis = await analyzeCode(accumulated.files)
          if (analysis.potentialBugs.length > 0) {
            return { response: `Found ${analysis.potentialBugs.length} potential issues.` }
          }
        }
        return { response: 'Validation passed.' }
      }

      case 'fix_errors': {
        // This would call lib/ai-fixer.ts
        return { response: 'Error fixing would happen here.' }
      }

      case 'run_tests': {
        // This would call lib/sandbox.ts
        return { response: 'Tests would run in sandbox here.' }
      }

      case 'create_artifact': {
        // Create preview artifact
        if (accumulated.files.length > 0) {
          const mainFile = accumulated.files[0]
          return {
            artifacts: [{
              type: 'react',
              content: mainFile.content,
              title: mainFile.path
            }]
          }
        }
        return {}
      }

      case 'deploy': {
        // This would call lib/deploy.ts
        return { response: 'Deployment would happen here.' }
      }

      case 'respond':
        return { response: 'Task completed.' }

      default:
        return {}
    }
  }

  private log(action: string, details?: any, duration?: number) {
    this.actionLog.push({
      action,
      input: details,
      timestamp: new Date().toISOString(),
      duration: duration || 0
    })
  }

  getActionLog(): ActionLog[] {
    return this.actionLog
  }
}

// =====================================================
// EXPORTS
// =====================================================

export function createOrchestrator(): Orchestrator {
  return new Orchestrator()
}

export { detectIntent, createTaskPlan }
