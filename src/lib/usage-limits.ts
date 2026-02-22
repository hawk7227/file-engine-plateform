// =====================================================
// FILE ENGINE - USAGE LIMITS & RATE LIMITING
// Enterprise-grade per-user limits system
// =====================================================

import { supabase } from './supabase'

// =====================================================
// PLAN DEFINITIONS
// =====================================================

export interface PlanLimits {
  generationsPerDay: number
  generationsPerMonth: number
  premiumPerDay: number          // Max Premium (Opus/o1) requests per day
  proPerDay: number              // Max Pro (Sonnet/GPT-4o) requests per day — overflow goes to fast
  maxTokensPerRequest: number
  maxFilesPerGeneration: number
  validationLevel: 'basic' | 'standard' | 'full'
  priorityQueue: boolean
  privateProjects: boolean
  teamMembers: number
  apiAccess: boolean
  customModels: boolean
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    generationsPerDay: 10,
    generationsPerMonth: 100,
    premiumPerDay: 0,
    proPerDay: 5,
    maxTokensPerRequest: 4000,
    maxFilesPerGeneration: 3,
    validationLevel: 'basic',
    priorityQueue: false,
    privateProjects: false,
    teamMembers: 1,
    apiAccess: false,
    customModels: false
  },
  starter: {
    generationsPerDay: 50,
    generationsPerMonth: 500,
    premiumPerDay: 2,
    proPerDay: 20,
    maxTokensPerRequest: 4000,
    maxFilesPerGeneration: 5,
    validationLevel: 'standard',
    priorityQueue: false,
    privateProjects: true,
    teamMembers: 1,
    apiAccess: false,
    customModels: false
  },
  pro: {
    generationsPerDay: 200,
    generationsPerMonth: 4000,
    premiumPerDay: 5,
    proPerDay: 60,
    maxTokensPerRequest: 8000,
    maxFilesPerGeneration: 10,
    validationLevel: 'full',
    priorityQueue: true,
    privateProjects: true,
    teamMembers: 5,
    apiAccess: true,
    customModels: false
  },
  max: {
    generationsPerDay: 500,
    generationsPerMonth: 10000,
    premiumPerDay: 15,
    proPerDay: 100,
    maxTokensPerRequest: 16000,
    maxFilesPerGeneration: 25,
    validationLevel: 'full',
    priorityQueue: true,
    privateProjects: true,
    teamMembers: 10,
    apiAccess: true,
    customModels: true
  },
  enterprise: {
    generationsPerDay: 1000,
    generationsPerMonth: 20000,
    premiumPerDay: 25,
    proPerDay: 150,
    maxTokensPerRequest: 16000,
    maxFilesPerGeneration: 50,
    validationLevel: 'full',
    priorityQueue: true,
    privateProjects: true,
    teamMembers: Infinity,
    apiAccess: true,
    customModels: true
  }
}

// =====================================================
// USAGE TRACKING
// =====================================================

export interface UsageRecord {
  userId: string
  date: string // YYYY-MM-DD
  generationsCount: number
  tokensUsed: number
  filesGenerated: number
  errorsEncountered: number
}

export interface UsageStats {
  today: UsageRecord
  thisMonth: {
    totalGenerations: number
    totalTokens: number
    totalFiles: number
    dailyBreakdown: UsageRecord[]
  }
  limits: PlanLimits
  remaining: {
    generationsToday: number
    generationsThisMonth: number
  }
  percentUsed: {
    daily: number
    monthly: number
  }
}

// =====================================================
// GET USER'S PLAN
// =====================================================

export async function getUserPlan(userId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .single()
    
    if (error || !data) return 'free'
    if (data.status !== 'active') return 'free'
    
    return data.plan || 'free'
  } catch {
    return 'free'
  }
}

export async function getUserLimits(userId: string): Promise<PlanLimits> {
  const plan = await getUserPlan(userId)
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free
}

// =====================================================
// CHECK IF USER CAN GENERATE
// =====================================================

export interface CanGenerateResult {
  allowed: boolean
  reason?: string
  remainingToday?: number
  remainingThisMonth?: number
  upgradeRequired?: boolean
  nextResetTime?: Date
}

