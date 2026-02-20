// =====================================================
// FILE ENGINE - PROJECT MEMORY SYSTEM
// Prevents AI from "forgetting" during long projects
// Persists across sessions, tracks everything
// =====================================================

// =====================================================
// TYPES
// =====================================================

export interface ProjectMemory {
  id: string
  projectId: string
  userId: string
  createdAt: string
  updatedAt: string
  
  // Core project info
  name: string
  description: string
  type: 'nextjs' | 'react' | 'node' | 'api' | 'fullstack'
  status: 'planning' | 'building' | 'testing' | 'deployed' | 'maintenance'
  
  // What exists in the project
  registry: ComponentRegistry
  
  // Decisions made
  decisions: Decision[]
  
  // Style and conventions
  styleGuide: StyleGuide
  
  // Progress tracking
  progress: ProgressTracker
  
  // Session summaries (compressed context)
  sessionSummaries: SessionSummary[]
  
  // What the AI should always remember
  criticalContext: string[]
  
  // User preferences for this project
  preferences: ProjectPreferences
}

export interface ComponentRegistry {
  // All components, pages, hooks, utils, etc.
  components: RegisteredItem[]
  pages: RegisteredItem[]
  hooks: RegisteredItem[]
  utils: RegisteredItem[]
  apiRoutes: RegisteredItem[]
  types: RegisteredItem[]
  
  // Dependency graph
  dependencies: DependencyNode[]
  
  // Last scan timestamp
  lastScanned: string
}

export interface RegisteredItem {
  name: string
  path: string
  type: string
  description: string
  exports: string[]
  imports: string[]
  props?: PropDefinition[]
  createdAt: string
  modifiedAt: string
  modifiedBy: 'user' | 'ai'
  version: number
  hash: string // Content hash to detect changes
}

export interface PropDefinition {
  name: string
  type: string
  required: boolean
  default?: string
  description?: string
}

export interface DependencyNode {
  path: string
  dependsOn: string[]
  dependedBy: string[]
}

export interface Decision {
  id: string
  timestamp: string
  category: 'architecture' | 'library' | 'pattern' | 'naming' | 'style' | 'feature' | 'other'
  question: string
  decision: string
  reasoning: string
  alternatives: string[]
  madeBy: 'user' | 'ai' | 'both'
  status: 'active' | 'superseded' | 'reverted'
  supersededBy?: string
}

export interface StyleGuide {
  // Naming conventions
  naming: {
    components: 'PascalCase' | 'camelCase'
    hooks: string // e.g., "use{Name}"
    utils: 'camelCase' | 'snake_case'
    constants: 'UPPER_SNAKE' | 'camelCase'
    files: 'kebab-case' | 'PascalCase' | 'camelCase'
    cssClasses: 'kebab-case' | 'camelCase' | 'BEM'
  }
  
  // Code patterns
  patterns: {
    stateManagement: 'useState' | 'zustand' | 'redux' | 'context'
    dataFetching: 'fetch' | 'swr' | 'tanstack-query' | 'trpc'
    styling: 'tailwind' | 'css-modules' | 'styled-components' | 'emotion'
    forms: 'react-hook-form' | 'formik' | 'native'
    testing: 'jest' | 'vitest' | 'playwright' | 'cypress'
  }
  
  // Preferences
  preferences: {
    semicolons: boolean
    singleQuotes: boolean
    tabWidth: number
    trailingCommas: 'none' | 'es5' | 'all'
    arrowFunctions: boolean
    asyncAwait: boolean
  }
  
  // Custom rules
  customRules: StyleRule[]
}

export interface StyleRule {
  name: string
  pattern: string
  replacement?: string
  message: string
  severity: 'error' | 'warning' | 'info'
}

export interface ProgressTracker {
  // Overall progress
  overallPercent: number
  
  // Milestones
  milestones: Milestone[]
  
  // Tasks
  tasks: Task[]
  
  // Timeline
  timeline: TimelineEvent[]
  
