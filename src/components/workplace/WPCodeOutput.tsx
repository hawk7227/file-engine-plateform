'use client'

import { useEffect, useRef, useState } from 'react'
import type { GeneratedFile } from '@/hooks/useChat'

const CSS = `
.wp-code-wrap{height:100%;display:flex;flex-direction:column;overflow:hidden}
.wp-code-tabs{display:flex;gap:1px;background:var(--wp-bg-2);border-bottom:1px solid var(--wp-border);overflow-x:auto;flex-shrink:0}
.wp-code-tabs::-webkit-scrollbar{display:none}
.wp-code-tab{padding:5px 12px;font-size:9px;font-weight:600;font-family:var(--wp-mono);color:var(--wp-text-4);background:none;border:none;cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap;transition:all .15s}
.wp-code-tab:hover{color:var(--wp-text-2)}
.wp-code-tab.on{color:var(--wp-accent);border-bottom-color:var(--wp-accent);background:var(--wp-accent-dim)}
.wp-code-tab .ext{opacity:.5;margin-left:2px}
.wp-code-body{flex:1;overflow:auto;background:var(--wp-bg-0);position:relative}
.wp-code-pre{margin:0;padding:12px;font-size:10px;line-height:1.6;font-family:var(--wp-mono);color:var(--wp-text-2);white-space:pre;tab-size:2}
.wp-code-line{display:flex}
.wp-code-ln{width:36px;text-align:right;padding-right:12px;color:var(--wp-text-4);user-select:none;flex-shrink:0;opacity:.5}
.wp-code-content{flex:1;min-width:0}
.wp-code-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--wp-text-4);font-size:11px;gap:8px;text-align:center;padding:24px}
.wp-code-empty .ce-icon{font-size:28px;opacity:.3}
.wp-code-copy{position:absolute;top:6px;right:6px;padding:3px 8px;border-radius:5px;font-size:8px;font-weight:700;background:var(--wp-bg-3);border:1px solid var(--wp-border);color:var(--wp-text-3);cursor:pointer;font-family:var(--wp-font);opacity:0;transition:opacity .15s}
.wp-code-body:hover .wp-code-copy{opacity:1}
.wp-code-copy:hover{background:var(--wp-bg-4);color:var(--wp-text-1)}

/* Syntax highlighting */
.wp-kw{color:#c084fc}
.wp-str{color:#34d399}
.wp-num{color:#fbbf24}
.wp-cmt{color:#404050;font-style:italic}
.wp-fn{color:#60a5fa}
.wp-tag{color:#f87171}
.wp-attr{color:#a78bfa}
.wp-op{color:#606070}
`

// Simple syntax highlighter (no external deps)
function highlight(code: string, lang: string): string {
  let escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  if (['ts', 'tsx', 'js', 'jsx', 'typescript', 'javascript'].includes(lang)) {
    // Comments
    escaped = escaped.replace(/(\/\/[^\n]*)/g, '<span class="wp-cmt">$1</span>')
    // Strings
    escaped = escaped.replace(/('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)/g, '<span class="wp-str">$1</span>')
    // Keywords
    escaped = escaped.replace(/\b(import|export|from|const|let|var|function|return|if|else|async|await|new|class|extends|interface|type|typeof|null|undefined|true|false|default)\b/g, '<span class="wp-kw">$1</span>')
    // Numbers
    escaped = escaped.replace(/\b(\d+\.?\d*)\b/g, '<span class="wp-num">$1</span>')
    // JSX tags
    escaped = escaped.replace(/(&lt;\/?)([\w.]+)/g, '$1<span class="wp-tag">$2</span>')
  } else if (['html', 'xml', 'svg'].includes(lang)) {
    escaped = escaped.replace(/(&lt;\/?)([\w-]+)/g, '$1<span class="wp-tag">$2</span>')
    escaped = escaped.replace(/\s([\w-]+)(=)/g, ' <span class="wp-attr">$1</span>$2')
    escaped = escaped.replace(/("(?:[^"\\]|\\.)*")/g, '<span class="wp-str">$1</span>')
  } else if (['css', 'scss'].includes(lang)) {
    escaped = escaped.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="wp-cmt">$1</span>')
    escaped = escaped.replace(/([{};:])/g, '<span class="wp-op">$1</span>')
    escaped = escaped.replace(/(\d+\.?\d*)(px|em|rem|%|vh|vw|s|ms)/g, '<span class="wp-num">$1$2</span>')
  } else if (lang === 'json') {
    escaped = escaped.replace(/("(?:[^"\\]|\\.)*")\s*:/g, '<span class="wp-attr">$1</span>:')
    escaped = escaped.replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="wp-str">$1</span>')
    escaped = escaped.replace(/\b(\d+\.?\d*)\b/g, '<span class="wp-num">$1</span>')
    escaped = escaped.replace(/\b(true|false|null)\b/g, '<span class="wp-kw">$1</span>')
  }
  return escaped
}

function getLang(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    ts: 'ts', tsx: 'tsx', js: 'js', jsx: 'jsx',
    html: 'html', css: 'css', scss: 'scss',
    json: 'json', md: 'md', sql: 'sql', yaml: 'yaml', yml: 'yaml',
  }
  return map[ext] || 'text'
}

function getFileName(path: string): string {
  return path.split('/').pop() || path
}

interface Props {
  files: GeneratedFile[]
}

export function WPCodeOutput({ files }: Props) {
  const [activeIdx, setActiveIdx] = useState(0)
  const codeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (activeIdx >= files.length && files.length > 0) setActiveIdx(0)
  }, [files, activeIdx])

  if (!files.length) {
    return (
      <>
        <style>{CSS}</style>
        <div className="wp-code-wrap">
          <div className="wp-code-empty">
            <div className="ce-icon">📄</div>
            <div>No code generated yet</div>
          </div>
        </div>
      </>
    )
  }

  const file = files[activeIdx] || files[0]
  const lang = getLang(file.path)
  const lines = file.content.split('\n')
  const highlighted = highlight(file.content, lang)
  const highlightedLines = highlighted.split('\n')

  return (
    <>
      <style>{CSS}</style>
      <div className="wp-code-wrap">
        <div className="wp-code-tabs">
          {files.map((f, i) => {
            const name = getFileName(f.path)
            const ext = f.path.split('.').pop() || ''
            return (
              <button
                key={f.path}
                className={`wp-code-tab${i === activeIdx ? ' on' : ''}`}
                onClick={() => setActiveIdx(i)}
              >
                {name.replace(`.${ext}`, '')}<span className="ext">.{ext}</span>
              </button>
            )
          })}
        </div>
        <div className="wp-code-body" ref={codeRef}>
          <button
            className="wp-code-copy"
            onClick={() => navigator.clipboard.writeText(file.content)}
          >
            📋 Copy
          </button>
          <pre className="wp-code-pre">
            {highlightedLines.map((line, i) => (
              <div key={i} className="wp-code-line">
                <span className="wp-code-ln">{i + 1}</span>
                <span className="wp-code-content" dangerouslySetInnerHTML={{ __html: line || ' ' }} />
              </div>
            ))}
          </pre>
        </div>
      </div>
    </>
  )
}