export async function canUserGenerate(userId: string): Promise<CanGenerateResult> {
  const plan = await getUserPlan(userId)
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free
  
  // Get today's date in UTC
  const today = new Date().toISOString().split('T')[0]
  const monthStart = today.slice(0, 7) + '-01'
  
  // Get today's usage
  const { data: todayUsage } = await supabase
    .from('usage')
    .select('generations_count')
    .eq('user_id', userId)
    .eq('date', today)
    .single()
  
  const todayCount = todayUsage?.generations_count || 0
  
  // Check daily limit
  if (todayCount >= limits.generationsPerDay) {
    const tomorrow = new Date()
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    tomorrow.setUTCHours(0, 0, 0, 0)
    
    return {
      allowed: false,
      reason: `Daily limit reached (${limits.generationsPerDay} generations). Resets at midnight UTC.`,
      remainingToday: 0,
      upgradeRequired: plan === 'free',
      nextResetTime: tomorrow
    }
  }
  
  // Get monthly usage
  const { data: monthlyUsage } = await supabase
    .from('usage')
    .select('generations_count')
    .eq('user_id', userId)
    .gte('date', monthStart)
  
  const monthlyCount = monthlyUsage?.reduce((sum, r) => sum + (r.generations_count || 0), 0) || 0
  
  // Check monthly limit
  if (monthlyCount >= limits.generationsPerMonth) {
    const nextMonth = new Date()
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1)
    nextMonth.setUTCDate(1)
    nextMonth.setUTCHours(0, 0, 0, 0)
    
    return {
      allowed: false,
      reason: `Monthly limit reached (${limits.generationsPerMonth} generations). Resets on the 1st.`,
      remainingToday: limits.generationsPerDay - todayCount,
      remainingThisMonth: 0,
      upgradeRequired: plan !== 'enterprise',
      nextResetTime: nextMonth
    }
  }
  
  return {
    allowed: true,
    remainingToday: limits.generationsPerDay - todayCount,
    remainingThisMonth: limits.generationsPerMonth - monthlyCount
  }
}

// =====================================================
// RECORD USAGE
// =====================================================

export async function recordUsage(
  userId: string,
  tokensUsed: number = 0,
  filesGenerated: number = 0,
  hadError: boolean = false
): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  
  // Check if record exists for today
  const { data: existing } = await supabase
    .from('usage')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single()
  
  if (existing) {
    // Update existing record
    await supabase
      .from('usage')
      .update({
        generations_count: existing.generations_count + 1,
        tokens_used: existing.tokens_used + tokensUsed,
        files_generated: existing.files_generated + filesGenerated,
        errors_count: existing.errors_count + (hadError ? 1 : 0),
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
  } else {
    // Create new record
    await supabase
      .from('usage')
      .insert({
        user_id: userId,
        date: today,
        generations_count: 1,
        tokens_used: tokensUsed,
        files_generated: filesGenerated,
        errors_count: hadError ? 1 : 0
      })
  }
}

// =====================================================
// GET USAGE STATS
// =====================================================

export async function getUsageStats(userId: string): Promise<UsageStats> {
  const plan = await getUserPlan(userId)
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free
  
  const today = new Date().toISOString().split('T')[0]
  const monthStart = today.slice(0, 7) + '-01'
  
  // Get today's usage
  const { data: todayData } = await supabase
    .from('usage')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single()
  
  const todayUsage: UsageRecord = {
    userId,
    date: today,
    generationsCount: todayData?.generations_count || 0,
    tokensUsed: todayData?.tokens_used || 0,
    filesGenerated: todayData?.files_generated || 0,
    errorsEncountered: todayData?.errors_count || 0
  }
  
  // Get monthly usage
  const { data: monthlyData } = await supabase
    .from('usage')
    .select('*')
    .eq('user_id', userId)
    .gte('date', monthStart)
    .order('date', { ascending: true })
  
  const monthlyBreakdown = (monthlyData || []).map((r: any) => ({
    userId,
    date: r.date,
    generationsCount: r.generations_count || 0,
    tokensUsed: r.tokens_used || 0,
    filesGenerated: r.files_generated || 0,
    errorsEncountered: r.errors_count || 0
  }))
  
  const totalGenerations = monthlyBreakdown.reduce((sum, r) => sum + r.generationsCount, 0)
  const totalTokens = monthlyBreakdown.reduce((sum, r) => sum + r.tokensUsed, 0)
  const totalFiles = monthlyBreakdown.reduce((sum, r) => sum + r.filesGenerated, 0)
  
  return {
    today: todayUsage,
    thisMonth: {
      totalGenerations,
      totalTokens,
      totalFiles,
      dailyBreakdown: monthlyBreakdown
    },
    limits,
    remaining: {
      generationsToday: Math.max(0, limits.generationsPerDay - todayUsage.generationsCount),
      generationsThisMonth: Math.max(0, limits.generationsPerMonth - totalGenerations)
    },
    percentUsed: {
      daily: limits.generationsPerDay === Infinity ? 0 : (todayUsage.generationsCount / limits.generationsPerDay) * 100,
      monthly: limits.generationsPerMonth === Infinity ? 0 : (totalGenerations / limits.generationsPerMonth) * 100
    }
  }
}

// =====================================================
// RATE LIMITING (Per-minute)
// =====================================================

const rateLimitCache = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(userId: string, maxPerMinute: number = 10): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const key = `rate:${userId}`
  const cached = rateLimitCache.get(key)
  
  // Clean up old entry if reset time passed
  if (cached && cached.resetAt <= now) {
    rateLimitCache.delete(key)
  }
  
  const current = rateLimitCache.get(key)
  
  if (!current) {
    // First request in this minute
    rateLimitCache.set(key, {
      count: 1,
      resetAt: now + 60000 // 1 minute from now
    })
    return { allowed: true }
  }
  
  if (current.count >= maxPerMinute) {
    // Rate limited
    const retryAfter = Math.ceil((current.resetAt - now) / 1000)
    return { allowed: false, retryAfter }
  }
  
  // Increment count
  current.count++
  return { allowed: true }
}

