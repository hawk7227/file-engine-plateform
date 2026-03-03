import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// =====================================================
// GET /api/memory/bootstrap?project_id=...
// Returns full project context for tokenless memory:
//   user_preferences, project, project_state,
//   last 10 decisions, open tasks (max 20),
//   last build_run, last patch_set
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

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const projectId = req.nextUrl.searchParams.get('project_id')
    if (!projectId) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

    const sb = getServiceClient()

    // Parallel fetch all context
    const [
      prefsResult,
      projectResult,
      stateResult,
      decisionsResult,
      tasksResult,
      buildResult,
      patchResult,
    ] = await Promise.all([
      sb.from('user_preferences').select('*').eq('user_id', user.id).maybeSingle(),
      sb.from('projects').select('*').eq('id', projectId).single(),
      sb.from('project_state').select('*').eq('project_id', projectId).maybeSingle(),
      sb.from('project_decisions').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(10),
      sb.from('project_tasks').select('*').eq('project_id', projectId).eq('status', 'open').order('priority', { ascending: true }).limit(20),
      sb.from('build_runs').select('*').eq('project_id', projectId).order('started_at', { ascending: false }).limit(1),
      sb.from('patch_sets').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(1),
    ])

    if (projectResult.error) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Verify ownership/membership
    const project = projectResult.data
    if (project.owner_id !== user.id) {
      const { data: membership } = await sb
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!membership) {
        return NextResponse.json({ error: 'Not a project member' }, { status: 403 })
      }
    }

    return NextResponse.json({
      user_preferences: prefsResult.data || null,
      project,
      project_state: stateResult.data || null,
      decisions: decisionsResult.data || [],
      tasks: tasksResult.data || [],
      last_build_run: buildResult.data?.[0] || null,
      last_patch_set: patchResult.data?.[0] || null,
    })
  } catch (error: unknown) {
    console.error('[Memory Bootstrap]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
