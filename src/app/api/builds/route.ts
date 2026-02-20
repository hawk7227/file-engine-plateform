import { NextRequest, NextResponse } from 'next/server'
import { supabase, getUser } from '@/lib/supabase'

const PLAN_LIMITS = {
  free: { concurrent: 3, daily: 10 },
  pro: { concurrent: 10, daily: 100 },
  enterprise: { concurrent: 20, daily: Infinity }
}

// POST - Create build (queue for processing)
export async function POST(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { project_id, prompt } = await req.json()

    if (!project_id || !prompt) {
      return NextResponse.json({ error: 'project_id and prompt required' }, { status: 400 })
    }

    // Get user subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .single()

    const plan = (subscription?.plan || 'free') as keyof typeof PLAN_LIMITS
    const limits = PLAN_LIMITS[plan]

    // Count active builds
    const { count } = await supabase
      .from('builds')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['queued', 'running'])

    if ((count || 0) >= limits.concurrent) {
      return NextResponse.json({ 
        error: `Concurrent build limit reached (${limits.concurrent} for ${plan} plan)` 
      }, { status: 429 })
    }

    // Count daily builds
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { count: dailyCount } = await supabase
      .from('builds')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', today.toISOString())

    if ((dailyCount || 0) >= limits.daily) {
      return NextResponse.json({ 
        error: `Daily build limit reached (${limits.daily} for ${plan} plan)` 
      }, { status: 429 })
    }

    // Create build
    const { data, error } = await supabase
      .from('builds')
      .insert({ 
        project_id, 
        user_id: user.id, 
        prompt, 
        status: 'queued' 
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('POST /api/builds error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

// GET - Get build by ID
export async function GET(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      // List all builds for user
      const { data, error } = await supabase
        .from('builds')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json(data)
    }

    // Get specific build
    const { data, error } = await supabase
      .from('builds')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('GET /api/builds error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
