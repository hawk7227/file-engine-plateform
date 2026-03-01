import { NextRequest, NextResponse } from 'next/server'
import { supabase, getUser } from '@/lib/supabase'

// GET /api/builds/[id]/status - Get build status

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const buildId = params.id

    // Get build with project info
    const { data: build, error } = await supabase
      .from('builds')
      .select(`
        *,
        project:projects(name, type)
      `)
      .eq('id', buildId)
      .eq('user_id', user.id)
      .single()

    if (error || !build) {
      return NextResponse.json({ error: 'Build not found' }, { status: 404 })
    }

    // Get generated files if completed
    let files: any[] = []
    if (build.status === 'completed') {
      const { data: fileData } = await supabase
        .from('files')
        .select('id, name, path, content, mime_type')
        .eq('project_id', build.project_id)
        .eq('type', 'generated')
        .order('path')

      files = fileData || []
    }

    // Calculate duration
    let duration = null
    if (build.started_at && build.completed_at) {
      duration = new Date(build.completed_at).getTime() - new Date(build.started_at).getTime()
    } else if (build.started_at && build.status === 'running') {
      duration = Date.now() - new Date(build.started_at).getTime()
    }

    return NextResponse.json({
      id: build.id,
      status: build.status,
      prompt: build.prompt,
      error: build.error,
      project: build.project,
      files,
      filesCount: files.length,
      duration,
      startedAt: build.started_at,
      completedAt: build.completed_at,
      createdAt: build.created_at
    })
  } catch (err: any) {
    console.error('GET /api/builds/[id]/status error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
