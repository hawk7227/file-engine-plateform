// =====================================================
// MESSAGE [messageId] API — Update + Delete
//
// PATCH  /api/conversations/[id]/messages/[messageId] — Update message
// DELETE /api/conversations/[id]/messages/[messageId] — Delete (with optional cascade)
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, messageId } = await params
    const supabase = getSupabaseClient(authHeader)
    const body = await request.json()

    const updates: Record<string, unknown> = {}
    if ('content' in body) updates.content = body.content
    if ('status' in body) updates.status = body.status
    if ('files_json' in body) updates.files_json = body.files_json
    if ('tool_calls_json' in body) updates.tool_calls_json = body.tool_calls_json
    if ('thinking' in body) updates.thinking = body.thinking
    if ('tokens_used' in body) updates.tokens_used = body.tokens_used

    const { data, error } = await supabase
      .from('messages')
      .update(updates)
      .eq('id', messageId)
      .eq('conversation_id', id)
      .select('id, content, status')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, messageId } = await params
    const supabase = getSupabaseClient(authHeader)
    const { searchParams } = new URL(request.url)
    const cascade = searchParams.get('cascade') === 'true'

    if (cascade) {
      // Get the sort_order of the message to delete
      const { data: msg } = await supabase
        .from('messages')
        .select('sort_order')
        .eq('id', messageId)
        .eq('conversation_id', id)
        .single()

      if (msg) {
        // Delete this message and all subsequent ones
        const { error, count } = await supabase
          .from('messages')
          .delete({ count: 'exact' })
          .eq('conversation_id', id)
          .gte('sort_order', msg.sort_order)

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ deleted: true, deleted_count: count || 0 })
      }
    }

    // Single message delete
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('conversation_id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ deleted: true, deleted_count: 1 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
