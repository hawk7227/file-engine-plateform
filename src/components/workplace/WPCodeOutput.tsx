'use client'

import { useEffect, useRef, useState } from 'react'
import type { GeneratedFile } from '@/hooks/useChat'

/**
 * Simple syntax highlighting for TypeScript/JSX.
 * For production, Monaco handles this. This is for the code output panel.
 */

interface TokenSpan { text: string; cls: string }

function tokenize(line: string): TokenSpan[] {
  const tokens: TokenSpan[] = []
  const patterns: [RegExp, string][] = [
    [/^(\s*\/\/.*)/, 'cm'],
    [/(import|export|from|const|let|var|function|return|if|else|async|await|new|type|interface|class|extends|default)\b/, 'kw'],
    [/('[^']*'|"[^"]*"|`[^`]*`)/, 'str'],
    [/(\{|\}|\(|\)|\[|\]|=>|;|,)/, 'pn'],
  ]

  let remaining = line
  while (remaining.length > 0) {
    let matched = false
    for (const [re, cls] of patterns) {
      const m = remaining.match(re)
      if (m && m.index !== undefined) {
        if (m.index > 0) {
          tokens.push({ text: remaining.substring(0, m.index), cls: 'def' })
        }
        tokens.push({ text: m[0], cls })
        remaining = remaining.substring(m.index + m[0].length)
        matched = true
        break
      }
    }
    if (!matched) {
      tokens.push({ text: remaining, cls: 'def' })
      break
    }
  }
  return tokens
}

const CLASS_MAP: Record<string, React.CSSProperties> = {
  cm: { color: 'var(--wp-text-4)', fontStyle: 'italic' },
  kw: { color: 'var(--wp-purple)' },
  str: { color: 'var(--wp-accent)' },
  fn: { color: 'var(--wp-blue)' },
  pn: { color: 'var(--wp-text-3)' },
  def: { color: 'var(--wp-text-2)' },
}

interface Props {
  files: GeneratedFile[]
}

export function WPCodeOutput({ files }: Props) {
  const [activeFile, setActiveFile] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setActiveFile(0) }, [files])

  const file = files[activeFile]
  const lines = file?.content?.split('\n') || []

  if (!files.length) {
    return (
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 8px', color: 'var(--wp-text-4)', fontSize: 10, fontFamily: 'var(--wp-mono)', textAlign: 'center' }}>
        <div style={{ marginTop: 8 }}>Generated code will appear here</div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* File tabs if multiple */}
      {files.length > 1 && (
        <div style={{ display: 'flex', gap: 1, padding: '2px 4px', borderBottom: '1px solid var(--wp-border)', background: 'var(--wp-bg-3)', overflowX: 'auto', flexShrink: 0 }}>
          {files.map((f, i) => (
            <button
              key={f.path}
              onClick={() => setActiveFile(i)}
              style={{
                padding: '2px 8px', borderRadius: 4, fontSize: 7, fontWeight: 700,
                border: 'none', cursor: 'pointer', fontFamily: 'var(--wp-mono)',
                background: i === activeFile ? 'var(--wp-accent-dim)' : 'none',
                color: i === activeFile ? 'var(--wp-accent)' : 'var(--wp-text-4)',
              }}
            >
              {f.path.split('/').pop()}
            </button>
          ))}
        </div>
      )}

      {/* Code lines */}
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {lines.map((line, i) => {
          const spans = tokenize(line)
          return (
            <div key={i} style={{ display: 'flex', fontFamily: 'var(--wp-mono)', fontSize: 10, lineHeight: 1.55 }}>
              <span style={{ width: 36, textAlign: 'right', paddingRight: 8, color: 'var(--wp-text-4)', userSelect: 'none', fontSize: 9, flexShrink: 0 }}>
                {i + 1}
              </span>
              <span style={{ flex: 1, whiteSpace: 'pre' }}>
                {spans.map((s, j) => (
                  <span key={j} style={CLASS_MAP[s.cls] || CLASS_MAP.def}>{s.text}</span>
                ))}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
