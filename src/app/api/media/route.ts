// =====================================================
// FILE ENGINE - MEDIA GENERATION API
// Users call tools by CODENAME only — never see provider
// Admin-protected: only enabled tools are accessible
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateMedia, getPublicTools, getToolByCodename } from '@/lib/media-tools'
import { validationErrorResponse } from '@/lib/schemas'

// GET — List available tools (codenames only, no provider info)

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const tools = getPublicTools()
  return NextResponse.json({ tools })
}

// POST — Generate media
export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as Record<string, any>
    const { toolCodename, prompt, params, inputFile } = body

    if (!toolCodename || !prompt) {
      return NextResponse.json({ error: 'Missing toolCodename or prompt' }, { status: 400 })
    }

    // Check tool exists and is enabled
    const tool = getToolByCodename(toolCodename)
    if (!tool) {
      return NextResponse.json({ error: `Tool "${toolCodename}" is not available` }, { status: 404 })
    }

    // Generate
    const result = await generateMedia({ toolCodename, prompt, params, inputFile })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Log usage
    await supabase.from('media_usage').insert({
      user_id: user.id,
      tool_codename: toolCodename,
      tool_type: tool.type,
      prompt: prompt.slice(0, 500),
      cost_cents: result.costCents || 0,
      created_at: new Date().toISOString()
    }).select().single()

    return NextResponse.json({
      url: result.url,
      mimeType: result.mimeType,
      duration: result.duration,
      tool: toolCodename // Only codename, never provider
    })

  } catch (err: unknown) {
    console.error('[Media API Error]', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
