// =====================================================
// FILE ENGINE - ChatMarkdown Component
// Renders markdown with syntax-highlighted code blocks
// Matches V2 dark theme (CSS variable based)
// =====================================================

'use client'

import { useState, useMemo, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'

// =====================================================
// STYLES — injected once, matches V2 CSS vars
// =====================================================

const MARKDOWN_CSS = `
/* ── Markdown content ── */
.md-content { font-size: 14.5px; line-height: 1.7; color: var(--text-secondary, #a0a0b0); }
.md-content p { margin: 0 0 12px; }
.md-content p:last-child { margin-bottom: 0; }
.md-content strong { color: var(--text-primary, #fff); font-weight: 600; }
.md-content em { font-style: italic; }
.md-content a { color: var(--accent-blue, #0088ff); text-decoration: none; }
.md-content a:hover { text-decoration: underline; }
.md-content h1,.md-content h2,.md-content h3,.md-content h4 { color: var(--text-primary, #fff); font-weight: 700; margin: 20px 0 8px; }
.md-content h1 { font-size: 1.4em; }
.md-content h2 { font-size: 1.2em; }
.md-content h3 { font-size: 1.05em; }
.md-content ul,.md-content ol { margin: 8px 0; padding-left: 24px; }
.md-content li { margin: 4px 0; }
.md-content li::marker { color: var(--text-muted, #6a6a7a); }
.md-content blockquote { border-left: 3px solid var(--accent-purple, #8a2be2); padding: 4px 16px; margin: 12px 0; background: rgba(138,43,226,.06); border-radius: 0 6px 6px 0; }
.md-content hr { border: none; border-top: 1px solid var(--border-subtle, #1e1e28); margin: 16px 0; }
.md-content table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
.md-content th { text-align: left; padding: 8px 12px; background: var(--bg-tertiary, #13131a); color: var(--text-primary, #fff); font-weight: 600; border-bottom: 1px solid var(--border-default, #2a2a38); }
.md-content td { padding: 6px 12px; border-bottom: 1px solid var(--border-subtle, #1e1e28); }
.md-content img { max-width: 100%; border-radius: 8px; margin: 12px 0; }

/* ── Inline code ── */
.md-content code:not(pre code) {
  padding: 2px 6px; background: rgba(255,255,255,.06); border: 1px solid var(--border-subtle, #1e1e28);
  border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 0.88em; color: var(--accent-primary, #00ff88);
}

/* ── Code blocks ── */
.md-code-block { position: relative; margin: 12px 0; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-subtle, #1e1e28); }
.md-code-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 12px; background: var(--bg-tertiary, #13131a);
  border-bottom: 1px solid var(--border-subtle, #1e1e28);
}
.md-code-lang { font-size: 11px; color: var(--text-muted, #6a6a7a); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.md-code-copy {
  padding: 3px 8px; font-size: 11px; background: transparent; border: 1px solid var(--border-subtle, #1e1e28);
  border-radius: 4px; color: var(--text-muted, #6a6a7a); cursor: pointer; transition: all 0.15s;
}
.md-code-copy:hover { background: var(--bg-elevated, #1a1a24); color: var(--text-primary, #fff); }
.md-code-copy.copied { color: var(--accent-primary, #00ff88); border-color: var(--accent-primary, #00ff88); }
.md-code-block pre {
  margin: 0; padding: 14px 16px; background: var(--bg-secondary, #0d0d12) !important;
  overflow-x: auto; font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.6;
}
.md-code-block pre code { background: none !important; border: none !important; padding: 0 !important; font-size: inherit; color: var(--text-secondary, #a0a0b0); }

/* ── highlight.js theme (dark) ── */
.hljs { color: #c9d1d9; }
.hljs-keyword,.hljs-selector-tag,.hljs-built_in { color: #ff7b72; }
.hljs-string,.hljs-attr,.hljs-template-tag { color: #a5d6ff; }
.hljs-function,.hljs-title { color: #d2a8ff; }
.hljs-comment,.hljs-quote { color: #8b949e; font-style: italic; }
.hljs-number,.hljs-literal { color: #79c0ff; }
.hljs-variable,.hljs-params { color: #ffa657; }
.hljs-type,.hljs-class .hljs-title { color: #7ee787; }
.hljs-meta,.hljs-tag { color: #79c0ff; }
.hljs-attribute { color: #7ee787; }
.hljs-symbol,.hljs-bullet { color: #ffa657; }
.hljs-addition { color: #aff5b4; background: rgba(46,160,67,.15); }
.hljs-deletion { color: #ffdcd7; background: rgba(248,81,73,.15); }
`

let styleInjected = false
function injectStyles() {
  if (styleInjected || typeof document === 'undefined') return
  const style = document.createElement('style')
  style.textContent = MARKDOWN_CSS
  document.head.appendChild(style)
  styleInjected = true
}

// =====================================================
// CODE BLOCK with copy button + language label
// =====================================================

function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false)
  const code = String(children).replace(/\n$/, '')
  const lang = className?.replace('language-', '') || ''

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  return (
    <div className="md-code-block">
      <div className="md-code-header">
        <span className="md-code-lang">{lang || 'code'}</span>
        <button className={`md-code-copy${copied ? ' copied' : ''}`} onClick={handleCopy}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre><code className={className}>{children}</code></pre>
    </div>
  )
}

// =====================================================
// MARKDOWN COMPONENT OVERRIDES
// =====================================================

const mdComponents = {
  code({ className, children, ...props }: any) {
    const isBlock = className?.startsWith('language-')
    if (isBlock) {
      return <CodeBlock className={className}>{children}</CodeBlock>
    }
    return <code className={className} {...props}>{children}</code>
  },
  a({ href, children, ...props }: any) {
    return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
  },
  pre({ children }: any) {
    return <>{children}</>
  },
}

// =====================================================
// EXPORT — drop-in content renderer
// =====================================================

export function ChatMarkdown({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  injectStyles()

  const rendered = useMemo(() => (
    <ReactMarkdown
      rehypePlugins={[rehypeHighlight]}
      components={mdComponents}
    >
      {content}
    </ReactMarkdown>
  ), [content])

  return (
    <div className="md-content">
      {rendered}
      {isStreaming && <span style={{ display: 'inline-block', width: 8, height: 16, background: 'var(--accent-primary, #00ff88)', animation: 'blink 1s infinite', verticalAlign: 'middle', marginLeft: 4, borderRadius: 2 }} />}
    </div>
  )
}

export default ChatMarkdown
