import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildQueue } from '@/lib/queue'
import { parseBody, parseAdminAIEdit, validationErrorResponse } from '@/lib/schemas'

// =====================================================
// POST /api/admin/ai-edit — Enqueue AI page edit job
// Accepts route + instruction, enqueues for worker processing.
// Returns job ID immediately. Client polls /status for result.
// Only owner/admin roles can access.
// =====================================================

interface AiEditPayload {
  route: string
  prompt: string
  pageName?: string
}

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, team_id')
    .eq('id', user.id)
    .single()

  return profile
}

const PAGE_FILE_MAP: Record<string, string> = {
  '/': 'src/app/page.tsx',
  '/auth/login': 'src/app/auth/login/page.tsx',
  '/auth/signup': 'src/app/auth/signup/page.tsx',
  '/auth/callback': 'src/app/auth/callback/page.tsx',
  '/dashboard': 'src/app/dashboard/page.tsx',
  '/pricing': 'src/app/pricing/page.tsx',
  '/contact': 'src/app/contact/page.tsx',
  '/terms': 'src/app/terms/page.tsx',
  '/privacy': 'src/app/privacy/page.tsx',
  '/admin': 'src/app/admin/page.tsx',
}

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const profile = await getAuthUser(req)
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const parsed = await parseBody(req, parseAdminAIEdit)
    if (!parsed.success) return validationErrorResponse(parsed.error)
    const body = parsed.data
    const { route, prompt, pageName } = body

    if (!route || !prompt) {
      return NextResponse.json({ error: 'Missing route or prompt' }, { status: 400 })
    }
    if (!prompt.trim() || prompt.length > 2000) {
      return NextResponse.json({ error: 'Prompt must be 1-2000 characters' }, { status: 400 })
    }

    const filePath = PAGE_FILE_MAP[route] || null
    const jobId = `ai-edit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    // ── ENQUEUE — no direct provider call in HTTP ──
    await buildQueue.add('ai-edit', {
      buildId: jobId,
      projectId: 'ai-edit',
      userId: profile.id,
      prompt,
      model: 'claude-sonnet-4-20250514' as any,
      context: JSON.stringify({ route, pageName, filePath, teamId: profile.team_id }),
    }, {
      jobId,
      attempts: 2,
      backoff: { type: 'exponential', delay: 2000 },
    })

    // Best-effort audit log
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      await supabase.from('admin_audit_log').insert({
        team_id: profile.team_id,
        user_id: profile.id,
        action: 'ai_edit_enqueued',
        target: route,
        details: { prompt: prompt.slice(0, 500), pageName, filePath, jobId },
        created_at: new Date().toISOString(),
      })
    } catch {
      // Audit table may not exist
    }

    return NextResponse.json({
      jobId,
      status: 'queued',
      route,
      pageName,
      filePath,
      message: 'AI edit job enqueued. Poll /api/admin/ai-edit/status?jobId= for result.',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI edit enqueue failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
