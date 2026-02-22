// Database Types
export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  preferred_model: string
  claude_api_key: string | null
  openai_api_key: string | null
  role: 'owner' | 'admin' | 'developer' | 'viewer' | 'user'
  team_id: string | null
  skill_level: string | null
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  plan: 'free' | 'pro' | 'enterprise'
  status: 'active' | 'canceled' | 'past_due'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  current_period_end: string | null
  created_at: string
}

export interface Project {
  id: string
  user_id?: string
  name: string
  description?: string
  type: 'landing' | 'api' | 'dashboard' | 'app' | 'nextjs' | 'react' | 'node'
  status: 'draft' | 'building' | 'completed' | 'deployed' | 'active' | 'archived'
  github_repo?: string | null
  deploy_url?: string | null
  created_at?: string
  createdAt?: string
  updated_at?: string
}

export interface Chat {
  id: string
  user_id?: string
  project_id?: string
  projectId?: string
  title: string
  messages: Message[]
  created_at?: string
  createdAt?: string
  updated_at?: string
  updatedAt?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  files?: GeneratedFile[]
  tokens?: { input: number; output: number }
  model?: string
}

export interface GeneratedFile {
  path: string
  content: string
  language: string
  status: 'pending' | 'validated' | 'error'
  errors?: string[]
}

export interface Build {
  id: string
  project_id: string
  user_id: string
  prompt: string | null
  status: 'queued' | 'running' | 'completed' | 'failed'
  error: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface FileRecord {
  id: string
  project_id: string
  user_id: string
  name: string
  path: string
  content: string | null
  storage_url: string | null
  type: 'generated' | 'attachment'
  mime_type: string | null
  size: number | null
  created_at: string
}

export interface UrlImport {
  id: string
  project_id: string
  user_id: string
  url: string
  title: string | null
  description: string | null
  created_at: string
}

// Plan limits
export const PLAN_LIMITS = {
  free: { concurrent: 3, daily: 10, generations_per_day: 10, premium_per_day: 0 },
  starter: { concurrent: 5, daily: 50, generations_per_day: 50, premium_per_day: 5 },
  pro: { concurrent: 10, daily: 200, generations_per_day: 200, premium_per_day: 25 },
  max: { concurrent: 15, daily: 1000, generations_per_day: 1000, premium_per_day: 100 },
  enterprise: { concurrent: 20, daily: 999999, generations_per_day: 999999, premium_per_day: 500 }
} as const

// AI Models
export const AI_MODELS = [
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'claude' },
  { id: 'claude-opus-4', name: 'Claude Opus 4', provider: 'claude' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
  { id: 'o1', name: 'o1', provider: 'openai' }
] as const

export type AIModel = typeof AI_MODELS[number]['id']
export type AIProvider = 'claude' | 'openai'
export type PlanType = keyof typeof PLAN_LIMITS
