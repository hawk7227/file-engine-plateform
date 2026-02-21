// =====================================================
// FILE ENGINE - AGENT LOOP
// Iteratively uses tools until the task is complete
// This is how Claude runs multiple commands in sequence
// =====================================================

import { ToolCallProcessor, ToolResult, Tool } from './tools'
import { BRAND_AI_NAME } from '@/lib/brand'
import { sanitizeResponse } from './ai-config'

// =====================================================
// TYPES
// =====================================================

export interface AgentConfig {
  maxIterations: number
  maxTokens: number
  temperature: number
  systemPrompt: string
  tools: Tool[]
  onStep?: (step: AgentStep) => void
  onToolCall?: (call: AgentToolCall) => void
}

export interface AgentStep {
  iteration: number
  thought: string
  action?: string
  observation?: string
  timestamp: string
}

export interface AgentToolCall {
  id: string
  name: string
  description: string
  input: Record<string, any>
  output?: any
  error?: string
  duration: number
}

export interface AgentResult {
  success: boolean
  response: string
  steps: AgentStep[]
  toolCalls: AgentToolCall[]
  totalTokens: number
  totalDuration: number
}

export interface AgentMessage {
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolCallId?: string
  toolName?: string
}

// =====================================================
// FILE OPERATION TOOLS
// The core tools that let the agent work with files
// =====================================================

export const fileOperationTools: Tool[] = [
  {
    name: 'view_file',
    description: 'Read the contents of a file or list directory contents',
    parameters: [
      { name: 'path', type: 'string', description: 'Path to file or directory', required: true },
      { name: 'startLine', type: 'number', description: 'Start line (optional)', required: false },
      { name: 'endLine', type: 'number', description: 'End line (optional)', required: false }
    ],
    handler: async (params) => {
      // In browser environment, this would use the virtual file system
      // In Node environment, this would use fs
      return { 
        success: true, 
        data: `Contents of ${params.path}` 
      }
    }
  },
  {
    name: 'create_file',
    description: 'Create a new file with the given content',
    parameters: [
      { name: 'path', type: 'string', description: 'Path for the new file', required: true },
      { name: 'content', type: 'string', description: 'Content to write', required: true },
      { name: 'description', type: 'string', description: 'Why creating this file', required: false }
    ],
    handler: async (params) => {
      return { 
        success: true, 
        data: `Created file: ${params.path}` 
      }
    }
  },
  {
    name: 'edit_file',
    description: 'Edit an existing file by replacing a unique string',
    parameters: [
      { name: 'path', type: 'string', description: 'Path to the file', required: true },
      { name: 'oldStr', type: 'string', description: 'String to find (must be unique)', required: true },
      { name: 'newStr', type: 'string', description: 'String to replace with', required: true },
      { name: 'description', type: 'string', description: 'Why making this edit', required: false }
    ],
    handler: async (params) => {
      return { 
        success: true, 
        data: `Edited ${params.path}: replaced string` 
      }
    }
  },
  {
    name: 'run_command',
    description: 'Run a shell command in the sandbox',
    parameters: [
      { name: 'command', type: 'string', description: 'Command to run', required: true },
      { name: 'description', type: 'string', description: 'Why running this command', required: false }
    ],
    handler: async (params) => {
      return { 
        success: true, 
        data: `Ran: ${params.command}` 
      }
    }
  },
  {
    name: 'search_files',
    description: 'Search for files matching a pattern or containing text',
    parameters: [
      { name: 'query', type: 'string', description: 'Search query', required: true },
      { name: 'path', type: 'string', description: 'Directory to search in', required: false }
    ],
    handler: async (params) => {
      return { 
        success: true, 
        data: `Search results for: ${params.query}` 
      }
    }
  },
  {
    name: 'think',
    description: 'Think through a problem step by step before taking action',
    parameters: [
      { name: 'thought', type: 'string', description: 'Your reasoning', required: true }
    ],
    handler: async (params) => {
      return { 
        success: true, 
        data: params.thought 
      }
    }
  },
  {
    name: 'complete',
    description: 'Mark the task as complete and provide final response',
    parameters: [
      { name: 'response', type: 'string', description: 'Final response to user', required: true },
      { name: 'summary', type: 'string', description: 'Summary of actions taken', required: false }
    ],
    handler: async (params) => {
      return { 
        success: true, 
        data: params.response,
        complete: true
      }
    }
  }
]

// =====================================================
// AGENT CLASS
// =====================================================

export class Agent {
  private config: AgentConfig
  private toolProcessor: ToolCallProcessor
  private steps: AgentStep[] = []
  private toolCalls: AgentToolCall[] = []
  private messages: AgentMessage[] = []
  
  constructor(config: Partial<AgentConfig> = {}) {
    this.config = {
      maxIterations: config.maxIterations || 10,
      maxTokens: config.maxTokens || 4096,
      temperature: config.temperature || 0.7,
      systemPrompt: config.systemPrompt || this.getDefaultSystemPrompt(),
      tools: config.tools || fileOperationTools,
      onStep: config.onStep,
      onToolCall: config.onToolCall
    }
    
    this.toolProcessor = new ToolCallProcessor()
    
    // Register tools
    for (const tool of this.config.tools) {
      this.toolProcessor.registerTool(tool)
    }
  }
  
