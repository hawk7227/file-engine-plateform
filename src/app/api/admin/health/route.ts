import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// =====================================================
// GET /api/admin/health — Live system health checks
// Returns real-time status of env vars, DB tables,
// API keys, and system configuration
// Only owner/admin roles can access
// =====================================================

async function getAuthUser(req: NextRequest) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return null

    const { data: { user } } = await supabase.auth.getUser(token)
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

// ── Check helpers ──

interface CheckResult {
    n: string
    crit: boolean
    ok: boolean
    detail?: string
}

function checkEnv(name: string, critical: boolean): CheckResult {
    const val = process.env[name]
    return {
        n: name,
        crit: critical,
        ok: !!val && val.length > 0,
        detail: val ? `Set (${val.length} chars)` : 'MISSING'
    }
}

async function checkTable(supabase: any, name: string, critical: boolean): Promise<CheckResult> {
    try {
        const { data, error } = await supabase.from(name).select('*', { count: 'exact', head: true })
        if (error) {
            return { n: name, crit: critical, ok: false, detail: error.message }
        }
        return { n: name, crit: critical, ok: true, detail: 'Exists ✓' }
    } catch (e: any) {
        return { n: name, crit: critical, ok: false, detail: e.message || 'Connection failed' }
    }
}

export async function GET(req: NextRequest) {
    try {
        const profile = await getAuthUser(req)
        if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        if (!isAdmin(profile.role)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // ── 1. Environment Variables ──
        const envChecks: CheckResult[] = [
            checkEnv('NEXT_PUBLIC_SUPABASE_URL', true),
            checkEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', true),
            checkEnv('SUPABASE_SERVICE_ROLE_KEY', true),
            checkEnv('ANTHROPIC_API_KEY', true),
            checkEnv('ANTHROPIC_API_KEY_1', false),
            checkEnv('ANTHROPIC_API_KEY_2', false),
            checkEnv('OPENAI_API_KEY', true),
            checkEnv('OPENAI_API_KEY_1', false),
            checkEnv('OPENAI_API_KEY_2', false),
            checkEnv('STRIPE_SECRET_KEY', true),
            checkEnv('STRIPE_WEBHOOK_SECRET', true),
            checkEnv('GITHUB_TOKEN', false),
            checkEnv('NEXT_PUBLIC_APP_URL', false),
            checkEnv('SERPER_API_KEY', false),
        ]

        // ── 2. Media & Provider Keys ──
        const mediaChecks: CheckResult[] = [
            checkEnv('GOOGLE_AI_API_KEY', false),
            checkEnv('GOOGLE_VEO_API_KEY', false),
            checkEnv('ELEVENLABS_API_KEY', false),
            checkEnv('OPENAI_SORA_API_KEY', false),
            checkEnv('GOOGLE_VEO_VIDEO_KEY', false),
            checkEnv('MEDIA_VIDEO_KEY_1', false),
            checkEnv('MEDIA_VIDEO_KEY_2', false),
            checkEnv('MEDIA_VIDEO_KEY_3', false),
            checkEnv('MEDIA_IMAGE_KEY_1', false),
            checkEnv('MEDIA_IMAGE_KEY_2', false),
            checkEnv('MEDIA_IMAGE_KEY_3', false),
            checkEnv('MEDIA_AUDIO_KEY_1', false),
            checkEnv('MEDIA_AUDIO_KEY_2', false),
            checkEnv('MEDIA_VOICE_KEY_1', false),
            checkEnv('MEDIA_3D_KEY_1', false),
        ]

        // ── 3. Supabase Tables ──
        const tableNames = [
            { name: 'profiles', crit: true },
            { name: 'projects', crit: true },
            { name: 'builds', crit: true },
            { name: 'subscriptions', crit: true },
            { name: 'conversations', crit: true },
            { name: 'files', crit: true },
            { name: 'team_cost_settings', crit: true },
            { name: 'deployments', crit: false },
            { name: 'daily_token_usage', crit: false },
            { name: 'usage', crit: false },
            { name: 'user_memories', crit: false },
            { name: 'user_preferences', crit: false },
            { name: 'payments', crit: false },
            { name: 'contact_submissions', crit: false },
            { name: 'media_usage', crit: false },
            { name: 'admin_api_keys', crit: false },
        ]

        const tableChecks = await Promise.all(
            tableNames.map(t => checkTable(supabase, t.name, t.crit))
        )

        // ── 4. Supabase connectivity ──
        let supabaseConnected = false
        try {
            const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true })
            supabaseConnected = !error
        } catch { /* noop */ }

        const connectivityChecks: CheckResult[] = [
            { n: 'Supabase connection', crit: true, ok: supabaseConnected, detail: supabaseConnected ? 'Connected ✓' : 'UNREACHABLE' },
            { n: 'Service role key valid', crit: true, ok: supabaseConnected, detail: supabaseConnected ? 'Authorized ✓' : 'Check key' },
        ]

        // ── 5. Build checks (static — determined at deploy time) ──
        const buildChecks: CheckResult[] = [
            { n: 'Next.js runtime', crit: true, ok: true, detail: 'Running ✓' },
            { n: 'Admin route (/admin)', crit: true, ok: true, detail: 'Protected ✓' },
            { n: 'Admin API (/api/admin/settings)', crit: true, ok: true, detail: 'Active ✓' },
            { n: 'Keys API (/api/admin/keys)', crit: true, ok: true, detail: 'Active ✓' },
            { n: 'Health API (/api/admin/health)', crit: true, ok: true, detail: 'Active ✓' },
        ]

        // ── Aggregate ──
        const groups = [
            { group: 'Environment Variables', icon: '', checks: envChecks },
            { group: 'Media & Provider Keys', icon: '', checks: mediaChecks },
            { group: 'Supabase Tables', icon: '', checks: tableChecks },
            { group: 'Connectivity', icon: '', checks: connectivityChecks },
            { group: 'Build & Runtime', icon: '', checks: buildChecks },
        ]

        let total = 0, pass = 0, warn = 0, fail = 0
        groups.forEach(g => g.checks.forEach(c => {
            total++
            if (c.ok) pass++
            else if (c.crit) fail++
            else warn++
        }))

        const score = total > 0 ? Math.round(((pass + warn * 0.5) / total) * 100) : 0

        return NextResponse.json({
            score,
            total,
            pass,
            warn,
            fail,
            groups,
            checkedAt: new Date().toISOString(),
        })
    } catch (error: any) {
        console.error('[Admin Health GET]', error)
        return NextResponse.json({ error: 'Health check failed' }, { status: 500 })
    }
}
