// TEMPORARY DIAGNOSTIC — DELETE AFTER FIX CONFIRMED
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const checks: Record<string, unknown> = {}

  checks['ANTHROPIC_API_KEY'] = process.env.ANTHROPIC_API_KEY
    ? `set (${process.env.ANTHROPIC_API_KEY.length} chars, starts: ${process.env.ANTHROPIC_API_KEY.slice(0, 12)})`
    : 'MISSING'
  checks['OPENAI_API_KEY'] = process.env.OPENAI_API_KEY
    ? `set (${process.env.OPENAI_API_KEY.length} chars)`
    : 'MISSING'
  checks['SERVICE_ROLE_KEY'] = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING'

  // Live Anthropic test
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'say hi' }],
        }),
      })
      const data = await resp.json()
      checks['anthropic_live'] = resp.ok
        ? `OK: ${data.content?.[0]?.text}`
        : `FAILED ${resp.status}: ${JSON.stringify(data.error)}`
    } catch (e) {
      checks['anthropic_live'] = `EXCEPTION: ${e instanceof Error ? e.message : String(e)}`
    }
  }

  // Key pool test
  try {
    const { getKeyWithFailover } = await import('@/lib/key-pool')
    const result = await getKeyWithFailover('anthropic')
    checks['key_pool'] = result
      ? `OK provider=${result.provider} key=${result.key.slice(0, 12)}...`
      : 'NULL — no anthropic key found'
  } catch (e) {
    checks['key_pool'] = `ERROR: ${e instanceof Error ? e.message : String(e)}`
  }

  // admin_api_keys table
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data, error } = await sb.from('admin_api_keys').select('key_name, team_id').limit(10)
      checks['admin_api_keys'] = error
        ? `ERROR: ${error.message}`
        : `${data?.length} rows: [${data?.map((r: Record<string,string>) => r.key_name).join(', ')}]`
      
      // profiles plan col
      const { error: planErr } = await sb.from('profiles').select('plan').limit(1)
      checks['profiles_plan_col'] = planErr ? `MISSING: ${planErr.message}` : 'EXISTS'
    } catch (e) {
      checks['db'] = `EXCEPTION: ${e instanceof Error ? e.message : String(e)}`
    }
  }

  return NextResponse.json({ checks }, { status: 200 })
}
