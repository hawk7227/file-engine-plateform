// =====================================================
// FILE ENGINE — Admin Permissions API
// Route: /api/admin/permissions
//
// Methods:
//   GET    — List all permissions (optionally filter by user/plan/group)
//   POST   — Grant a feature permission
//   DELETE — Revoke a feature permission
//
// Auth: Admin role required (server-side verified)
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role client for admin operations (bypasses RLS)

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase config missing')
  return createClient(url, key)
}

// Verify the caller is an admin
async function verifyAdmin(request: NextRequest): Promise<{ userId: string } | Response> {
  const token = request.headers.get('x-user-token') ||
    request.headers.get('Authorization')?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const supabase = getServiceClient()

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'owner'].includes(profile.role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  return { userId: user.id }
}

// ── GET: List permissions ────────────────────────────
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request)
  if (auth instanceof Response) return auth

  const supabase = getServiceClient()
  const { searchParams } = new URL(request.url)

  const userId = searchParams.get('user_id')
  const plan = searchParams.get('plan')
  const groupId = searchParams.get('group_id')
  const feature = searchParams.get('feature')

  let query = supabase
    .from('feature_permissions')
    .select('*, permission_groups(name)')
    .order('created_at', { ascending: false })

  if (userId) query = query.eq('user_id', userId)
  if (plan) query = query.eq('plan', plan)
  if (groupId) query = query.eq('group_id', groupId)
  if (feature) query = query.eq('feature', feature)

  const { data, error } = await query.limit(500)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Also fetch groups and their member counts
  const { data: groups } = await supabase
    .from('permission_groups')
    .select('id, name, description, created_at')
    .order('name')

  let groupCounts: any[] = []
  try {
    const { data } = await supabase.rpc('get_group_member_counts')
    groupCounts = data || []
  } catch { /* function may not exist yet */ }

  return NextResponse.json({
    permissions: data || [],
    groups: groups || [],
    groupCounts
  })
}

// ── POST: Grant permission ───────────────────────────
export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request)
  if (auth instanceof Response) return auth

  const body = await request.json()
  const { feature, user_id, group_id, plan, enabled, limit_value, limit_period, expires_at, reason } = body

  // Validate
  if (!feature) {
    return NextResponse.json({ error: 'feature is required' }, { status: 400 })
  }

  const targets = [user_id, group_id, plan].filter(Boolean).length
  if (targets !== 1) {
    return NextResponse.json(
      { error: 'Exactly one of user_id, group_id, or plan must be provided' },
      { status: 400 }
    )
  }

  const supabase = getServiceClient()

  // Upsert permission
  const { data, error } = await supabase
    .from('feature_permissions')
    .upsert({
      user_id: user_id || null,
      group_id: group_id || null,
      plan: plan || null,
      feature,
      enabled: enabled ?? true,
      limit_value: limit_value || null,
      limit_period: limit_period || null,
      expires_at: expires_at || null,
      granted_by: auth.userId,
      reason: reason || null,
    }, {
      onConflict: user_id ? 'fp_unique_user_feature'
        : group_id ? 'fp_unique_group_feature'
        : 'fp_unique_plan_feature'
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log to audit
  try {
    await supabase.from('admin_audit_log').insert({
      admin_id: auth.userId,
      action: 'grant_feature',
      details: { feature, user_id, group_id, plan, enabled, reason }
    })
  } catch { /* audit log failure is non-fatal */ }

  return NextResponse.json({ success: true, permission: data })
}

// ── DELETE: Revoke permission ────────────────────────
export async function DELETE(request: NextRequest) {
  const auth = await verifyAdmin(request)
  if (auth instanceof Response) return auth

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const feature = searchParams.get('feature')
  const userId = searchParams.get('user_id')
  const plan = searchParams.get('plan')
  const groupId = searchParams.get('group_id')

  const supabase = getServiceClient()

  let query = supabase.from('feature_permissions').delete()

  if (id) {
    query = query.eq('id', id)
  } else if (feature) {
    query = query.eq('feature', feature)
    if (userId) query = query.eq('user_id', userId)
    if (plan) query = query.eq('plan', plan)
    if (groupId) query = query.eq('group_id', groupId)
  } else {
    return NextResponse.json({ error: 'id or feature+target required' }, { status: 400 })
  }

  const { error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log to audit
  try {
    await supabase.from('admin_audit_log').insert({
      admin_id: auth.userId,
      action: 'revoke_feature',
      details: { id, feature, user_id: userId, group_id: groupId, plan }
    })
  } catch { /* audit log failure is non-fatal */ }

  return NextResponse.json({ success: true })
}
