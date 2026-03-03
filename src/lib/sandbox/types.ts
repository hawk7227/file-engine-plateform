// =====================================================
// SANDBOX PROVIDER — Abstract interface for code execution
//
// The AI chat route calls these methods. The implementation
// can be E2B, self-hosted Docker, or WebContainers.
// Swap providers by changing the factory — zero consumer changes.
// =====================================================

// ── Types ──

export interface SandboxFile {
  path: string
  content: string
}

export interface SandboxProcess {
  pid: number
  command: string
  exitCode: number | null
  stdout: string
  stderr: string
  isRunning: boolean
}

export interface SandboxPreview {
  /** Public URL where the dev server is accessible */
  url: string
  /** Port the server is listening on inside the sandbox */
  port: number
}

export interface SandboxInfo {
  id: string
  status: 'creating' | 'running' | 'stopped' | 'error'
  createdAt: string
  previewUrl: string | null
  filesWritten: number
}

// ── Provider interface ──

export interface SandboxProvider {
  /**
   * Create a new sandbox for a project.
   * Returns sandbox ID for all subsequent operations.
   */
  create(opts: {
    projectId: string
    userId: string
    template?: 'react' | 'nextjs' | 'node' | 'python' | 'static'
    timeoutMs?: number
  }): Promise<{ sandboxId: string; info: SandboxInfo }>

  /**
   * Write files to the sandbox filesystem.
   * Paths are relative to /home/user/project/
   */
  writeFiles(sandboxId: string, files: SandboxFile[]): Promise<void>

  /**
   * Read a file from the sandbox filesystem.
   * Returns null if file doesn't exist.
   */
  readFile(sandboxId: string, path: string): Promise<string | null>

  /**
   * List files in a directory. Non-recursive by default.
   */
  listFiles(sandboxId: string, dir?: string): Promise<string[]>

  /**
   * Execute a command in the sandbox.
   * Returns when the command exits OR timeout is reached.
   */
  exec(sandboxId: string, command: string, opts?: {
    cwd?: string
    env?: Record<string, string>
    timeoutMs?: number
  }): Promise<SandboxProcess>

  /**
   * Start a long-running process (e.g. npm run dev).
   * Returns immediately with the process info.
   * Use getPreviewUrl() to get the dev server URL.
   */
  startProcess(sandboxId: string, command: string, opts?: {
    cwd?: string
    env?: Record<string, string>
    port?: number
  }): Promise<SandboxProcess>

  /**
   * Get the public preview URL for a running dev server.
   * Returns null if no server is running on the expected port.
   */
  getPreviewUrl(sandboxId: string, port?: number): Promise<SandboxPreview | null>

  /**
   * Get current sandbox status and metadata.
   */
  getInfo(sandboxId: string): Promise<SandboxInfo | null>

  /**
   * Stop and destroy the sandbox. Releases resources.
   */
  destroy(sandboxId: string): Promise<void>

  /**
   * Keep the sandbox alive (reset idle timeout).
   * Call periodically while user is active.
   */
  keepAlive(sandboxId: string): Promise<void>
}

// ── Factory ──

export type SandboxProviderType = 'e2b' | 'docker' | 'mock'

export async function createSandboxProvider(type: SandboxProviderType): Promise<SandboxProvider> {
  switch (type) {
    case 'e2b': {
      const { E2BSandboxProvider } = await import('./e2b-provider')
      return new E2BSandboxProvider()
    }
    case 'mock': {
      const { MockSandboxProvider } = await import('./mock-provider')
      return new MockSandboxProvider()
    }
    case 'docker': {
      // Future: self-hosted Docker/Firecracker provider
      throw new Error('Docker provider not yet implemented. Use E2B or mock.')
    }
    default:
      throw new Error(`Unknown sandbox provider: ${type}`)
  }
}

// ── Singleton accessor ──

let _provider: SandboxProvider | null = null

export async function getSandboxProvider(): Promise<SandboxProvider> {
  if (!_provider) {
    const type = (process.env.SANDBOX_PROVIDER || 'mock') as SandboxProviderType
    _provider = await createSandboxProvider(type)
  }
  return _provider
}
