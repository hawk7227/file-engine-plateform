// =====================================================
// MOCK SANDBOX PROVIDER
//
// In-memory simulation for development and testing.
// No real filesystem or process execution.
// Performs static analysis on code to generate realistic output.
// =====================================================

import type {
  SandboxProvider,
  SandboxFile,
  SandboxProcess,
  SandboxPreview,
  SandboxInfo,
} from './types'

interface MockSandbox {
  id: string
  projectId: string
  userId: string
  files: Map<string, string>
  createdAt: string
  status: 'running' | 'stopped'
}

const sandboxes = new Map<string, MockSandbox>()
let idCounter = 0

export class MockSandboxProvider implements SandboxProvider {
  async create(opts: {
    projectId: string
    userId: string
    template?: string
    timeoutMs?: number
  }) {
    const id = `mock-${++idCounter}-${Date.now()}`
    const sandbox: MockSandbox = {
      id,
      projectId: opts.projectId,
      userId: opts.userId,
      files: new Map(),
      createdAt: new Date().toISOString(),
      status: 'running',
    }
    sandboxes.set(id, sandbox)

    return {
      sandboxId: id,
      info: {
        id,
        status: 'running' as const,
        createdAt: sandbox.createdAt,
        previewUrl: null,
        filesWritten: 0,
      },
    }
  }

  async writeFiles(sandboxId: string, files: SandboxFile[]) {
    const sb = sandboxes.get(sandboxId)
    if (!sb) throw new Error(`Sandbox ${sandboxId} not found`)
    for (const f of files) {
      sb.files.set(f.path, f.content)
    }
  }

  async readFile(sandboxId: string, path: string) {
    const sb = sandboxes.get(sandboxId)
    if (!sb) throw new Error(`Sandbox ${sandboxId} not found`)
    return sb.files.get(path) ?? null
  }

  async listFiles(sandboxId: string, dir = '') {
    const sb = sandboxes.get(sandboxId)
    if (!sb) throw new Error(`Sandbox ${sandboxId} not found`)
    const prefix = dir ? (dir.endsWith('/') ? dir : dir + '/') : ''
    const results: string[] = []
    for (const key of sb.files.keys()) {
      if (!prefix || key.startsWith(prefix)) {
        results.push(key)
      }
    }
    return results
  }

  async exec(sandboxId: string, command: string): Promise<SandboxProcess> {
    const sb = sandboxes.get(sandboxId)
    if (!sb) throw new Error(`Sandbox ${sandboxId} not found`)

    // Simulate command output based on command string
    const output = simulateCommand(command, sb.files)

    return {
      pid: Math.floor(Math.random() * 10000),
      command,
      exitCode: output.exitCode,
      stdout: output.stdout,
      stderr: output.stderr,
      isRunning: false,
    }
  }

  async startProcess(sandboxId: string, command: string): Promise<SandboxProcess> {
    return {
      pid: Math.floor(Math.random() * 10000),
      command,
      exitCode: null,
      stdout: `[mock] Started: ${command}\nServer running on http://localhost:3000`,
      stderr: '',
      isRunning: true,
    }
  }

  async getPreviewUrl(sandboxId: string, port = 3000): Promise<SandboxPreview | null> {
    const sb = sandboxes.get(sandboxId)
    if (!sb) return null
    // In mock mode, return null — no real server
    return null
  }

  async getInfo(sandboxId: string): Promise<SandboxInfo | null> {
    const sb = sandboxes.get(sandboxId)
    if (!sb) return null
    return {
      id: sb.id,
      status: sb.status === 'running' ? 'running' : 'stopped',
      createdAt: sb.createdAt,
      previewUrl: null,
      filesWritten: sb.files.size,
    }
  }

  async destroy(sandboxId: string) {
    sandboxes.delete(sandboxId)
  }

  async keepAlive() {
    // No-op in mock
  }
}

// ── Static analysis simulator ──

function simulateCommand(
  command: string,
  files: Map<string, string>
): { stdout: string; stderr: string; exitCode: number } {
  const start = Date.now()

  if (command.includes('npm install') || command.includes('npm i')) {
    return {
      stdout: `added ${files.size * 12 + 80} packages in ${(Math.random() * 5 + 3).toFixed(1)}s\n\n✓ Dependencies installed`,
      stderr: '',
      exitCode: 0,
    }
  }

  if (command.includes('npm run build') || command.includes('next build') || command.includes('vite build')) {
    const errors = analyzeFiles(files)
    if (errors.length > 0) {
      return {
        stdout: '',
        stderr: `Build failed:\n\n${errors.join('\n')}`,
        exitCode: 1,
      }
    }
    return {
      stdout: `✓ Compiled successfully\n✓ ${files.size} modules transformed\n✓ Build complete in ${Date.now() - start}ms`,
      stderr: '',
      exitCode: 0,
    }
  }

  if (command.includes('tsc') || command.includes('typecheck')) {
    const errors = analyzeFiles(files).filter(e => e.includes('error'))
    if (errors.length > 0) {
      return { stdout: '', stderr: errors.join('\n'), exitCode: 1 }
    }
    return { stdout: '✓ Type checking passed', stderr: '', exitCode: 0 }
  }

  if (command.includes('npm test') || command.includes('vitest') || command.includes('jest')) {
    return {
      stdout: `PASS  All tests\n  ✓ renders correctly (${Math.floor(Math.random() * 50 + 10)}ms)\n  ✓ handles events (${Math.floor(Math.random() * 30 + 5)}ms)\n\nTests: 2 passed\nTime:  ${Date.now() - start}ms`,
      stderr: '',
      exitCode: 0,
    }
  }

  if (command.includes('npm run dev') || command.includes('vite') || command.includes('next dev')) {
    return {
      stdout: `ready - started server on http://localhost:3000\n[mock] Dev server simulated`,
      stderr: '',
      exitCode: 0,
    }
  }

  return {
    stdout: `[mock] Executed: ${command}`,
    stderr: '',
    exitCode: 0,
  }
}

function analyzeFiles(files: Map<string, string>): string[] {
  const errors: string[] = []

  for (const [path, content] of files) {
    if (!path.endsWith('.ts') && !path.endsWith('.tsx')) continue

    // Bracket balance
    const open = (content.match(/{/g) || []).length
    const close = (content.match(/}/g) || []).length
    if (open !== close) {
      errors.push(`${path}: error TS1005: '}' expected (${open} open, ${close} close)`)
    }

    // Missing React import for hooks
    if (
      (content.includes('useState') || content.includes('useEffect')) &&
      !content.includes("from 'react'") &&
      !content.includes('from "react"')
    ) {
      errors.push(`${path}: error TS2304: Cannot find name 'useState'. Import from 'react'.`)
    }
  }

  return errors
}
