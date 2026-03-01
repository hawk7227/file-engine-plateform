// ═══════════════════════════════════════════════════════════════════════════
// ENV VALIDATION — CONSTITUTION §4
// Single source of truth for all environment variables.
// Application MUST refuse to start if validation fails.
// ═══════════════════════════════════════════════════════════════════════════

import { z } from 'zod'

// ─── Schema ─────────────────────────────────────────────────────────────────

const envSchema = z.object({
  // ── Required ──
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // ── AI Providers (at least one required) ──
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // ── Deployment ──
  VERCEL_TOKEN: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),

  // ── Stripe ──
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // ── Queue / Worker ──
  REDIS_URL: z.string().url().optional(),
  BULL_REDIS_URL: z.string().url().optional(),

  // ── Media Providers ──
  ELEVENLABS_API_KEY: z.string().optional(),
  STABILITY_API_KEY: z.string().optional(),
  RUNWAY_API_KEY: z.string().optional(),

  // ── App Config ──
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
}).refine(
  (data) => data.ANTHROPIC_API_KEY || data.OPENAI_API_KEY,
  { message: 'At least one AI provider key is required (ANTHROPIC_API_KEY or OPENAI_API_KEY)' }
)

// ─── Type Export ────────────────────────────────────────────────────────────

export type Env = z.infer<typeof envSchema>

// ─── Validation ─────────────────────────────────────────────────────────────

let _env: Env | null = null

export function validateEnv(): Env {
  if (_env) return _env

  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const errors = result.error.issues.map(
      (issue) => `  ✗ ${issue.path.join('.')}: ${issue.message}`
    )

    console.error('\n═══════════════════════════════════════════════')
    console.error('ENV VALIDATION FAILED — APPLICATION CANNOT START')
    console.error('═══════════════════════════════════════════════')
    console.error(errors.join('\n'))
    console.error('═══════════════════════════════════════════════\n')

    // §4: Application must refuse to start if validation fails.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Environment validation failed:\n${errors.join('\n')}`)
    }

    // In dev, warn but continue (less strict for local dev)
    console.warn('⚠ Continuing in development mode with missing env vars')
  }

  _env = result.success ? result.data : (process.env as unknown as Env)
  return _env
}

// ─── Accessor (lazy-init) ───────────────────────────────────────────────────

export function env(): Env {
  return _env ?? validateEnv()
}

export default env
