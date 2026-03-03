// =====================================================
// E2B SANDBOX PROVIDER
//
// Uses E2B (e2b.dev) for sandboxed code execution.
// Each sandbox is a Firecracker microVM with:
// - Full filesystem, Node.js 20, Python 3.11, npm, git
// - Network access (outbound HTTP/HTTPS)
// - Public URL for dev server preview
//
// Requires: npm install e2b @e2b/code-interpreter
// Env: E2B_API_KEY
// =====================================================

import type {
  SandboxProvider,
  SandboxFile,
  SandboxProcess,
  SandboxPreview,
  SandboxInfo,
} from './types'

// Lazy import to avoid build errors when e2b isn't installed

async function getE2B(): Promise<any> {
  try {
    // Dynamic import — only resolved at runtime when E2B provider is selected
    return await (Function('return import("e2b")')() as Promise<unknown>)
  } catch {
    throw new Error(
      'e2b package not installed. Run: npm install e2b @e2b/code-interpreter'
    )
  }
}

// Track active sandboxes
interface SandboxEntry {
  
  sandbox: any // e2b.Sandbox type — kept as any to avoid import at module level
  projectId: string
  userId: string
  createdAt: string
  filesWritten: number
}

const activeSandboxes = new Map<string, SandboxEntry>()

export class E2BSandboxProvider implements SandboxProvider {
  async create(opts: {
    projectId: string
    userId: string
    template?: 'react' | 'nextjs' | 'node' | 'python' | 'static'
    timeoutMs?: number
  }) {
    const e2b = await getE2B()
    const timeout = opts.timeoutMs || 300_000 // 5 min default

    // E2B templates map to pre-built sandbox images
    const templateMap: Record<string, string> = {
      react: 'base',     // Install React toolchain post-create
      nextjs: 'base',
      node: 'base',
      python: 'base',
      static: 'base',
    }
    const template = templateMap[opts.template || 'node'] || 'base'

    const sandbox = await e2b.Sandbox.create(template, {
      timeoutMs: timeout,
      metadata: {
        projectId: opts.projectId,
        userId: opts.userId,
      },
    })

    const sandboxId = sandbox.sandboxId

    activeSandboxes.set(sandboxId, {
      sandbox,
      projectId: opts.projectId,
      userId: opts.userId,
      createdAt: new Date().toISOString(),
      filesWritten: 0,
    })

    // Bootstrap project directory
    await sandbox.filesystem.makeDir('/home/user/project')

    // Install template-specific toolchain
    if (opts.template === 'react' || opts.template === 'nextjs') {
      // Don't await — let it install in background. User can write files while npm runs.
      sandbox.process.start({
        cmd: 'cd /home/user/project && npm init -y',
        timeoutMs: 30_000,
      }).catch(() => { /* non-critical */ })
    }

    return {
      sandboxId,
      info: {
        id: sandboxId,
        status: 'running' as const,
        createdAt: new Date().toISOString(),
        previewUrl: null,
        filesWritten: 0,
      },
    }
  }

  async writeFiles(sandboxId: string, files: SandboxFile[]) {
    const entry = activeSandboxes.get(sandboxId)
    if (!entry) throw new Error(`Sandbox ${sandboxId} not found`)

    for (const file of files) {
      const fullPath = file.path.startsWith('/')
        ? file.path
        : `/home/user/project/${file.path}`

      // Ensure parent directory exists
      const dir = fullPath.substring(0, fullPath.lastIndexOf('/'))
      if (dir) {
        await entry.sandbox.filesystem.makeDir(dir).catch(() => {
          /* dir might already exist */
        })
      }

      await entry.sandbox.filesystem.write(fullPath, file.content)
    }

    entry.filesWritten += files.length
  }

  async readFile(sandboxId: string, path: string) {
    const entry = activeSandboxes.get(sandboxId)
    if (!entry) throw new Error(`Sandbox ${sandboxId} not found`)

    const fullPath = path.startsWith('/')
      ? path
      : `/home/user/project/${path}`

    try {
      return await entry.sandbox.filesystem.read(fullPath)
    } catch {
      return null
    }
  }

  async listFiles(sandboxId: string, dir = '/home/user/project') {
    const entry = activeSandboxes.get(sandboxId)
    if (!entry) throw new Error(`Sandbox ${sandboxId} not found`)

    try {
      const entries = await entry.sandbox.filesystem.list(dir)
      
      return entries.map((e: any) => e.name as string)
    } catch {
      return []
    }
  }

  async exec(sandboxId: string, command: string, opts?: {
    cwd?: string
    env?: Record<string, string>
    timeoutMs?: number
  }): Promise<SandboxProcess> {
    const entry = activeSandboxes.get(sandboxId)
    if (!entry) throw new Error(`Sandbox ${sandboxId} not found`)

    const cwd = opts?.cwd || '/home/user/project'
    const fullCommand = `cd ${cwd} && ${command}`

    const result = await entry.sandbox.process.start({
      cmd: fullCommand,
      envs: opts?.env,
      timeoutMs: opts?.timeoutMs || 60_000,
    })

    // Wait for completion
    const output = await result.wait()

    return {
      pid: 0, // E2B doesn't expose PID
      command,
      exitCode: output.exitCode,
      stdout: output.stdout,
      stderr: output.stderr,
      isRunning: false,
    }
  }

  async startProcess(sandboxId: string, command: string, opts?: {
    cwd?: string
    env?: Record<string, string>
    port?: number
  }): Promise<SandboxProcess> {
    const entry = activeSandboxes.get(sandboxId)
    if (!entry) throw new Error(`Sandbox ${sandboxId} not found`)

    const cwd = opts?.cwd || '/home/user/project'
    const fullCommand = `cd ${cwd} && ${command}`

    const process = await entry.sandbox.process.start({
      cmd: fullCommand,
      envs: opts?.env,
    })

    return {
      pid: 0,
      command,
      exitCode: null,
      stdout: '',
      stderr: '',
      isRunning: true,
    }
  }

  async getPreviewUrl(sandboxId: string, port = 3000): Promise<SandboxPreview | null> {
    const entry = activeSandboxes.get(sandboxId)
    if (!entry) return null

    try {
      const url = entry.sandbox.getHost(port)
      return { url: `https://${url}`, port }
    } catch {
      return null
    }
  }

  async getInfo(sandboxId: string): Promise<SandboxInfo | null> {
    const entry = activeSandboxes.get(sandboxId)
    if (!entry) return null

    let previewUrl: string | null = null
    try {
      const host = entry.sandbox.getHost(3000)
      previewUrl = `https://${host}`
    } catch { /* no server running */ }

    return {
      id: sandboxId,
      status: 'running',
      createdAt: entry.createdAt,
      previewUrl,
      filesWritten: entry.filesWritten,
    }
  }

  async destroy(sandboxId: string) {
    const entry = activeSandboxes.get(sandboxId)
    if (!entry) return

    try {
      await entry.sandbox.close()
    } catch { /* already closed */ }

    activeSandboxes.delete(sandboxId)
  }

  async keepAlive(sandboxId: string) {
    const entry = activeSandboxes.get(sandboxId)
    if (!entry) return

    await entry.sandbox.setTimeout(300_000) // Reset to 5 min
  }
}
