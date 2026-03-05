/**
 * /api/pb-image-gen
 * Server-side proxy for Replicate image generation.
 * Replicate does not allow direct browser fetch (no CORS headers on prediction creation).
 * Stability AI and DALL-E work directly from browser — this proxy is only needed for Replicate.
 *
 * POST { provider: 'replicate', prompt: string, model: string, apiKey: string }
 * → { url: string }
 */

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 90

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { provider, prompt, model, apiKey } = body

    if (!provider || !prompt || !apiKey) {
      return NextResponse.json({ error: 'Missing required fields: provider, prompt, apiKey' }, { status: 400 })
    }

    if (provider !== 'replicate') {
      return NextResponse.json({ error: 'This proxy only supports Replicate' }, { status: 400 })
    }

    const replicateModel = model || 'black-forest-labs/flux-schnell'

    // Create prediction
    const createRes = await fetch(`https://api.replicate.com/v1/models/${replicateModel}/predictions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ input: { prompt, num_outputs: 1, output_format: 'png' } }),
    })

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}))
      return NextResponse.json({ error: `Replicate: ${err?.detail || createRes.statusText}` }, { status: createRes.status })
    }

    const prediction = await createRes.json()
    const pollUrl = prediction.urls?.get

    if (!pollUrl) {
      return NextResponse.json({ error: 'Replicate: no polling URL in response' }, { status: 502 })
    }

    // Poll until complete (max 80s — Vercel maxDuration is 90s)
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 2000))
      const pollRes = await fetch(pollUrl, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      })
      const p = await pollRes.json()
      if (p.status === 'succeeded') {
        const url = Array.isArray(p.output) ? p.output[0] : p.output
        return NextResponse.json({ url, provider: `Replicate/${replicateModel}` })
      }
      if (p.status === 'failed') {
        return NextResponse.json({ error: `Replicate prediction failed: ${p.error}` }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Replicate: timed out after 80s' }, { status: 504 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
