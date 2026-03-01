import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// =====================================================
// POST /api/admin/ai-edit — AI-powered page editing
// Accepts a page route + user instruction, returns
// suggested code changes from the AI model
// Only owner/admin roles can access
// =====================================================

async function getAuthUser(req: NextRequest) {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return null

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        }
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

function isAdmin(role: string): boolean {
    return role === 'owner' || role === 'admin'
}

// ── Page → file mapping ──
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
        if (!isAdmin(profile.role)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

        const { route, prompt, pageName } = await req.json()

        if (!route || !prompt) {
            return NextResponse.json({ error: 'Missing route or prompt' }, { status: 400 })
        }

        if (!prompt.trim() || prompt.length > 2000) {
            return NextResponse.json({ error: 'Prompt must be 1-2000 characters' }, { status: 400 })
        }

        const filePath = PAGE_FILE_MAP[route]
        const apiKey = process.env.ANTHROPIC_API_KEY

        if (!apiKey) {
            return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
        }

        // Build the system prompt for page editing
        const systemPrompt = `You are an expert frontend developer editing a Next.js application.
The user is an admin requesting changes to the page at route "${route}" (file: ${filePath || 'unknown'}).
Page name: ${pageName || route}

Rules:
- Return ONLY the code changes needed, not the full file
- Use the format: describe what to change, then show the code diff
- Keep changes minimal and targeted
- Maintain existing styling and design patterns
- Never remove existing functionality unless explicitly asked
- Use TypeScript and React best practices`

        // Call Anthropic API
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 4096,
                system: systemPrompt,
                messages: [
                    {
                        role: 'user',
                        content: `Please make the following change to the ${pageName || route} page:\n\n${prompt}`
                    }
                ]
            }),
        })

        if (!response.ok) {
            const errBody = await response.text()
            console.error('[AI Edit] Anthropic API error:', response.status, errBody)
            return NextResponse.json({ error: 'AI API call failed' }, { status: 502 })
        }

        const data = await response.json()
        const aiResponse = data.content
            ?.filter((block: any) => block.type === 'text')
            .map((block: any) => block.text)
            .join('\n') || 'No response generated'

        // Log the edit request
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Best-effort audit log — don't fail if table doesn't exist
        try {
            await supabase.from('admin_audit_log').insert({
                team_id: profile.team_id,
                user_id: profile.id,
                action: 'ai_edit',
                target: route,
                details: { prompt: prompt.slice(0, 500), pageName, filePath },
                created_at: new Date().toISOString(),
            })
        } catch {
            // Audit log table may not exist yet — that's OK
        }

        return NextResponse.json({
            route,
            pageName,
            filePath: filePath || null,
            prompt,
            suggestion: aiResponse,
            model: 'claude-sonnet-4-20250514',
            timestamp: new Date().toISOString(),
        })
    } catch (error: any) {
        console.error('[Admin AI Edit]', error)
        return NextResponse.json({ error: 'AI edit failed' }, { status: 500 })
    }
}
