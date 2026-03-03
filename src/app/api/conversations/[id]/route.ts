// =====================================================
// CONVERSATION [id] API — Get, Update, Delete
//
// GET    /api/conversations/[id] — Get conversation metadata
// PATCH  /api/conversations/[id] — Update (rename, archive, settings)
// DELETE /api/conversations/[id] — Delete conversation + all messages
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

    const { data, error } = await supabase
      .from('conversations')
      .select('id, title, model, project_id, settings_json, archived, pinned, created_at, updated_at')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const supabase = getSupabaseClient(authHeader)
    const body = await request.json()

    // Only allow specific fields to be updated
    const updates: Record<string, unknown> = {}
    if ('title' in body) updates.title = body.title
    if ('archived' in body) updates.archived = body.archived
    if ('pinned' in body) updates.pinned = body.pinned
    if ('model' in body) updates.model = body.model
    if ('settings_json' in body) updates.settings_json = body.settings_json
    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('conversations')
      .update(updates)
      .eq('id', id)
      .select('id, title, updated_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const supabase = getSupabaseClient(authHeader)

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ deleted: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
