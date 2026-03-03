// =====================================================
// MESSAGES API — List + Save
//
// GET  /api/conversations/[id]/messages — List messages with pagination
// POST /api/conversations/[id]/messages — Save a new message
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabaseClient(authHeader: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  )
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const supabase = getSupabaseClient(authHeader)
    const { searchParams } = new URL(request.url)

    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200)
    const sort = searchParams.get('sort') || 'asc'
    const before = searchParams.get('before') // ISO timestamp for pagination
    const after = searchParams.get('after')

    // Verify conversation exists and belongs to user (RLS handles this)
    let query = supabase
      .from('messages')
      .select('id, role, content, files_json, tool_calls_json, attachments_json, thinking, tokens_used, model, status, sort_order, created_at', { count: 'exact' })
      .eq('conversation_id', id)
      .order('sort_order', { ascending: sort === 'asc' })
      .limit(limit)

    if (before) query = query.lt('created_at', before)
    if (after) query = query.gt('created_at', after)

    const { data, error, count } = await query

    if (error) {
      console.error('[Messages GET]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      messages: data || [],
      total: count || 0,
      has_more: (count || 0) > limit,
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const supabase = getSupabaseClient(authHeader)
    const body = await request.json()

    const { role, content, files_json, tool_calls_json, attachments_json, thinking, tokens_used, model, status } = body

    if (!role || !['user', 'assistant', 'system'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Get next sort_order
    const { data: lastMsg } = await supabase
      .from('messages')
      .select('sort_order')
      .eq('conversation_id', id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const nextOrder = (lastMsg?.sort_order ?? 0) + 1

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: id,
        role,
        content: content || '',
        files_json: files_json || null,
        tool_calls_json: tool_calls_json || null,
        attachments_json: attachments_json || null,
        thinking: thinking || null,
        tokens_used: tokens_used || null,
        model: model || null,
        status: status || 'complete',
        sort_order: nextOrder,
      })
      .select('id, sort_order, created_at')
      .single()

    if (error) {
      console.error('[Messages POST]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
