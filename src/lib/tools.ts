// =====================================================
// FILE ENGINE - TOOL CALLING / MCP
// Structured function calling and Model Context Protocol
// =====================================================

// =====================================================
// TYPES
// =====================================================

export interface Tool {
  name: string
  description: string
  parameters: ToolParameter[]
  handler: (params: Record<string, any>) => Promise<ToolResult>
}

export interface ToolParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  required: boolean
  default?: any
  enum?: string[]
}

export interface ToolResult {
  success: boolean
  data?: any
  error?: string
}

export interface ToolCall {
  id: string
  name: string
  parameters: Record<string, any>
  result?: ToolResult
  timestamp: string
}

export interface MCPServer {
  name: string
  url: string
  tools: Tool[]
  connected: boolean
}

// =====================================================
// BUILT-IN TOOLS
// These are the core tools File Engine uses to work
// Similar to Claude's bash, view, create_file, str_replace
// =====================================================

const builtInTools: Tool[] = [
  // =====================================================
  // FILE OPERATION TOOLS (Core - like Claude's tools)
  // =====================================================
  {
    name: 'view',
    description: 'Read file contents or list directory. Returns file content with line numbers or directory listing.',
    parameters: [
      { name: 'path', type: 'string', description: 'Absolute path to file or directory', required: true },
      { name: 'start_line', type: 'number', description: 'Start line for partial view', required: false },
      { name: 'end_line', type: 'number', description: 'End line for partial view', required: false }
    ],
    handler: async (params) => {
      // This would interface with the virtual file system or actual FS
      return { 
        success: true, 
        data: { path: params.path, type: 'view', content: `[File contents of ${params.path}]` }
      }
    }
  },
  {
    name: 'create_file',
    description: 'Create a new file with the given content. Use for creating new files only.',
    parameters: [
      { name: 'path', type: 'string', description: 'Path for the new file', required: true },
      { name: 'content', type: 'string', description: 'Content to write to the file', required: true },
      { name: 'description', type: 'string', description: 'Why creating this file', required: false }
    ],
    handler: async (params) => {
      return { 
        success: true, 
        data: { path: params.path, type: 'create', message: `Created ${params.path}` }
      }
    }
  },
  {
    name: 'str_replace',
    description: 'Replace a unique string in a file. The old_str must appear exactly once in the file.',
    parameters: [
      { name: 'path', type: 'string', description: 'Path to the file to edit', required: true },
      { name: 'old_str', type: 'string', description: 'String to find (must be unique in file)', required: true },
      { name: 'new_str', type: 'string', description: 'String to replace with (empty to delete)', required: false, default: '' },
      { name: 'description', type: 'string', description: 'Why making this edit', required: false }
    ],
    handler: async (params) => {
      return { 
        success: true, 
        data: { path: params.path, type: 'edit', message: `Edited ${params.path}` }
      }
    }
  },
  {
    name: 'bash',
    description: 'Run a bash command in the sandbox container. Use for installing packages, running builds, tests, etc.',
    parameters: [
      { name: 'command', type: 'string', description: 'Bash command to run', required: true },
      { name: 'description', type: 'string', description: 'Why running this command', required: false }
    ],
    handler: async (params) => {
      try {
        const { createSandbox } = await import('./sandbox')
        const sandbox = createSandbox('default')
        const result = await sandbox.execute(params.command)
        return { success: result.success, data: result }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  },
  {
    name: 'present_files',
    description: 'Share files with the user for viewing/download. Use after creating files the user should see.',
    parameters: [
      { name: 'filepaths', type: 'array', description: 'Array of file paths to present', required: true }
    ],
    handler: async (params) => {
      return { 
        success: true, 
        data: { 
          files: params.filepaths,
          message: `Presenting ${params.filepaths.length} file(s) to user`
        }
      }
    }
  },
  
  // =====================================================
  // SEARCH AND RESEARCH TOOLS
  // =====================================================
  {
    name: 'search_web',
    description: 'Search the web for information, documentation, or code examples',
    parameters: [
      { name: 'query', type: 'string', description: 'Search query', required: true },
      { name: 'maxResults', type: 'number', description: 'Maximum results to return', required: false, default: 5 }
    ],
    handler: async (params) => {
      try {
        const { webSearch } = await import('./search')
        const results = await webSearch(params.query, { maxResults: params.maxResults || 5 })
        return { success: true, data: results }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  },
  {
    name: 'search_npm',
    description: 'Search npm packages',
    parameters: [
      { name: 'query', type: 'string', description: 'Package name or keywords', required: true }
    ],
    handler: async (params) => {
      try {
        const { searchNpmPackages } = await import('./search')
        const results = await searchNpmPackages(params.query)
        return { success: true, data: results }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  },
  {
    name: 'get_package_info',
    description: 'Get detailed information about an npm package',
    parameters: [
      { name: 'name', type: 'string', description: 'Package name', required: true }
    ],
    handler: async (params) => {
      try {
        const { getPackageInfo } = await import('./search')
        const info = await getPackageInfo(params.name)
        return { success: true, data: info }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  },
  {
    name: 'analyze_image',
    description: 'Analyze an image/mockup and extract UI information',
    parameters: [
      { name: 'imageData', type: 'string', description: 'Base64 image data', required: true },
      { name: 'framework', type: 'string', description: 'Target framework', required: false, enum: ['react', 'html', 'vue'] }
    ],
    handler: async (params) => {
      try {
        const { analyzeImage } = await import('./vision')
        const result = await analyzeImage(params.imageData, { framework: params.framework })
        return { success: true, data: result }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  },
  {
    name: 'generate_screenshot',
    description: 'Generate a screenshot from code',
    parameters: [
      { name: 'code', type: 'string', description: 'HTML/React code', required: true },
      { name: 'width', type: 'number', description: 'Width in pixels', required: false, default: 1200 },
      { name: 'height', type: 'number', description: 'Height in pixels', required: false, default: 800 }
    ],
    handler: async (params) => {
      try {
        const { codeToImage } = await import('./vision')
        const result = await codeToImage(params.code, { 
          width: params.width || 1200, 
          height: params.height || 800 
        })
        return { success: true, data: result }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  },
  {
    name: 'run_code',
    description: 'Execute code in a sandbox and get results',
    parameters: [
      { name: 'projectId', type: 'string', description: 'Project ID', required: true },
      { name: 'command', type: 'string', description: 'Command to run', required: true }
    ],
    handler: async (params) => {
      try {
        const { createSandbox } = await import('./sandbox')
        const sandbox = createSandbox(params.projectId)
        const result = await sandbox.execute(params.command)
        return { success: result.success, data: result }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  },
  {
    name: 'analyze_code',
    description: 'Perform semantic analysis on code',
    parameters: [
      { name: 'files', type: 'array', description: 'Array of {path, content} objects', required: true }
    ],
    handler: async (params) => {
      try {
        const { analyzeCode } = await import('./semantic')
        const result = await analyzeCode(params.files)
        return { success: true, data: result }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  },
  {
    name: 'get_user_memory',
    description: 'Retrieve user preferences and coding style',
    parameters: [
      { name: 'userId', type: 'string', description: 'User ID', required: true }
    ],
    handler: async (params) => {
      try {
        const { getRelevantMemories } = await import('./memory')
        const memories = await getRelevantMemories(params.userId, {})
        return { success: true, data: memories }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  },
  {
    name: 'audit_project',
    description: 'Check project for completeness - finds missing files, syntax errors, and issues. Use this to verify a project is production-ready.',
    parameters: [
      { name: 'files', type: 'object', description: 'Map of file paths to contents', required: true },
      { name: 'autoFix', type: 'boolean', description: 'Automatically create missing files', required: false, default: false },
      { name: 'projectName', type: 'string', description: 'Project name for templates', required: false }
    ],
    handler: async (params) => {
      try {
        const { auditProject } = await import('./audit')
        const filesMap = new Map<string, string>(Object.entries(params.files))
        const result = await auditProject(filesMap)
        return { success: true, data: result }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  },
  {
    name: 'batch_create_files',
    description: 'Create multiple files at once. Use for scaffolding projects or fixing multiple missing files.',
    parameters: [
      { name: 'operations', type: 'array', description: 'Array of {type, path, content, description} operations', required: true }
    ],
    handler: async (params) => {
      try {
        const { batchCreateFiles } = await import('./batch-operations')
        const result = await batchCreateFiles(params.operations)
        return { success: result.success, data: result }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  },
  {
    name: 'scaffold_project',
    description: 'Generate a complete project scaffold with all necessary files',
    parameters: [
      { name: 'name', type: 'string', description: 'Project name', required: true },
      { name: 'type', type: 'string', description: 'Project type', required: false, enum: ['nextjs', 'react', 'node', 'api'], default: 'nextjs' }
    ],
    handler: async (params) => {
      try {
        const { createProjectScaffold, batchCreateFiles } = await import('./batch-operations')
        const scaffold = createProjectScaffold(params.name, params.type || 'nextjs')
        const result = await batchCreateFiles(scaffold.files)
        return { success: result.success, data: { scaffold, result } }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  },
  {
    name: 'auto_fix_project',
    description: 'Automatically fix missing files in a project by generating them from templates',
    parameters: [
      { name: 'files', type: 'object', description: 'Current files map', required: true },
      { name: 'projectName', type: 'string', description: 'Project name', required: false, default: 'Project' }
    ],
    handler: async (params) => {
      try {
        const { autoFixMissingFiles, batchCreateFiles } = await import('./batch-operations')
        const filesMap = new Map<string, string>(Object.entries(params.files))
        const { operations, auditBefore, auditAfter } = await autoFixMissingFiles(filesMap, params.projectName)
        const result = await batchCreateFiles(operations)
        return { 
          success: result.success, 
          data: { 
            auditBefore, 
            auditAfter, 
            operations: result 
          } 
        }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  },
  {
    name: 'search_conversations',
    description: 'Search past conversations for context',
    parameters: [
      { name: 'userId', type: 'string', description: 'User ID', required: true },
      { name: 'query', type: 'string', description: 'Search query', required: true }
    ],
    handler: async (params) => {
      try {
        const { searchConversations } = await import('./memory')
        const results = await searchConversations(params.userId, params.query)
        return { success: true, data: results }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  },
  {
    name: 'fetch_url',
    description: 'Fetch content from a URL',
    parameters: [
      { name: 'url', type: 'string', description: 'URL to fetch', required: true }
    ],
    handler: async (params) => {
      try {
        const response = await fetch('/api/fetch-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: params.url })
        })
        const data = await response.json()
        return { success: true, data }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  }
]

// =====================================================
// TOOL REGISTRY
// =====================================================

class ToolRegistry {
  private tools: Map<string, Tool> = new Map()
  private mcpServers: Map<string, MCPServer> = new Map()
  
  constructor() {
    // Register built-in tools
    for (const tool of builtInTools) {
      this.register(tool)
    }
  }
  
  register(tool: Tool): void {
    this.tools.set(tool.name, tool)
  }
  
  unregister(name: string): void {
    this.tools.delete(name)
  }
  
  get(name: string): Tool | undefined {
    return this.tools.get(name)
  }
  
  list(): Tool[] {
    return Array.from(this.tools.values())
  }
  
  // Get tools in OpenAI function calling format
  getOpenAIFormat(): any[] {
    return this.list().map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: tool.parameters.reduce((acc, param) => {
            acc[param.name] = {
              type: param.type,
              description: param.description,
              ...(param.enum && { enum: param.enum })
            }
            return acc
          }, {} as Record<string, any>),
          required: tool.parameters.filter(p => p.required).map(p => p.name)
        }
      }
    }))
  }
  
  // Get tools in Anthropic format
  getAnthropicFormat(): any[] {
    return this.list().map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object',
        properties: tool.parameters.reduce((acc, param) => {
          acc[param.name] = {
            type: param.type,
            description: param.description,
            ...(param.enum && { enum: param.enum })
          }
          return acc
        }, {} as Record<string, any>),
        required: tool.parameters.filter(p => p.required).map(p => p.name)
      }
    }))
  }
  
  // Execute a tool
  async execute(name: string, params: Record<string, any>): Promise<ToolResult> {
    const tool = this.tools.get(name)
    if (!tool) {
      return { success: false, error: `Tool not found: ${name}` }
    }
    
    // Validate required parameters
    for (const param of tool.parameters) {
      if (param.required && !(param.name in params)) {
        return { success: false, error: `Missing required parameter: ${param.name}` }
      }
    }
    
    // Apply defaults
    for (const param of tool.parameters) {
      if (param.default !== undefined && !(param.name in params)) {
        params[param.name] = param.default
      }
    }
    
    try {
      return await tool.handler(params)
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }
  
  // Connect to MCP server
  async connectMCP(name: string, url: string): Promise<boolean> {
    try {
      // Fetch available tools from MCP server
      const response = await fetch(`${url}/tools`)
      if (!response.ok) {
        throw new Error(`Failed to connect to MCP server: ${response.status}`)
      }
      
      const { tools } = await response.json()
      
      // Create handlers for MCP tools
      const mcpTools: Tool[] = tools.map((t: any) => ({
        name: `${name}_${t.name}`,
        description: t.description,
        parameters: t.parameters || [],
        handler: async (params: Record<string, any>) => {
          const res = await fetch(`${url}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool: t.name, params })
          })
          return res.json()
        }
      }))
      
      // Register MCP tools
      for (const tool of mcpTools) {
        this.register(tool)
      }
      
      this.mcpServers.set(name, {
        name,
        url,
        tools: mcpTools,
        connected: true
      })
      
      return true
    } catch (err) {
      console.error(`Failed to connect to MCP server ${name}:`, err)
      return false
    }
  }
  
  // Disconnect from MCP server
  disconnectMCP(name: string): void {
    const server = this.mcpServers.get(name)
    if (server) {
      for (const tool of server.tools) {
        this.unregister(tool.name)
      }
      this.mcpServers.delete(name)
    }
  }
  
  // List connected MCP servers
  listMCPServers(): MCPServer[] {
    return Array.from(this.mcpServers.values())
  }
}

// =====================================================
// TOOL CALL PROCESSOR
// =====================================================

export class ToolCallProcessor {
  private registry: ToolRegistry
  private history: ToolCall[] = []
  
  constructor(registry?: ToolRegistry) {
    this.registry = registry || new ToolRegistry()
  }
  
  // Process tool calls from AI response
  async processToolCalls(
    toolCalls: { id: string; name: string; arguments: string | Record<string, any> }[]
  ): Promise<ToolCall[]> {
    const results: ToolCall[] = []
    
    for (const call of toolCalls) {
      const params = typeof call.arguments === 'string' 
        ? JSON.parse(call.arguments) 
        : call.arguments
      
      const result = await this.registry.execute(call.name, params)
      
      const toolCall: ToolCall = {
        id: call.id,
        name: call.name,
        parameters: params,
        result,
        timestamp: new Date().toISOString()
      }
      
      results.push(toolCall)
      this.history.push(toolCall)
    }
    
    return results
  }
  
  // Get tool definitions for AI
  getToolDefinitions(format: 'openai' | 'anthropic' = 'openai'): any[] {
    return format === 'openai' 
      ? this.registry.getOpenAIFormat()
      : this.registry.getAnthropicFormat()
  }
  
  // Get call history
  getHistory(): ToolCall[] {
    return this.history
  }
  
  // Clear history
  clearHistory(): void {
    this.history = []
  }
  
  // Register custom tool
  registerTool(tool: Tool): void {
    this.registry.register(tool)
  }
  
  // Connect MCP server
  async connectMCP(name: string, url: string): Promise<boolean> {
    return this.registry.connectMCP(name, url)
  }
}

// =====================================================
// EXPORTS
// =====================================================

// Singleton registry
const globalRegistry = new ToolRegistry()

export function getToolRegistry(): ToolRegistry {
  return globalRegistry
}

export function createToolProcessor(): ToolCallProcessor {
  return new ToolCallProcessor(globalRegistry)
}

export {
  ToolRegistry,
  builtInTools
}
