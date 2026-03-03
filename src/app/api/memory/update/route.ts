import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// =====================================================
// POST /api/memory/update
// Writes structured memory after each interaction:
//   decisions_to_add[], tasks_to_add[],
//   tasks_to_update[], project_state_patch,
//   evidence_refs
// =====================================================

export const dynamic = 'force-dynamic'

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user } } = await sb.auth.getUser(token)
  return user
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface MemoryUpdateBody {
  project_id: string
  decisions_to_add?: Array<{
    kind: string
    title?: string
    decision: string
    data?: Record<string, unknown>
    confidence?: number
  }>
  tasks_to_add?: Array<{
    title: string
    details?: string
    priority?: number
  }>
  tasks_to_update?: Array<{
    id: string
    status?: string
    blocked_reason?: string
    details?: string
  }>
  project_state_patch?: {
    active_goal?: string
    current_phase?: string
    active_constraints?: unknown[]
    current_context_summary?: string
  }
  evidence_refs?: {
    patch_set_id?: string
    build_run_id?: string
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as MemoryUpdateBody
    const { project_id } = body
    if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

    const sb = getServiceClient()

    // Verify project access
    const { data: project } = await sb.from('projects').select('owner_id').eq('id', project_id).single()
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const results: Record<string, unknown> = {}

    // 1. Add decisions
    if (body.decisions_to_add?.length) {
      const rows = body.decisions_to_add.map(d => ({
        project_id,
        kind: d.kind,
        title: d.title || null,
        decision: d.decision,
        data: d.data || {},
        confidence: d.confidence ?? 0.8,
        created_by: user.id,
      }))
      const { data, error } = await sb.from('project_decisions').insert(rows).select('id')
      results.decisions_added = error ? { error: error.message } : (data?.length ?? 0)
    }

    // 2. Add tasks
    if (body.tasks_to_add?.length) {
      const rows = body.tasks_to_add.map(t => ({
        project_id,
        title: t.title,
        details: t.details || null,
        priority: t.priority ?? 2,
        status: 'open',
        created_by: user.id,
      }))
      const { data, error } = await sb.from('project_tasks').insert(rows).select('id')
      results.tasks_added = error ? { error: error.message } : (data?.length ?? 0)
    }

    // 3. Update tasks
    if (body.tasks_to_update?.length) {
      let updated = 0
      for (const t of body.tasks_to_update) {
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (t.status) patch.status = t.status
        if (t.blocked_reason !== undefined) patch.blocked_reason = t.blocked_reason
        if (t.details !== undefined) patch.details = t.details
        const { error } = await sb.from('project_tasks').update(patch).eq('id', t.id).eq('project_id', project_id)
        if (!error) updated++
      }
      results.tasks_updated = updated
    }

    // 4. Patch project state
    if (body.project_state_patch) {
      const patch = {
        ...body.project_state_patch,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const { error } = await sb
        .from('project_state')
        .upsert({ project_id, ...patch }, { onConflict: 'project_id' })
      results.state_updated = error ? { error: error.message } : true
    }

    return NextResponse.json({ ok: true, results })
  } catch (error: unknown) {
    console.error('[Memory Update]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
