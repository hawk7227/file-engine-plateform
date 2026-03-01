// ═══════════════════════════════════════════════════════════════════════════
// API BOUNDARY VALIDATION — CONSTITUTION §4
// No external dependencies. Pure TypeScript runtime validation.
// ═══════════════════════════════════════════════════════════════════════════

type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

function requireString(val: unknown, name: string, maxLen = 100_000): string {
  if (typeof val !== 'string' || val.length === 0) throw new Error(`${name} must be a non-empty string`)
  if (val.length > maxLen) throw new Error(`${name} exceeds max length ${maxLen}`)
  return val
}

function optionalString(val: unknown): string | undefined {
  if (val === undefined || val === null) return undefined
  if (typeof val !== 'string') return undefined
  return val
}

// ─── Chat Request ───────────────────────────────────────────────────────────

export interface ChatRequest {
  message: string
  chatId?: string
  model?: 'auto' | 'fast' | 'pro' | 'premium'
  projectId?: string
}

export function parseChatRequest(body: unknown): ValidationResult<ChatRequest> {
  try {
    const b = body as Record<string, unknown>
    return {
      success: true,
      data: {
        message: requireString(b.message, 'message'),
        chatId: optionalString(b.chatId),
        model: (['auto', 'fast', 'pro', 'premium'].includes(b.model as string) ? b.model : 'auto') as ChatRequest['model'],
        projectId: optionalString(b.projectId),
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid request' }
  }
}

// ─── Generate Request ───────────────────────────────────────────────────────

export interface GenerateRequest {
  prompt: string
  language?: string
  framework?: string
  model?: 'auto' | 'fast' | 'pro' | 'premium'
}

export function parseGenerateRequest(body: unknown): ValidationResult<GenerateRequest> {
  try {
    const b = body as Record<string, unknown>
    return {
      success: true,
      data: {
        prompt: requireString(b.prompt, 'prompt', 50_000),
        language: optionalString(b.language),
        framework: optionalString(b.framework),
        model: (['auto', 'fast', 'pro', 'premium'].includes(b.model as string) ? b.model : 'auto') as GenerateRequest['model'],
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid request' }
  }
}

// ─── Admin AI Edit ──────────────────────────────────────────────────────────

export interface AdminAIEdit {
  route: string
  prompt: string
  pageName?: string
}

export function parseAdminAIEdit(body: unknown): ValidationResult<AdminAIEdit> {
  try {
    const b = body as Record<string, unknown>
    return {
      success: true,
      data: {
        route: requireString(b.route, 'route'),
        prompt: requireString(b.prompt, 'prompt', 50_000),
        pageName: optionalString(b.pageName),
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid request' }
  }
}

// ─── Deploy Request ─────────────────────────────────────────────────────────

export interface DeployRequest {
  files: Record<string, string>
  projectName?: string
  framework?: 'nextjs' | 'react' | 'vanilla'
}

export function parseDeployRequest(body: unknown): ValidationResult<DeployRequest> {
  try {
    const b = body as Record<string, unknown>
    if (!b.files || typeof b.files !== 'object') throw new Error('files must be an object')
    return {
      success: true,
      data: {
        files: b.files as Record<string, string>,
        projectName: optionalString(b.projectName),
        framework: (['nextjs', 'react', 'vanilla'].includes(b.framework as string) ? b.framework : 'react') as DeployRequest['framework'],
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid request' }
  }
}

// ─── Contact Form ───────────────────────────────────────────────────────────

export interface ContactRequest {
  name: string
  email: string
  message: string
  subject?: string
}

export function parseContactRequest(body: unknown): ValidationResult<ContactRequest> {
  try {
    const b = body as Record<string, unknown>
    const email = requireString(b.email, 'email', 320)
    if (!email.includes('@')) throw new Error('email must be valid')
    return {
      success: true,
      data: {
        name: requireString(b.name, 'name', 200),
        email,
        message: requireString(b.message, 'message', 10_000),
        subject: optionalString(b.subject),
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid request' }
  }
}

// ─── Generic validation error response ──────────────────────────────────────

export function validationErrorResponse(error: string) {
  return Response.json({ error: 'Validation failed', details: error }, { status: 400 })
}
