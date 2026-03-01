// =====================================================
// BRAND CONFIG — SINGLE SOURCE OF TRUTH
// Change values here → entire system updates
// White-label ready: swap name, colors, logo once
// =====================================================

export interface BrandConfig {
  // ── Identity ──
  name: string              // "File Engine" → "Acme Builder"
  shortName: string         // "FE" → "AB" (logo mark, favicon)
  tagline: string           // Shown in hero, metadata
  description: string       // Meta description, SEO
  domain: string            // "fileengine.dev" → "acme.dev"
  supportEmail: string      // "support@fileengine.dev"
  companyName: string       // Legal entity: "File Engine Inc."

  // ── Visual ──
  logo: {
    emoji: string           //  — fallback when no image
    imageUrl: string | null // URL to logo image (null = use emoji)
    markText: string        // Text inside the logo mark circle ("FE")
  }
  colors: {
    primary: string         // Main accent (var(--accent-primary))
    secondary: string       // Blue accent (var(--accent-primary))
    purple: string          // Purple accent (var(--accent-primary))
    orange: string          // Warning/cancel (#ff6622)
    yellow: string          // Building/queue (#ffc800)
    glow: string            // Glow effect rgba
  }
  gradients: {
    logo: string            // Logo background gradient
    button: string          // Primary button gradient
    avatar: string          // User avatar gradient
  }

  // ── AI Identity ──
  ai: {
    name: string            // "File Engine" — what the AI calls itself
    personality: string     // "your AI coding assistant"
    avatar: string          // Emoji in chat: 
    neverMention: string[]  // Provider names to NEVER say
  }

  // ── Product ──
  product: {
    version: string         // "v2.5.0"
    tier: string            // "Pro", "Enterprise"
    features: string[]      // Marketing badges
  }

  // ── Legal ──
  legal: {
    companyFull: string     // "File Engine, Inc."
    jurisdiction: string    // "Delaware, USA"
    copyrightYear: number
  }

  // ── Social / Links ──
  links: {
    docs: string
    github: string
    twitter: string
    discord: string
    status: string
    pricing: string
  }
}

// =====================================================
// DEFAULT BRAND — Change this one object to rebrand
// =====================================================

const BRAND: BrandConfig = {
  name: 'File Engine',
  shortName: 'FE',
  tagline: 'Build Anything. No Limits.',
  description: 'Build anything with AI. No limits. Unlimited AI development platform.',
  domain: 'fileengine.dev',
  supportEmail: 'support@fileengine.dev',
  companyName: 'File Engine Inc.',

  logo: {
    emoji: '',           // §2: No emoji in product UI
    imageUrl: null,
    markText: 'FE',
  },

  colors: {
    primary: '#10b981',    // §6: Single accent (emerald-500)
    secondary: '#10b981',  // §6: Maximum one accent color — unified
    purple: '#10b981',     // §6: No multi-accent — map to primary
    orange: '#ef4444',     // Destructive actions only
    yellow: '#eab308',     // Warning states only
    glow: 'rgba(16, 185, 129, 0.12)', // §6: Subtle, not intense
  },

  gradients: {
    logo: 'none',          // §6: No gradient-heavy marketing UI in product
    button: 'none',        // §6: Solid colors only
    avatar: 'none',        // §6: Solid colors only
  },

  ai: {
    name: 'File Engine',
    personality: 'your AI coding assistant',
    avatar: '',            // §2: No emoji in product UI
    neverMention: ['Claude', 'GPT', 'OpenAI', 'Anthropic', 'Google', 'Gemini', 'Copilot', 'ChatGPT'],
  },

  product: {
    version: 'v2.5.0',
    tier: 'Pro',
    features: ['20 concurrent builds', 'Zero throttling', '100K+ scalable'],
  },

  legal: {
    companyFull: 'File Engine, Inc.',
    jurisdiction: 'Delaware, USA',
    copyrightYear: 2025,
  },

  links: {
    docs: 'https://docs.fileengine.dev',
    github: 'https://github.com/file-engine',
    twitter: 'https://twitter.com/fileengine',
    discord: 'https://discord.gg/fileengine',
    status: 'https://status.fileengine.dev',
    pricing: '/pricing',
  },
}

// =====================================================
// EXPORTS — use these everywhere, never hardcode
// =====================================================

/** The brand config object */
export const brand = BRAND

/** Quick accessors */
export const BRAND_NAME = BRAND.name
export const BRAND_SHORT = BRAND.shortName
export const BRAND_TAGLINE = BRAND.tagline
export const BRAND_DESCRIPTION = BRAND.description
export const BRAND_AI_NAME = BRAND.ai.name
export const BRAND_AI_AVATAR = BRAND.ai.avatar
export const BRAND_LOGO_EMOJI = BRAND.logo.emoji
export const BRAND_LOGO_MARK = BRAND.logo.markText
export const BRAND_VERSION = BRAND.product.version
export const BRAND_DOMAIN = BRAND.domain
export const BRAND_SUPPORT_EMAIL = BRAND.supportEmail

// =====================================================
// CSS VARIABLES — inject into :root
// =====================================================

export function getBrandCSSVars(): string {
  return `
    --brand-primary: ${BRAND.colors.primary};
    --brand-secondary: ${BRAND.colors.primary};
    --brand-accent: ${BRAND.colors.primary};
    --brand-destructive: ${BRAND.colors.orange};
    --brand-warning: ${BRAND.colors.yellow};
    --brand-glow: ${BRAND.colors.glow};
  `
}

