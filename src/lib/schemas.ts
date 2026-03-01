// ═══════════════════════════════════════════════════════════════════════════
// API BOUNDARY SCHEMAS — CONSTITUTION §4
// Every API boundary must validate with Zod.
// No raw req.json() without schema parse.
// ═══════════════════════════════════════════════════════════════════════════

import { z } from 'zod'

// ─── Chat ───────────────────────────────────────────────────────────────────

export const ChatRequestSchema = z.object({
  message: z.string().min(1).max(100_000),
  chatId: z.string().uuid().optional(),
  model: z.enum(['auto', 'fast', 'pro', 'premium']).default('auto'),
  context: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })).optional(),
  projectId: z.string().uuid().optional(),
})

export type ChatRequest = z.infer<typeof ChatRequestSchema>

// ─── Generate (Code Generation) ─────────────────────────────────────────────

export const GenerateRequestSchema = z.object({
  prompt: z.string().min(1).max(50_000),
  language: z.string().optional(),
  framework: z.string().optional(),
  model: z.enum(['auto', 'fast', 'pro', 'premium']).default('auto'),
})

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>

// ─── Admin AI Edit ──────────────────────────────────────────────────────────

export const AdminAIEditSchema = z.object({
  route: z.string().min(1),
  prompt: z.string().min(1).max(50_000),
  pageName: z.string().optional(),
})

export type AdminAIEdit = z.infer<typeof AdminAIEditSchema>

// ─── Deploy ─────────────────────────────────────────────────────────────────

export const DeployRequestSchema = z.object({
  files: z.record(z.string(), z.string()),
  projectName: z.string().min(1).max(100).optional(),
  framework: z.enum(['nextjs', 'react', 'vanilla']).default('react'),
})

export type DeployRequest = z.infer<typeof DeployRequestSchema>

// ─── Media Generation ───────────────────────────────────────────────────────

export const MediaRequestSchema = z.object({
  type: z.enum(['image', 'video', 'audio', 'voice', '3d']),
  prompt: z.string().min(1).max(10_000),
  settings: z.record(z.string(), z.unknown()).optional(),
})

export type MediaRequest = z.infer<typeof MediaRequestSchema>

// ─── Project Files ──────────────────────────────────────────────────────────

export const ProjectFilesSchema = z.object({
  projectId: z.string().uuid(),
  files: z.array(z.object({
    path: z.string().min(1),
    content: z.string(),
    language: z.string().optional(),
  })),
})

export type ProjectFiles = z.infer<typeof ProjectFilesSchema>

// ─── Admin Keys ─────────────────────────────────────────────────────────────

export const AdminKeysSchema = z.object({
  provider: z.string().min(1),
  key: z.string().min(1),
  enabled: z.boolean().default(true),
})

export type AdminKeys = z.infer<typeof AdminKeysSchema>

// ─── Admin Settings ─────────────────────────────────────────────────────────

export const AdminSettingsSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
})

export type AdminSettings = z.infer<typeof AdminSettingsSchema>

// ─── Contact Form ───────────────────────────────────────────────────────────

export const ContactSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  message: z.string().min(1).max(10_000),
  subject: z.string().max(500).optional(),
})

export type Contact = z.infer<typeof ContactSchema>

// ─── User Settings ──────────────────────────────────────────────────────────

export const UserSettingsSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']).optional(),
  defaultModel: z.enum(['auto', 'fast', 'pro', 'premium']).optional(),
  editorFontSize: z.number().int().min(10).max(24).optional(),
})

export type UserSettings = z.infer<typeof UserSettingsSchema>

// ─── Validation Helper ──────────────────────────────────────────────────────

export function parseRequest<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: true; data: T
} | {
  success: false; error: string; issues: z.ZodIssue[]
} {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return {
    success: false,
    error: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '),
    issues: result.error.issues,
  }
}

// ─── Response wrapper for validation errors ─────────────────────────────────

export function validationErrorResponse(error: string, issues: z.ZodIssue[]) {
  return Response.json(
    { error: 'Validation failed', details: error, issues },
    { status: 400 }
  )
}
