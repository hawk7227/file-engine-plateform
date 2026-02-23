// =====================================================
// FILE ENGINE - SMART CONTEXT BUILDER
// Replaces the old "dump everything" approach
// Injects ONLY what's relevant per request
// Saves ~60% tokens per API call
// =====================================================

import { supabase } from './supabase'
import { BRAND_AI_NAME } from '@/lib/brand'
import { matchSkills } from './skills'

// =====================================================
// TYPES
// =====================================================

interface ContextOptions {
  userId: string
  userMessage: string
  projectId?: string
  attachments?: { type: string; content: string; filename?: string }[]
  previousMessages?: { role: string; content: string }[]
  endpoint: 'chat' | 'generate' | 'fix' | 'vision'
  adminSettings?: {
    smart_model_routing?: boolean
    default_model_tier?: 'fast' | 'pro' | 'premium'
    conversation_trimming?: boolean
    max_history_pairs?: number
    max_message_chars?: number
    smart_max_tokens?: boolean
    fixed_max_tokens?: number
    smart_context?: boolean
    skill_caching?: boolean
    provider_preference?: string
  }
}

interface ContextResult {
  systemPrompt: string
  injectedContext: string
  tokenEstimate: number
  modelTier: 'fast' | 'pro' | 'premium'
  maxTokens: number
  trimmedMessages: { role: string; content: string }[]
  debugInfo: {
    intent: MessageIntent
    skillsInjected: string[]
    memoryInjected: string[]
    projectFilesInjected: number
    messagesOriginal: number
    messagesTrimmed: number
  }
}

// =====================================================
// MESSAGE INTENT CLASSIFIER
// Determines what context the AI actually needs
// =====================================================

export type MessageIntent =
  | 'generate_code'      // "build me a login page"
  | 'fix_code'           // "fix the error in..."
  | 'explain'            // "explain how useEffect works"
  | 'style_question'     // "what color should..."
  | 'refactor'           // "refactor this component"
  | 'general_chat'       // "hello", "thanks"
  | 'project_question'   // "what files do we have?"
  | 'deploy_action'      // "deploy this"