// =====================================================
// MIDDLEWARE HELPER
// =====================================================

export interface UsageCheckResult {
  allowed: boolean
  error?: string
  statusCode?: number
  userId?: string
  plan?: string
  limits?: PlanLimits
  remaining?: {
    today: number
    month: number
  }
}

export async function checkUsageAndRateLimit(userId: string): Promise<UsageCheckResult> {
  // Check rate limit first (faster)
  const rateCheck = checkRateLimit(userId, 20) // 20 requests per minute
  if (!rateCheck.allowed) {
    return {
      allowed: false,
      error: `Rate limited. Try again in ${rateCheck.retryAfter} seconds.`,
      statusCode: 429
    }
  }
  
  // Check usage limits
  const usageCheck = await canUserGenerate(userId)
  if (!usageCheck.allowed) {
    return {
      allowed: false,
      error: usageCheck.reason,
      statusCode: 403
    }
  }
  
  const plan = await getUserPlan(userId)
  const limits = PLAN_LIMITS[plan]
  
  return {
    allowed: true,
    userId,
    plan,
    limits,
    remaining: {
      today: usageCheck.remainingToday || 0,
      month: usageCheck.remainingThisMonth || 0
    }
  }
}

// =====================================================
// USAGE ALERTS
// =====================================================

export async function checkUsageAlerts(userId: string): Promise<string[]> {
  const stats = await getUsageStats(userId)
  const alerts: string[] = []
  
  // 80% daily usage warning
  if (stats.percentUsed.daily >= 80 && stats.percentUsed.daily < 100) {
    alerts.push(`You've used ${Math.round(stats.percentUsed.daily)}% of your daily generations.`)
  }
  
  // 80% monthly usage warning
  if (stats.percentUsed.monthly >= 80 && stats.percentUsed.monthly < 100) {
    alerts.push(`You've used ${Math.round(stats.percentUsed.monthly)}% of your monthly generations.`)
  }
  
  // Daily limit reached
  if (stats.remaining.generationsToday === 0) {
    alerts.push('Daily generation limit reached. Resets at midnight UTC.')
  }
  
  // Monthly limit reached
  if (stats.remaining.generationsThisMonth === 0) {
    alerts.push('Monthly generation limit reached. Consider upgrading your plan.')
  }
  
  return alerts
}
