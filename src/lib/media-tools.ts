// =====================================================
// FILE ENGINE - MEDIA GENERATION TOOLS
// Admin-configurable AI tools for video, audio, images
// Each tool has a SECRET CODENAME — only admins know which
// provider powers it. Users see the codename only.
// =====================================================

// =====================================================
// TYPES
// =====================================================

export interface MediaTool {
  codename: string          // User-facing name (e.g. "PHOENIX", "ECHO")
  type: 'video' | 'audio' | 'image' | 'voice' | '3d'
  provider: string          // Internal only — never shown (e.g. "runway", "suno", "dall-e")
  model: string             // Internal only — never shown
  apiKeyEnv: string         // ENV variable name for the API key
  endpoint: string          // API endpoint URL
  description: string       // User-facing description
  maxDuration?: number      // Max seconds for video/audio
  maxResolution?: string    // Max resolution for video/image
  formats?: string[]        // Supported output formats
  enabled: boolean          // Admin can toggle on/off
  rateLimit?: number        // Requests per minute
  costPerRequest?: number   // Estimated cost in cents
}

export interface MediaToolConfig {
  tools: MediaTool[]
  globalEnabled: boolean
  adminOnlyUpload: boolean  // If true, only admins can upload video/audio
  maxUploadSize: number     // In bytes
}

export interface MediaGenerationRequest {
  toolCodename: string
  prompt: string
  params?: Record<string, any> // Tool-specific params (duration, style, etc.)
  inputFile?: { url: string; mimeType: string } // For video-to-video, etc.
}

export interface MediaGenerationResult {
  success: boolean
  url?: string
  mimeType?: string
  duration?: number
  error?: string
  costCents?: number
}

// =====================================================
// DEFAULT TOOL REGISTRY
// Admins configure these in settings — codenames hide the provider
// =====================================================

export const DEFAULT_MEDIA_TOOLS: MediaTool[] = [
  // ── VIDEO GENERATION ──
  {
    codename: 'PHOENIX',
    type: 'video',
    provider: 'runway',        // Runway Gen-3
    model: 'gen-3-alpha',
    apiKeyEnv: 'MEDIA_VIDEO_KEY_1',
    endpoint: 'https://api.dev.runwayml.com/v1/image_to_video',
    description: 'Generate cinematic video from text or image',
    maxDuration: 10,
    maxResolution: '1280x768',
    formats: ['mp4', 'webm'],
    enabled: false,
    costPerRequest: 50
  },
  {
    codename: 'NOVA',
    type: 'video',
    provider: 'pika',          // Pika Labs
    model: 'pika-1.0',
    apiKeyEnv: 'MEDIA_VIDEO_KEY_2',
    endpoint: 'https://api.pika.art/v1/generate',
    description: 'Fast video generation with motion control',
    maxDuration: 4,
    maxResolution: '1024x1024',
    formats: ['mp4'],
    enabled: false,
    costPerRequest: 25
  },
  {
    codename: 'TITAN',
    type: 'video',
    provider: 'minimax',       // MiniMax Hailuo
    model: 'video-01',
    apiKeyEnv: 'MEDIA_VIDEO_KEY_3',
    endpoint: 'https://api.minimaxi.chat/v1/video_generation',
    description: 'High-quality long-form video generation',
    maxDuration: 6,
    maxResolution: '1280x720',
    formats: ['mp4'],
    enabled: false,
    costPerRequest: 30
  },

  // ── AUDIO / MUSIC GENERATION ──
  {
    codename: 'ECHO',
    type: 'audio',
    provider: 'suno',          // Suno AI
    model: 'v3.5',
    apiKeyEnv: 'MEDIA_AUDIO_KEY_1',
    endpoint: 'https://studio-api.suno.ai/api/generate/v2/',
    description: 'Generate music and songs from text description',
    maxDuration: 120,
    formats: ['mp3', 'wav'],
    enabled: false,
    costPerRequest: 10
  },
  {
    codename: 'PULSE',
    type: 'audio',
    provider: 'elevenlabs',    // ElevenLabs
    model: 'eleven_multilingual_v2',
    apiKeyEnv: 'MEDIA_AUDIO_KEY_2',
    endpoint: 'https://api.elevenlabs.io/v1/sound-generation',
    description: 'Generate sound effects and ambient audio',
    maxDuration: 30,
    formats: ['mp3', 'wav'],
    enabled: false,
    costPerRequest: 5
  },

  // ── VOICE / TTS ──
  {
    codename: 'ORACLE',
    type: 'voice',
    provider: 'elevenlabs',    // ElevenLabs TTS
    model: 'eleven_turbo_v2_5',
    apiKeyEnv: 'MEDIA_VOICE_KEY_1',
    endpoint: 'https://api.elevenlabs.io/v1/text-to-speech',
    description: 'High-quality text-to-speech with voice cloning',
    maxDuration: 300,
    formats: ['mp3', 'wav', 'ogg'],
    enabled: false,
    costPerRequest: 3
  },

  // ── IMAGE GENERATION ──
  {
    codename: 'PRISM',
    type: 'image',
    provider: 'dall-e',        // OpenAI DALL-E 3
    model: 'dall-e-3',
    apiKeyEnv: 'MEDIA_IMAGE_KEY_1',
    endpoint: 'https://api.openai.com/v1/images/generations',
    description: 'Photorealistic and artistic image generation',
    maxResolution: '1792x1024',
    formats: ['png', 'webp'],
    enabled: false,
    costPerRequest: 8
  },
  {
    codename: 'FLUX',
    type: 'image',
    provider: 'stability',     // Stability AI / SDXL
    model: 'stable-diffusion-xl-1024-v1-0',
    apiKeyEnv: 'MEDIA_IMAGE_KEY_2',
    endpoint: 'https://api.stability.ai/v1/generation',
    description: 'Fast image generation with fine-grained control',
    maxResolution: '1024x1024',
    formats: ['png', 'webp', 'jpeg'],
    enabled: false,
    costPerRequest: 3
  },
  {
    codename: 'AURORA',
    type: 'image',
    provider: 'midjourney',    // Midjourney (via proxy)
    model: 'v6',
    apiKeyEnv: 'MEDIA_IMAGE_KEY_3',
    endpoint: '', // Requires Discord/proxy setup
    description: 'Premium artistic image generation',
    maxResolution: '2048x2048',
    formats: ['png'],
    enabled: false,
    costPerRequest: 12
  },

  // ── 3D GENERATION ──
  {
    codename: 'FORGE',
    type: '3d',
    provider: 'meshy',         // Meshy AI
    model: 'meshy-3',
    apiKeyEnv: 'MEDIA_3D_KEY_1',
    endpoint: 'https://api.meshy.ai/v2/text-to-3d',
    description: 'Generate 3D models from text or images',
    formats: ['glb', 'obj', 'fbx'],
    enabled: false,
    costPerRequest: 20
  }
]

