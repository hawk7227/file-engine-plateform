import { createClient } from './supabase/client'
import { PLAN_LIMITS } from './types'

// Browser-side Supabase client — lazy singleton
// Deferred init prevents build crash when env vars aren't available during static generation
let _supabase: ReturnType<typeof createClient> | null = null
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    if (!_supabase) _supabase = createClient()
    return (_supabase as any)[prop]
  }
})

// ─── Auth: Sign Up (sends OTP confirmation email) ───────────────────────────
// Profile & subscription are auto-created by the DB trigger on auth.users INSERT
export async function signUp(email: string, password: string, fullName: string) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  })
}

// ─── Auth: Verify signup OTP ──────────────────────────────────────────────────
// Profile + subscription are created by the DB trigger — no manual upsert needed
export async function verifyEmailOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'signup',
  })
  // Trigger handles profile/subscription creation automatically
  return { data, error }
}

// ─── Auth: Forgot password — sends OTP recovery email ────────────────────────
export async function sendPasswordResetOtp(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {})
}

// ─── Auth: Verify recovery OTP ───────────────────────────────────────────────
export async function verifyPasswordResetOtp(email: string, token: string) {
  return supabase.auth.verifyOtp({
    email,
    token,
    type: 'recovery',
  })
}

// ─── Auth: Update password (after recovery OTP verified) ─────────────────────
export async function updatePassword(newPassword: string) {
  return supabase.auth.updateUser({ password: newPassword })
}

// ─── Auth: Standard email/password login ─────────────────────────────────────
export async function login(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

// ─── Auth: OAuth ─────────────────────────────────────────────────────────────
export async function loginWithOAuth(provider: 'google' | 'github') {
  return supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    }
  })
}

export async function logout() {
  return supabase.auth.signOut()
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getProfile(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}

export async function getSubscription(userId: string) {
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()
  return data
}

export async function updateProfile(userId: string, updates: any) {
  return supabase.from('profiles').update(updates).eq('id', userId)
}

// ─── Generation Usage: get today's count ─────────────────────────────────────
export async function getUsageToday(userId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('generation_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('date', today)
    .single()
  return (data as any)?.count ?? 0
}

// ─── Generation Usage: check limit & increment ───────────────────────────────
// Returns { allowed: boolean, used: number, limit: number }
export async function checkAndIncrementUsage(
  userId: string,
  plan: 'free' | 'pro' | 'enterprise'
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const limit = PLAN_LIMITS[plan].generations_per_day
  const today = new Date().toISOString().split('T')[0]

  // Upsert: insert row for today if not exists, then increment
  const { data, error } = await supabase.rpc('increment_generation_usage', {
    p_user_id: userId,
    p_date: today,
  })

  if (error) {
    // Fallback: just check current count without incrementing
    const used = await getUsageToday(userId)
    return { allowed: limit === Infinity || used < limit, used, limit: limit === Infinity ? 999999 : limit }
  }

  const used = (data as number) ?? 0
  const allowed = limit === Infinity || used <= limit
  return { allowed, used, limit: limit === Infinity ? 999999 : limit }
}
