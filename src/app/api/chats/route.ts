import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization')
        const token = authHeader?.replace('Bearer ', '')

        if (!token) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
        }

        const { data: chats, error } = await supabase
            .from('chats')
            .select('id, title, updated_at, messages')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })

        if (error) throw error

        return new Response(JSON.stringify(chats), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        })

    } catch (error: unknown) {
        console.error('Error fetching chats:', error)
        return new Response(JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }), { status: 500 })
    }
}