// =====================================================
// MEDIA TOOL MANAGER
// =====================================================

let toolConfig: MediaToolConfig = {
  tools: [...DEFAULT_MEDIA_TOOLS],
  globalEnabled: false,
  adminOnlyUpload: true,
  maxUploadSize: 500 * 1024 * 1024 // 500MB
}

export function getMediaConfig(): MediaToolConfig {
  return { ...toolConfig }
}

export function updateMediaConfig(update: Partial<MediaToolConfig>): void {
  toolConfig = { ...toolConfig, ...update }
}

// Get tools visible to the user (only enabled ones, no provider info)
export function getPublicTools(): { codename: string; type: string; description: string; formats?: string[] }[] {
  if (!toolConfig.globalEnabled) return []
  return toolConfig.tools
    .filter(t => t.enabled && process.env[t.apiKeyEnv])
    .map(t => ({
      codename: t.codename,
      type: t.type,
      description: t.description,
      formats: t.formats,
      maxDuration: t.maxDuration,
      maxResolution: t.maxResolution
    }))
}

// Get a tool by codename (internal — includes provider info)
export function getToolByCodename(codename: string): MediaTool | null {
  const tool = toolConfig.tools.find(t => t.codename.toUpperCase() === codename.toUpperCase())
  if (!tool || !tool.enabled) return null
  if (!process.env[tool.apiKeyEnv]) return null
  return tool
}

// Enable/disable a tool (admin only)
export function setToolEnabled(codename: string, enabled: boolean): boolean {
  const tool = toolConfig.tools.find(t => t.codename === codename)
  if (!tool) return false
  tool.enabled = enabled
  return true
}

// Add a custom tool (admin only)
export function addCustomTool(tool: MediaTool): void {
  // Remove existing with same codename
  toolConfig.tools = toolConfig.tools.filter(t => t.codename !== tool.codename)
  toolConfig.tools.push(tool)
}

// =====================================================
// MEDIA GENERATION EXECUTOR
// Routes generation requests to the correct provider
// Provider details NEVER exposed to the client
// =====================================================

