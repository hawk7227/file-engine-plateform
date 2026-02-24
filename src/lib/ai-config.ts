// =====================================================
// FILE ENGINE - AI CONFIGURATION
// White-labeled AI system - NO external branding visible
// Users interact with "File Engine AI" not Claude/OpenAI
// =====================================================

import { BRAND_NAME, BRAND_AI_NAME, getBrandIdentityPrompt, getBrandModelNames, sanitizeBrandOutput } from '@/lib/brand'

// =====================================================
// TYPES
// =====================================================

export interface AIConfig {
  provider: 'anthropic' | 'openai' | 'auto'
  model: string
  apiKey: string | null
  maxTokens: number
  temperature: number
  systemPrompt: string
}

export interface AIProvider {
  name: string // Internal name (anthropic/openai)
  displayName: string // Always "File Engine AI" for users
  models: AIModel[]
  defaultModel: string
}

export interface AIModel {
  id: string // Internal ID (claude-3-opus, gpt-4, etc.)
  displayName: string // User-facing name ("Advanced", "Fast", "Balanced")
  description: string
  maxTokens: number
  contextWindow: number
  capabilities: string[]
  speed: 'fast' | 'balanced' | 'thorough'
  quality: 'standard' | 'high' | 'premium'
}

// =====================================================
// WHITE-LABELED MODEL NAMES
// Users never see "Claude" or "GPT" - only File Engine branding
// =====================================================

const MODEL_DISPLAY_NAMES: Record<string, string> = getBrandModelNames()

const MODEL_DESCRIPTIONS: Record<string, string> = {
  'claude-sonnet-4-20250514': 'Best balance of speed and quality for most tasks',
  'claude-opus-4-0-20250115': 'Highest quality output for complex projects',
  'claude-haiku-4-5-20251001': 'Fastest responses for quick iterations',
  'gpt-4o': 'Best balance of speed and quality for most tasks',
  'gpt-4o-mini': 'Fastest responses for quick iterations',
  'gpt-4-turbo': 'Great for everyday coding tasks',
  'o1': 'Highest quality output for complex projects',
  'auto': 'Automatically selects the best model for your task'
}

// =====================================================
// USER-FACING MODEL OPTIONS
// These are what users see in the UI
// =====================================================

export const USER_MODEL_OPTIONS = [
  {
    id: 'auto',
    name: `${BRAND_NAME} Auto`,
    description: 'Automatically selects the best model for your task',
    icon: '✨',
    recommended: true
  },
  {
    id: 'fast',
    name: `${BRAND_NAME} Fast`,
    description: 'Quick responses for rapid iteration',
    icon: '⚡',
    recommended: false
  },
  {
    id: 'pro',
    name: `${BRAND_NAME} Pro`,
    description: 'Best balance of speed and quality',
    icon: '🚀',
    recommended: false
  },
  {
    id: 'premium',
    name: `${BRAND_NAME} Premium`,
    description: 'Highest quality for complex projects',
    icon: '💎',
    recommended: false
  }
]

// Map user-facing IDs to actual model IDs (current versions)
const USER_TO_ACTUAL_MODEL: Record<string, { anthropic: string; openai: string }> = {
  'auto': { anthropic: 'claude-sonnet-4-20250514', openai: 'gpt-4o' },
  'fast': { anthropic: 'claude-haiku-4-5-20251001', openai: 'ft:gpt-4o-2024-08-06:az-deal-hub:chat2:DCi22IDX' },
  'pro': { anthropic: 'claude-sonnet-4-20250514', openai: 'gpt-4o' },
  'premium': { anthropic: 'claude-opus-4-0-20250115', openai: 'o1' }
}

// =====================================================
// SYSTEM PROMPTS
// White-labeled - AI identifies as "File Engine"
// =====================================================

export const FILE_ENGINE_SYSTEM_PROMPT = `You are ${BRAND_AI_NAME}, an advanced AI code generation assistant. You help developers create, fix, and improve code.

${getBrandIdentityPrompt()}


YOUR CAPABILITIES:
- Generate complete, production-ready code
- Fix errors and bugs in code
- Refactor and improve existing code
- Explain code and concepts
- Search for documentation and packages
- Analyze images/mockups and generate matching code
- Remember user preferences and coding style

CODE GENERATION RULES:
- Always generate complete, working code
- Use modern best practices
- Include proper error handling
- Add helpful comments
- Follow the user's preferred coding style
- Use TypeScript by default unless specified otherwise
- Use Tailwind CSS for styling unless specified otherwise

RESPONSE FORMAT:
- Be concise but thorough
- Show code in properly formatted code blocks
- Explain important decisions
- Offer suggestions for improvements`

export const FILE_ENGINE_VISION_PROMPT = `You are ${BRAND_AI_NAME}'s vision system. Analyze UI mockups and screenshots to generate accurate code.

RULES:
- Generate pixel-perfect recreations when possible
- Use appropriate CSS frameworks (prefer Tailwind)
- Extract colors, fonts, and spacing accurately
- Identify all UI components
- Generate responsive code by default
- Include all visible text and content`

export const FILE_ENGINE_FIX_PROMPT = `You are ${BRAND_AI_NAME}'s error fixing system. Analyze errors and generate fixes.

RULES:
- Identify the root cause of errors
- Generate minimal, targeted fixes
- Preserve existing functionality
- Add error handling where appropriate
- Explain what was wrong and how you fixed it
- If multiple issues exist, fix all of them`

// =====================================================
// CONFIGURATION
// =====================================================

let currentConfig: AIConfig = {
  provider: 'auto',
  model: 'auto',
  apiKey: null,
  maxTokens: 4096,
  temperature: 0.7,
  systemPrompt: FILE_ENGINE_SYSTEM_PROMPT
}

