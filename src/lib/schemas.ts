// ═══════════════════════════════════════════════════════════════════════════
// API BOUNDARY VALIDATION — CONSTITUTION §4
// Every route MUST validate its body through a parse function.
// No raw req.json() without validation.
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

function requireNumber(val: unknown, name: string, min?: number, max?: number): number {
  const n = typeof val === 'number' ? val : Number(val)
  if (isNaN(n)) throw new Error(`${name} must be a number`)
  if (min !== undefined && n < min) throw new Error(`${name} must be >= ${min}`)
  if (max !== undefined && n > max) throw new Error(`${name} must be <= ${max}`)
  return n
}

function optionalNumber(val: unknown, fallback: number): number {
  if (val === undefined || val === null) return fallback
  const n = Number(val)
  return isNaN(n) ? fallback : n
}

function requireBoolean(val: unknown, fallback: boolean): boolean {
  if (val === undefined || val === null) return fallback
  return val === true || val === 'true'
}

function requireOneOf<T extends string>(val: unknown, options: T[], fallback: T): T {
  return options.includes(val as T) ? (val as T) : fallback
}

function requireObject(val: unknown, name: string): Record<string, unknown> {
  if (!val || typeof val !== 'object' || Array.isArray(val)) throw new Error(`${name} must be an object`)
  return val as Record<string, unknown>
}

function requireArray(val: unknown, name: string): unknown[] {
  if (!Array.isArray(val)) throw new Error(`${name} must be an array`)
  return val
}

// ─── Wrapper to parse req.json() + validate in one call ─────────────────
export async function parseBody<T>(
  req: Request,
  parser: (body: unknown) => ValidationResult<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await req.json()
    return parser(body)
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid JSON body' }
  }
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
        model: requireOneOf<'auto' | 'fast' | 'pro' | 'premium'>(b.model, ['auto', 'fast', 'pro', 'premium'], 'auto'),
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
  projectId?: string
  buildId?: string
  model: string
  language?: string
  framework?: string
}