  // Metrics
  metrics: {
    filesCreated: number
    filesModified: number
    linesOfCode: number
    componentsBuilt: number
    testsWritten: number
    bugsFixed: number
    deploymentsCount: number
  }
}

export interface Milestone {
  id: string
  name: string
  description: string
  targetDate?: string
  completedDate?: string
  status: 'pending' | 'in-progress' | 'completed' | 'blocked'
  tasks: string[] // Task IDs
}

export interface Task {
  id: string
  title: string
  description: string
  status: 'todo' | 'in-progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignee?: string
  createdAt: string
  completedAt?: string
  relatedFiles: string[]
  blockedBy?: string[]
}

export interface TimelineEvent {
  timestamp: string
  type: 'created' | 'modified' | 'deleted' | 'deployed' | 'milestone' | 'decision' | 'error' | 'fix'
  description: string
  files?: string[]
  metadata?: Record<string, any>
}

export interface SessionSummary {
  sessionId: string
  startTime: string
  endTime: string
  
  // What was discussed/built
  summary: string
  
  // Key points to remember
  keyPoints: string[]
  
  // Files touched
  filesCreated: string[]
  filesModified: string[]
  filesDeleted: string[]
  
  // Decisions made
  decisions: string[] // Decision IDs
  
  // Tasks completed
  tasksCompleted: string[] // Task IDs
  
  // Unfinished business
  pendingItems: string[]
  
  // Token count (for context management)
  tokenCount: number
}

export interface ProjectPreferences {
  // AI behavior
  aiPersonality: 'concise' | 'detailed' | 'educational'
  codeComments: 'minimal' | 'moderate' | 'verbose'
  explanations: boolean
  askBeforeChanging: boolean
  
  // Generation preferences
  defaultFramework: string
  preferredLibraries: string[]
  avoidLibraries: string[]
  
  // Quality settings
  strictTypeChecking: boolean
  autoTesting: boolean
  autoFormatting: boolean
}

// =====================================================
// PROJECT MEMORY MANAGER
// =====================================================

export class ProjectMemoryManager {
  private memory: ProjectMemory
  private maxSessionSummaries: number = 50
  private maxTimelineEvents: number = 500
  
  constructor(memory: ProjectMemory) {
    this.memory = memory
  }
  
  // =====================================================
  // CONTEXT GENERATION
  // Generate context string for AI to "remember" everything
  // =====================================================
  
  generateContext(options: {
    includeRegistry?: boolean
    includeDecisions?: boolean
    includeStyle?: boolean
    includeProgress?: boolean
    maxTokens?: number
  } = {}): string {
    const {
      includeRegistry = true,
      includeDecisions = true,
      includeStyle = true,
      includeProgress = true,
      maxTokens = 4000
    } = options
    
    const sections: string[] = []
    
    // Critical context (always included)
    if (this.memory.criticalContext.length > 0) {
      sections.push(`<critical_context>
${this.memory.criticalContext.map(c => `- ${c}`).join('\n')}
</critical_context>`)
    }
    
    // Project overview
    sections.push(`<project_overview>
Name: ${this.memory.name}
Type: ${this.memory.type}
Status: ${this.memory.status}
Description: ${this.memory.description}
</project_overview>`)
    
    // Component registry
    if (includeRegistry && this.memory.registry.components.length > 0) {
      sections.push(this.generateRegistryContext())
    }
    
    // Active decisions
    if (includeDecisions) {
      const activeDecisions = this.memory.decisions.filter(d => d.status === 'active')
      if (activeDecisions.length > 0) {
        sections.push(`<active_decisions>
${activeDecisions.slice(-20).map(d => `- ${d.category}: ${d.decision} (${d.reasoning.slice(0, 100)}...)`).join('\n')}
</active_decisions>`)
      }
    }
    
    // Style guide
    if (includeStyle) {
      sections.push(`<style_guide>
Naming: components=${this.memory.styleGuide.naming.components}, hooks=${this.memory.styleGuide.naming.hooks}
Patterns: state=${this.memory.styleGuide.patterns.stateManagement}, styling=${this.memory.styleGuide.patterns.styling}
Preferences: semicolons=${this.memory.styleGuide.preferences.semicolons}, quotes=${this.memory.styleGuide.preferences.singleQuotes ? 'single' : 'double'}
</style_guide>`)
    }
    
    // Progress
    if (includeProgress) {
      const pending = this.memory.progress.tasks.filter(t => t.status !== 'done')
      if (pending.length > 0) {
        sections.push(`<pending_tasks>
${pending.slice(0, 10).map(t => `- [${t.priority}] ${t.title}`).join('\n')}
</pending_tasks>`)
      }
    }
    
    // Recent session summaries
    const recentSessions = this.memory.sessionSummaries.slice(-3)
    if (recentSessions.length > 0) {
      sections.push(`<recent_sessions>
${recentSessions.map(s => `Session ${s.sessionId}: ${s.summary}`).join('\n')}
</recent_sessions>`)
    }
    
    // Combine and truncate if needed
    let context = sections.join('\n\n')
    
    // Simple token estimation (4 chars ≈ 1 token)
    const estimatedTokens = Math.ceil(context.length / 4)
    if (estimatedTokens > maxTokens) {
      // Truncate from the middle, keeping start and end
      const maxChars = maxTokens * 4
      const halfMax = Math.floor(maxChars / 2)
      context = context.slice(0, halfMax) + '\n\n[...context truncated...]\n\n' + context.slice(-halfMax)
    }
    
    return context
  }
  
