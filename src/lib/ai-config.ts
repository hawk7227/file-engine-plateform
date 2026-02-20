// =====================================================
// FILE ENGINE - AI CONFIGURATION
// White-labeled AI system - NO external branding visible
// Users interact with "File Engine AI" not Claude/OpenAI
// =====================================================

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

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  // All models displayed as File Engine tiers - NO provider branding
  'claude-sonnet-4-20250514': 'File Engine Pro',
  'claude-opus-4-20250514': 'File Engine Premium',
  'claude-haiku-4-20250514': 'File Engine Fast',
  'gpt-4o': 'File Engine Pro',
  'gpt-4o-mini': 'File Engine Fast',
  'gpt-4-turbo': 'File Engine Pro',
  'o1': 'File Engine Premium',
  'auto': 'File Engine Auto'
}

const MODEL_DESCRIPTIONS: Record<string, string> = {
  'claude-sonnet-4-20250514': 'Best balance of speed and quality for most tasks',
  'claude-opus-4-20250514': 'Highest quality output for complex projects',
  'claude-haiku-4-20250514': 'Fastest responses for quick iterations',
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
    name: 'File Engine Auto',
    description: 'Automatically selects the best model for your task',
    icon: '✨',
    recommended: true
  },
  {
    id: 'fast',
    name: 'File Engine Fast',
    description: 'Quick responses for rapid iteration',
    icon: '⚡',
    recommended: false
  },
  {
    id: 'pro',
    name: 'File Engine Pro',
    description: 'Best balance of speed and quality',
    icon: '🚀',
    recommended: false
  },
  {
    id: 'premium',
    name: 'File Engine Premium',
    description: 'Highest quality for complex projects',
    icon: '💎',
    recommended: false
  }
]

// Map user-facing IDs to actual model IDs (current versions)
const USER_TO_ACTUAL_MODEL: Record<string, { anthropic: string; openai: string }> = {
  'auto': { anthropic: 'claude-sonnet-4-20250514', openai: 'gpt-4o' },
  'fast': { anthropic: 'claude-haiku-4-20250514', openai: 'gpt-4o-mini' },
  'pro': { anthropic: 'claude-sonnet-4-20250514', openai: 'gpt-4o' },
  'premium': { anthropic: 'claude-opus-4-20250514', openai: 'o1' }
}

// =====================================================
// SYSTEM PROMPTS
// White-labeled - AI identifies as "File Engine"
// =====================================================

export const FILE_ENGINE_SYSTEM_PROMPT = `You are File Engine, an advanced AI code generation assistant. You help developers create, fix, and improve code.

IMPORTANT IDENTITY RULES:
- You are "File Engine" - never mention being Claude, GPT, or any other AI
- If asked who you are, say "I'm File Engine, your AI coding assistant"
- If asked about your capabilities, describe File Engine's features
- Never reference Anthropic, OpenAI, or other AI companies

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

export const FILE_ENGINE_VISION_PROMPT = `You are File Engine's vision system. Analyze UI mockups and screenshots to generate accurate code.

RULES:
- Generate pixel-perfect recreations when possible
- Use appropriate CSS frameworks (prefer Tailwind)
- Extract colors, fonts, and spacing accurately
- Identify all UI components
- Generate responsive code by default
- Include all visible text and content`

export const FILE_ENGINE_FIX_PROMPT = `You are File Engine's error fixing system. Analyze errors and generate fixes.

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
  if (!mapping) return userModelId // Already an actual model ID
  
  const selectedProvider = provider || currentConfig.provider
  if (selectedProvider === 'auto' || selectedProvider === 'anthropic') {
    return mapping.anthropic
  }
  return mapping.openai
}

// Get user-friendly display name for a model
export function getModelDisplayName(modelId: string): string {
  return MODEL_DISPLAY_NAMES[modelId] || 'File Engine'
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
  const replacements: [RegExp, string][] = [
    // Direct name mentions
    [/\bClaude\b/g, 'File Engine'],
    [/\bclaude\b/g, 'File Engine'],
    [/\bAnthropic\b/gi, 'File Engine'],
    [/\bGPT-?4o?(?:-mini|-turbo)?\b/gi, 'File Engine'],
    [/\bGPT-?3\.?5?(?:-turbo)?\b/gi, 'File Engine'],
    [/\bChatGPT\b/gi, 'File Engine'],
    [/\bOpenAI\b/gi, 'File Engine'],
    [/\bGemini\b/gi, 'File Engine'],
    [/\bGoogle AI\b/gi, 'File Engine'],
    [/\bBard\b/gi, 'File Engine'],
    [/\bCopilot\b/gi, 'File Engine'],
    [/\bMistral\b/gi, 'File Engine'],
    [/\bLlama\b/g, 'File Engine'],
    
    // Identity phrases (common AI self-references)
    [/I'm an AI (?:assistant |language model |)(?:made|created|developed|built|trained) by [A-Za-z]+/gi, "I'm File Engine, your AI coding assistant"],
    [/I am an AI (?:assistant |language model |)(?:made|created|developed|built|trained) by [A-Za-z]+/gi, "I am File Engine, your AI coding assistant"],
    [/As an AI language model/gi, 'As File Engine'],
    [/As an AI assistant/gi, 'As File Engine'],
    [/I'm Claude/gi, "I'm File Engine"],
    [/I am Claude/gi, "I am File Engine"],
    [/I'm GPT/gi, "I'm File Engine"],
    [/I am GPT/gi, "I am File Engine"],
    [/my name is Claude/gi, "my name is File Engine"],
    [/my name is GPT/gi, "my name is File Engine"],
    [/I was (?:made|created|developed|built|trained) by (?:Anthropic|OpenAI|Google|Meta)/gi, "I was built by the File Engine team"],
    [/(?:Anthropic|OpenAI)'s (?:API|model|system)/gi, "File Engine's system"],
    
    // Model version references
    [/claude-[\w.-]+/gi, 'file-engine'],
    [/gpt-[\w.-]+/gi, 'file-engine'],
    [/o1-(?:preview|mini)/gi, 'file-engine'],
    
    // "Powered by" references
    [/powered by (?:Claude|Anthropic|OpenAI|GPT)/gi, 'powered by File Engine'],
    [/using (?:Claude|Anthropic|OpenAI|GPT)/gi, 'using File Engine'],
  ]
  
  let result = text
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement)
  }
  
  return result
}

// =====================================================
// ERROR MESSAGES (White-labeled)
// =====================================================

export const ERROR_MESSAGES = {
  API_KEY_MISSING: 'File Engine API key not configured. Please add your API key in settings.',
  RATE_LIMITED: 'File Engine is experiencing high demand. Please try again in a moment.',
  GENERATION_FAILED: 'File Engine encountered an error generating code. Please try again.',
  VALIDATION_FAILED: 'File Engine found issues with the generated code and is attempting to fix them.',
  TIMEOUT: 'File Engine is taking longer than expected. Please try a simpler request.',
  NETWORK_ERROR: 'Unable to connect to File Engine. Please check your internet connection.',
  INVALID_REQUEST: 'File Engine couldn\'t understand that request. Please try rephrasing.',
  CONTENT_FILTERED: 'File Engine cannot help with that request.',
  MAX_TOKENS: 'The response was too long. File Engine will try to provide a more concise answer.'
}

// =====================================================
// RE-EXPORTS (only items not already exported at declaration)
// =====================================================

export {
  MODEL_DISPLAY_NAMES,
  MODEL_DESCRIPTIONS,
  currentConfig
}