export async function generateMedia(req: MediaGenerationRequest): Promise<MediaGenerationResult> {
  const tool = getToolByCodename(req.toolCodename)
  if (!tool) {
    return { success: false, error: `Tool "${req.toolCodename}" not found or not enabled` }
  }

  const apiKey = process.env[tool.apiKeyEnv]
  if (!apiKey) {
    return { success: false, error: `Tool "${req.toolCodename}" is not configured` }
  }

  try {
    switch (tool.type) {
      case 'image':
        return await generateImage(tool, apiKey, req)
      case 'video':
        return await generateVideo(tool, apiKey, req)
      case 'audio':
        return await generateAudio(tool, apiKey, req)
      case 'voice':
        return await generateVoice(tool, apiKey, req)
      case '3d':
        return await generate3D(tool, apiKey, req)
      default:
        return { success: false, error: `Unknown tool type: ${tool.type}` }
    }
  } catch (err: unknown) {
    console.error(`[Media ${tool.codename}] Error:`, err)
    return { success: false, error: `Generation failed: ${(err instanceof Error ? err.message : String(err))}` }
  }
}

// ── Provider-specific handlers (all internal) ──

async function generateImage(tool: MediaTool, key: string, req: MediaGenerationRequest): Promise<MediaGenerationResult> {
  if (tool.provider === 'dall-e') {
    const resp = await fetch(tool.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: tool.model,
        prompt: req.prompt,
        n: 1,
        size: req.params?.size || '1024x1024',
        response_format: 'url'
      })
    })
    if (!resp.ok) throw new Error(`API error: ${resp.status}`)
    const data = await resp.json()
    return { success: true, url: data.data?.[0]?.url, mimeType: 'image/png', costCents: tool.costPerRequest }
  }

  if (tool.provider === 'stability') {
    const resp = await fetch(`${tool.endpoint}/${tool.model}/text-to-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'Accept': 'application/json' },
      body: JSON.stringify({
        text_prompts: [{ text: req.prompt, weight: 1 }],
        cfg_scale: req.params?.cfg_scale || 7,
        height: req.params?.height || 1024,
        width: req.params?.width || 1024,
        steps: req.params?.steps || 30,
        samples: 1
      })
    })
    if (!resp.ok) throw new Error(`API error: ${resp.status}`)
    const data = await resp.json()
    const base64 = data.artifacts?.[0]?.base64
    if (base64) return { success: true, url: `data:image/png;base64,${base64}`, mimeType: 'image/png', costCents: tool.costPerRequest }
    return { success: false, error: 'No image generated' }
  }

  return { success: false, error: `Unsupported image provider` }
}

async function generateVideo(tool: MediaTool, key: string, req: MediaGenerationRequest): Promise<MediaGenerationResult> {
  // Generic video generation API call
  const resp = await fetch(tool.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      prompt: req.prompt,
      duration: req.params?.duration || tool.maxDuration || 4,
      ...(req.inputFile && { image: req.inputFile.url }),
      ...req.params
    })
  })
  if (!resp.ok) throw new Error(`API error: ${resp.status}`)
  const data = await resp.json()
  // Most video APIs return a task ID for async polling
  return {
    success: true,
    url: data.url || data.output?.url || data.video_url,
    mimeType: 'video/mp4',
    duration: req.params?.duration || tool.maxDuration,
    costCents: tool.costPerRequest
  }
}

async function generateAudio(tool: MediaTool, key: string, req: MediaGenerationRequest): Promise<MediaGenerationResult> {
  const resp = await fetch(tool.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      prompt: req.prompt,
      duration: req.params?.duration,
      ...req.params
    })
  })
  if (!resp.ok) throw new Error(`API error: ${resp.status}`)
  const data = await resp.json()
  return {
    success: true,
    url: data.url || data.audio_url || data.output?.url,
    mimeType: 'audio/mpeg',
    duration: req.params?.duration,
    costCents: tool.costPerRequest
  }
}

async function generateVoice(tool: MediaTool, key: string, req: MediaGenerationRequest): Promise<MediaGenerationResult> {
  const voiceId = req.params?.voiceId || 'EXAVITQu4vr4xnSDxMaL' // Default voice
  const resp = await fetch(`${tool.endpoint}/${voiceId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'xi-api-key': key },
    body: JSON.stringify({
      text: req.prompt,
      model_id: tool.model,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 }
    })
  })
  if (!resp.ok) throw new Error(`API error: ${resp.status}`)
  const blob = await resp.blob()
  // In production, upload blob to storage and return URL
  return {
    success: true,
    url: URL.createObjectURL(blob),
    mimeType: 'audio/mpeg',
    costCents: tool.costPerRequest
  }
}

async function generate3D(tool: MediaTool, key: string, req: MediaGenerationRequest): Promise<MediaGenerationResult> {
  const resp = await fetch(tool.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      mode: 'preview',
      prompt: req.prompt,
      art_style: req.params?.style || 'realistic',
      ...req.params
    })
  })
  if (!resp.ok) throw new Error(`API error: ${resp.status}`)
  const data = await resp.json()
  return {
    success: true,
    url: data.model_urls?.glb || data.url,
    mimeType: 'model/gltf-binary',
    costCents: tool.costPerRequest
  }
}