// =====================================================
// AI SYSTEM PROMPT IDENTITY BLOCK
// Inject into every AI call's system prompt
// =====================================================

export function getBrandIdentityPrompt(): string {
  const blocked = BRAND.ai.neverMention.map(n => `"${n}"`).join(', ')
  return `IDENTITY:
- You are ${BRAND.ai.name}, ${BRAND.ai.personality}.
- NEVER mention ${blocked} or any AI provider by name.
- If asked who you are: "I'm ${BRAND.ai.name}, ${BRAND.ai.personality}."
- If asked who made you: "${BRAND.companyName} built me."
- Always refer to yourself as "${BRAND.ai.name}".`
}

// =====================================================
// SANITIZER — strip provider names from AI output
// =====================================================

export function sanitizeBrandOutput(text: string): string {
  let result = text
  for (const name of BRAND.ai.neverMention) {
    // Replace provider names with brand name (case-insensitive)
    const regex = new RegExp(`\\b${name}\\b`, 'gi')
    result = result.replace(regex, BRAND.ai.name)
  }
  return result
}

/**
 * Deep-sanitize any value destined for the client.
 * Recursively walks objects/arrays and strips all provider names from strings.
 * Use this on API JSON responses as a last line of defense.
 */
export function sanitizeForClient<T>(value: T): T {
  if (typeof value === 'string') return sanitizeBrandOutput(value) as T
  if (Array.isArray(value)) return value.map(v => sanitizeForClient(v)) as T
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(value)) {
      // Never sanitize keys, only values
      out[k] = sanitizeForClient(v)
    }
    return out as T
  }
  return value
}

/**
 * Check if a string contains any provider name that should never be exposed.
 * Use for runtime assertions in tests and debug builds.
 */
export function containsProviderName(text: string): boolean {
  for (const name of BRAND.ai.neverMention) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(text)) return true
  }
  return false
}

// =====================================================
// METADATA HELPERS
// =====================================================

export function getBrandMetadata() {
  return {
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    openGraph: {
      title: `${BRAND.name} — ${BRAND.tagline}`,
      description: BRAND.description,
      siteName: BRAND.name,
      url: `https://${BRAND.domain}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: BRAND.name,
      description: BRAND.description,
    },
    icons: { icon: '/favicon.ico' },
  }
}

// =====================================================
// EMAIL / NOTIFICATION TEMPLATES
// =====================================================

export function getBrandEmailHeader(): string {
  return `${BRAND.logo.emoji} ${BRAND.name}`
}

export function getBrandEmailFooter(): string {
  return `© ${BRAND.legal.copyrightYear} ${BRAND.legal.companyFull}. All rights reserved.\n${BRAND.supportEmail} | ${BRAND.domain}`
}

// =====================================================
// API RESPONSE HEADERS
// =====================================================

export function getBrandHeaders(): Record<string, string> {
  return {
    'X-Powered-By': BRAND.name,
    'X-Version': BRAND.product.version,
  }
}

// =====================================================
// OVERRIDE FROM ENV (optional runtime override)
// If BRAND_NAME env var is set, use it instead
// =====================================================

if (typeof process !== 'undefined' && process.env?.BRAND_NAME) {
  BRAND.name = process.env.BRAND_NAME
  BRAND.ai.name = process.env.BRAND_NAME
}
if (typeof process !== 'undefined' && process.env?.BRAND_SHORT) {
  BRAND.shortName = process.env.BRAND_SHORT
  BRAND.logo.markText = process.env.BRAND_SHORT
}
if (typeof process !== 'undefined' && process.env?.BRAND_DOMAIN) {
  BRAND.domain = process.env.BRAND_DOMAIN
}
if (typeof process !== 'undefined' && process.env?.BRAND_TAGLINE) {
  BRAND.tagline = process.env.BRAND_TAGLINE
}
if (typeof process !== 'undefined' && process.env?.BRAND_PRIMARY_COLOR) {
  BRAND.colors.primary = process.env.BRAND_PRIMARY_COLOR
}

export default brand

// =====================================================
// MODEL TIER DISPLAY NAMES — use brand name
// =====================================================

export function getBrandModelNames(): Record<string, string> {
  return {
    'claude-sonnet-4-20250514': `${BRAND.name} Pro`,
    'claude-opus-4-0-20250115': `${BRAND.name} Premium`,
    'claude-haiku-4-5-20251001': `${BRAND.name} Fast`,
    'gpt-4o': `${BRAND.name} Pro`,
    'gpt-4o-mini': `${BRAND.name} Fast`,
    'ft:gpt-4o-2024-08-06:az-deal-hub:chat2:DCi22IDX': `${BRAND.name} Fast`,
    'gpt-4-turbo': `${BRAND.name} Pro`,
    'o1': `${BRAND.name} Premium`,
    'o3': `${BRAND.name} Premium`,
    'auto': `${BRAND.name} Auto`,
  }
}

export function getBrandModelTiers() {
  return [
    { id: 'auto', name: `${BRAND.name} Auto`, desc: 'Smart routing' },
    { id: 'fast', name: `${BRAND.name} Fast`, desc: 'Quick responses' },
    { id: 'pro', name: `${BRAND.name} Pro`, desc: 'Best balance' },
    { id: 'premium', name: `${BRAND.name} Premium`, desc: 'Maximum quality' },
  ]
}
