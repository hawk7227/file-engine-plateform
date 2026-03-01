// ═══════════════════════════════════════════════════════════════════════════
// ENV VALIDATION — CONSTITUTION §4
// No external dependencies. Application refuses to start if invalid.
// ═══════════════════════════════════════════════════════════════════════════

export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  ANTHROPIC_API_KEY?: string
  OPENAI_API_KEY?: string
  VERCEL_TOKEN?: string
  GITHUB_TOKEN?: string
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string
  REDIS_URL?: string
  BULL_REDIS_URL?: string
  ELEVENLABS_API_KEY?: string
  STABILITY_API_KEY?: string
  RUNWAY_API_KEY?: string
  NODE_ENV: string
  NEXT_PUBLIC_APP_URL?: string
}

let _env: Env | null = null

export function validateEnv(): Env {
  if (_env) return _env

  const e = process.env
  const errors: string[] = []

  if (!e.NEXT_PUBLIC_SUPABASE_URL) errors.push('NEXT_PUBLIC_SUPABASE_URL is required')
  if (!e.NEXT_PUBLIC_SUPABASE_ANON_KEY) errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
  if (!e.SUPABASE_SERVICE_ROLE_KEY) errors.push('SUPABASE_SERVICE_ROLE_KEY is required')
  if (!e.ANTHROPIC_API_KEY && !e.OPENAI_API_KEY) errors.push('At least one AI provider key required')

  if (errors.length > 0) {
    const msg = errors.map((m) => `  ✗ ${m}`).join('\n')
    console.error('\n══ ENV VALIDATION FAILED ══\n' + msg + '\n══════════════════════════\n')
    if (e.NODE_ENV === 'production') throw new Error('Env validation failed:\n' + msg)
  }

  _env = {
    NEXT_PUBLIC_SUPABASE_URL: e.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: e.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    SUPABASE_SERVICE_ROLE_KEY: e.SUPABASE_SERVICE_ROLE_KEY || '',
    ANTHROPIC_API_KEY: e.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: e.OPENAI_API_KEY,
    VERCEL_TOKEN: e.VERCEL_TOKEN,
    GITHUB_TOKEN: e.GITHUB_TOKEN,
    STRIPE_SECRET_KEY: e.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: e.STRIPE_WEBHOOK_SECRET,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: e.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    REDIS_URL: e.REDIS_URL,
    BULL_REDIS_URL: e.BULL_REDIS_URL,
    ELEVENLABS_API_KEY: e.ELEVENLABS_API_KEY,
    STABILITY_API_KEY: e.STABILITY_API_KEY,
    RUNWAY_API_KEY: e.RUNWAY_API_KEY,
    NODE_ENV: e.NODE_ENV || 'development',
    NEXT_PUBLIC_APP_URL: e.NEXT_PUBLIC_APP_URL,
  }
  return _env
}

export function env(): Env {
  return _env ?? validateEnv()
}

export default env
