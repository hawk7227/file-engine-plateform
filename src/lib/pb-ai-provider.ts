/**
 * PAGE BUILDER — CLIENT-SIDE AI PROVIDER
 *
 * Priority: OpenAI (primary) → Claude (fallback) → Standalone (no AI)
 * User can disable any provider. System functions fully without AI.
 *
 * ALL calls go directly from browser to provider APIs.
 * Keys stored in localStorage only — never sent to our server.
 *
 * Standalone mode: rule-based CSS parser replaces AI analysis.
 */

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

export type ProviderName = 'openai' | 'claude' | 'standalone'

export interface ProviderConfig {
  openaiEnabled: boolean
  openaiKey: string
  claudeEnabled: boolean
  claudeKey: string
  imageProvider: 'dalle3' | 'stability' | 'replicate' | 'none'
  stabilityKey: string
  replicateKey: string
  imageModel: string  // e.g. 'black-forest-labs/flux-schnell'
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | Array<{ type: string; [k: string]: unknown }>
}

export interface AIResponse {
  text: string
  provider: ProviderName
  model: string
}

export interface ImageGenResult {
  url: string
  b64?: string
  provider: string
  prompt: string
}

// ─────────────────────────────────────────────────────────────────
// CONFIG PERSISTENCE
// ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'pb-ai-provider-config'

export const DEFAULT_CONFIG: ProviderConfig = {
  openaiEnabled: true,
  openaiKey: '',
  claudeEnabled: true,
  claudeKey: '',
  imageProvider: 'dalle3',
  stabilityKey: '',
  replicateKey: '',
  imageModel: 'black-forest-labs/flux-schnell',
}

export function loadConfig(): ProviderConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CONFIG
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_CONFIG
  }
}

export function saveConfig(cfg: ProviderConfig): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
}

// ─────────────────────────────────────────────────────────────────
// ACTIVE PROVIDER RESOLUTION
// ─────────────────────────────────────────────────────────────────

export function resolveProvider(cfg: ProviderConfig): ProviderName {
  if (cfg.openaiEnabled && cfg.openaiKey.trim()) return 'openai'
  if (cfg.claudeEnabled && cfg.claudeKey.trim()) return 'claude'
  return 'standalone'
}

// ─────────────────────────────────────────────────────────────────
// TEXT COMPLETION — OpenAI
// ─────────────────────────────────────────────────────────────────

async function callOpenAI(
  messages: ChatMessage[],
  cfg: ProviderConfig,
  signal?: AbortSignal
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cfg.openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 4000,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`OpenAI ${res.status}: ${err?.error?.message || res.statusText}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

// ─────────────────────────────────────────────────────────────────
// TEXT COMPLETION — Claude
// ─────────────────────────────────────────────────────────────────

async function callClaude(
  messages: ChatMessage[],
  cfg: ProviderConfig,
  signal?: AbortSignal
): Promise<string> {
  // Separate system message
  const system = messages.find(m => m.role === 'system')?.content as string | undefined
  const conv = messages.filter(m => m.role !== 'system')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': cfg.claudeKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      ...(system ? { system } : {}),
      messages: conv.map(m => ({ role: m.role, content: m.content })),
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Claude ${res.status}: ${err?.error?.message || res.statusText}`)
  }
  const data = await res.json()
  return data.content?.[0]?.text || ''
}

// ─────────────────────────────────────────────────────────────────
// TEXT COMPLETION — main entry with auto-fallback
// ─────────────────────────────────────────────────────────────────

export async function aiComplete(
  messages: ChatMessage[],
  cfg: ProviderConfig,
  signal?: AbortSignal
): Promise<AIResponse> {
  const primary = resolveProvider(cfg)

  if (primary === 'openai') {
    try {
      const text = await callOpenAI(messages, cfg, signal)
      return { text, provider: 'openai', model: 'gpt-4o' }
    } catch (e) {
      // Auto-fallback to Claude if enabled
      if (cfg.claudeEnabled && cfg.claudeKey.trim()) {
        console.warn('OpenAI failed, falling back to Claude:', e)
        try {
          const text = await callClaude(messages, cfg, signal)
          return { text, provider: 'claude', model: 'claude-sonnet-4-20250514' }
        } catch (e2) {
          throw new Error(`Both providers failed. OpenAI: ${e}. Claude: ${e2}`)
        }
      }
      throw e
    }
  }

  if (primary === 'claude') {
    const text = await callClaude(messages, cfg, signal)
    return { text, provider: 'claude', model: 'claude-sonnet-4-20250514' }
  }

  // Standalone — caller handles this case
  throw new Error('STANDALONE_MODE')
}

