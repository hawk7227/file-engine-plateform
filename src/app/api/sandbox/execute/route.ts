// =====================================================
// SANDBOX EXECUTION API
//
// Runs commands in an isolated sandbox environment.
// Provider is configurable: E2B (production) or Mock (dev).
// Set SANDBOX_PROVIDER=e2b|mock in env.
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { getSandboxProvider } from '@/lib/sandbox/index'

export const dynamic = 'force-dynamic'
export const maxDuration = 120 // Allow up to 2 min for builds

interface ExecuteRequest {
  sandboxId?: string
  projectId: string
  userId?: string
  command: string
  files?: { path: string; content: string }[]
  template?: 'react' | 'nextjs' | 'node' | 'python' | 'static'
  timeoutMs?: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ExecuteRequest
    const { projectId, command, files, template, timeoutMs } = body

    if (!projectId || !command) {
      return NextResponse.json(
        { error: 'Missing projectId or command' },
        { status: 400 }
      )
    }

    const provider = await getSandboxProvider()
    let sandboxId = body.sandboxId

    // Create sandbox if none provided
    if (!sandboxId) {
      const result = await provider.create({
        projectId,
        userId: body.userId || 'anonymous',
        template: template || 'node',
        timeoutMs: timeoutMs || 300_000,
      })
      sandboxId = result.sandboxId
    }

    // Write files if provided
    if (files && files.length > 0) {
      await provider.writeFiles(sandboxId, files)
    }

    // Execute command
    const process = await provider.exec(sandboxId, command, {
      timeoutMs: timeoutMs || 60_000,
    })

    // Get preview URL if a server was started
    let previewUrl: string | null = null
    if (command.includes('dev') || command.includes('start')) {
      const preview = await provider.getPreviewUrl(sandboxId)
      previewUrl = preview?.url || null
    }

    return NextResponse.json({
      sandboxId,
      output: process.stdout || process.stderr,
      stdout: process.stdout,
      stderr: process.stderr,
      exitCode: process.exitCode,
      previewUrl,
    })
  } catch (err: unknown) {
    console.error('[Sandbox API Error]', err)
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : String(err),
        output: '',
        exitCode: 1,
      },
      { status: 500 }
    )
  }
}
