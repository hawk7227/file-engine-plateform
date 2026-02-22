// =====================================================
// USER SETTINGS API — White-label proxy
// Hides DB column names from client JS bundles
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Config missing')
  return createClient(url, key)
}

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const sb = getClient()
  const { data: { user } } = await sb.auth.getUser(token)
  return user?.id || null
}

export async function GET(request: NextRequest) {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const sb = getClient()
  const { data, error } = await sb
    .from('profiles')
    .select('preferred_model, claude_api_key, openai_api_key')
    .eq('id', userId)
    .single()

  if (error) return NextResponse.json({ error: 'Load failed' }, { status: 500 })

  // Return with generic field names — no provider names
  return NextResponse.json({
    model: data?.preferred_model || 'fast',
    primaryKey: data?.claude_api_key ? '••••' + data.claude_api_key.slice(-4) : '',
    secondaryKey: data?.openai_api_key ? '••••' + data.openai_api_key.slice(-4) : '',
    hasPrimaryKey: !!data?.claude_api_key,
    hasSecondaryKey: !!data?.openai_api_key,
  })
}

export async function POST(request: NextRequest) {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { model, primaryKey, secondaryKey } = await request.json()

  const sb = getClient()
  const updates: Record<string, any> = {}

  if (model !== undefined) updates.preferred_model = model
  if (primaryKey !== undefined) updates.claude_api_key = primaryKey || null
  if (secondaryKey !== undefined) updates.openai_api_key = secondaryKey || null

  const { error } = await sb
    .from('profiles')
    .update(updates)
    .eq('id', userId)

  if (error) return NextResponse.json({ error: 'Save failed' }, { status: 500 })

  return NextResponse.json({ success: true })
}
