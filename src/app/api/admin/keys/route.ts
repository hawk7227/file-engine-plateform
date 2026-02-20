import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

// =====================================================
// /api/admin/keys — Manage API keys
// GET  — List all keys (masked)
// PUT  — Save/update a key
// DELETE — Clear a key
// Only owner/admin roles can access
// =====================================================

// ── Auth helper (same as /api/admin/settings) ──
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

// ── Encryption helpers ──
const ALGO = 'aes-256-gcm'

function getEncryptionKey(): Buffer {
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-key-do-not-use-in-prod'
    return scryptSync(secret, 'admin-keys-salt', 32)
}

function encrypt(text: string): string {
    const key = getEncryptionKey()
    const iv = randomBytes(16)
    const cipher = createCipheriv(ALGO, key, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const authTag = cipher.getAuthTag().toString('hex')
    return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

function decrypt(data: string): string {
    const key = getEncryptionKey()
    const [ivHex, authTagHex, encrypted] = data.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const decipher = createDecipheriv(ALGO, key, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
}

function maskKey(value: string): string {
    if (!value || value.length < 8) return '•••'
    return value.slice(0, 6) + '•••' + value.slice(-4)
}

// ── Valid key names ──
const VALID_KEYS = [
    'ANTHROPIC_API_KEY', 'ANTHROPIC_API_KEY_1', 'ANTHROPIC_API_KEY_2',
    'OPENAI_API_KEY', 'OPENAI_API_KEY_1', 'OPENAI_API_KEY_2',
    'GOOGLE_AI_API_KEY', 'GOOGLE_VEO_API_KEY',
    'ELEVENLABS_API_KEY',
    'OPENAI_SORA_API_KEY', 'GOOGLE_VEO_VIDEO_KEY',
    'MEDIA_VIDEO_KEY_1', 'MEDIA_VIDEO_KEY_2', 'MEDIA_VIDEO_KEY_3',
    'MEDIA_IMAGE_KEY_1', 'MEDIA_IMAGE_KEY_2', 'MEDIA_IMAGE_KEY_3',
    'MEDIA_AUDIO_KEY_1', 'MEDIA_AUDIO_KEY_2',
    'MEDIA_VOICE_KEY_1',
    'MEDIA_3D_KEY_1',
]

// ── GET — List all keys (masked, never raw) ──
export async function GET(req: NextRequest) {
    try {
        const profile = await getAuthUser(req)
        if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        if (!isAdmin(profile.role)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const teamId = profile.team_id
        if (!teamId) {
            // No team — return all keys as inactive from env check
            return NextResponse.json({
                keys: VALID_KEYS.map(name => ({
                    id: name,
                    active: !!process.env[name],
                    masked: process.env[name] ? maskKey(process.env[name]!) : null,
                    source: process.env[name] ? 'env' : 'none',
                }))
            })
        }

        // Fetch stored keys
        const { data: storedKeys } = await supabase
            .from('admin_api_keys')
            .select('key_name, encrypted_value, updated_at')
            .eq('team_id', teamId)

        const storedMap = new Map((storedKeys || []).map(k => [k.key_name, k]))

        const keys = VALID_KEYS.map(name => {
            const stored = storedMap.get(name)
            const envVal = process.env[name]

            if (stored) {
                // Decrypt just to mask it
                try {
                    const raw = decrypt(stored.encrypted_value)
                    return { id: name, active: true, masked: maskKey(raw), source: 'database' as const, updatedAt: stored.updated_at }
                } catch {
                    return { id: name, active: false, masked: null, source: 'error' as const }
                }
            }

            if (envVal) {
                return { id: name, active: true, masked: maskKey(envVal), source: 'env' as const }
            }

            return { id: name, active: false, masked: null, source: 'none' as const }
        })

        return NextResponse.json({ keys })
    } catch (error: any) {
        console.error('[Admin Keys GET]', error)
        return NextResponse.json({ error: 'Failed to fetch keys' }, { status: 500 })
    }
}

// ── PUT — Save/update a key ──
export async function PUT(req: NextRequest) {
    try {
        const profile = await getAuthUser(req)
        if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        if (!isAdmin(profile.role)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

        const { key_name, value } = await req.json()

        if (!key_name || !VALID_KEYS.includes(key_name)) {
            return NextResponse.json({ error: `Invalid key name: ${key_name}` }, { status: 400 })
        }
        if (!value || typeof value !== 'string' || value.trim().length < 5) {
            return NextResponse.json({ error: 'Key value is too short' }, { status: 400 })
        }

        const teamId = profile.team_id
        if (!teamId) return NextResponse.json({ error: 'No team configured' }, { status: 400 })

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const encrypted = encrypt(value.trim())

        const { error } = await supabase
            .from('admin_api_keys')
            .upsert({
                team_id: teamId,
                key_name,
                encrypted_value: encrypted,
                updated_by: profile.id,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'team_id,key_name' })

        if (error) throw error

        return NextResponse.json({
            saved: true,
            key: { id: key_name, active: true, masked: maskKey(value.trim()), source: 'database' }
        })
    } catch (error: any) {
        console.error('[Admin Keys PUT]', error)
        return NextResponse.json({ error: 'Failed to save key' }, { status: 500 })
    }
}

// ── DELETE — Clear a key ──
export async function DELETE(req: NextRequest) {
    try {
        const profile = await getAuthUser(req)
        if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        if (!isAdmin(profile.role)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

        const { key_name } = await req.json()

        if (!key_name || !VALID_KEYS.includes(key_name)) {
            return NextResponse.json({ error: `Invalid key name: ${key_name}` }, { status: 400 })
        }

        const teamId = profile.team_id
        if (!teamId) return NextResponse.json({ error: 'No team configured' }, { status: 400 })

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        await supabase
            .from('admin_api_keys')
            .delete()
            .eq('team_id', teamId)
            .eq('key_name', key_name)

        return NextResponse.json({ deleted: true, key: { id: key_name, active: false } })
    } catch (error: any) {
        console.error('[Admin Keys DELETE]', error)
        return NextResponse.json({ error: 'Failed to delete key' }, { status: 500 })
    }
}