export function getAIConfig(): AIConfig {
  return { ...currentConfig }
}

export function setAIConfig(config: Partial<AIConfig>): void {
  currentConfig = { ...currentConfig, ...config }
}

// Get the actual model ID from user-facing ID
export function getActualModelId(userModelId: string, provider?: 'anthropic' | 'openai'): string {
  const mapping = USER_TO_ACTUAL_MODEL[userModelId]
  if (mapping) {
    const selectedProvider = provider || currentConfig.provider
    if (selectedProvider === 'auto' || selectedProvider === 'anthropic') {
      return mapping.anthropic
    }
    return mapping.openai
  }
  
  // Safety net: catch legacy/invalid model IDs stored in user profiles
  // e.g. "file-engine-premium-20240229" from old code versions
  const lower = userModelId.toLowerCase()
  if (lower.includes('premium') || lower.includes('opus')) return getActualModelId('premium', provider)
  if (lower.includes('pro') || lower.includes('sonnet')) return getActualModelId('pro', provider)
  if (lower.includes('fast') || lower.includes('haiku') || lower.includes('mini')) return getActualModelId('fast', provider)
  
  // If it looks like a real API model ID (contains provider prefix), pass through
  if (lower.startsWith('claude-') || lower.startsWith('gpt-') || lower.startsWith('o1') || lower.startsWith('o3')) {
    return userModelId
  }
  
  // Unknown model — default to auto/pro tier
  return getActualModelId('auto', provider)
}

// Get user-friendly display name for a model
export function getModelDisplayName(modelId: string): string {
  return MODEL_DISPLAY_NAMES[modelId] || BRAND_NAME
}

// Get model description
export function getModelDescription(modelId: string): string {
  return MODEL_DESCRIPTIONS[modelId] || 'AI-powered code generation'
}

// Determine best provider based on available keys (no bias)
export function selectProvider(): 'anthropic' | 'openai' {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  
  // If both available, alternate (use timestamp-based selection for fairness)
  if (anthropicKey && openaiKey) {
    return Date.now() % 2 === 0 ? 'anthropic' : 'openai'
  }
  if (anthropicKey) return 'anthropic'
  if (openaiKey) return 'openai'
  
  // Default to whichever is configured
  return 'anthropic'
}

// =====================================================
// SANITIZE AI RESPONSES
// Remove any accidental mentions of Claude/GPT
// =====================================================

export function sanitizeResponse(text: string): string {
  // Delegate to brand.ts sanitizer — single source of truth
  let result = sanitizeBrandOutput(text)
  const name = BRAND_AI_NAME
  const replacements: [RegExp, string][] = [
    [/I'm an AI (?:assistant |language model |)(?:made|created|developed|built|trained) by [A-Za-z]+/gi, `I'm ${name}, your AI coding assistant`],
    [/I am an AI (?:assistant |language model |)(?:made|created|developed|built|trained) by [A-Za-z]+/gi, `I am ${name}, your AI coding assistant`],
    [/As an AI language model/gi, `As ${name}`],
    [/As an AI assistant/gi, `As ${name}`],
    [/I'm Claude/gi, `I'm ${name}`],
    [/I am Claude/gi, `I am ${name}`],
    [/I'm GPT/gi, `I'm ${name}`],
    [/I am GPT/gi, `I am ${name}`],
    [/my name is Claude/gi, `my name is ${name}`],
    [/my name is GPT/gi, `my name is ${name}`],
    [/I was (?:made|created|developed|built|trained) by (?:Anthropic|OpenAI|Google|Meta)/gi, `I was built by the ${BRAND_NAME} team`],
    [/(?:Anthropic|OpenAI)'s (?:API|model|system)/gi, `${name}'s system`],
    [/claude-[\w.-]+/gi, BRAND_NAME.toLowerCase().replace(/\s+/g, '-')],
    [/gpt-[\w.-]+/gi, BRAND_NAME.toLowerCase().replace(/\s+/g, '-')],
    [/o1-(?:preview|mini)/gi, BRAND_NAME.toLowerCase().replace(/\s+/g, '-')],
    [/powered by (?:Claude|Anthropic|OpenAI|GPT)/gi, `powered by ${name}`],
    [/using (?:Claude|Anthropic|OpenAI|GPT)/gi, `using ${name}`],
  ]
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement)
  }
  return result
}

// =====================================================
// ERROR MESSAGES (White-labeled)
// =====================================================

export const ERROR_MESSAGES = {
  API_KEY_MISSING: `${BRAND_NAME} API key not configured. Please add your API key in settings.`,
  RATE_LIMITED: `${BRAND_NAME} is experiencing high demand. Please try again in a moment.`,
  GENERATION_FAILED: `${BRAND_NAME} encountered an error generating code. Please try again.`,
  VALIDATION_FAILED: `${BRAND_NAME} found issues with the generated code and is attempting to fix them.`,
  TIMEOUT: `${BRAND_NAME} is taking longer than expected. Please try a simpler request.`,
  NETWORK_ERROR: `Unable to connect to ${BRAND_NAME}. Please check your internet connection.`,
  INVALID_REQUEST: `${BRAND_NAME} couldn\'t understand that request. Please try rephrasing.`,
  CONTENT_FILTERED: `${BRAND_NAME} cannot help with that request.`,
  MAX_TOKENS: `The response was too long. ${BRAND_NAME} will try to provide a more concise answer.`
}

// =====================================================
// RE-EXPORTS (only items not already exported at declaration)
// =====================================================

export {
  MODEL_DISPLAY_NAMES,
  MODEL_DESCRIPTIONS,
  currentConfig
}

