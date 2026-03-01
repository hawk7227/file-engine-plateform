import { NextResponse } from 'next/server'
import { supabase, getUser } from '@/lib/supabase'

// GET /api/queue/stats - Get queue statistics

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get build stats from database (works without Redis)
    const [
      { count: queued },
      { count: running },
      { count: completed },
      { count: failed }
    ] = await Promise.all([
      supabase
        .from('builds')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'queued'),
      supabase
        .from('builds')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'running'),
      supabase
        .from('builds')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed'),
      supabase
        .from('builds')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed')
    ])

    // Get user's active builds
    const { count: userActive } = await supabase
      .from('builds')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['queued', 'running'])

    // Get average build time (last 100 completed builds)
    const { data: recentBuilds } = await supabase
      .from('builds')
      .select('started_at, completed_at')
      .eq('status', 'completed')
      .not('started_at', 'is', null)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(100)

    let avgDuration = 0
    if (recentBuilds && recentBuilds.length > 0) {
      const durations = recentBuilds.map((b: any) => 
        new Date(b.completed_at!).getTime() - new Date(b.started_at!).getTime()
      )
      avgDuration = Math.round(durations.reduce((a: number, b: any) => a + b, 0) / durations.length)
    }

    return NextResponse.json({
      queue: {
        waiting: queued || 0,
        active: running || 0,
        completed: completed || 0,
        failed: failed || 0
      },
      user: {
        activeBuilds: userActive || 0
      },
      performance: {
        avgDurationMs: avgDuration,
        avgDurationFormatted: formatDuration(avgDuration)
      }
    })
  } catch (err: any) {
    console.error('GET /api/queue/stats error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}