export function parseGenerateRequest(body: unknown): ValidationResult<GenerateRequest> {
  try {
    const b = body as Record<string, unknown>
    return {
      success: true,
      data: {
        prompt: requireString(b.prompt, 'prompt', 50_000),
        projectId: optionalString(b.projectId),
        buildId: optionalString(b.buildId),
        model: typeof b.model === 'string' ? b.model : 'claude-sonnet-4',
        language: optionalString(b.language),
        framework: optionalString(b.framework),
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid request' }
  }
}

// ─── Generate Validated Request ─────────────────────────────────────────────
export interface GenerateValidatedRequest {
  prompt: string
  projectId?: string
  buildId?: string
  model: string
  strictMode: boolean
  maxFixIterations: number
}

export function parseGenerateValidatedRequest(body: unknown): ValidationResult<GenerateValidatedRequest> {
  try {
    const b = body as Record<string, unknown>
    return {
      success: true,
      data: {
        prompt: requireString(b.prompt, 'prompt', 50_000),
        projectId: optionalString(b.projectId),
        buildId: optionalString(b.buildId),
        model: typeof b.model === 'string' ? b.model : 'claude-sonnet-4',
        strictMode: requireBoolean(b.strictMode, false),
        maxFixIterations: optionalNumber(b.maxFixIterations, 3),
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
        prompt: requireString(b.prompt, 'prompt', 2000),
        pageName: optionalString(b.pageName),
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid request' }
  }
}

// ─── Admin Keys ─────────────────────────────────────────────────────────────
export interface AdminKeysRequest {
  key_name: string
  value: string
}

export function parseAdminKeysRequest(body: unknown): ValidationResult<AdminKeysRequest> {
  try {
    const b = body as Record<string, unknown>
    return {
      success: true,
      data: {
        key_name: requireString(b.key_name, 'key_name', 200),
        value: requireString(b.value, 'value', 10_000),
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid request' }
  }
}

// ─── Admin Permissions (POST body shape varies by action) ───────────────────
export interface AdminPermissionsRequest {
  userId: string
  role: string
  teamId?: string
}

export function parseAdminPermissionsRequest(body: unknown): ValidationResult<AdminPermissionsRequest> {
  try {
    const b = body as Record<string, unknown>
    return {
      success: true,
      data: {
        userId: requireString(b.userId, 'userId'),
        role: requireOneOf(b.role, ['owner', 'admin', 'editor', 'viewer'], 'viewer'),
        teamId: optionalString(b.teamId),
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid request' }
  }
}

// ─── Admin Settings ─────────────────────────────────────────────────────────
export interface AdminSettingsRequest {
  settings: Record<string, unknown>
}

export function parseAdminSettingsRequest(body: unknown): ValidationResult<AdminSettingsRequest> {
  try {
    const b = body as Record<string, unknown>
    return { success: true, data: { settings: requireObject(b, 'settings') } }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid request' }
  }
}

// ─── AI Vision ──────────────────────────────────────────────────────────────
export interface AIVisionRequest {
  image: string
  prompt: string
  maxTokens: number
}

export function parseAIVisionRequest(body: unknown): ValidationResult<AIVisionRequest> {
  try {
    const b = body as Record<string, unknown>
    return {
      success: true,
      data: {
        image: requireString(b.image, 'image'),
        prompt: requireString(b.prompt, 'prompt', 10_000),
        maxTokens: optionalNumber(b.maxTokens, 4096),
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid request' }
  }
}

// ─── Billing ────────────────────────────────────────────────────────────────
export interface BillingRequest { action: string }

export function parseBillingRequest(body: unknown): ValidationResult<BillingRequest> {
  try {
    const b = body as Record<string, unknown>
    return { success: true, data: { action: requireString(b.action, 'action', 100) } }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid request' }
  }
}

// ─── Builds ─────────────────────────────────────────────────────────────────
export interface BuildsRequest {
  project_id: string
  prompt: string
}

export function parseBuildsRequest(body: unknown): ValidationResult<BuildsRequest> {
  try {
    const b = body as Record<string, unknown>
    return {
      success: true,
      data: {
        project_id: requireString(b.project_id, 'project_id'),
        prompt: requireString(b.prompt, 'prompt', 50_000),
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid request' }
  }
}

// ─── Checkout ───────────────────────────────────────────────────────────────
export interface CheckoutRequest {
  plan: string
  interval: 'monthly' | 'yearly'
}

export function parseCheckoutRequest(body: unknown): ValidationResult<CheckoutRequest> {
  try {
    const b = body as Record<string, unknown>
    return {
      success: true,
      data: {
        plan: requireString(b.plan, 'plan', 100),
        interval: requireOneOf(b.interval, ['monthly', 'yearly'], 'monthly'),
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid request' }
  }
}

// ─── Contact ────────────────────────────────────────────────────────────────
export interface ContactRequest {
  name: string
  email: string
  message: string
  company?: string
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
        company: optionalString(b.company),
        subject: optionalString(b.subject),
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid request' }
  }
}

// ─── Deploy ─────────────────────────────────────────────────────────────────
export interface DeployRequest {
  projectId: string
  production: boolean
  customDomain?: string
  files?: Record<string, string>
  projectName?: string
  framework?: string
}

export function parseDeployRequest(body: unknown): ValidationResult<DeployRequest> {
  try {
    const b = body as Record<string, unknown>
    return {
      success: true,
      data: {
        projectId: requireString(b.projectId, 'projectId'),
        production: requireBoolean(b.production, false),
        customDomain: optionalString(b.customDomain),
        files: b.files && typeof b.files === 'object' ? (b.files as Record<string, string>) : undefined,
        projectName: optionalString(b.projectName),
        framework: optionalString(b.framework),
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid request' }
  }
}

// ─── Fetch URL ──────────────────────────────────────────────────────────────
export interface FetchUrlRequest { url: string }

export function parseFetchUrlRequest(body: unknown): ValidationResult<FetchUrlRequest> {
  try {
    const b = body as Record<string, unknown>
    const url = requireString(b.url, 'url', 4096)
    try { new URL(url) } catch { throw new Error('url must be a valid URL') }
    return { success: true, data: { url } }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid request' }
  }
}

// ─── File Engine: Auto Fix ──────────────────────────────────────────────────
export interface AutoFixRequest {
  originalFiles: Array<{ path: string; content: string }>
  errorLogs: string
  attemptNumber?: number
}

export function parseAutoFixRequest(body: unknown): ValidationResult<AutoFixRequest> {
  try {
    const b = body as Record<string, unknown>
    return {
      success: true,
      data: {
        originalFiles: requireArray(b.originalFiles, 'originalFiles') as AutoFixRequest['originalFiles'],
        errorLogs: requireString(b.errorLogs, 'errorLogs'),
        attemptNumber: optionalNumber(b.attemptNumber, 1),
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid request' }
  }
}

// ─── File Engine: Deploy Both ───────────────────────────────────────────────
export interface DeployBothRequest {
  files: Record<string, string>
  projectName: string
  buildId?: string
  projectId?: string
}

export function parseDeployBothRequest(body: unknown): ValidationResult<DeployBothRequest> {
  try {
    const b = body as Record<string, unknown>
    return {
      success: true,
      data: {
        files: requireObject(b.files, 'files') as Record<string, string>,
        projectName: requireString(b.projectName, 'projectName', 200),
        buildId: optionalString(b.buildId),
        projectId: optionalString(b.projectId),
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid request' }
  }
}

// ─── File Engine: Deploy Vercel ─────────────────────────────────────────────
export interface DeployVercelRequest {
  files: Record<string, string>
  projectName: string
  buildId?: string
}

export function parseDeployVercelRequest(body: unknown): ValidationResult<DeployVercelRequest> {
  try {
    const b = body as Record<string, unknown>
    return {
      success: true,
      data: {
        files: requireObject(b.files, 'files') as Record<string, string>,
        projectName: requireString(b.projectName, 'projectName', 200),
        buildId: optionalString(b.buildId),
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid request' }
  }
}

// ─── File Engine: Push GitHub ───────────────────────────────────────────────
export interface PushGithubRequest {
  files: Record<string, string>
  projectName: string
  repoName?: string
  isPrivate?: boolean
  buildId?: string
  projectId?: string
}

export function parsePushGithubRequest(body: unknown): ValidationResult<PushGithubRequest> {
  try {
    const b = body as Record<string, unknown>
    return {
      success: true,
      data: {
        files: requireObject(b.files, 'files') as Record<string, string>,
        projectName: requireString(b.projectName, 'projectName', 200),
        repoName: optionalString(b.repoName),
        isPrivate: requireBoolean(b.isPrivate, true),
        buildId: optionalString(b.buildId),
        projectId: optionalString(b.projectId),
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid request' }
  }
}

// ─── File Engine: User Fix ──────────────────────────────────────────────────
export interface UserFixRequest {
  originalFiles: Array<{ path: string; content: string }>
  errorLogs: string
  userInstructions: string
}

export function parseUserFixRequest(body: unknown): ValidationResult<UserFixRequest> {
  try {
    const b = body as Record<string, unknown>
    return {
      success: true,
      data: {
        originalFiles: requireArray(b.originalFiles, 'originalFiles') as UserFixRequest['originalFiles'],
        errorLogs: requireString(b.errorLogs, 'errorLogs'),
        userInstructions: requireString(b.userInstructions, 'userInstructions', 10_000),
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid request' }
  }
}

// ─── File Engine: Verify Build ──────────────────────────────────────────────
export interface VerifyBuildRequest {
  files: Record<string, string>
  projectName: string
  buildId?: string
}

export function parseVerifyBuildRequest(body: unknown): ValidationResult<VerifyBuildRequest> {
  try {
    const b = body as Record<string, unknown>
    return {
      success: true,
      data: {
        files: requireObject(b.files, 'files') as Record<string, string>,
        projectName: requireString(b.projectName, 'projectName', 200),
        buildId: optionalString(b.buildId),
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid request' }
  }
}

// ─── Media ──────────────────────────────────────────────────────────────────
export interface MediaRequest {
  prompt: string
  type: 'image' | 'video' | 'audio'
  model?: string
}

export function parseMediaRequest(body: unknown): ValidationResult<MediaRequest> {
  try {
    const b = body as Record<string, unknown>
    return {
      success: true,
      data: {
        prompt: requireString(b.prompt, 'prompt', 10_000),
        type: requireOneOf(b.type, ['image', 'video', 'audio'], 'image'),
        model: optionalString(b.model),
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid request' }
  }
}

// ─── Projects ───────────────────────────────────────────────────────────────
export interface ProjectsRequest {
  name: string
  type: string
}

export function parseProjectsRequest(body: unknown): ValidationResult<ProjectsRequest> {
  try {
    const b = body as Record<string, unknown>
    return {
      success: true,
      data: {
        name: requireString(b.name, 'name', 200),
        type: requireString(b.type, 'type', 100),
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid request' }
  }
}

// ─── Search Web ─────────────────────────────────────────────────────────────
export interface SearchWebRequest {
  query: string
  maxResults: number
  dateRange: string
}

export function parseSearchWebRequest(body: unknown): ValidationResult<SearchWebRequest> {
  try {
    const b = body as Record<string, unknown>
    return {
      success: true,
      data: {
        query: requireString(b.query, 'query', 1000),
        maxResults: optionalNumber(b.maxResults, 10),
        dateRange: typeof b.dateRange === 'string' ? b.dateRange : 'all',
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid request' }
  }
}

// ─── Team ───────────────────────────────────────────────────────────────────
export interface TeamRequest {
  projectId: string
  email: string
  role: string
}

export function parseTeamRequest(body: unknown): ValidationResult<TeamRequest> {
  try {
    const b = body as Record<string, unknown>
    const email = requireString(b.email, 'email', 320)
    if (!email.includes('@')) throw new Error('email must be valid')
    return {
      success: true,
      data: {
        projectId: requireString(b.projectId, 'projectId'),
        email,
        role: requireOneOf(b.role, ['owner', 'admin', 'editor', 'viewer'], 'editor'),
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid request' }
  }
}

// ─── User Settings ──────────────────────────────────────────────────────────
export interface UserSettingsRequest {
  model?: string
  primaryKey?: string
  secondaryKey?: string
}

export function parseUserSettingsRequest(body: unknown): ValidationResult<UserSettingsRequest> {
  try {
    const b = body as Record<string, unknown>
    return {
      success: true,
      data: {
        model: optionalString(b.model),
        primaryKey: optionalString(b.primaryKey),
        secondaryKey: optionalString(b.secondaryKey),
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid request' }
  }
}

// ─── Validate ───────────────────────────────────────────────────────────────
export interface ValidateRequest {
  files: Record<string, string>
  projectName?: string
}

export function parseValidateRequest(body: unknown): ValidationResult<ValidateRequest> {
  try {
    const b = body as Record<string, unknown>
    return {
      success: true,
      data: {
        files: requireObject(b.files, 'files') as Record<string, string>,
        projectName: optionalString(b.projectName),
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid request' }
  }
}

// ─── Test (generic) ─────────────────────────────────────────────────────────
export interface TestRequest {
  action: string
  data?: unknown
}

export function parseTestRequest(body: unknown): ValidationResult<TestRequest> {
  try {
    const b = body as Record<string, unknown>
    return {
      success: true,
      data: {
        action: requireString(b.action, 'action', 100),
        data: b.data,
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
