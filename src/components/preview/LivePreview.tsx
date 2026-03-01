'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

interface LivePreviewProps {
  files: Array<{
    path: string
    content: string
  }>
  onReady?: (url: string) => void
  onError?: (error: string) => void
  onLog?: (log: string) => void
}

// WebContainer types (loaded dynamically)
interface WebContainerInstance {
  mount: (files: any) => Promise<void>
  spawn: (command: string, args: string[]) => Promise<any>
  on: (event: string, callback: (data: any) => void) => void
  teardown: () => Promise<void>
}

export function LivePreview({ files, onReady, onError, onLog }: LivePreviewProps) {
  const [status, setStatus] = useState<'loading' | 'installing' | 'starting' | 'ready' | 'error'>('loading')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const containerRef = useRef<WebContainerInstance | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const addLog = useCallback((message: string) => {
    setLogs((prev: string[]) => [...prev.slice(-50), message])
    onLog?.(message)
  }, [onLog])

  // Convert files to WebContainer format
  const convertFilesToWebContainer = (files: Array<{ path: string; content: string }>) => {
    const tree: Record<string, any> = {}
    
    files.forEach(file => {
      const parts = file.path.split('/').filter(Boolean)
      let current = tree
      
      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          // File
          current[part] = {
            file: {
              contents: file.content
            }
          }
        } else {
          // Directory
          if (!current[part]) {
            current[part] = { directory: {} }
          }
          current = current[part].directory
        }
      })
    })
    
    return tree
  }

  // Initialize WebContainer
  useEffect(() => {
    let mounted = true

    async function boot() {
      try {
        setStatus('loading')
        addLog('[Preview] Loading WebContainer...')

        // Dynamically import WebContainer
        // @ts-ignore - WebContainer API is loaded dynamically
        const { WebContainer } = await import('@webcontainer/api')
        
        // Boot the container
        const container = await WebContainer.boot()
        containerRef.current = container as WebContainerInstance

        addLog('[Preview] WebContainer ready')

        // Listen for server-ready event
        container.on('server-ready', (port: number, url: string) => {
          if (mounted) {
            setPreviewUrl(url)
            setStatus('ready')
            addLog(`[Preview] Server ready at ${url}`)
            onReady?.(url)
          }
        })

        // Mount files
        setStatus('installing')
        addLog('[Preview] Mounting files...')
        const fileTree = convertFilesToWebContainer(files)
        await container.mount(fileTree)
        addLog(`[Preview] Mounted ${files.length} files`)

        // Check if package.json exists
        const hasPackageJson = files.some(f => f.path === 'package.json' || f.path === '/package.json')
        
        if (hasPackageJson) {
          // Install dependencies
          addLog('[Preview] Installing dependencies...')
          const installProcess = await container.spawn('npm', ['install'])
          
          installProcess.output.pipeTo(new WritableStream({
            write(data) {
              addLog(`[npm] ${data}`)
            }
          }))

          const installCode = await installProcess.exit
          if (installCode !== 0) {
            throw new Error('npm install failed')
          }
          addLog('[Preview] Dependencies installed')

          // Start dev server
          setStatus('starting')
          addLog('[Preview] Starting dev server...')
          
          const devProcess = await container.spawn('npm', ['run', 'dev'])
          
          devProcess.output.pipeTo(new WritableStream({
            write(data) {
              addLog(`[dev] ${data}`)
            }
          }))
        } else {
          // Static files - serve directly
          addLog('[Preview] Serving static files...')
          
          // Install and run serve
          await container.spawn('npm', ['install', 'serve'])
          const serveProcess = await container.spawn('npx', ['serve', '-l', '3000'])
          
          serveProcess.output.pipeTo(new WritableStream({
            write(data) {
              addLog(`[serve] ${data}`)
            }
          }))
        }
      } catch (error) {
        if (mounted) {
          const message = error instanceof Error ? error.message : 'Failed to start preview'
          setStatus('error')
          addLog(`[Error] ${message}`)
          onError?.(message)
        }
      }
    }

    if (files.length > 0) {
      boot()
    }

    return () => {
      mounted = false
      if (containerRef.current) {
        containerRef.current.teardown()
      }
    }
  }, [files, addLog, onReady, onError])

  // Refresh preview when files change
  const refresh = useCallback(() => {
    if (iframeRef.current && previewUrl) {
      iframeRef.current.src = previewUrl
    }
  }, [previewUrl])

  return (
    <div className="live-preview-container">
      {/* Status bar */}
      <div className="live-preview-status">
        <div className="live-preview-status-indicator">
          <span className={`status-dot ${status}`} />
          <span>{getStatusText(status)}</span>
        </div>
        <div className="live-preview-actions">
          <button onClick={refresh} disabled={status !== 'ready'} className="btn btn-ghost">
            ↻ Refresh
          </button>
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
              ↗ Open
            </a>
          )}
        </div>
      </div>

      {/* Preview area */}
      <div className="live-preview-frame">
        {status === 'loading' && (
          <div className="live-preview-loading">
            <div className="loading-spinner" />
            <p>Booting WebContainer...</p>
          </div>
        )}

        {status === 'installing' && (
          <div className="live-preview-loading">
            <div className="loading-spinner" />
            <p>Installing dependencies...</p>
          </div>
        )}

        {status === 'starting' && (
          <div className="live-preview-loading">
            <div className="loading-spinner" />
            <p>Starting dev server...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="live-preview-error">
            <span></span>
            <p>Preview failed to load</p>
            <p className="error-hint">Check the console tab for details</p>
          </div>
        )}

        {previewUrl && (
          <iframe
            ref={iframeRef}
            src={previewUrl}
            className="live-preview-iframe"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        )}
      </div>

      {/* Console logs */}
      <div className="live-preview-console">
        <div className="console-header">Console</div>
        <div className="console-logs">
          {logs.map((log: string, i: number) => (
            <div key={i} className={`console-log ${getLogType(log)}`}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function getStatusText(status: string): string {
  switch (status) {
    case 'loading': return 'Loading...'
    case 'installing': return 'Installing dependencies...'
    case 'starting': return 'Starting server...'
    case 'ready': return 'Ready'
    case 'error': return 'Error'
    default: return 'Unknown'
  }
}

function getLogType(log: string): string {
  if (log.includes('[Error]') || log.includes('error') || log.includes('Error')) return 'error'
  if (log.includes('warning') || log.includes('warn')) return 'warning'
  if (log.includes('[Preview]')) return 'info'
  return ''
}

// Alternative: Sandpack-based preview (simpler, no WebContainer needed)
export function SandpackPreview({ files }: { files: Array<{ path: string; content: string }> }) {
  // Convert files to Sandpack format
  const sandpackFiles: Record<string, string> = {}
  files.forEach(f => {
    const path = f.path.startsWith('/') ? f.path : `/${f.path}`
    sandpackFiles[path] = f.content
  })

  // Detect template
  const hasReact = files.some(f => 
    f.content.includes('from "react"') || f.content.includes("from 'react'")
  )
  const hasNext = files.some(f => 
    f.content.includes('from "next') || f.content.includes("from 'next")
  )
  const hasVue = files.some(f => 
    f.content.includes('from "vue"') || f.content.includes("from 'vue'")
  )

  let template = 'static'
  if (hasNext) template = 'nextjs'
  else if (hasReact) template = 'react'
  else if (hasVue) template = 'vue'

  return (
    <div className="sandpack-preview">
      {/* 
        Note: This component requires @codesandbox/sandpack-react package
        Install with: npm install @codesandbox/sandpack-react
        
        <Sandpack
          files={sandpackFiles}
          template={template}
          theme="dark"
          options={{
            showNavigator: true,
            showTabs: true,
            showLineNumbers: true,
            showConsole: true,
            editorHeight: 400
          }}
        />
      */}
      <div className="sandpack-placeholder">
        <p>Sandpack Preview</p>
        <p>Template: {template}</p>
        <p>Files: {files.length}</p>
      </div>
    </div>
  )
}
