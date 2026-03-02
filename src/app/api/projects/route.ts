import { NextRequest, NextResponse } from 'next/server'
import { supabase, getUser } from '@/lib/supabase'
import { parseBody, parseProjectsRequest, validationErrorResponse } from '@/lib/schemas'

// GET - List user projects

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    console.error('GET /api/projects error:', err)
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) || 'Internal server error' }, { status: 500 })
  }
}

// POST - Create project
export async function POST(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parsed = await parseBody(req, parseProjectsRequest)
    if (!parsed.success) return validationErrorResponse(parsed.error)
    const { name, type } = parsed.data

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({ 
        user_id: user.id, 
        name, 
        type,
        status: 'draft'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    console.error('POST /api/projects error:', err)
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) || 'Internal server error' }, { status: 500 })
  }
}
