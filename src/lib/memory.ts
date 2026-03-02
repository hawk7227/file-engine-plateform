// =====================================================
// FILE ENGINE - PERSISTENT MEMORY
// Remember user preferences, coding style, past projects
// Cross-conversation knowledge that improves over time
// =====================================================

import { supabase } from './supabase'

// =====================================================
// TYPES
// =====================================================

export interface UserMemory {
  id: string
  userId: string
  type: 'preference' | 'style' | 'project' | 'skill' | 'context' | 'correction'
  category: string
  key: string
  value: any
  confidence: number // 0-1, how confident we are this is accurate
  lastUsed: string
  usageCount: number
  createdAt: string
  updatedAt: string
}

export interface CodingStyle {
  indentation: 'spaces' | 'tabs'
  indentSize: number
  semicolons: boolean
  quotes: 'single' | 'double'
  trailingComma: boolean
  bracketSpacing: boolean
  arrowParens: 'always' | 'avoid'
  preferredFramework: string
  preferredStyling: 'tailwind' | 'css' | 'styled-components' | 'scss'
  componentStyle: 'functional' | 'class'
  stateManagement: string
  testingFramework: string
  namingConvention: 'camelCase' | 'PascalCase' | 'snake_case' | 'kebab-case'
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  defaultModel: string
  autoFix: boolean
  autoValidate: boolean
  streamResponses: boolean
  showActivityFeed: boolean
  defaultFramework: string
  defaultStyling: string
  codeCommenting: 'minimal' | 'moderate' | 'verbose'
  errorVerbosity: 'minimal' | 'detailed'
}

export interface ProjectMemory {
  projectId: string
  name: string
  type: string
  framework: string
  styling: string
  keyFiles: string[]
  commonPatterns: string[]
  knownIssues: string[]
  lastAccessed: string
}

export interface ConversationContext {
  conversationId: string
  summary: string
  topics: string[]
  decisions: { topic: string; decision: string }[]
  codeGenerated: { file: string; description: string }[]
  timestamp: string
}

// =====================================================
// MEMORY MANAGER CLASS
// =====================================================

export class MemoryManager {
  private userId: string
  private cache: Map<string, UserMemory> = new Map()
  private loaded: boolean = false

  constructor(userId: string) {
    this.userId = userId
  }

  // Load all memories for user
  async load(): Promise<void> {
    if (this.loaded) return

    try {
      const { data, error } = await supabase
        .from('user_memories')
        .select('*')
        .eq('user_id', this.userId)

      if (error) throw error

      for (const memory of data || []) {
        const key = `${memory.type}:${memory.category}:${memory.key}`
        this.cache.set(key, {
          id: memory.id,
          userId: memory.user_id,
          type: memory.type,
          category: memory.category,
          key: memory.key,
          value: memory.value,
          confidence: memory.confidence,
          lastUsed: memory.last_used,
          usageCount: memory.usage_count,
          createdAt: memory.created_at,
          updatedAt: memory.updated_at
        })
      }

      this.loaded = true
      console.log(`[Memory] Loaded ${this.cache.size} memories for user`)
    } catch (err) {
      console.error('[Memory] Failed to load memories:', err)
    }
  }

  // Get a specific memory
  async get(type: string, category: string, key: string): Promise<any | null> {
    await this.load()
    const cacheKey = `${type}:${category}:${key}`
    const memory = this.cache.get(cacheKey)

    if (memory) {
      // Update usage stats
      this.updateUsage(memory.id)
      return memory.value
    }

    return null
  }