  private generateRegistryContext(): string {
    const registry = this.memory.registry
    const sections: string[] = []
    
    // Components summary
    if (registry.components.length > 0) {
      sections.push(`Components (${registry.components.length}):
${registry.components.slice(0, 20).map(c => `  - ${c.name} (${c.path}) - ${c.description.slice(0, 50)}`).join('\n')}`)
    }
    
    // Hooks summary
    if (registry.hooks.length > 0) {
      sections.push(`Hooks (${registry.hooks.length}):
${registry.hooks.map(h => `  - ${h.name} (${h.path})`).join('\n')}`)
    }
    
    // API routes
    if (registry.apiRoutes.length > 0) {
      sections.push(`API Routes (${registry.apiRoutes.length}):
${registry.apiRoutes.map(r => `  - ${r.path}`).join('\n')}`)
    }
    
    return `<component_registry>
${sections.join('\n')}
</component_registry>`
  }
  
  // =====================================================
  // REGISTRY MANAGEMENT
  // =====================================================
  
  scanAndRegister(files: { path: string; content: string }[]): void {
    for (const file of files) {
      this.registerFile(file.path, file.content)
    }
    this.memory.registry.lastScanned = new Date().toISOString()
    this.updateDependencyGraph()
  }
  
  registerFile(path: string, content: string): void {
    const item = this.parseFile(path, content)
    if (!item) return
    
    // Determine which registry to add to
    if (path.includes('/components/')) {
      this.addOrUpdate(this.memory.registry.components, item)
    } else if (path.includes('/hooks/') || item.name.startsWith('use')) {
      this.addOrUpdate(this.memory.registry.hooks, item)
    } else if (path.includes('/api/')) {
      this.addOrUpdate(this.memory.registry.apiRoutes, item)
    } else if (path.includes('/lib/') || path.includes('/utils/')) {
      this.addOrUpdate(this.memory.registry.utils, item)
    } else if (path.includes('/types/') || path.endsWith('.d.ts')) {
      this.addOrUpdate(this.memory.registry.types, item)
    } else if (path.includes('/app/') && path.endsWith('page.tsx')) {
      this.addOrUpdate(this.memory.registry.pages, item)
    }
  }
  
  private parseFile(path: string, content: string): RegisteredItem | null {
    const name = path.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '') || path
    
    // Extract exports
    const exports: string[] = []
    const exportDefault = content.match(/export\s+default\s+(?:function\s+)?(\w+)/)
    if (exportDefault) exports.push(exportDefault[1])
    
