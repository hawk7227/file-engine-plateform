import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// =====================================================
// /api/admin/keys/debug — Surfaces auth + DB status
// Admin-only. Used to diagnose key save failures.
// DELETE THIS ENDPOINT after confirming Save works.
// =====================================================

export const dynamic = 'force-dynamic'
export const maxDuration = 15

const ADMIN_SECRET = process.env.ADMIN_PANEL_SECRET || ''
const OWNER_ID = process.env.ADMIN_OWNER_ID || ''

export async function GET(req: NextRequest) {
  const checks: Record<string, unknown> = {}

  // 1. Env vars
  checks['env_ADMIN_PANEL_SECRET'] = ADMIN_SECRET ? `set (${ADMIN_SECRET.length} chars)` : 'MISSING'
  checks['env_ADMIN_OWNER_ID'] = OWNER_ID ? `set: ${OWNER_ID}` : 'MISSING'
  checks['env_SUPABASE_URL'] = process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'MISSING'
  checks['env_SERVICE_ROLE_KEY'] = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING'

  // 2. Auth header check
  const sentSecret = req.headers.get('X-Admin-Secret')
  const sentBearer = req.headers.get('Authorization')
  checks['header_X-Admin-Secret'] = sentSecret ? `received: "${sentSecret}"` : 'not sent'
  checks['header_Authorization'] = sentBearer ? `received (${sentBearer.length} chars)` : 'not sent'
  checks['secret_match'] = sentSecret && sentSecret === ADMIN_SECRET ? 'MATCH ✓' : `NO MATCH — server expects "${ADMIN_SECRET}", got "${sentSecret}"`

  // 3. Supabase table check
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data, error } = await supabase
      .from('admin_api_keys')
      .select('team_id, key_name')
      .limit(1)

    if (error) {
      checks['table_admin_api_keys'] = `ERROR: ${error.message} (code: ${error.code})`
    } else {
      checks['table_admin_api_keys'] = `EXISTS — ${data?.length ?? 0} row(s) visible`
    }

    // 4. Test upsert with a dummy row to verify write access
    const testTeamId = OWNER_ID || 'test-team'
    const { error: upsertErr } = await supabase
      .from('admin_api_keys')
      .upsert({
        team_id: testTeamId,
        key_name: '__debug_test__',
        encrypted_value: 'debug:test:value',
        updated_by: OWNER_ID || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'team_id,key_name' })

    if (upsertErr) {
      checks['write_test'] = `FAILED: ${upsertErr.message} (code: ${upsertErr.code})`
    } else {
      checks['write_test'] = 'SUCCESS — upsert worked'
      // Clean up test row
      await supabase
        .from('admin_api_keys')
        .delete()
        .eq('team_id', testTeamId)
        .eq('key_name', '__debug_test__')
    }
  } catch (e) {
    checks['supabase_error'] = e instanceof Error ? e.message : String(e)
  }

  // 5. GoTrue Bearer verify (if token sent)
  if (sentBearer) {
    const token = sentBearer.replace('Bearer ', '')
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const res = await fetch(`${url}/auth/v1/user`, {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${token}`,
        },
      })
      if (res.ok) {
        const user = await res.json()
        checks['bearer_verify'] = `VALID — user: ${user.email}, id: ${user.id}`
      } else {
        checks['bearer_verify'] = `FAILED — HTTP ${res.status}`
      }
    } catch (e) {
      checks['bearer_verify'] = `ERROR — ${e instanceof Error ? e.message : String(e)}`
    }
  } else {
    checks['bearer_verify'] = 'skipped (no Bearer sent)'
  }

  return NextResponse.json({ debug: true, checks }, { status: 200 })
}