  // Set a memory
  async set(
    type: UserMemory['type'],
    category: string,
    key: string,
    value: any,
    confidence: number = 0.8
  ): Promise<void> {
    await this.load()
    const cacheKey = `${type}:${category}:${key}`
    const existing = this.cache.get(cacheKey)

    try {
      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('user_memories')
          .update({
            value,
            confidence: Math.min(1, existing.confidence + 0.1), // Increase confidence with updates
            last_used: new Date().toISOString(),
            usage_count: existing.usageCount + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (error) throw error

        existing.value = value
        existing.confidence = Math.min(1, existing.confidence + 0.1)
        existing.usageCount++
        existing.lastUsed = new Date().toISOString()
      } else {
        // Create new
        const { data, error } = await supabase
          .from('user_memories')
          .insert({
            user_id: this.userId,
            type,
            category,
            key,
            value,
            confidence,
            last_used: new Date().toISOString(),
            usage_count: 1
          })
          .select()
          .single()

        if (error) throw error

        this.cache.set(cacheKey, {
          id: data.id,
          userId: this.userId,
          type,
          category,
          key,
          value,
          confidence,
          lastUsed: new Date().toISOString(),
          usageCount: 1,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        })
      }
    } catch (err) {
      console.error('[Memory] Failed to save memory:', err)
    }
  }

  // Delete a memory
  async delete(type: string, category: string, key: string): Promise<void> {
    const cacheKey = `${type}:${category}:${key}`
    const memory = this.cache.get(cacheKey)

    if (memory) {
      try {
        await supabase
          .from('user_memories')
          .delete()
          .eq('id', memory.id)

        this.cache.delete(cacheKey)
      } catch (err) {
        console.error('[Memory] Failed to delete memory:', err)
      }
    }
  }

  // Update usage stats (fire and forget)
  private async updateUsage(memoryId: string): Promise<void> {
    try {
      await supabase
        .from('user_memories')
        .update({
          last_used: new Date().toISOString()
        })
        .eq('id', memoryId)
    } catch (err: unknown) {
      console.error('[Memory] Failed to update usage:', err)
    }
  }

  // Get all memories of a type
  async getByType(type: UserMemory['type']): Promise<UserMemory[]> {
    await this.load()
    return Array.from(this.cache.values()).filter(m => m.type === type)
  }

  // Get all memories for a category
  async getByCategory(type: UserMemory['type'], category: string): Promise<UserMemory[]> {
    await this.load()
    return Array.from(this.cache.values())
      .filter(m => m.type === type && m.category === category)
  }

  // Search memories
  async search(query: string): Promise<UserMemory[]> {
    await this.load()
    const lowerQuery = query.toLowerCase()
    return Array.from(this.cache.values())
      .filter(m =>
        m.key.toLowerCase().includes(lowerQuery) ||
        JSON.stringify(m.value).toLowerCase().includes(lowerQuery)
      )
      .sort((a, b) => b.confidence - a.confidence)
  }
}

// =====================================================
// CONVENIENCE FUNCTIONS
// =====================================================

// Get user's coding style
export async function getUserCodingStyle(userId: string): Promise<CodingStyle> {
  const memory = new MemoryManager(userId)
  const style = await memory.get('style', 'coding', 'default')

  return style || {
    indentation: 'spaces',
    indentSize: 2,
    semicolons: false,
    quotes: 'single',
    trailingComma: true,
    bracketSpacing: true,
    arrowParens: 'avoid',
    preferredFramework: 'react',
    preferredStyling: 'tailwind',
    componentStyle: 'functional',
    stateManagement: 'hooks',
    testingFramework: 'jest',
    namingConvention: 'camelCase'
  }
}

// Update user's coding style
export async function updateUserCodingStyle(
  userId: string,
  style: Partial<CodingStyle>
): Promise<void> {
  const memory = new MemoryManager(userId)
  const current = await getUserCodingStyle(userId)
  await memory.set('style', 'coding', 'default', { ...current, ...style })
}

// Get user preferences
export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const memory = new MemoryManager(userId)
  const prefs = await memory.get('preference', 'app', 'default')

  return prefs || {
    theme: 'dark',
    defaultModel: 'auto',
    autoFix: true,
    autoValidate: true,
    streamResponses: true,
    showActivityFeed: true,
    defaultFramework: 'react',
    defaultStyling: 'tailwind',
    codeCommenting: 'moderate',
    errorVerbosity: 'detailed'
  }
}

// Update user preferences
export async function updateUserPreferences(
  userId: string,
  prefs: Partial<UserPreferences>
): Promise<void> {
  const memory = new MemoryManager(userId)
  const current = await getUserPreferences(userId)
  await memory.set('preference', 'app', 'default', { ...current, ...prefs })
}

// Remember a project
export async function rememberProject(
  userId: string,
  project: ProjectMemory
): Promise<void> {
  const memory = new MemoryManager(userId)
  await memory.set('project', 'history', project.projectId, project)
}

// Get project memories
export async function getProjectMemories(userId: string): Promise<ProjectMemory[]> {
  const memory = new MemoryManager(userId)
  const projects = await memory.getByCategory('project', 'history')
  return projects.map(p => p.value as ProjectMemory)
}

// Remember a conversation context
export async function rememberConversation(
  userId: string,
  context: ConversationContext
): Promise<void> {
  const memory = new MemoryManager(userId)
  await memory.set('context', 'conversation', context.conversationId, context)
}

// Search conversation history
export async function searchConversations(
  userId: string,
  query: string
): Promise<ConversationContext[]> {
  const memory = new MemoryManager(userId)
  const results = await memory.search(query)
  return results
    .filter(r => r.type === 'context' && r.category === 'conversation')
    .map(r => r.value as ConversationContext)
}

// Learn from user correction
export async function learnFromCorrection(
  userId: string,
  correction: {
    original: string
    corrected: string
    context: string
  }
): Promise<void> {
  const memory = new MemoryManager(userId)
  const key = `correction_${Date.now()}`
  await memory.set('correction', 'user_feedback', key, correction, 1.0)
}

// Get relevant memories for context
export async function getRelevantMemories(
  userId: string,
  context: {
    prompt?: string
    framework?: string
    projectId?: string
  }
): Promise<{
  codingStyle: CodingStyle
  preferences: UserPreferences
  recentProjects: ProjectMemory[]
  relevantCorrections: any[]
}> {
  const memory = new MemoryManager(userId)
  await memory.load()

  const [codingStyle, preferences, projectMemories, corrections] = await Promise.all([
    getUserCodingStyle(userId),
    getUserPreferences(userId),
    getProjectMemories(userId),
    memory.getByType('correction')
  ])

  // Get 5 most recent projects
  const recentProjects = projectMemories
    .sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime())
    .slice(0, 5)

  // Get relevant corrections (last 10)
  const relevantCorrections = corrections
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)
    .map(c => c.value)

  return {
    codingStyle,
    preferences,
    recentProjects,
    relevantCorrections
  }
}

// =====================================================
// EXPORTS
// =====================================================