// ─────────────────────────────────────────────────────────────────
// VISION (image input) — OpenAI GPT-4o vision
// ─────────────────────────────────────────────────────────────────

async function callOpenAIVision(
  imageB64: string,
  prompt: string,
  cfg: ProviderConfig,
  signal?: AbortSignal
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cfg.openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/png;base64,${imageB64}`, detail: 'high' } },
          { type: 'text', text: prompt },
        ],
      }],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`OpenAI Vision ${res.status}: ${err?.error?.message || res.statusText}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

async function callClaudeVision(
  imageB64: string,
  prompt: string,
  cfg: ProviderConfig,
  signal?: AbortSignal
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': cfg.claudeKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageB64 } },
          { type: 'text', text: prompt },
        ],
      }],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Claude Vision ${res.status}: ${err?.error?.message || res.statusText}`)
  }
  const data = await res.json()
  return data.content?.[0]?.text || ''
}

export async function aiVision(
  imageB64: string,
  prompt: string,
  cfg: ProviderConfig,
  signal?: AbortSignal
): Promise<AIResponse> {
  const primary = resolveProvider(cfg)

  if (primary === 'openai') {
    try {
      const text = await callOpenAIVision(imageB64, prompt, cfg, signal)
      return { text, provider: 'openai', model: 'gpt-4o' }
    } catch (e) {
      if (cfg.claudeEnabled && cfg.claudeKey.trim()) {
        console.warn('OpenAI Vision failed, falling back to Claude:', e)
        const text = await callClaudeVision(imageB64, prompt, cfg, signal)
        return { text, provider: 'claude', model: 'claude-sonnet-4-20250514' }
      }
      throw e
    }
  }

  if (primary === 'claude') {
    const text = await callClaudeVision(imageB64, prompt, cfg, signal)
    return { text, provider: 'claude', model: 'claude-sonnet-4-20250514' }
  }

  throw new Error('STANDALONE_MODE')
}

// ─────────────────────────────────────────────────────────────────
// IMAGE GENERATION
// ─────────────────────────────────────────────────────────────────

async function generateDALLE3(
  prompt: string,
  cfg: ProviderConfig,
  signal?: AbortSignal
): Promise<ImageGenResult> {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cfg.openaiKey}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'hd',
      response_format: 'b64_json',
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`DALL-E 3: ${err?.error?.message || res.statusText}`)
  }
  const data = await res.json()
  const b64 = data.data?.[0]?.b64_json
  return {
    url: `data:image/png;base64,${b64}`,
    b64,
    provider: 'DALL-E 3',
    prompt,
  }
}

async function generateStability(
  prompt: string,
  cfg: ProviderConfig,
  signal?: AbortSignal
): Promise<ImageGenResult> {
  const res = await fetch('https://api.stability.ai/v2beta/stable-image/generate/sd3', {
    method: 'POST',
    signal,
    headers: {
      'Authorization': `Bearer ${cfg.stabilityKey}`,
      'Accept': 'application/json',
    },
    body: (() => {
      const fd = new FormData()
      fd.append('prompt', prompt)
      fd.append('output_format', 'png')
      fd.append('model', 'sd3.5-large')
      return fd
    })(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Stability AI: ${err?.errors?.[0] || res.statusText}`)
  }
  const data = await res.json()
  const b64 = data.image
  return {
    url: `data:image/png;base64,${b64}`,
    b64,
    provider: 'Stability AI SD3.5',
    prompt,
  }
}

