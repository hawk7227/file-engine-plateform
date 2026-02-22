// =====================================================
// FILE ENGINE — Permission System (Server-Side)
//
// Features:
//   - hasFeature(userId, feature) → boolean check
//   - getUserFeatures(userId) → all active features
//   - In-memory cache with TTL (5 min)
//   - Feature key registry with metadata
//   - Timeout protection on all DB calls
//   - Batch check for multiple features at once
// =====================================================

import { supabase } from '@/lib/supabase'

// ── Feature Key Registry ─────────────────────────────
// Single source of truth for all gated features

export const FEATURE_KEYS = {
  // Deployment
  deploy_vercel: 'deploy_vercel',
  deploy_github: 'deploy_github',
  preview_panel: 'preview_panel',
  build_verify: 'build_verify',

  // AI Enhancement
  auto_fix: 'auto_fix',
  user_fix: 'user_fix',
  generate_validated: 'generate_validated',
  code_execution: 'code_execution',
  extended_thinking: 'extended_thinking',

  // Media & Vision
  media_generation: 'media_generation',
  vision_analysis: 'vision_analysis',
  image_search: 'image_search',

  // Memory & Intelligence
  memory_persistent: 'memory_persistent',
  advanced_models: 'advanced_models',

  // Collaboration
  team_features: 'team_features',
  byok: 'byok',

  // Utility
  export_zip: 'export_zip',
  url_import: 'url_import',
  batch_operations: 'batch_operations',
} as const

export type FeatureKey = typeof FEATURE_KEYS[keyof typeof FEATURE_KEYS]

// Feature metadata for admin UI and upsell messages
export const FEATURE_META: Record<FeatureKey, {
  label: string
  description: string
  category: 'deployment' | 'ai' | 'media' | 'memory' | 'collaboration' | 'utility'
  suggestedPlan: 'pro' | 'enterprise'
  upsellMessage: string
}> = {
  deploy_vercel: {
    label: 'Deploy to Vercel',
    description: 'One-click deployment to Vercel hosting',
    category: 'deployment',
    suggestedPlan: 'pro',
    upsellMessage: 'Deploy your projects live with one click on the Pro plan.'
  },
  deploy_github: {
    label: 'Push to GitHub',
    description: 'Push generated code to GitHub repositories',
    category: 'deployment',
    suggestedPlan: 'pro',
    upsellMessage: 'Push your code directly to GitHub on the Pro plan.'
  },
  preview_panel: {
    label: 'Live Preview Panel',
    description: 'Right-side panel with live code preview',
    category: 'deployment',
    suggestedPlan: 'pro',
    upsellMessage: 'See live previews of your code as it generates on the Pro plan.'
  },
  build_verify: {
    label: 'Build Verification',
    description: 'Automated build testing and status tracking',
    category: 'deployment',
    suggestedPlan: 'pro',
    upsellMessage: 'Verify your builds automatically on the Pro plan.'
  },
  auto_fix: {
    label: 'AI Auto-Fix',
    description: 'Automatic error detection and fixing pipeline',
    category: 'ai',
    suggestedPlan: 'enterprise',
    upsellMessage: 'AI automatically fixes code errors on the Enterprise plan.'
  },
  user_fix: {
    label: 'Feedback Fix Loop',
    description: 'User feedback → AI fix iteration cycle',
    category: 'ai',
    suggestedPlan: 'pro',
    upsellMessage: 'Iterate on fixes with AI feedback on the Pro plan.'
  },
  generate_validated: {
    label: 'Validated Generation',
    description: 'Code generation with TypeScript validation',
    category: 'ai',
    suggestedPlan: 'pro',
    upsellMessage: 'Get validated, error-free code generation on the Pro plan.'
  },
  code_execution: {
    label: 'Code Execution',
    description: 'Run code in a sandboxed environment',
    category: 'ai',
    suggestedPlan: 'pro',
    upsellMessage: 'Execute and test code in a sandbox on the Pro plan.'
  },
  extended_thinking: {
    label: 'Extended Thinking',
    description: 'Deep reasoning mode for complex problems',
    category: 'ai',
    suggestedPlan: 'enterprise',
    upsellMessage: 'Enable deep reasoning for complex tasks on the Enterprise plan.'
  },
  media_generation: {
    label: 'Media Generation',
    description: 'Generate images, video, audio, and 3D content',
    category: 'media',
    suggestedPlan: 'pro',
    upsellMessage: 'Generate images, videos, and audio on the Pro plan.'
  },
  vision_analysis: {
    label: 'Vision Analysis',
    description: 'Upload and analyze images with AI',
    category: 'media',
    suggestedPlan: 'pro',
    upsellMessage: 'Analyze images and screenshots with AI on the Pro plan.'
  },
  image_search: {
    label: 'Image Search',
    description: 'AI searches for relevant images',
    category: 'media',
    suggestedPlan: 'pro',
    upsellMessage: 'Search for images within conversations on the Pro plan.'
  },
  memory_persistent: {
    label: 'Persistent Memory',
    description: 'AI remembers preferences across sessions',
    category: 'memory',
    suggestedPlan: 'pro',
    upsellMessage: 'AI remembers your coding style and preferences on the Pro plan.'
  },
  advanced_models: {
    label: 'Advanced Models',
    description: 'Access to Claude Opus, GPT-4, and other premium models',
    category: 'memory',
    suggestedPlan: 'pro',
    upsellMessage: 'Access the most powerful AI models on the Pro plan.'
  },
  team_features: {
    label: 'Team Collaboration',
    description: 'Create teams, share projects, collaborate',
    category: 'collaboration',
    suggestedPlan: 'enterprise',
    upsellMessage: 'Collaborate with your team on the Enterprise plan.'
  },
  byok: {
    label: 'Bring Your Own Key',
    description: 'Use personal API keys for unlimited generation',
    category: 'collaboration',
    suggestedPlan: 'enterprise',
    upsellMessage: 'Use your own API keys for unlimited usage on the Enterprise plan.'
  },
  export_zip: {
    label: 'Export as ZIP',
    description: 'Download projects as ZIP files',
    category: 'utility',
    suggestedPlan: 'pro',
    upsellMessage: 'Export your projects as downloadable ZIPs on the Pro plan.'
  },
  url_import: {
    label: 'URL Import',
    description: 'Import content from URLs into projects',
    category: 'utility',
    suggestedPlan: 'pro',
    upsellMessage: 'Import content from any URL on the Pro plan.'
  },
  batch_operations: {
    label: 'Batch Operations',
    description: 'Process multiple files in batch',
    category: 'utility',
    suggestedPlan: 'enterprise',
    upsellMessage: 'Process files in batch on the Enterprise plan.'
  },
}

