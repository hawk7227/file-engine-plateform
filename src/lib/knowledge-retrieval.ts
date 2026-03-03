import { createClient } from '@supabase/supabase-js'

// =====================================================
// Knowledge Retrieval — used by /api/chat to inject
// stored knowledge into LLM context instead of
// requiring external API calls or 18K token injection.
//
// Scope order: project → global → web
// Hard cap: 8 chunks default, 12 max
// =====================================================

interface KnowledgeChunk {
  id: string
  content: string
  citation: {
    title: string | null
    pack: string | null
    source_url: string | null
  }
}

interface RetrievalResult {
  chunks: KnowledgeChunk[]
  total: number
  fromDb: boolean
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

/**
 * Retrieve relevant knowledge chunks from the DB.
 * Returns empty array if no knowledge system is configured.
 */
export async function retrieveKnowledge(
  query: string,
  projectId?: string,
  maxChunks: number = 8
): Promise<RetrievalResult> {
  const sb = getServiceClient()
  if (!sb) return { chunks: [], total: 0, fromDb: false }

  const terms = query
    .split(/\s+/)
    .filter(Boolean)
    .map(t => t.replace(/[^\w]/g, ''))
    .filter(t => t.length > 1)
    .slice(0, 6) // cap search terms

  if (terms.length === 0) return { chunks: [], total: 0, fromDb: false }

  try {
    // Try FTS first
    const tsQuery = terms.join(' & ')
    const { data, error } = await sb
      .from('knowledge_chunks')
      .select(`
        id, content, source_url,
        document:knowledge_documents(title, pack, source_url, source:knowledge_sources(owner_scope, project_id))
      `)
      .textSearch('content', tsQuery, { type: 'websearch', config: 'english' })
      .limit(maxChunks * 2)

    if (error) {
      // Fallback: ilike on first term
      const { data: fallback } = await sb
        .from('knowledge_chunks')
        .select('id, content, source_url, document:knowledge_documents(title, pack, source_url)')
        .ilike('content', `%${terms[0]}%`)
        .limit(maxChunks)

      if (!fallback?.length) return { chunks: [], total: 0, fromDb: true }

      return {
        chunks: fallback.map(formatChunk),
        total: fallback.length,
        fromDb: true,
      }
    }

    if (!data?.length) return { chunks: [], total: 0, fromDb: true }

    // Scope-sort: project > global > web
    const scored = data.map((c: Record<string, unknown>) => {
      const doc = Array.isArray(c.document) ? c.document[0] : c.document
      const source = (doc as Record<string, unknown>)?.source
      const srcObj = Array.isArray(source) ? source[0] : source
      let score = 0
      if ((srcObj as Record<string, unknown>)?.project_id === projectId) score = 3
      else if ((srcObj as Record<string, unknown>)?.owner_scope === 'global') score = 2
      else score = 0
      return { ...c, document: doc, _score: score }
    })

    scored.sort((a: { _score: number }, b: { _score: number }) => b._score - a._score)
    const top = scored.slice(0, maxChunks)

    return {
      chunks: top.map(formatChunk),
      total: top.length,
      fromDb: true,
    }
  } catch (e) {
    console.warn('[KnowledgeRetrieval] Error:', e instanceof Error ? e.message : String(e))
    return { chunks: [], total: 0, fromDb: false }
  }
}

function formatChunk(c: Record<string, unknown>): KnowledgeChunk {
  const doc = (Array.isArray(c.document) ? c.document[0] : c.document) as Record<string, unknown> | null
  return {
    id: c.id as string,
    content: c.content as string,
    citation: {
      title: (doc?.title as string) || null,
      pack: (doc?.pack as string) || null,
      source_url: (doc?.source_url as string) || (c.source_url as string) || null,
    },
  }
}

/**
 * Format knowledge chunks into a system prompt section.
 * Used by chat route to inject into LLM context.
 */
export function formatKnowledgeForPrompt(chunks: KnowledgeChunk[]): string {
  if (chunks.length === 0) return ''

  const sections = chunks.map((c, i) => {
    const cite = c.citation.title || c.citation.source_url || `chunk-${i}`
    return `[${cite}]\n${c.content}`
  })

  return `\n<knowledge_context>\nThe following knowledge was retrieved from the project database. Use it to inform your response:\n\n${sections.join('\n\n---\n\n')}\n</knowledge_context>\n`
}

/**
 * Retrieve known fixes matching error symptoms.
 */
export async function matchKnownFixes(
  errorText: string,
  projectId?: string,
  limit: number = 3
): Promise<Array<{ signature: string; root_cause: string | null; fix_steps: string | null; confidence: number }>> {
  const sb = getServiceClient()
  if (!sb) return []

  try {
    const { data } = await sb
      .from('knowledge_fixes')
      .select('signature, root_cause, fix_steps, confidence, symptoms')
      .or(`scope.eq.global${projectId ? `,project_id.eq.${projectId}` : ''}`)
      .limit(50)

    if (!data?.length) return []

    // Score fixes by symptom match
    const errorLower = errorText.toLowerCase()
    const scored = data
      .map(fix => {
        const symptoms = (fix.symptoms as Record<string, unknown>)?.includes as string[] || []
        const matches = symptoms.filter(s => errorLower.includes(s.toLowerCase())).length
        return { ...fix, matches }
      })
      .filter(f => f.matches > 0)
      .sort((a, b) => b.matches - a.matches || (b.confidence as number) - (a.confidence as number))
      .slice(0, limit)

    return scored.map(f => ({
      signature: f.signature as string,
      root_cause: f.root_cause as string | null,
      fix_steps: f.fix_steps as string | null,
      confidence: f.confidence as number,
    }))
  } catch {
    return []
  }
}
