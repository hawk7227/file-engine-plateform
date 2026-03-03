import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// =====================================================
// GET /api/knowledge/search?q=...&project_id=...&limit=8
// Searches knowledge_chunks via Postgres full-text search.
// Scope order: project → org → global → web
// Returns chunks with citations (doc title, version, source_url)
// =====================================================

export const dynamic = 'force-dynamic'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface ChunkResult {
  id: string
  chunk_index: number
  content: string
  tokens_est: number | null
  source_url: string | null
  meta: Record<string, unknown>
  document: {
    id: string
    title: string | null
    pack: string | null
    version: string | null
    source_url: string | null
    source: {
      owner_scope: string
      project_id: string | null
    } | null
  } | null
}

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q')
    if (!q || q.trim().length < 2) {
      return NextResponse.json({ error: 'q parameter required (min 2 chars)' }, { status: 400 })
    }

    const projectId = req.nextUrl.searchParams.get('project_id')
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '8', 10), 12)

    const sb = getServiceClient()

    // Build tsquery from user input
    // Split words, join with & for AND matching
    const terms = q.trim().split(/\s+/).filter(Boolean).map(t => t.replace(/[^\w]/g, '')).filter(t => t.length > 1)
    if (terms.length === 0) {
      return NextResponse.json({ chunks: [], total: 0 })
    }
    const tsQuery = terms.join(' & ')

    // Full-text search on knowledge_chunks
    const { data: rawChunks, error } = await sb
      .from('knowledge_chunks')
      .select(`
        id,
        chunk_index,
        content,
        tokens_est,
        source_url,
        meta,
        document:knowledge_documents!inner(
          id,
          title,
          pack,
          version,
          source_url,
          source:knowledge_sources(
            owner_scope,
            project_id
          )
        )
      `)
      .textSearch('content', tsQuery, { type: 'websearch', config: 'english' })
      .limit(limit * 3) // Over-fetch for scope reranking

    if (error) {
      console.error('[Knowledge Search] FTS error:', error.message)
      // Fallback: ilike search
      const { data: fallback } = await sb
        .from('knowledge_chunks')
        .select(`
          id, chunk_index, content, tokens_est, source_url, meta,
          document:knowledge_documents(id, title, pack, version, source_url)
        `)
        .ilike('content', `%${terms[0]}%`)
        .limit(limit)

      return NextResponse.json({
        chunks: (fallback || []).map(formatChunk),
        total: fallback?.length || 0,
        search_mode: 'fallback_ilike',
      })
    }

    const chunks = (rawChunks || []) as unknown as ChunkResult[]

    // Scope ordering: project > global > web (org not implemented yet)
    const scored = chunks.map(c => {
      let scopeScore = 0
      const doc = Array.isArray(c.document) ? c.document[0] : c.document
      const source = doc?.source
      const sourceObj = Array.isArray(source) ? source[0] : source

      if (sourceObj?.project_id === projectId) scopeScore = 3
      else if (sourceObj?.owner_scope === 'global') scopeScore = 2
      else if (sourceObj?.owner_scope === 'org') scopeScore = 1
      else scopeScore = 0 // web

      return { ...c, document: doc, scopeScore }
    })

    // Sort by scope then chunk_index, take top `limit`
    scored.sort((a, b) => b.scopeScore - a.scopeScore || a.chunk_index - b.chunk_index)
    const topChunks = scored.slice(0, limit)

    return NextResponse.json({
      chunks: topChunks.map(formatChunk),
      total: topChunks.length,
      search_mode: 'fts',
    })
  } catch (error: unknown) {
    console.error('[Knowledge Search]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

function formatChunk(c: Record<string, unknown>) {
  const doc = (Array.isArray(c.document) ? c.document[0] : c.document) as Record<string, unknown> | null
  return {
    id: c.id,
    chunk_index: c.chunk_index,
    content: c.content,
    tokens_est: c.tokens_est,
    citation: {
      doc_id: doc?.id || null,
      title: doc?.title || null,
      pack: doc?.pack || null,
      version: doc?.version || null,
      source_url: doc?.source_url || c.source_url || null,
    },
  }
}

// =====================================================
// POST /api/knowledge/search — same but accepts body
// For longer/structured queries from chat route
// =====================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { q: string; project_id?: string; limit?: number }
    const url = new URL(req.url)
    if (body.q) url.searchParams.set('q', body.q)
    if (body.project_id) url.searchParams.set('project_id', body.project_id)
    if (body.limit) url.searchParams.set('limit', String(body.limit))

    const fakeReq = new NextRequest(url, { method: 'GET', headers: req.headers })
    return GET(fakeReq)
  } catch (error: unknown) {
    console.error('[Knowledge Search POST]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