// ── Cache ────────────────────────────────────────────
// In-memory cache to avoid hitting Supabase on every request
// TTL: 5 minutes. Cleared on permission changes.

interface CacheEntry {
  features: Set<string>
  timestamp: number
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const permissionCache = new Map<string, CacheEntry>()

function getCached(userId: string): Set<string> | null {
  const entry = permissionCache.get(userId)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    permissionCache.delete(userId)
    return null
  }
  return entry.features
}

function setCache(userId: string, features: Set<string>) {
  permissionCache.set(userId, { features, timestamp: Date.now() })
}

export function clearPermissionCache(userId?: string) {
  if (userId) {
    permissionCache.delete(userId)
  } else {
    permissionCache.clear()
  }
}

// ── Timeout wrapper ──────────────────────────────────
const QUERY_TIMEOUT_MS = 3000

function withTimeout<T>(promise: PromiseLike<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${QUERY_TIMEOUT_MS}ms`))
    }, QUERY_TIMEOUT_MS)

    Promise.resolve(promise)
      .then((result) => { clearTimeout(timer); resolve(result) })
      .catch((err) => { clearTimeout(timer); reject(err) })
  })
}

// ── Core: Check single feature ───────────────────────

export async function hasFeature(userId: string, feature: string): Promise<boolean> {
  try {
    // Check cache first
    const cached = getCached(userId)
    if (cached) {
      return cached.has(feature)
    }

    // Cache miss — load all features and cache
    const features = await loadUserFeatures(userId)
    return features.has(feature)

  } catch (err: any) {
    console.error(`[permissions] hasFeature(${feature}) failed:`, err.message)
    // Fail CLOSED — deny on error (security-first)
    return false
  }
}

// ── Core: Check multiple features at once ────────────

export async function hasFeatures(
  userId: string, 
  features: string[]
): Promise<Record<string, boolean>> {
  try {
    const cached = getCached(userId)
    const featureSet = cached || await loadUserFeatures(userId)

    const result: Record<string, boolean> = {}
    for (const f of features) {
      result[f] = featureSet.has(f)
    }
    return result

  } catch (err: any) {
    console.error('[permissions] hasFeatures failed:', err.message)
    // Fail closed — deny all
    const result: Record<string, boolean> = {}
    for (const f of features) {
      result[f] = false
    }
    return result
  }
}

// ── Core: Get all features for a user ────────────────

export interface UserFeature {
  feature: string
  source: string
  expires_at: string | null
  limit_value: number | null
  limit_period: string | null
}

export async function getUserFeatures(userId: string): Promise<UserFeature[]> {
  try {
    const { data, error } = await withTimeout(
      supabase.rpc('get_user_features', { p_user_id: userId }),
      'get_user_features RPC'
    )

    if (error) throw error
    return (data as UserFeature[]) || []

  } catch (err: any) {
    console.error('[permissions] getUserFeatures failed:', err.message)
    return []
  }
}

// ── Internal: Load and cache all features ────────────

async function loadUserFeatures(userId: string): Promise<Set<string>> {
  const { data, error } = await withTimeout(
    supabase.rpc('get_user_features', { p_user_id: userId }),
    'get_user_features RPC'
  )

  if (error) throw error

  const features = new Set<string>(
    ((data as UserFeature[]) || []).map(f => f.feature)
  )

  setCache(userId, features)
  return features
}

// ── Middleware helper: require feature or 403 ────────

export async function requireFeature(
  userId: string, 
  feature: FeatureKey
): Promise<Response | null> {
  const allowed = await hasFeature(userId, feature)
  
  if (!allowed) {
    const meta = FEATURE_META[feature]
    return Response.json({
      error: 'Feature not available',
      feature,
      message: meta?.upsellMessage || `This feature requires an upgraded plan.`,
      suggestedPlan: meta?.suggestedPlan || 'pro'
    }, { status: 403 })
  }

  return null // null means allowed — continue processing
}

// ── Admin: Grant/revoke permissions ──────────────────

export async function grantFeature(params: {
  feature: string
  userId?: string
  groupId?: string
  plan?: string
  grantedBy: string
  enabled?: boolean
  limitValue?: number
  limitPeriod?: 'day' | 'week' | 'month'
  expiresAt?: string
  reason?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('feature_permissions')
      .upsert({
        user_id: params.userId || null,
        group_id: params.groupId || null,
        plan: params.plan || null,
        feature: params.feature,
        enabled: params.enabled ?? true,
        limit_value: params.limitValue || null,
        limit_period: params.limitPeriod || null,
        expires_at: params.expiresAt || null,
        granted_by: params.grantedBy,
        reason: params.reason || null,
      }, {
        onConflict: params.userId ? 'user_id,feature'
          : params.groupId ? 'group_id,feature'
          : 'plan,feature'
      })

    if (error) throw error

    // Clear cache for affected users
    if (params.userId) {
      clearPermissionCache(params.userId)
    } else {
      // Group or plan change — clear entire cache
      clearPermissionCache()
    }

    return { success: true }

  } catch (err: any) {
    console.error('[permissions] grantFeature failed:', err.message)
    return { success: false, error: err.message }
  }
}

export async function revokeFeature(params: {
  feature: string
  userId?: string
  groupId?: string
  plan?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    let query = supabase
      .from('feature_permissions')
      .delete()
      .eq('feature', params.feature)

    if (params.userId) query = query.eq('user_id', params.userId)
    if (params.groupId) query = query.eq('group_id', params.groupId)
    if (params.plan) query = query.eq('plan', params.plan)

    const { error } = await query

    if (error) throw error

    if (params.userId) {
      clearPermissionCache(params.userId)
    } else {
      clearPermissionCache()
    }

    return { success: true }

  } catch (err: any) {
    console.error('[permissions] revokeFeature failed:', err.message)
    return { success: false, error: err.message }
  }
}
