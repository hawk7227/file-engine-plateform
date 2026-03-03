// =====================================================
// CONVERSATIONS API — List + Create
//
// GET  /api/conversations — List user's conversations
// POST /api/conversations — Create new conversation
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabaseClient(authHeader?: string | null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  if (authHeader) {
    return createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
  }
  return createClient(url, anonKey)
}

function getUserId(request: NextRequest): string | null {
  // Extract from auth header or cookie
  return null // Will be resolved by Supabase RLS via auth header
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = getSupabaseClient(authHeader)
    const { searchParams } = new URL(request.url)

    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const archived = searchParams.get('archived') === 'true'
    const search = searchParams.get('search') || ''
    const sort = searchParams.get('sort') || 'updated_at'
    const order = searchParams.get('order') || 'desc'

    let query = supabase
      .from('conversations')
      .select('id, title, model, project_id, archived, pinned, created_at, updated_at', { count: 'exact' })
      .eq('archived', archived)
      .order(sort, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[Conversations GET]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      conversations: data || [],
      total: count || 0,
      has_more: (count || 0) > offset + limit,
    })
  } catch (err: unknown) {
    console.error('[Conversations GET Error]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = getSupabaseClient(authHeader)

    // Get user ID from auth
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { project_id, model, settings_json, title } = body

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        project_id: project_id || null,
        model: model || 'auto',
        settings_json: settings_json || {},
        title: title || 'New chat',
      })
      .select('id, title, model, created_at, updated_at')
      .single()

    if (error) {
      console.error('[Conversations POST]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err: unknown) {
    console.error('[Conversations POST Error]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
