// =====================================================
// FILE ENGINE — ADMIN COST SETTINGS LOADER
// Caches team settings in-memory, refreshes every 60s
// Smart-context reads from this at request time
// =====================================================

import { supabase } from './supabase'

export interface TeamCostSettings {
  smart_model_routing: boolean
  default_model_tier: 'fast' | 'pro' | 'premium'
  conversation_trimming: boolean
  max_history_pairs: number
  max_message_chars: number
  smart_max_tokens: boolean
  fixed_max_tokens: number
  smart_context: boolean
  prevent_dual_calls: boolean
  skill_caching: boolean
  provider_preference: 'balanced' | 'provider_a' | 'provider_b'
  daily_token_budget: number
  alert_threshold_pct: number
  alert_email: string | null
}

const DEFAULTS: TeamCostSettings = {
  smart_model_routing: true,
  default_model_tier: 'pro',
  conversation_trimming: true,
  max_history_pairs: 6,
  max_message_chars: 3000,
  smart_max_tokens: true,
  fixed_max_tokens: 8192,
  smart_context: true,
  prevent_dual_calls: true,
  skill_caching: true,
  provider_preference: 'balanced',
  daily_token_budget: 0,
  alert_threshold_pct: 80,
  alert_email: null,
}

// =====================================================
// IN-MEMORY CACHE
// One entry per team, refreshes every 60 seconds
// =====================================================

interface CacheEntry {
  settings: TeamCostSettings
  fetchedAt: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 60_000 // 60 seconds

export async function getTeamCostSettings(teamId: string | null): Promise<TeamCostSettings> {
  if (!teamId) return DEFAULTS
  
  // Check cache
  const cached = cache.get(teamId)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.settings
  }
  
  // Fetch from Supabase
  try {
    const { data, error } = await supabase
      .from('team_cost_settings')
      .select('*')
      .eq('team_id', teamId)
      .single()
    
    if (error || !data) {
      // No settings row yet — return defaults
      cache.set(teamId, { settings: DEFAULTS, fetchedAt: Date.now() })
      return DEFAULTS
    }
    
    const settings: TeamCostSettings = {
      smart_model_routing: data.smart_model_routing ?? DEFAULTS.smart_model_routing,
      default_model_tier: data.default_model_tier ?? DEFAULTS.default_model_tier,
      conversation_trimming: data.conversation_trimming ?? DEFAULTS.conversation_trimming,
      max_history_pairs: data.max_history_pairs ?? DEFAULTS.max_history_pairs,
      max_message_chars: data.max_message_chars ?? DEFAULTS.max_message_chars,
      smart_max_tokens: data.smart_max_tokens ?? DEFAULTS.smart_max_tokens,
      fixed_max_tokens: data.fixed_max_tokens ?? DEFAULTS.fixed_max_tokens,
      smart_context: data.smart_context ?? DEFAULTS.smart_context,
      prevent_dual_calls: data.prevent_dual_calls ?? DEFAULTS.prevent_dual_calls,
      skill_caching: data.skill_caching ?? DEFAULTS.skill_caching,
      provider_preference: data.provider_preference ?? DEFAULTS.provider_preference,
      daily_token_budget: data.daily_token_budget ?? DEFAULTS.daily_token_budget,
      alert_threshold_pct: data.alert_threshold_pct ?? DEFAULTS.alert_threshold_pct,
      alert_email: data.alert_email ?? DEFAULTS.alert_email,
    }
    
    cache.set(teamId, { settings, fetchedAt: Date.now() })
    return settings
    
  } catch (err) {
    console.error('[CostSettings] Failed to load:', err)
    return DEFAULTS
  }
}

// Get user's team ID from their profile
export async function getUserTeamId(userId: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', userId)
      .single()
    return data?.team_id || null
  } catch {
    return null
  }
}

// Force cache refresh (called after admin saves settings)
export function invalidateCache(teamId: string): void {
  cache.delete(teamId)
}

export { DEFAULTS as COST_SETTINGS_DEFAULTS }
