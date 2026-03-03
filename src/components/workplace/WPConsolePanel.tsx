'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// =====================================================
// WP CONSOLE PANEL
// Captures console.log/warn/error from iframe previews via postMessage.
// Renders in the bottom panel as a new tab.
// =====================================================

const CSS = `
.wpc-console{display:flex;flex-direction:column;height:100%;font-family:var(--wp-mono);font-size:10px;background:var(--wp-bg-2);overflow:hidden}
.wpc-console-toolbar{display:flex;align-items:center;gap:6px;padding:4px 8px;border-bottom:1px solid var(--wp-border);flex-shrink:0}
.wpc-console-clear{padding:2px 8px;border-radius:4px;font-size:8px;font-weight:700;border:1px solid var(--wp-border);background:none;color:var(--wp-text-4);cursor:pointer;font-family:var(--wp-mono)}
.wpc-console-clear:hover{border-color:var(--wp-border-2);color:var(--wp-text-2)}
.wpc-console-count{font-size:8px;color:var(--wp-text-4)}
.wpc-console-count .cnt-err{color:var(--wp-red)}
.wpc-console-count .cnt-warn{color:var(--wp-yellow)}
.wpc-console-lines{flex:1;overflow-y:auto;padding:0}
.wpc-console-line{display:flex;align-items:flex-start;gap:6px;padding:3px 8px;border-bottom:1px solid rgba(30,30,40,.5);word-break:break-word;white-space:pre-wrap;line-height:1.4}
.wpc-console-line:hover{background:rgba(255,255,255,.02)}
.wpc-console-line.log{color:var(--wp-text-2)}
.wpc-console-line.info{color:var(--wp-blue)}
.wpc-console-line.warn{color:var(--wp-yellow);background:rgba(251,191,36,.03)}
.wpc-console-line.error{color:var(--wp-red);background:rgba(248,113,113,.03)}
.wpc-console-badge{font-size:7px;font-weight:700;padding:1px 4px;border-radius:3px;flex-shrink:0;text-transform:uppercase;letter-spacing:.3px}
.wpc-console-badge.log{background:rgba(160,160,176,.08);color:var(--wp-text-3)}
.wpc-console-badge.info{background:rgba(96,165,250,.08);color:var(--wp-blue)}
.wpc-console-badge.warn{background:rgba(251,191,36,.08);color:var(--wp-yellow)}
.wpc-console-badge.error{background:rgba(248,113,113,.08);color:var(--wp-red)}
.wpc-console-ts{font-size:7px;color:var(--wp-text-4);flex-shrink:0}
.wpc-console-empty{display:flex;align-items:center;justify-content:center;height:100%;color:var(--wp-text-4);font-size:10px}
`

export interface ConsoleEntry {
  id: string
  level: 'log' | 'warn' | 'error' | 'info'
  message: string
  timestamp: number
}

interface Props {
  entries: ConsoleEntry[]
  onClear: () => void
}

export function WPConsolePanel({ entries, onClear }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries.length])

  const errCount = entries.filter(e => e.level === 'error').length
  const warnCount = entries.filter(e => e.level === 'warn').length

  return (
    <>
      <style>{CSS}</style>
      <div className="wpc-console">
        <div className="wpc-console-toolbar">
          <button className="wpc-console-clear" onClick={onClear}>Clear</button>
          <span className="wpc-console-count">
            {entries.length} message{entries.length !== 1 ? 's' : ''}
            {errCount > 0 && <span className="cnt-err"> · {errCount} error{errCount !== 1 ? 's' : ''}</span>}
            {warnCount > 0 && <span className="cnt-warn"> · {warnCount} warn</span>}
          </span>
        </div>
        <div className="wpc-console-lines" ref={scrollRef}>
          {entries.length === 0 ? (
            <div className="wpc-console-empty">Console output from preview will appear here</div>
          ) : (
            entries.map(e => (
              <div key={e.id} className={`wpc-console-line ${e.level}`}>
                <span className={`wpc-console-badge ${e.level}`}>{e.level}</span>
                <span className="wpc-console-ts">
                  {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span>{e.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}

// ── Hook to capture console messages from iframe postMessage ──

export function useConsoleCapture() {
  const [entries, setEntries] = useState<ConsoleEntry[]>([])
  let idCounter = useRef(0)

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'wp-console') {
        const entry: ConsoleEntry = {
          id: `c-${++idCounter.current}`,
          level: e.data.level || 'log',
          message: e.data.message || '',
          timestamp: e.data.timestamp || Date.now(),
        }
        setEntries(prev => {
          // Cap at 500 entries to prevent memory bloat
          const next = [...prev, entry]
          return next.length > 500 ? next.slice(-400) : next
        })
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const clear = useCallback(() => setEntries([]), [])

  return { entries, clear }
}