    const namedExports = content.matchAll(/export\s+(?:const|function|class|interface|type)\s+(\w+)/g)
    for (const match of namedExports) {
      exports.push(match[1])
    }
    
    // Extract imports
    const imports: string[] = []
    const importMatches = content.matchAll(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g)
    for (const match of importMatches) {
      imports.push(match[1])
    }
    
    // Extract props for components
    let props: PropDefinition[] | undefined
    if (path.endsWith('.tsx')) {
      props = this.extractProps(content)
    }
    
    // Generate description
    const description = this.generateDescription(name, content, exports)
    
    // Calculate hash
    const hash = this.simpleHash(content)
    
    return {
      name,
      path,
      type: this.inferType(path, content),
      description,
      exports,
      imports,
      props,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      modifiedBy: 'ai',
      version: 1,
      hash
    }
  }
  
  private extractProps(content: string): PropDefinition[] {
    const props: PropDefinition[] = []
    
    // Match interface/type Props
    const propsMatch = content.match(/(?:interface|type)\s+\w*Props\w*\s*(?:=\s*)?\{([^}]+)\}/)
    if (propsMatch) {
      const propsContent = propsMatch[1]
      const propMatches = propsContent.matchAll(/(\w+)(\?)?:\s*([^;,\n]+)/g)
      
      for (const match of propMatches) {
        props.push({
          name: match[1],
          type: match[3].trim(),
          required: !match[2]
        })
      }
    }
    
    return props
  }
  
  private generateDescription(name: string, content: string, exports: string[]): string {
    // Look for JSDoc or comments
    const jsdocMatch = content.match(/\/\*\*\s*\n\s*\*\s*([^\n]+)/)
    if (jsdocMatch) return jsdocMatch[1].trim()
    
    // Look for top-level comment
    const commentMatch = content.match(/^\/\/\s*(.+)$/m)
    if (commentMatch) return commentMatch[1].trim()
    
    // Generate from context
    if (exports.includes('default')) {
      return `Default export: ${name}`
    }
    
    return `Exports: ${exports.join(', ')}`
  }
  
  private inferType(path: string, content: string): string {
    if (path.includes('/api/')) return 'api-route'
    if (path.includes('/hooks/') || /^use[A-Z]/.test(path.split('/').pop() || '')) return 'hook'
    if (path.endsWith('.tsx') && /export\s+default\s+function/.test(content)) return 'component'
    if (path.endsWith('.tsx') && /export\s+default\s+async\s+function/.test(content)) return 'server-component'
    if (path.endsWith('page.tsx')) return 'page'
    if (path.endsWith('layout.tsx')) return 'layout'
    if (path.endsWith('.d.ts')) return 'type-declaration'
    if (path.includes('/types/')) return 'types'
    if (path.includes('/lib/') || path.includes('/utils/')) return 'utility'
    return 'module'
  }
  
  private addOrUpdate(registry: RegisteredItem[], item: RegisteredItem): void {
    const existing = registry.findIndex(r => r.path === item.path)
    if (existing >= 0) {
      const old = registry[existing]
      item.createdAt = old.createdAt
      item.version = old.hash !== item.hash ? old.version + 1 : old.version
      registry[existing] = item
    } else {
      registry.push(item)
    }
  }
  
  private updateDependencyGraph(): void {
    const allItems = [
      ...this.memory.registry.components,
      ...this.memory.registry.hooks,
      ...this.memory.registry.utils,
      ...this.memory.registry.apiRoutes,
      ...this.memory.registry.pages,
      ...this.memory.registry.types
    ]
    
    const nodes: DependencyNode[] = []
    
    for (const item of allItems) {
      const dependsOn: string[] = []
      
      for (const imp of item.imports) {
        // Find matching item
        const match = allItems.find(i => 
          i.path.includes(imp) || 
          imp.includes(i.name) ||
          imp.endsWith(i.name)
        )
        if (match) {
          dependsOn.push(match.path)
        }
      }
      
      nodes.push({
        path: item.path,
        dependsOn,
        dependedBy: [] // Will be filled in second pass
      })
    }
    
    // Second pass: fill in dependedBy
    for (const node of nodes) {
      for (const dep of node.dependsOn) {
        const depNode = nodes.find(n => n.path === dep)
        if (depNode && !depNode.dependedBy.includes(node.path)) {
          depNode.dependedBy.push(node.path)
        }
      }
    }
    
    this.memory.registry.dependencies = nodes
  }
  
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16)
  }
  
  // =====================================================
  // DECISION TRACKING
  // =====================================================
  
  recordDecision(decision: Omit<Decision, 'id' | 'timestamp' | 'status'>): string {
    const id = `dec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    
    this.memory.decisions.push({
      ...decision,
      id,
      timestamp: new Date().toISOString(),
      status: 'active'
    })
    
    // Add to timeline
    this.addTimelineEvent({
      type: 'decision',
      description: `Decision: ${decision.decision}`,
      metadata: { decisionId: id, category: decision.category }
    })
    
    return id
  }
  
  supersedeDecision(oldId: string, newDecision: Omit<Decision, 'id' | 'timestamp' | 'status'>): string {
    const old = this.memory.decisions.find(d => d.id === oldId)
    if (old) {
      old.status = 'superseded'
    }
    
    const newId = this.recordDecision(newDecision)
    if (old) {
      old.supersededBy = newId
    }
    
    return newId
  }
  
  getActiveDecisions(category?: Decision['category']): Decision[] {
    return this.memory.decisions.filter(d => 
      d.status === 'active' && 
      (!category || d.category === category)
    )
  }
  
  // =====================================================
  // SESSION MANAGEMENT
  // =====================================================
  
  startSession(): string {
    const sessionId = `sess_${Date.now()}`
    return sessionId
  }
  
  endSession(sessionId: string, summary: Omit<SessionSummary, 'sessionId'>): void {
    this.memory.sessionSummaries.push({
      sessionId,
      ...summary
    })
    
    // Trim old summaries if needed
    if (this.memory.sessionSummaries.length > this.maxSessionSummaries) {
      // Compress older summaries
      this.compressOldSummaries()
    }
    
    this.memory.updatedAt = new Date().toISOString()
  }
  
  private compressOldSummaries(): void {
    // Keep last 10 full summaries, compress the rest
    const toCompress = this.memory.sessionSummaries.slice(0, -10)
    const toKeep = this.memory.sessionSummaries.slice(-10)
    
    // Merge old summaries into fewer entries
    const compressed: SessionSummary[] = []
    for (let i = 0; i < toCompress.length; i += 5) {
      const batch = toCompress.slice(i, i + 5)
      const merged: SessionSummary = {
        sessionId: `compressed_${batch[0].sessionId}_${batch[batch.length - 1].sessionId}`,
        startTime: batch[0].startTime,
        endTime: batch[batch.length - 1].endTime,
        summary: batch.map(s => s.summary).join(' | '),
        keyPoints: batch.flatMap(s => s.keyPoints).slice(0, 10),
        filesCreated: [...new Set(batch.flatMap(s => s.filesCreated))],
        filesModified: [...new Set(batch.flatMap(s => s.filesModified))],
        filesDeleted: [...new Set(batch.flatMap(s => s.filesDeleted))],
        decisions: batch.flatMap(s => s.decisions),
        tasksCompleted: batch.flatMap(s => s.tasksCompleted),
        pendingItems: batch[batch.length - 1].pendingItems,
        tokenCount: batch.reduce((sum, s) => sum + s.tokenCount, 0)
      }
      compressed.push(merged)
    }
    
    this.memory.sessionSummaries = [...compressed, ...toKeep]
  }
  
  // =====================================================
  // PROGRESS TRACKING
  // =====================================================
  
  addTask(task: Omit<Task, 'id' | 'createdAt'>): string {
    const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    
    this.memory.progress.tasks.push({
      ...task,
      id,
      createdAt: new Date().toISOString()
    })
    
    return id
  }
  
  updateTask(taskId: string, updates: Partial<Task>): void {
    const task = this.memory.progress.tasks.find(t => t.id === taskId)
    if (task) {
      Object.assign(task, updates)
      
      if (updates.status === 'done' && !task.completedAt) {
        task.completedAt = new Date().toISOString()
        this.memory.progress.metrics.bugsFixed++
        
        this.addTimelineEvent({
          type: 'milestone',
          description: `Task completed: ${task.title}`,
          files: task.relatedFiles
        })
      }
    }
    
    this.recalculateProgress()
  }
  
  private recalculateProgress(): void {
    const tasks = this.memory.progress.tasks
    const completed = tasks.filter(t => t.status === 'done').length
    this.memory.progress.overallPercent = tasks.length > 0 
      ? Math.round((completed / tasks.length) * 100)
      : 0
  }
  
  // =====================================================
  // TIMELINE
  // =====================================================
  
  addTimelineEvent(event: Omit<TimelineEvent, 'timestamp'>): void {
    this.memory.progress.timeline.push({
      ...event,
      timestamp: new Date().toISOString()
    })
    
    // Trim old events
    if (this.memory.progress.timeline.length > this.maxTimelineEvents) {
      this.memory.progress.timeline = this.memory.progress.timeline.slice(-this.maxTimelineEvents)
    }
  }
  
  // =====================================================
  // CRITICAL CONTEXT
  // =====================================================
  
  addCriticalContext(context: string): void {
    if (!this.memory.criticalContext.includes(context)) {
      this.memory.criticalContext.push(context)
    }
  }
  
  removeCriticalContext(context: string): void {
    const index = this.memory.criticalContext.indexOf(context)
    if (index >= 0) {
      this.memory.criticalContext.splice(index, 1)
    }
  }
  
  // =====================================================
  // EXPORT/IMPORT
  // =====================================================
  
  export(): ProjectMemory {
    return JSON.parse(JSON.stringify(this.memory))
  }
  
  static import(data: ProjectMemory): ProjectMemoryManager {
    return new ProjectMemoryManager(data)
  }
  
  static createNew(projectId: string, userId: string, name: string): ProjectMemoryManager {
    const memory: ProjectMemory = {
      id: `mem_${Date.now()}`,
      projectId,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      name,
      description: '',
      type: 'nextjs',
      status: 'planning',
      registry: {
        components: [],
        pages: [],
        hooks: [],
        utils: [],
        apiRoutes: [],
        types: [],
        dependencies: [],
        lastScanned: ''
      },
      decisions: [],
      styleGuide: {
        naming: {
          components: 'PascalCase',
          hooks: 'use{Name}',
          utils: 'camelCase',
          constants: 'UPPER_SNAKE',
          files: 'kebab-case',
          cssClasses: 'kebab-case'
        },
        patterns: {
          stateManagement: 'useState',
          dataFetching: 'fetch',
          styling: 'tailwind',
          forms: 'react-hook-form',
          testing: 'vitest'
        },
        preferences: {
          semicolons: false,
          singleQuotes: true,
          tabWidth: 2,
          trailingCommas: 'es5',
          arrowFunctions: true,
          asyncAwait: true
        },
        customRules: []
      },
      progress: {
        overallPercent: 0,
        milestones: [],
        tasks: [],
        timeline: [],
        metrics: {
          filesCreated: 0,
          filesModified: 0,
          linesOfCode: 0,
          componentsBuilt: 0,
          testsWritten: 0,
          bugsFixed: 0,
          deploymentsCount: 0
        }
      },
      sessionSummaries: [],
      criticalContext: [],
      preferences: {
        aiPersonality: 'detailed',
        codeComments: 'moderate',
        explanations: true,
        askBeforeChanging: true,
        defaultFramework: 'nextjs',
        preferredLibraries: [],
        avoidLibraries: [],
        strictTypeChecking: true,
        autoTesting: false,
        autoFormatting: true
      }
    }
    
    return new ProjectMemoryManager(memory)
  }
}

export default ProjectMemoryManager