  private getDefaultSystemPrompt(): string {
    return `You are ${BRAND_AI_NAME}, an AI agent that can use tools to accomplish tasks.

AVAILABLE TOOLS:
- view_file: Read file contents or list directories
- create_file: Create new files
- edit_file: Edit existing files by replacing text
- run_command: Run shell commands
- search_files: Search for files
- think: Think through problems (use this to plan)
- complete: Mark task complete

WORKFLOW:
1. Think about what needs to be done
2. Use tools to accomplish the task
3. Verify your work
4. Call 'complete' when done

RULES:
- Always verify changes work before completing
- Create complete, working code
- Use 'think' to plan complex tasks
- Never leave tasks incomplete`
  }
  
  async run(userMessage: string, files?: Map<string, string>): Promise<AgentResult> {
    const startTime = Date.now()
    let totalTokens = 0
    let isComplete = false
    let finalResponse = ''
    
    // Initialize messages
    this.messages = [
      { role: 'user', content: userMessage }
    ]
    
    for (let iteration = 0; iteration < this.config.maxIterations && !isComplete; iteration++) {
      const stepStart = Date.now()
      
      // Get AI response (this would call the actual AI)
      const aiResponse = await this.getAIResponse()
      
      // Record step
      const step: AgentStep = {
        iteration,
        thought: aiResponse.thought || '',
        action: aiResponse.toolCall?.name,
        timestamp: new Date().toISOString()
      }
      
      // If AI wants to use a tool
      if (aiResponse.toolCall) {
        const toolStart = Date.now()
        
        const toolResult = await this.toolProcessor.processToolCalls([{
          id: `call_${iteration}`,
          name: aiResponse.toolCall.name,
          arguments: aiResponse.toolCall.input
        }])
        
        const result = toolResult[0]
        
        // Record tool call
        const toolCall: AgentToolCall = {
          id: result.id,
          name: result.name,
          description: this.getToolDescription(result.name),
          input: result.parameters,
          output: result.result?.data,
          error: result.result?.error,
          duration: Date.now() - toolStart
        }
        
        this.toolCalls.push(toolCall)
        this.config.onToolCall?.(toolCall)
        
        step.observation = JSON.stringify(result.result?.data || result.result?.error)
        
        // Check if task is complete
        if (result.name === 'complete' && result.result?.success) {
          isComplete = true
          finalResponse = result.parameters.response
        }
        
        // Add tool result to messages
        this.messages.push({
          role: 'assistant',
          content: aiResponse.thought || '',
          toolCallId: result.id,
          toolName: result.name
        })
        
        this.messages.push({
          role: 'tool',
          content: JSON.stringify(result.result),
          toolCallId: result.id,
          toolName: result.name
        })
      }
      
      this.steps.push(step)
      this.config.onStep?.(step)
      
      // Safety: if no tool call and no completion, force completion
      if (!aiResponse.toolCall && iteration === this.config.maxIterations - 1) {
        finalResponse = 'Task completed after maximum iterations.'
        isComplete = true
      }
    }
    
    return {
      success: isComplete,
      response: sanitizeResponse(finalResponse),
      steps: this.steps,
      toolCalls: this.toolCalls,
      totalTokens,
      totalDuration: Date.now() - startTime
    }
  }
  
  private async getAIResponse(): Promise<{
    thought?: string
    toolCall?: { name: string; input: Record<string, any> }
  }> {
    // This would call the actual AI API
    // For now, return a placeholder that demonstrates the flow
    
    // In real implementation:
    // 1. Send messages to AI with tool definitions
    // 2. Parse response for tool calls
    // 3. Return thought + tool call
    
    return {
      thought: 'Analyzing the request...',
      toolCall: {
        name: 'complete',
        input: {
          response: 'This is a placeholder. In production, this calls the AI API.',
          summary: 'Agent loop demonstration'
        }
      }
    }
  }
  
  private getToolDescription(name: string): string {
    const tool = this.config.tools.find(t => t.name === name)
    return tool?.description || name
  }
  
  getSteps(): AgentStep[] {
    return this.steps
  }
  
  getToolCalls(): AgentToolCall[] {
    return this.toolCalls
  }
}

// =====================================================
// STREAMING AGENT
// Yields results as they happen (like the UI shows)
// =====================================================

export class StreamingAgent extends Agent {
  async *runStream(userMessage: string): AsyncGenerator<AgentStep | AgentToolCall> {
    const result = await this.run(userMessage)
    
    for (const step of result.steps) {
      yield step
    }
    
    for (const toolCall of result.toolCalls) {
      yield toolCall
    }
  }
}

// =====================================================
// EXPORTS
// =====================================================

export function createAgent(config?: Partial<AgentConfig>): Agent {
  return new Agent(config)
}

export function createStreamingAgent(config?: Partial<AgentConfig>): StreamingAgent {
  return new StreamingAgent(config)
}