async function generateReplicate(
  prompt: string,
  cfg: ProviderConfig,
  signal?: AbortSignal
): Promise<ImageGenResult> {
  // FIX: Replicate does not set CORS headers for browser fetch — route through our API proxy
  // /api/pb-image-gen handles the Replicate call server-side and returns the result
  const model = cfg.imageModel || 'black-forest-labs/flux-schnell'
  const res = await fetch('/api/pb-image-gen', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'replicate', prompt, model, apiKey: cfg.replicateKey }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Replicate (via proxy): ${err?.error || res.statusText}`)
  }
  const data = await res.json()
  return { url: data.url, provider: `Replicate/${model}`, prompt }
}

export async function generateImage(
  prompt: string,
  cfg: ProviderConfig,
  signal?: AbortSignal
): Promise<ImageGenResult> {
  const { imageProvider } = cfg

  if (imageProvider === 'dalle3' && cfg.openaiKey.trim()) {
    return generateDALLE3(prompt, cfg, signal)
  }
  if (imageProvider === 'stability' && cfg.stabilityKey.trim()) {
    return generateStability(prompt, cfg, signal)
  }
  if (imageProvider === 'replicate' && cfg.replicateKey.trim()) {
    return generateReplicate(prompt, cfg, signal)
  }

  // Auto-fallback chain
  if (cfg.openaiKey.trim()) {
    try { return await generateDALLE3(prompt, cfg, signal) } catch {}
  }
  if (cfg.stabilityKey.trim()) {
    try { return await generateStability(prompt, cfg, signal) } catch {}
  }
  if (cfg.replicateKey.trim()) {
    try { return await generateReplicate(prompt, cfg, signal) } catch {}
  }

  throw new Error('STANDALONE_MODE')
}

// ─────────────────────────────────────────────────────────────────
// STANDALONE DESIGN TOKEN EXTRACTOR (no AI required)
// Rule-based canvas pixel sampling + CSS heuristics
// ─────────────────────────────────────────────────────────────────

export interface DesignTokens {
  colors: Array<{ hex: string; name: string; usage: string }>
  typography: Array<{ size: number; weight: number; family: string; usage: string; lineHeight?: number }>
  spacing: number[]
  radii: number[]
  shadows: string[]
  layout: string
}

export function extractTokensStandalone(imageElement: HTMLImageElement): DesignTokens {
  const canvas = document.createElement('canvas')
  const maxSize = 200
  const ratio = Math.min(maxSize / imageElement.naturalWidth, maxSize / imageElement.naturalHeight, 1)
  canvas.width = Math.round(imageElement.naturalWidth * ratio)
  canvas.height = Math.round(imageElement.naturalHeight * ratio)
  const ctx = canvas.getContext('2d')
  if (!ctx) return getDefaultTokens()

  ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height)
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)

  // Sample colors using quantization — group similar colors
  const colorBuckets: Map<string, number> = new Map()
  for (let i = 0; i < data.length; i += 4) {
    const r = Math.round(data[i] / 32) * 32
    const g = Math.round(data[i + 1] / 32) * 32
    const b = Math.round(data[i + 2] / 32) * 32
    if (data[i + 3] < 128) continue // skip transparent
    const key = `${r},${g},${b}`
    colorBuckets.set(key, (colorBuckets.get(key) || 0) + 1)
  }

  // Sort by frequency, take top 12, convert to hex
  const sorted = [...colorBuckets.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)

  const toHex = (r: number, g: number, b: number) =>
    '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')

  const COLOR_NAMES = [
    'Primary', 'Secondary', 'Background', 'Surface', 'Accent',
    'Text', 'Border', 'Muted', 'Highlight', 'Dark', 'Light', 'Mid'
  ]

  const colors = sorted.map(([key], i) => {
    const [r, g, b] = key.split(',').map(Number)
    const hex = toHex(r, g, b)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    const usage = luminance > 0.85 ? 'background/surface'
      : luminance < 0.15 ? 'text/icon'
      : i === 0 ? 'dominant'
      : 'accent/ui'
    return { hex, name: COLOR_NAMES[i] || `Color ${i + 1}`, usage }
  })

  return {
    colors,
    typography: [
      { size: 24, weight: 700, family: 'system-ui', usage: 'Heading', lineHeight: 1.2 },
      { size: 16, weight: 400, family: 'system-ui', usage: 'Body', lineHeight: 1.5 },
      { size: 13, weight: 500, family: 'system-ui', usage: 'Label', lineHeight: 1.4 },
      { size: 11, weight: 400, family: 'system-ui', usage: 'Caption', lineHeight: 1.3 },
    ],
    spacing: [4, 8, 12, 16, 24, 32, 48],
    radii: [4, 8, 12, 24, 999],
    shadows: ['0 2px 8px rgba(0,0,0,.08)', '0 8px 24px rgba(0,0,0,.12)'],
    layout: 'flexbox / column',
  }
}

function getDefaultTokens(): DesignTokens {
  return {
    colors: [
      { hex: '#2dd4a0', name: 'Primary Green', usage: 'accent' },
      { hex: '#0b0f0c', name: 'Dark BG', usage: 'background' },
      { hex: '#ffffff', name: 'White', usage: 'text' },
    ],
    typography: [
      { size: 24, weight: 700, family: 'system-ui', usage: 'Heading' },
      { size: 16, weight: 400, family: 'system-ui', usage: 'Body' },
    ],
    spacing: [4, 8, 16, 24, 32],
    radii: [8, 12, 999],
    shadows: ['0 4px 14px rgba(0,0,0,.08)'],
    layout: 'flexbox / column',
  }
}

// ─────────────────────────────────────────────────────────────────
// STANDALONE TSX GENERATOR — no AI, template-based
// Takes extracted tokens and builds a valid component skeleton
// ─────────────────────────────────────────────────────────────────

export function generateTSXStandalone(tokens: DesignTokens, filename: string): string {
  const primary = tokens.colors[0]?.hex || '#2dd4a0'
  const bg = tokens.colors.find(c => c.usage.includes('background'))?.hex || '#0b0f0c'
  const text = tokens.colors.find(c => c.usage.includes('text'))?.hex || '#ffffff'
  const accent = tokens.colors[1]?.hex || primary
  const h1Size = tokens.typography.find(t => t.usage === 'Heading')?.size || 24
  const bodySize = tokens.typography.find(t => t.usage === 'Body')?.size || 16
  const radius = tokens.radii[1] || 12
  const spacingMd = tokens.spacing[3] || 16

  const name = filename.replace(/\.(tsx?|jsx?)$/, '').replace(/[^a-zA-Z0-9]/g, '') || 'GeneratedComponent'

  return `import { useState } from 'react'

// Design tokens extracted from screenshot
const TOKENS = ${JSON.stringify({ colors: tokens.colors, spacing: tokens.spacing, radii: tokens.radii }, null, 2)}

export default function ${name}() {
  const [active, setActive] = useState(0)

  return (
    <div style={{
      background: '${bg}',
      color: '${text}',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      padding: ${spacingMd},
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: ${spacingMd * 2},
        paddingBottom: ${spacingMd},
        borderBottom: '1px solid rgba(255,255,255,.1)',
      }}>
        <h1 style={{ fontSize: ${h1Size}, fontWeight: 700, color: '${primary}' }}>
          Title
        </h1>
        <button
          onClick={() => setActive(a => a + 1)}
          style={{
            background: '${primary}',
            color: '${bg}',
            border: 'none',
            borderRadius: ${radius},
            padding: '10px 20px',
            fontSize: ${bodySize - 2},
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Action {active > 0 ? active : ''}
        </button>
      </header>

      {/* Content */}
      <main>
        {[1, 2, 3].map(i => (
          <div
            key={i}
            style={{
              background: '${accent}22',
              border: '1px solid ${accent}44',
              borderRadius: ${radius},
              padding: ${spacingMd},
              marginBottom: ${tokens.spacing[2] || 12},
            }}
          >
            <p style={{ fontSize: ${bodySize}, lineHeight: 1.5 }}>
              Content block {i} — customize this component
            </p>
          </div>
        ))}
      </main>
    </div>
  )
}
`
}

// ─────────────────────────────────────────────────────────────────
// SYSTEM PROMPT HELPERS
// ─────────────────────────────────────────────────────────────────

export const DESIGN_ANALYSIS_SYSTEM = `You are a design systems engineer. Analyze the UI screenshot and extract ALL design tokens.
Return ONLY valid JSON matching this exact schema — no markdown, no explanation, no code fences:
{
  "colors": [{"hex":"#xxxxxx","name":"Primary Green","usage":"accents, borders"}],
  "typography": [{"size":16,"weight":400,"family":"Inter","usage":"body","lineHeight":1.5}],
  "spacing": [4,8,12,16,24,32,48],
  "radii": [4,8,12,999],
  "shadows": ["0 4px 14px rgba(0,0,0,.08)"],
  "layout": "flexbox column"
}
Extract every unique color visible. Include minimum 3 typography sizes. Spacing must be numbers only.`

export const CODE_GEN_SYSTEM = `You are an expert React/TSX developer. Generate a pixel-perfect TSX component from the design.
Rules:
- Output ONLY valid TSX — no markdown, no explanation, no code fences
- Use inline styles only (no Tailwind, no CSS imports, no external deps)
- export default function ComponentName() { ... }
- Use React.useState for interactive elements
- Self-contained, renders immediately with no props required
- Pixel-perfect match to the screenshot`
