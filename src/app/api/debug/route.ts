import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET() {
  const env = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
      ? `SET (${process.env.ANTHROPIC_API_KEY.length} chars, starts: ${process.env.ANTHROPIC_API_KEY.slice(0,12)}...)`
      : 'MISSING',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'MISSING',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
  }
  let liveTest = 'skipped - no key'
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 10, messages: [{ role: 'user', content: 'hi' }] }),
      })
      const d = await r.json() as { content?: [{text:string}], error?: {message:string} }
      liveTest = r.ok ? `OK: "${d.content?.[0]?.text}"` : `FAIL ${r.status}: ${d.error?.message}`
    } catch (e) { liveTest = `EXCEPTION: ${e instanceof Error ? e.message : String(e)}` }
  }
  return NextResponse.json({ env, liveTest })
}
