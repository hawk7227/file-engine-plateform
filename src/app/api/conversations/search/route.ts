// =====================================================
// CONVERSATION SEARCH API
//
// GET /api/conversations/search?q=term — Full-text search across messages
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

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = getSupabaseClient(authHeader)
    const { searchParams } = new URL(request.url)

    const q = searchParams.get('q') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    if (!q || q.length < 2) {
      return NextResponse.json({ error: 'Search query must be at least 2 characters' }, { status: 400 })
    }

    // Search conversation titles
    const { data: titleResults } = await supabase
      .from('conversations')
      .select('id, title, updated_at')
      .ilike('title', `%${q}%`)
      .order('updated_at', { ascending: false })
      .limit(limit)

    // Search message content
    const { data: messageResults } = await supabase
      .from('messages')
      .select('id, conversation_id, content, role, created_at')
      .ilike('content', `%${q}%`)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Build results with snippets
    const results: {
      conversation_id: string
      conversation_title?: string
      message_id?: string
      snippet: string
      created_at: string
      match_type: 'title' | 'content'
    }[] = []

    // Title matches
    if (titleResults) {
      for (const conv of titleResults) {
        results.push({
          conversation_id: conv.id,
          conversation_title: conv.title,
          snippet: conv.title,
          created_at: conv.updated_at,
          match_type: 'title',
        })
      }
    }

    // Content matches with snippets
    if (messageResults) {
      const seenConvs = new Set(results.map(r => r.conversation_id))
      for (const msg of messageResults) {
        // Create a snippet around the match
        const idx = msg.content.toLowerCase().indexOf(q.toLowerCase())
        const start = Math.max(0, idx - 40)
        const end = Math.min(msg.content.length, idx + q.length + 40)
        const snippet = (start > 0 ? '...' : '') + msg.content.slice(start, end) + (end < msg.content.length ? '...' : '')

        results.push({
          conversation_id: msg.conversation_id,
          message_id: msg.id,
          snippet,
          created_at: msg.created_at,
          match_type: 'content',
        })
      }
    }

    // Sort by date, deduplicate by conversation
    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({ results: results.slice(0, limit) })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
