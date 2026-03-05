import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET() {
  const env: Record<string, string> = {
    ANTHROPIC_API_KEY:   process.env.ANTHROPIC_API_KEY   ? `SET (starts: ${process.env.ANTHROPIC_API_KEY.slice(0,14)}...)` : 'MISSING',
    ANTHROPIC_API_KEY_1: process.env.ANTHROPIC_API_KEY_1 ? `SET (starts: ${process.env.ANTHROPIC_API_KEY_1.slice(0,14)}...)` : 'MISSING',
    ANTHROPIC_API_KEY_2: process.env.ANTHROPIC_API_KEY_2 ? `SET (starts: ${process.env.ANTHROPIC_API_KEY_2.slice(0,14)}...)` : 'MISSING',
    ANTHROPIC_API_KEY_3: process.env.ANTHROPIC_API_KEY_3 ? `SET (starts: ${process.env.ANTHROPIC_API_KEY_3.slice(0,14)}...)` : 'MISSING',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
  }

  // Find first available key to test
  const testKey = process.env.ANTHROPIC_API_KEY
    || process.env.ANTHROPIC_API_KEY_1
    || process.env.ANTHROPIC_API_KEY_2
    || process.env.ANTHROPIC_API_KEY_3

  let liveTest = 'SKIPPED — no key found'
  if (testKey) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': testKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'say hi' }],
        }),
      })
      const d = await r.json() as { content?: [{ text: string }]; error?: { message: string } }
      liveTest = r.ok
        ? `✅ WORKING — "${d.content?.[0]?.text}"`
        : `❌ FAILED ${r.status}: ${d.error?.message}`
    } catch (e) {
      liveTest = `❌ EXCEPTION: ${e instanceof Error ? e.message : String(e)}`
    }
  }

  const anyKeySet = !!(testKey)
  return NextResponse.json({ anyKeySet, env, liveTest })
}
