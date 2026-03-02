import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validationErrorResponse } from '@/lib/schemas'

// =====================================================
// GET /api/admin/settings — Fetch team cost settings
// PUT /api/admin/settings — Update team cost settings
// Only owner/admin roles can access
// =====================================================

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Get profile with role and team
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, team_id')
    .eq('id', user.id)
    .single()

  return profile
}

function isAdmin(role: string): boolean {
  return role === 'owner' || role === 'admin'
}

// GET — Fetch current settings
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const profile = await getAuthUser(req)
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isAdmin(profile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const teamId = profile.team_id
    if (!teamId) {
      // No team yet — return defaults
      return NextResponse.json({
        settings: getDefaults(),
        usage: null,
        isDefault: true
      })
    }

    // Fetch settings
    const { data: settings } = await supabase
      .from('team_cost_settings')
      .select('*')
      .eq('team_id', teamId)
      .single()

    // Fetch this month's usage summary
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: usageRows } = await supabase
      .from('daily_token_usage')
      .select('*')
      .eq('team_id', teamId)
      .gte('date', startOfMonth.toISOString().split('T')[0])

    // Aggregate usage
    const usage = (usageRows || []).reduce((acc, row) => ({
      totalTokens: acc.totalTokens + (row.total_tokens || 0),
      totalRequests: acc.totalRequests + (row.requests_chat + row.requests_generate + row.requests_fix + row.requests_explain + row.requests_other),
      estimatedCostCents: acc.estimatedCostCents + (row.estimated_cost_cents || 0),
      tierBreakdown: {
        fast: acc.tierBreakdown.fast + (row.tier_fast_count || 0),
        pro: acc.tierBreakdown.pro + (row.tier_pro_count || 0),
        premium: acc.tierBreakdown.premium + (row.tier_premium_count || 0),
      },
      intentBreakdown: {
        chat: acc.intentBreakdown.chat + (row.requests_chat || 0),
        generate: acc.intentBreakdown.generate + (row.requests_generate || 0),
        fix: acc.intentBreakdown.fix + (row.requests_fix || 0),
        explain: acc.intentBreakdown.explain + (row.requests_explain || 0),
        other: acc.intentBreakdown.other + (row.requests_other || 0),
      }
    }), {
      totalTokens: 0,
      totalRequests: 0,
      estimatedCostCents: 0,
      tierBreakdown: { fast: 0, pro: 0, premium: 0 },
      intentBreakdown: { chat: 0, generate: 0, fix: 0, explain: 0, other: 0 }
    })

    return NextResponse.json({
      settings: settings || getDefaults(),
      usage,
      isDefault: !settings
    })

  } catch (error: unknown) {
    console.error('[Admin Settings GET]', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

// PUT — Update settings
export async function PUT(req: NextRequest) {
  try {
    const profile = await getAuthUser(req)
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isAdmin(profile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await req.json() as Record<string, any>
    const teamId = profile.team_id
    if (!teamId) {
      return NextResponse.json({ error: 'No team configured' }, { status: 400 })
    }

    // Validate fields
    const allowedFields = [
      'smart_model_routing', 'default_model_tier', 'conversation_trimming',
      'max_history_pairs', 'max_message_chars', 'smart_max_tokens',
      'fixed_max_tokens', 'smart_context', 'prevent_dual_calls',
      'skill_caching', 'provider_preference', 'daily_token_budget',
      'alert_threshold_pct', 'alert_email'
    ]

    const updates: Record<string, any> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }
    updates.updated_by = profile.id
    updates.updated_at = new Date().toISOString()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Upsert
    const { data, error } = await supabase
      .from('team_cost_settings')
      .upsert({ team_id: teamId, ...updates }, { onConflict: 'team_id' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ settings: data, updated: true })

  } catch (error: unknown) {
    console.error('[Admin Settings PUT]', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}

function getDefaults() {
  return {
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
}