export function classifyIntent(message: string): MessageIntent {
  const lower = message.toLowerCase()

  // Order matters — most specific first, generation BEFORE styling
  if (lower.match(/deploy|publish|ship|go live/)) return 'deploy_action'
  if (lower.match(/fix|bug|error|broken|crash|fail|doesn'?t work|not working/)) return 'fix_code'
  if (lower.match(/refactor|clean up|improve|optimize|simplify/)) return 'refactor'
  if (lower.match(/explain|how does|what is|why does|teach me|what'?s the difference/)) return 'explain'
  // CRITICAL: generate_code MUST come before style_question
  // "Build a landing page with dark theme" = generate, not style
  if (lower.match(/create|build|generate|make|write|code|add|implement|design|set ?up|develop|page|app|website|component|dashboard|form/)) return 'generate_code'
  if (lower.match(/color|font|spacing|style|theme|dark mode|responsive|layout|align/)) return 'style_question'
  if (lower.match(/what files|show me|list|which components|project structure/)) return 'project_question'
  if (lower.match(/create|build|generate|make|write|code|add|implement|design|set ?up|develop/)) return 'generate_code'

  return 'general_chat'
}

// =====================================================
// INTENT → MODEL TIER MAPPING
// Simple questions use cheap models, complex ones use premium
// =====================================================

const INTENT_MODEL_TIER: Record<MessageIntent, 'fast' | 'pro' | 'premium'> = {
  general_chat: 'fast',      // Haiku — trivial responses
  explain: 'fast',           // Haiku — explanations don't need quality code
  deploy_action: 'fast',     // Haiku — just orchestration
  style_question: 'pro',     // Sonnet — needs design reasoning
  project_question: 'fast',  // Haiku — just listing files
  generate_code: 'pro',      // Sonnet MINIMUM — must produce quality code
  refactor: 'pro',           // Sonnet — needs pattern understanding
  fix_code: 'pro',           // Sonnet — needs debugging reasoning
}

// =====================================================
// INTENT → MAX_TOKENS
// Don't reserve 8192 tokens for "hello"
// =====================================================

const INTENT_MAX_TOKENS: Record<MessageIntent, number> = {
  general_chat: 512,
  explain: 2048,
  deploy_action: 512,
  style_question: 1024,
  project_question: 1024,
  generate_code: 16384,
  refactor: 8192,
  fix_code: 8192,
}

// =====================================================
// CONTEXT BUDGET PER INTENT
// =====================================================

const CONTEXT_BUDGETS: Record<MessageIntent, {
  needsSkills: boolean
  needsCodingStyle: boolean
  needsPreferences: boolean
  needsProjectFiles: boolean
  needsCorrections: boolean
  needsProjectHistory: boolean
  maxProjectFiles: number
  maxFileChars: number
  maxCorrections: number
}> = {
  generate_code: {
    needsSkills: true,
    needsCodingStyle: true,
    needsPreferences: true,
    needsProjectFiles: true,
    needsCorrections: true,
    needsProjectHistory: false,
    maxProjectFiles: 5,
    maxFileChars: 300,
    maxCorrections: 3
  },
  fix_code: {
    needsSkills: true,
    needsCodingStyle: true,
    needsPreferences: false,
    needsProjectFiles: true,
    needsCorrections: true,
    needsProjectHistory: false,
    maxProjectFiles: 3,
    maxFileChars: 500,
    maxCorrections: 5
  },
  refactor: {
    needsSkills: true,
    needsCodingStyle: true,
    needsPreferences: false,
    needsProjectFiles: true,
    needsCorrections: false,
    needsProjectHistory: false,
    maxProjectFiles: 5,
    maxFileChars: 400,
    maxCorrections: 0
  },
  explain: {
    needsSkills: false,
    needsCodingStyle: false,
    needsPreferences: false,
    needsProjectFiles: false,
    needsCorrections: false,
    needsProjectHistory: false,
    maxProjectFiles: 0,
    maxFileChars: 0,
    maxCorrections: 0
  },
  style_question: {
    needsSkills: false,
    needsCodingStyle: true,
    needsPreferences: true,
    needsProjectFiles: false,
    needsCorrections: false,
    needsProjectHistory: false,
    maxProjectFiles: 0,
    maxFileChars: 0,
    maxCorrections: 0
  },
  project_question: {
    needsSkills: false,
    needsCodingStyle: false,
    needsPreferences: false,
    needsProjectFiles: true,
    needsCorrections: false,
    needsProjectHistory: true,
    maxProjectFiles: 10,
    maxFileChars: 0,
    maxCorrections: 0
  },
  deploy_action: {
    needsSkills: false,
    needsCodingStyle: false,
    needsPreferences: false,
    needsProjectFiles: false,
    needsCorrections: false,
    needsProjectHistory: false,
    maxProjectFiles: 0,
    maxFileChars: 0,
    maxCorrections: 0
  },
  general_chat: {
    needsSkills: false,
    needsCodingStyle: false,
    needsPreferences: false,
    needsProjectFiles: false,
    needsCorrections: false,
    needsProjectHistory: false,
    maxProjectFiles: 0,
    maxFileChars: 0,
    maxCorrections: 0
  }
}

// =====================================================
// CONVERSATION TRIMMER
// Keep last N exchanges + compress older ones into summary
// User sees full history in UI — only the API payload is trimmed
// =====================================================

const MAX_RECENT_PAIRS = 6  // Keep last 6 user+assistant pairs (12 messages)
const MAX_MESSAGE_CHARS = 3000  // Truncate individual long messages

function trimConversation(
  messages: { role: string; content: string }[],
  maxRecentPairs: number = MAX_RECENT_PAIRS,
  maxMsgChars: number = MAX_MESSAGE_CHARS
): { role: string; content: string }[] {
  if (!messages || messages.length === 0) return []

  // If conversation is small enough, send it all
  if (messages.length <= maxRecentPairs * 2) {
    return messages.map(m => ({
      role: m.role,
      content: m.content.length > maxMsgChars
        ? m.content.slice(0, maxMsgChars) + '\n[...truncated]'
        : m.content
    }))
  }

  // Split into old and recent
  const recentCount = maxRecentPairs * 2
  const oldMessages = messages.slice(0, -recentCount)
  const recentMessages = messages.slice(-recentCount)

  // Compress old messages into a summary
  // Extract just the user intents — skip full assistant responses
  const oldTopics = oldMessages
    .filter(m => m.role === 'user')
    .map(m => {
      // Take first 80 chars of each user message
      const snippet = m.content.slice(0, 80).replace(/\n/g, ' ')
      return snippet.length < m.content.length ? snippet + '...' : snippet
    })

  const summary: { role: string; content: string } = {
    role: 'system',
    content: `[Earlier in this conversation, the user discussed: ${oldTopics.join('; ')}]`
  }

  // Truncate long messages in recent history
  const trimmedRecent = recentMessages.map(m => ({
    role: m.role,
    content: m.content.length > maxMsgChars
      ? m.content.slice(0, maxMsgChars) + '\n[...truncated]'
      : m.content
  }))

  return [summary, ...trimmedRecent]
}

// =====================================================
// SKILL MATCH CACHE
// Same user working on React all day — don't re-match every time
// =====================================================

let lastSkillMatchQuery = ''
let lastSkillMatchResult: { id: string; content: string; confidence: number } | null = null

function getCachedSkillMatch(query: string): { id: string; content: string } | null {
  // Check if the query would match the same skill as last time
  // Simple heuristic: if the matched skill ID would be the same, reuse
  const skills = matchSkills(query)
  if (skills.length === 0 || skills[0].confidence <= 0.3) return null

  const topSkill = skills[0]
  if (lastSkillMatchResult && lastSkillMatchResult.id === topSkill.skill.id) {
    // Cache hit — same skill, reuse content
    return { id: lastSkillMatchResult.id, content: lastSkillMatchResult.content }
  }

  // Cache miss — update cache
  lastSkillMatchQuery = query
  lastSkillMatchResult = {
    id: topSkill.skill.id,
    content: topSkill.skill.content,
    confidence: topSkill.confidence
  }

  return { id: topSkill.skill.id, content: topSkill.skill.content }
}

// =====================================================
// SMART CONTEXT BUILDER
// Only fetches and injects what the intent requires
// =====================================================

export async function buildSmartContext(options: ContextOptions): Promise<ContextResult> {
  const { userId, userMessage, projectId, attachments, previousMessages, endpoint, adminSettings } = options

  const intent = classifyIntent(userMessage)
  const budget = CONTEXT_BUDGETS[intent]

  // Apply admin overrides for model tier
  let modelTier: 'fast' | 'pro' | 'premium'
  if (adminSettings?.smart_model_routing === false) {
    // Admin disabled smart routing — use their default tier
    modelTier = adminSettings.default_model_tier || 'pro'
  } else {
    modelTier = INTENT_MODEL_TIER[intent]
  }

  // Apply admin overrides for max_tokens
  let maxTokens: number
  if (adminSettings?.smart_max_tokens === false) {
    maxTokens = adminSettings.fixed_max_tokens || 8192
  } else {
    maxTokens = INTENT_MAX_TOKENS[intent]
  }

  // Apply admin overrides for conversation trimming
  const shouldTrim = adminSettings?.conversation_trimming !== false
  const maxPairs = adminSettings?.max_history_pairs || MAX_RECENT_PAIRS
  const maxChars = adminSettings?.max_message_chars || MAX_MESSAGE_CHARS

  // Apply admin override for smart context
  const useSmartContext = adminSettings?.smart_context !== false
  const contextParts: string[] = []
  const debugInfo = {
    intent,
    skillsInjected: [] as string[],
    memoryInjected: [] as string[],
    projectFilesInjected: 0,
    messagesOriginal: previousMessages?.length || 0,
    messagesTrimmed: 0
  }

  // Trim conversation history (respects admin settings)
  const trimmedMessages = shouldTrim
    ? trimConversation(previousMessages || [], maxPairs, maxChars)
    : (previousMessages || []).map(m => ({ role: m.role, content: m.content }))
  debugInfo.messagesTrimmed = trimmedMessages.length

  // Build only the needed queries in parallel
  // When admin disables smart_context, load everything regardless of intent
  const queries: PromiseLike<void>[] = []

  let codingStyle: any = null
  let preferences: any = null
  let projectFiles: any[] = []
  let corrections: any[] = []

  const loadStyle = useSmartContext ? budget.needsCodingStyle : true
  const loadPrefs = useSmartContext ? budget.needsPreferences : true
  const loadFiles = useSmartContext ? budget.needsProjectFiles : !!projectId
  const loadCorr = useSmartContext ? budget.needsCorrections : true

  if (loadStyle && userId !== 'anonymous') {
    queries.push(
      supabase
        .from('user_memories')
        .select('value')
        .eq('user_id', userId)
        .eq('type', 'style')
        .eq('key', 'default')
        .single()
        .then(
          ({ data }) => { codingStyle = data?.value },
          () => { /* non-blocking */ }
        )
    )
  }

  if (loadPrefs && userId !== 'anonymous') {
    queries.push(
      supabase
        .from('user_memories')
        .select('value')
        .eq('user_id', userId)
        .eq('type', 'preference')
        .eq('key', 'default')
        .single()
        .then(
          ({ data }) => { preferences = data?.value },
          () => { /* non-blocking */ }
        )
    )
  }

  if (loadFiles && projectId) {
    queries.push(
      supabase
        .from('project_files')
        .select('file_path, language, file_size')
        .eq('project_id', projectId)
        .limit(budget.maxProjectFiles)
        .then(
          ({ data }) => { projectFiles = data || [] },
          () => { /* non-blocking */ }
        )
    )
  }

  if (loadCorr && userId !== 'anonymous') {
    queries.push(
      supabase
        .from('user_memories')
        .select('value')
        .eq('user_id', userId)
        .eq('type', 'correction')
        .order('updated_at', { ascending: false })
        .limit(budget.maxCorrections)
        .then(
          ({ data }) => { corrections = (data || []).map(d => d.value) },
          () => { /* non-blocking */ }
        )
    )
  }

  // Execute all needed queries in parallel
  if (queries.length > 0) {
    await Promise.allSettled(queries)
  }

  // =====================================================
  // ASSEMBLE CONTEXT — compact format, no waste
  // =====================================================

  // Coding style — only non-default values
  if (codingStyle) {
    const defaults: Record<string, any> = {
      indentation: 'spaces', indentSize: 2, semicolons: false,
      quotes: 'single', preferredFramework: 'react', preferredStyling: 'tailwind',
      componentStyle: 'functional', namingConvention: 'camelCase'
    }
    const overrides = Object.entries(codingStyle)
      .filter(([k, v]) => defaults[k] !== undefined && defaults[k] !== v)
      .map(([k, v]) => `${k}: ${v}`)

    if (overrides.length > 0) {
      contextParts.push(`<style>${overrides.join(', ')}</style>`)
      debugInfo.memoryInjected.push('codingStyle')
    }
  }

  // Preferences — only non-defaults
  if (preferences) {
    const relevant: string[] = []
    if (preferences.codeCommenting === 'verbose') relevant.push('verbose comments')
    if (preferences.codeCommenting === 'minimal') relevant.push('minimal comments')
    if (preferences.defaultFramework !== 'react') relevant.push(`framework: ${preferences.defaultFramework}`)
    if (preferences.defaultStyling !== 'tailwind') relevant.push(`styling: ${preferences.defaultStyling}`)

    if (relevant.length > 0) {
      contextParts.push(`<prefs>${relevant.join(', ')}</prefs>`)
      debugInfo.memoryInjected.push('preferences')
    }
  }

  // Skills — cached, rules-only for non-generate
  if (budget.needsSkills) {
    const skillMatch = getCachedSkillMatch(userMessage)
    if (skillMatch) {
      if (intent === 'generate_code' || intent === 'fix_code' || intent === 'refactor') {
        contextParts.push(`<skill>${skillMatch.content}</skill>`)
      } else {
        const rulesOnly = skillMatch.content
          .replace(/```[\s\S]*?```/g, '')
          .replace(/\n{3,}/g, '\n')
          .trim()
        contextParts.push(`<skill>${rulesOnly}</skill>`)
      }
      debugInfo.skillsInjected.push(skillMatch.id)
    }
  }

  // Project files — file tree
  if (projectFiles.length > 0) {
    const fileList = projectFiles.map(f => `${f.file_path} (${f.file_size}b)`).join('\n')
    contextParts.push(`<project_files_list>\n${fileList}\n</project_files_list>`)
    debugInfo.projectFilesInjected = projectFiles.length
  }

  // Corrections — compact
  if (corrections.length > 0) {
    const correctionText = corrections
      .map(c => `"${c.original}" → "${c.corrected}"`)
      .join('; ')
    contextParts.push(`<corrections>${correctionText}</corrections>`)
    debugInfo.memoryInjected.push(`${corrections.length} corrections`)
  }

  // Attachments
  if (attachments && attachments.length > 0) {
    for (const att of attachments) {
      if (att.type === 'image') {
        contextParts.push(`<image file="${att.filename || 'image'}">[analyze and generate code]</image>`)
      } else if (att.type === 'file') {
        contextParts.push(`<file name="${att.filename}">\n${att.content}\n</file>`)
      }
    }
  }

  const injectedContext = contextParts.join('\n')
  const tokenEstimate = Math.ceil((SYSTEM_PROMPT_COMPACT.length + injectedContext.length) / 4)

  return {
    systemPrompt: SYSTEM_PROMPT_COMPACT,
    injectedContext,
    tokenEstimate,
    modelTier,
    maxTokens,
    trimmedMessages,
    debugInfo
  }
}

// =====================================================
// COMPACT SYSTEM PROMPT
// =====================================================

export const SYSTEM_PROMPT_COMPACT = `You are ${BRAND_AI_NAME}, a world-class AI software engineer with deep expertise in frontend, backend, databases, APIs, and modern web architecture.

IDENTITY: You are "${BRAND_AI_NAME}". Never mention Claude, GPT, OpenAI, Anthropic, or any other AI.

APPROACH:
- Think carefully before responding — understand the problem fully before solving it
- Be concise but thorough — explain decisions, not basics
- Give direct, actionable answers — no hedging or unnecessary qualifiers
- If unsure, say so honestly. If you can search, do so before guessing.
- Proactively identify edge cases, potential issues, and better alternatives

CODE QUALITY:
- Generate complete, production-ready code — never truncated or placeholder
- TypeScript + Tailwind CSS by default unless user specifies otherwise
- Include error handling, proper types, loading/empty/error states
- Modern design: distinctive fonts (Poppins, Space Grotesk, etc.), intentional colors, smooth animations
- Mobile responsive with proper breakpoints (375px, 768px, 1024px)
- Semantic HTML, ARIA labels, proper heading hierarchy
- CSS custom properties for theming, Flexbox/Grid for layout
- const by default, arrow functions for callbacks, async/await, optional chaining

CODE OUTPUT FORMAT (CRITICAL):
\`\`\`language:filepath
[complete code here]
\`\`\`

NEVER output code blocks without the :filepath suffix. The preview system requires it.
For HTML pages: <!DOCTYPE html> required, ALL CSS in <style>, ALL JS in <script>.
STRATEGY: Brief intro (1-2 sentences), then complete code. Explain AFTER, not before.

PLATFORM KNOWLEDGE:
- You run inside File Engine with live preview (iframe srcdoc for HTML, Babel standalone for React)
- If something fails, diagnose the root cause — don't just regenerate blindly
- Common failures: token limit truncation, missing DOCTYPE, missing :filepath on code blocks
- For iteration/edits, check existing files first — don't recreate from scratch
- Previous files from this conversation are available in your context`

// Intent-specific prompt additions that get appended
export const INTENT_PROMPT_ADDITIONS: Record<MessageIntent, string> = {
  generate_code: `
GENERATION PRIORITIES (in order):
1. Output complete, immediately-runnable code — ZERO placeholders or TODOs
2. Keep preamble to 1-2 sentences MAX — most tokens must go to CODE
3. For single-page: ONE HTML file, 150-400 lines, embedded CSS+JS
4. For React: each component in its own file with proper imports

DESIGN CHECKLIST (verify every item):
- [ ] Distinctive font loaded (Google Fonts — NOT just Arial/system)
- [ ] Color palette defined as CSS variables
- [ ] Mobile responsive (375px, 768px, 1024px breakpoints)
- [ ] Hover effects on all clickable elements
- [ ] Smooth transitions (0.2-0.4s ease)
- [ ] Proper visual hierarchy (size, weight, color, spacing)
- [ ] Loading states for async operations
- [ ] Empty states for lists/data
- [ ] Error states with recovery actions
- [ ] All images have alt text
- [ ] Semantic HTML elements (nav, main, section, article)

COMMON GENERATION MISTAKES TO AVOID:
- Cutting off HTML mid-file (token limit) — keep explanations SHORT
- Missing <!DOCTYPE html> — preview won't render
- Missing viewport meta — mobile layout breaks
- Missing :filepath on code blocks — preview can't detect the file
- Using placeholder text like "Lorem ipsum" everywhere — use realistic content
- Forgetting to close all HTML tags
- onclick handlers referencing functions that don't exist yet
- CSS classes that are defined but never applied to elements`,

  fix_code: `
SYSTEMATIC DEBUGGING PROTOCOL:
1. REPRODUCE: Understand exactly what's happening vs what should happen
2. HYPOTHESIZE: Form a theory about the root cause BEFORE looking at code
3. INVESTIGATE: Use view_file to see actual code, use run_command to check build
4. IDENTIFY ROOT CAUSE: Don't fix symptoms, fix the underlying problem
5. FIX MINIMALLY: edit_file with the smallest change that resolves the issue
6. VERIFY: Mentally trace the code path to confirm the fix works
7. EXPLAIN: What was wrong, why, how the fix works, how to prevent it

ROOT CAUSE ANALYSIS PATTERNS:
- Error says "undefined" → trace backwards: where should this value come from? Is it async? Is the import wrong? Is the prop not passed?
- Error says "not a function" → the variable exists but isn't what you think. Check: wrong import, shadowed variable, or accessing wrong property
- Visual bug (wrong layout/style) → inspect: is the CSS applied? Is specificity overriding? Is the DOM structure correct?
- State bug (UI not updating) → check: is setState called correctly? Stale closure? Missing dependency in useEffect?
- "Works locally but not in production" → check: environment variables? Build-time vs runtime? Client vs server rendering?

PLATFORM-SPECIFIC FIX PATTERNS:
- "Creating file failed" → Previous attempt exceeded token limit. Solution: shorter preamble, immediate code.
- "Preview blank" → Missing <!DOCTYPE html> or wrong code block format.
- "Preview shows old version" → Browser caching or file not updated. Recreate with create_file.
- "Tool failed" → JSON truncated. Simplify or split the file.`,

  refactor: `
REFACTORING PRINCIPLES:
- NEVER break existing functionality — all current behavior must be preserved
- Make ONE type of improvement at a time, not everything at once
- Verify the refactored code handles all the same edge cases

REFACTORING STRATEGIES (pick the right one):
- Extract function: repeated code → named function with clear parameters
- Extract component: repeated UI → reusable component with props
- Simplify conditionals: nested if/else → early returns, switch, or lookup objects
- Remove duplication: copy-pasted code → shared utility function
- Improve naming: vague names → descriptive, intention-revealing names
- Add types: any/unknown → proper TypeScript interfaces
- Split file: 300+ line file → separate concerns into focused modules

ALWAYS USE edit_file for targeted changes. Never rewrite from scratch unless the code is fundamentally broken.`,

  explain: `
EXPLANATION APPROACH:
- Start with the core concept in 1-2 sentences (the "what")
- Then explain the "why" — what problem does this solve?
- Use a practical analogy if the concept is abstract
- Show a minimal code example that demonstrates the concept
- Mention common mistakes or gotchas
- Keep it focused — depth over breadth, don't explain tangential concepts
- Match the user's expertise level — if they use technical terms, respond technically`,

  style_question: `
DESIGN EXPERTISE:
- Always give SPECIFIC values: hex colors, font names, exact px/rem spacing
- Consider WCAG contrast: 4.5:1 for body text, 3:1 for headings (use WebAIM checker formula)
- Recommend font PAIRINGS: display + body (e.g., Playfair Display + DM Sans, Space Grotesk + Inter)
- Include practical CSS code, not just verbal descriptions
- Consider dark mode implications if the project uses dark theme
- Think about hover, focus, and active states for interactive elements
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96px (multiples of 4/8)`,

  project_question: `
PROJECT ANALYSIS:
- List files with their purposes and how they connect
- Identify the architecture: what framework, what state management, what styling approach
- Map the data flow: where does data come from, how does it transform, where does it render
- Note potential issues: missing error handling, accessibility gaps, performance concerns
- Suggest concrete next steps if the user seems to be looking for direction`,

  deploy_action: `
DEPLOYMENT CHECKLIST:
1. Run build check first (run_command: npm run build)
2. Verify no TypeScript/lint errors
3. Check for environment variables that need to be set
4. Confirm all imports resolve correctly
5. Test at multiple viewport sizes mentally`,

  general_chat: `
Be helpful, direct, and warm. Answer questions concisely but completely. If a question touches on code, offer to build or fix something. If the user seems stuck, proactively suggest the next step.`
}


export { CONTEXT_BUDGETS, INTENT_MODEL_TIER, INTENT_MAX_TOKENS, trimConversation }
