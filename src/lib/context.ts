import { supabase } from './supabase'

// Types for project memory
export interface ProjectContext {
  project: {
    id: string
    name: string
    type: string
    description?: string
    techStack: TechStack
    createdAt: string
  }
  files: FileContext[]
  conversations: ConversationSummary[]
  buildHistory: BuildSummary[]
  knownIssues: string[]
  lastActivity: string
}

export interface TechStack {
  framework: string | null
  language: string
  styling: string | null
  database: string | null
  dependencies: string[]
}

export interface FileContext {
  path: string
  type: 'component' | 'page' | 'api' | 'config' | 'style' | 'util' | 'other'
  summary: string
  lastModified: string
}

export interface ConversationSummary {
  id: string
  summary: string
  keyDecisions: string[]
  timestamp: string
}

export interface BuildSummary {
  id: string
  prompt: string
  filesChanged: string[]
  status: string
  timestamp: string
}

// Detect tech stack from files
export function detectTechStack(files: Array<{ path: string; content: string }>): TechStack {
  const stack: TechStack = {
    framework: null,
    language: 'javascript',
    styling: null,
    database: null,
    dependencies: []
  }

  const packageJson = files.find((f: any) => f.path === 'package.json' || f.path === '/package.json')
  
  if (packageJson) {
    try {
      const pkg = JSON.parse(packageJson.content)
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
      
      // Framework detection
      if (allDeps['next']) stack.framework = 'Next.js'
      else if (allDeps['nuxt']) stack.framework = 'Nuxt.js'
      else if (allDeps['gatsby']) stack.framework = 'Gatsby'
      else if (allDeps['@sveltejs/kit']) stack.framework = 'SvelteKit'
      else if (allDeps['svelte']) stack.framework = 'Svelte'
      else if (allDeps['vue']) stack.framework = 'Vue.js'
      else if (allDeps['@angular/core']) stack.framework = 'Angular'
      else if (allDeps['react']) stack.framework = 'React'
      else if (allDeps['express']) stack.framework = 'Express'
      else if (allDeps['fastify']) stack.framework = 'Fastify'
      
      // Language detection
      if (allDeps['typescript'] || files.some(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx'))) {
        stack.language = 'typescript'
      }
      
      // Styling detection
      if (allDeps['tailwindcss']) stack.styling = 'Tailwind CSS'
      else if (allDeps['styled-components']) stack.styling = 'Styled Components'
      else if (allDeps['@emotion/react']) stack.styling = 'Emotion'
      else if (allDeps['sass']) stack.styling = 'Sass'
      else if (files.some(f => f.path.endsWith('.css'))) stack.styling = 'CSS'
      
      // Database detection
      if (allDeps['@supabase/supabase-js']) stack.database = 'Supabase'
      else if (allDeps['@prisma/client']) stack.database = 'Prisma'
      else if (allDeps['mongoose']) stack.database = 'MongoDB'
      else if (allDeps['pg']) stack.database = 'PostgreSQL'
      else if (allDeps['mysql2']) stack.database = 'MySQL'
      else if (allDeps['firebase']) stack.database = 'Firebase'
      
      // Key dependencies
      stack.dependencies = Object.keys(allDeps).filter(dep => 
        !dep.startsWith('@types/') && 
        !['typescript', 'eslint', 'prettier'].includes(dep)
      ).slice(0, 20)
    } catch (e) {
      // Invalid JSON
    }
  }
  
  return stack
}

// Categorize file by path and content
export function categorizeFile(path: string, content: string): FileContext['type'] {
  const lowerPath = path.toLowerCase()
  
  if (lowerPath.includes('/api/') || lowerPath.includes('/routes/')) return 'api'
  if (lowerPath.includes('/pages/') || lowerPath.includes('/app/') && lowerPath.endsWith('page.tsx')) return 'page'
  if (lowerPath.includes('/components/')) return 'component'
  if (lowerPath.includes('/styles/') || lowerPath.endsWith('.css') || lowerPath.endsWith('.scss')) return 'style'
  if (lowerPath.includes('/utils/') || lowerPath.includes('/lib/') || lowerPath.includes('/helpers/')) return 'util'
  if (lowerPath.includes('config') || lowerPath.includes('.json') || lowerPath.includes('.env')) return 'config'
  
  return 'other'
}

// Generate brief summary of file
export function summarizeFile(path: string, content: string): string {
  const lines = content.split('\n').filter(l => l.trim())
  
  // For React/Vue components
  if (path.endsWith('.tsx') || path.endsWith('.jsx') || path.endsWith('.vue')) {
    const exports = content.match(/export\s+(default\s+)?(?:function|const|class)\s+(\w+)/g)
    if (exports) {
      return `Exports: ${exports.map(e => e.split(/\s+/).pop()).join(', ')}`
    }
  }
  
  // For API routes
  if (path.includes('/api/')) {
    const methods = []
    if (content.includes('GET')) methods.push('GET')
    if (content.includes('POST')) methods.push('POST')
    if (content.includes('PUT') || content.includes('PATCH')) methods.push('PUT')
    if (content.includes('DELETE')) methods.push('DELETE')
    if (methods.length) return `API: ${methods.join(', ')}`
  }
  
  // For config files
  if (path.endsWith('.json')) {
    try {
      const obj = JSON.parse(content)
      return `Keys: ${Object.keys(obj).slice(0, 5).join(', ')}${Object.keys(obj).length > 5 ? '...' : ''}`
    } catch (e) {
      // JSON parse failed — fall through to line count
    }
  }
  
  return `${lines.length} lines`
}

// Load full project context
export async function loadProjectContext(projectId: string): Promise<ProjectContext | null> {
  // Get project info
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()
  
  if (projectError || !project) return null
  
  // Get files
  const { data: files } = await supabase
    .from('files')
    .select('path, content, updated_at')
    .eq('project_id', projectId)
    .eq('type', 'generated')
  
  const filesList = files || []
  const techStack = detectTechStack(filesList)
  
  // Get conversation history
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, summary, key_decisions, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(10)
  
  // Get build history
  const { data: builds } = await supabase
    .from('builds')
    .select('id, prompt, status, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(10)
  
  // Get known issues
  const { data: issues } = await supabase
    .from('project_issues')
    .select('description')
    .eq('project_id', projectId)
    .eq('resolved', false)
  
  return {
    project: {
      id: project.id,
      name: project.name,
      type: project.type,
      description: project.description,
      techStack,
      createdAt: project.created_at
    },
    files: filesList.map((f: any) => ({
      path: f.path,
      type: categorizeFile(f.path, f.content),
      summary: summarizeFile(f.path, f.content),
      lastModified: f.updated_at
    })),
    conversations: (conversations || []).map((c: any) => ({
      id: c.id,
      summary: c.summary,
      keyDecisions: c.key_decisions || [],
      timestamp: c.created_at
    })),
    buildHistory: (builds || []).map((b: any) => ({
      id: b.id,
      prompt: b.prompt.slice(0, 100) + (b.prompt.length > 100 ? '...' : ''),
      filesChanged: [], // Would need to track this
      status: b.status,
      timestamp: b.created_at
    })),
    knownIssues: (issues || []).map((i: any) => i.description),
    lastActivity: project.updated_at
  }
}

// Generate context prompt for AI
export function generateContextPrompt(context: ProjectContext): string {
  const { project, files, conversations, buildHistory, knownIssues } = context
  
  let prompt = `## Project Context: ${project.name}\n\n`
  
  // Tech stack
  prompt += `### Tech Stack\n`
  prompt += `- Framework: ${project.techStack.framework || 'None'}\n`
  prompt += `- Language: ${project.techStack.language}\n`
  prompt += `- Styling: ${project.techStack.styling || 'None'}\n`
  prompt += `- Database: ${project.techStack.database || 'None'}\n`
  if (project.techStack.dependencies.length > 0) {
    prompt += `- Key Dependencies: ${project.techStack.dependencies.slice(0, 10).join(', ')}\n`
  }
  prompt += '\n'
  
  // File structure
  prompt += `### Project Files (${files.length} total)\n`
  const filesByType = files.reduce((acc, f) => {
    acc[f.type] = acc[f.type] || []
    acc[f.type].push(f)
    return acc
  }, {} as Record<string, FileContext[]>)
  
  Object.entries(filesByType).forEach(([type, typeFiles]) => {
    prompt += `\n**${type.charAt(0).toUpperCase() + type.slice(1)}s:**\n`
    typeFiles.slice(0, 10).forEach(f => {
      prompt += `- \`${f.path}\` - ${f.summary}\n`
    })
    if (typeFiles.length > 10) {
      prompt += `- ...and ${typeFiles.length - 10} more\n`
    }
  })
  prompt += '\n'
  
  // Recent conversations
  if (conversations.length > 0) {
    prompt += `### Recent Conversations\n`
    conversations.slice(0, 5).forEach(c => {
      prompt += `- ${c.summary}\n`
      if (c.keyDecisions.length > 0) {
        prompt += `  Decisions: ${c.keyDecisions.join('; ')}\n`
      }
    })
    prompt += '\n'
  }
  
  // Known issues
  if (knownIssues.length > 0) {
    prompt += `### Known Issues\n`
    knownIssues.forEach(issue => {
      prompt += `-  ${issue}\n`
    })
    prompt += '\n'
  }
  
  return prompt
}

// Save conversation summary
export async function saveConversationSummary(
  projectId: string,
  userId: string,
  messages: Array<{ role: string; content: string }>,
  summary?: string
) {
  // Auto-generate summary if not provided
  if (!summary) {
    const userMessages = messages.filter(m => m.role === 'user').map(m => m.content)
    summary = userMessages.slice(-3).join(' → ').slice(0, 200)
  }
  
  // Extract key decisions (look for patterns)
  const keyDecisions: string[] = []
  messages.forEach(m => {
    if (m.role === 'assistant') {
      const decisions = m.content.match(/(?:I'll|I will|Let's|We should|I've decided to)\s+([^.!?\n]+)/gi)
      if (decisions) {
        keyDecisions.push(...decisions.map(d => d.slice(0, 100)))
      }
    }
  })
  
  await supabase.from('conversations').insert({
    project_id: projectId,
    user_id: userId,
    summary,
    key_decisions: keyDecisions.slice(0, 5),
    message_count: messages.length
  })
}

// Track project issue
export async function trackIssue(
  projectId: string,
  description: string,
  source: 'user' | 'ai' | 'runtime'
) {
  await supabase.from('project_issues').insert({
    project_id: projectId,
    description,
    source,
    resolved: false
  })
}

// Resolve issue
export async function resolveIssue(issueId: string) {
  await supabase
    .from('project_issues')
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq('id', issueId)
}
