// =====================================================
// FILE ENGINE — usePermissions Hook (Client-Side)
//
// Loads the current user's active feature permissions
// and provides a simple has('feature_key') API.
//
// Features:
//   - Fetches all permissions on mount
//   - 5-second timeout with graceful fallback
//   - Caches in React state (re-fetched on user change)
//   - has() returns false during loading (fail closed)
//   - Batch check via hasAll() and hasAny()
//   - upsellMessage() for gated feature prompts
//   - Refresh on demand
// =====================================================

'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// ── Feature keys (must match server-side FEATURE_KEYS) ──

export const FEATURES = {
  deploy_vercel: 'deploy_vercel',
  deploy_github: 'deploy_github',
  preview_panel: 'preview_panel',
  build_verify: 'build_verify',
  auto_fix: 'auto_fix',
  user_fix: 'user_fix',
  generate_validated: 'generate_validated',
  code_execution: 'code_execution',
  extended_thinking: 'extended_thinking',
  media_generation: 'media_generation',
  vision_analysis: 'vision_analysis',
  image_search: 'image_search',
  memory_persistent: 'memory_persistent',
  advanced_models: 'advanced_models',
  team_features: 'team_features',
  byok: 'byok',
  export_zip: 'export_zip',
  url_import: 'url_import',
  batch_operations: 'batch_operations',
} as const

export type Feature = typeof FEATURES[keyof typeof FEATURES]

// ── Upsell messages (client-side copy) ───────────────

const UPSELL_MESSAGES: Partial<Record<Feature, { message: string; plan: string }>> = {
  deploy_vercel: { message: 'Deploy your projects live with one click.', plan: 'Pro' },
  deploy_github: { message: 'Push your code directly to GitHub.', plan: 'Pro' },
  preview_panel: { message: 'See live previews of your code as it generates.', plan: 'Pro' },
  media_generation: { message: 'Generate images, videos, and audio.', plan: 'Pro' },
  vision_analysis: { message: 'Analyze images and screenshots with AI.', plan: 'Pro' },
  code_execution: { message: 'Execute and test code in a sandbox.', plan: 'Pro' },
  memory_persistent: { message: 'AI remembers your coding style and preferences.', plan: 'Pro' },
  advanced_models: { message: 'Access the most powerful AI models.', plan: 'Pro' },
  auto_fix: { message: 'AI automatically fixes code errors.', plan: 'Enterprise' },
  byok: { message: 'Use your own API keys for unlimited usage.', plan: 'Enterprise' },
  team_features: { message: 'Collaborate with your team.', plan: 'Enterprise' },
  extended_thinking: { message: 'Enable deep reasoning for complex tasks.', plan: 'Enterprise' },
  export_zip: { message: 'Export your projects as downloadable ZIPs.', plan: 'Pro' },
  url_import: { message: 'Import content from any URL.', plan: 'Pro' },
}

// ── Types ────────────────────────────────────────────

interface PermissionEntry {
  feature: string
  source: string
  expires_at: string | null
  limit_value: number | null
  limit_period: string | null
}

export interface UsePermissionsReturn {
  /** Check if user has a specific feature */
  has: (feature: string) => boolean
  /** Check if user has ALL of these features */
  hasAll: (...features: string[]) => boolean
  /** Check if user has ANY of these features */
  hasAny: (...features: string[]) => boolean
  /** Get upsell info for a gated feature */
  getUpsell: (feature: string) => { message: string; plan: string } | null
  /** All active feature keys */
  features: Set<string>
  /** Full permission details (with source, expiry) */
  details: PermissionEntry[]
  /** Loading state */
  loading: boolean
  /** Error state */
  error: string | null
  /** Re-fetch permissions */
  refresh: () => Promise<void>
}

// ── Constants ────────────────────────────────────────
const QUERY_TIMEOUT_MS = 5000

// ── Hook ─────────────────────────────────────────────

export function usePermissions(): UsePermissionsReturn {
  const [features, setFeatures] = useState<Set<string>>(new Set())
  const [details, setDetails] = useState<PermissionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const loadPermissions = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (!mountedRef.current) return
      if (authError || !user) {
        setFeatures(new Set())
        setDetails([])
        setLoading(false)
        return
      }

      // Call the RPC with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS)

      const { data, error: rpcError } = await supabase
        .rpc('get_user_features', { p_user_id: user.id })

      clearTimeout(timeoutId)

      if (!mountedRef.current) return

      if (rpcError) {
        throw new Error(`Permission check failed: ${rpcError.message}`)
      }

      const entries = (data as PermissionEntry[]) || []
      const featureSet = new Set(entries.map(e => e.feature))

      setFeatures(featureSet)
      setDetails(entries)
      setError(null)

    } catch (err: any) {
      if (!mountedRef.current) return

      console.error('[usePermissions] Failed:', err.message)
      setError(err.message)
      // Fail closed — empty feature set (deny all gated features)
      setFeatures(new Set())
      setDetails([])

    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [])

  // Load on mount
  useEffect(() => {
    mountedRef.current = true
    loadPermissions()

    // Re-load when auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (mountedRef.current) {
        loadPermissions()
      }
    })

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [loadPermissions])

  // ── API ────────────────────────────────────────────

  const has = useCallback((feature: string): boolean => {
    // Fail closed during loading — deny by default
    return features.has(feature)
  }, [features])

  const hasAll = useCallback((...featureList: string[]): boolean => {
    return featureList.every(f => features.has(f))
  }, [features])

  const hasAny = useCallback((...featureList: string[]): boolean => {
    return featureList.some(f => features.has(f))
  }, [features])

  const getUpsell = useCallback((feature: string): { message: string; plan: string } | null => {
    if (features.has(feature)) return null // user already has it
    return UPSELL_MESSAGES[feature as Feature] || {
      message: 'This feature requires an upgraded plan.',
      plan: 'Pro'
    }
  }, [features])

  return {
    has,
    hasAll,
    hasAny,
    getUpsell,
    features,
    details,
    loading,
    error,
    refresh: loadPermissions,
  }
}
