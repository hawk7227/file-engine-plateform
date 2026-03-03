// =====================================================
// AUTO-TITLE API
//
// POST /api/conversations/[id]/title — Generate title from first exchange
// Uses cheapest available AI model for a 4-8 word title.
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { selectProvider } from '@/lib/ai-config'

export const dynamic = 'force-dynamic'

function getSupabaseClient(authHeader: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  )
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const supabase = getSupabaseClient(authHeader)
    const body = await request.json()

    const { user_message, assistant_message } = body

    if (!user_message) {
      return NextResponse.json({ error: 'Missing user_message' }, { status: 400 })
    }

    // Use cheapest model for title generation
    const provider = selectProvider()
    const apiKey = provider === 'anthropic' ? (process.env.ANTHROPIC_API_KEY || '') : (process.env.OPENAI_API_KEY || '')
    const resolvedModel = provider === 'anthropic' ? 'claude-3-haiku-20240307' : 'gpt-4o-mini'

    const titlePrompt = `Generate a concise title (4-8 words) for this conversation. Return ONLY the title, no quotes, no punctuation at the end, no explanation.

User: ${user_message.slice(0, 500)}
${assistant_message ? `Assistant: ${assistant_message.slice(0, 300)}` : ''}`

    let title = 'New chat'

    try {
      if (provider === 'anthropic' && apiKey) {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: resolvedModel || 'claude-3-haiku-20240307',
            max_tokens: 30,
            messages: [{ role: 'user', content: titlePrompt }],
          }),
        })

        if (resp.ok) {
          const data = await resp.json()
          const generated = data.content?.[0]?.text?.trim()
          if (generated && generated.length > 0 && generated.length < 100) {
            title = generated
          }
        }
      } else if (provider === 'openai' && apiKey) {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: resolvedModel || 'gpt-4o-mini',
            max_tokens: 30,
            messages: [{ role: 'user', content: titlePrompt }],
          }),
        })

        if (resp.ok) {
          const data = await resp.json()
          const generated = data.choices?.[0]?.message?.content?.trim()
          if (generated && generated.length > 0 && generated.length < 100) {
            title = generated
          }
        }
      }
    } catch (aiErr) {
      console.error('[Auto-title AI Error]', aiErr)
      // Fallback: use first 8 words of user message
      title = user_message.split(/\s+/).slice(0, 8).join(' ')
      if (title.length > 60) title = title.slice(0, 57) + '...'
    }

    // Update conversation title
    const { error } = await supabase
      .from('conversations')
      .update({ title })
      .eq('id', id)

    if (error) {
      console.error('[Auto-title Update Error]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ title })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
