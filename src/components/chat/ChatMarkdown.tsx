// =====================================================
// FILE ENGINE - ChatMarkdown Component V3
// Claude-style rendering:
// - File cards (collapsed) instead of raw code dumps
// - Streaming progress indicators
// - Proper language:filepath parsing
// =====================================================

'use client'

import { useState, useMemo, useCallback } from 'react'

// =====================================================
// STYLES
// =====================================================

const MARKDOWN_CSS = `
/* ── Markdown content ── */
.md-content { font-size: 14.5px; line-height: 1.7; color: var(--text-secondary, #a0a0b0); }
.md-content p { margin: 0 0 12px; }
.md-content p:last-child { margin-bottom: 0; }
.md-content strong { color: var(--text-primary, #fff); font-weight: 600; }
.md-content em { font-style: italic; }
.md-content a { color: var(--accent-blue, var(--accent-primary)); text-decoration: none; }
.md-content a:hover { text-decoration: underline; }
.md-content h1,.md-content h2,.md-content h3,.md-content h4 { color: var(--text-primary, #fff); font-weight: 700; margin: 20px 0 8px; }
.md-content h1 { font-size: 1.4em; }
.md-content h2 { font-size: 1.2em; }
.md-content h3 { font-size: 1.05em; }
.md-content ul,.md-content ol { margin: 8px 0; padding-left: 24px; }
.md-content li { margin: 4px 0; }
.md-content li::marker { color: var(--text-muted, #6a6a7a); }
.md-content blockquote { border-left: 3px solid var(--accent-purple, var(--accent-primary)); padding: 4px 16px; margin: 12px 0; background: rgba(138,43,226,.06); border-radius: 0 6px 6px 0; }
.md-content hr { border: none; border-top: 1px solid var(--border-subtle, #1e1e28); margin: 16px 0; }
.md-content table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
.md-content th { text-align: left; padding: 8px 12px; background: var(--bg-tertiary, #13131a); color: var(--text-primary, #fff); font-weight: 600; border-bottom: 1px solid var(--border-default, #2a2a38); }
.md-content td { padding: 6px 12px; border-bottom: 1px solid var(--border-subtle, #1e1e28); }

/* ── Inline code ── */
.md-content code {
  padding: 2px 6px; background: rgba(255,255,255,.06); border: 1px solid var(--border-subtle, #1e1e28);
  border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 0.88em; color: var(--accent-primary, var(--accent-primary));
}

/* ── File Card (Claude-style collapsed code block) ── */
.file-card {
  margin: 12px 0; border: 1px solid var(--border-subtle, #1e1e28); border-radius: 12px;
  overflow: hidden; background: var(--bg-secondary, #0d0d12); transition: border-color 0.2s;
}
.file-card:hover { border-color: var(--border-default, #2a2a38); }
.file-card-header {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  cursor: pointer; user-select: none; background: var(--bg-tertiary, #13131a);
}
.file-card-header:hover { background: rgba(255,255,255,0.03); }
.file-card-icon {
  width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center;
  justify-content: center; font-size: 13px; flex-shrink: 0;
}
.file-card-icon.html { background: rgba(255,99,34,0.15); color: #ff6322; }
.file-card-icon.tsx, .file-card-icon.jsx { background: rgba(59,130,246,0.15); color: #3b82f6; }
.file-card-icon.ts, .file-card-icon.js { background: rgba(234,179,8,0.15); color: #eab308; }
.file-card-icon.css { background: rgba(168,85,247,0.15); color: #a855f7; }
.file-card-icon.json { background: rgba(34,197,94,0.15); color: #22c55e; }
.file-card-icon.default { background: rgba(113,113,122,0.15); color: #71717a; }
.file-card-info { flex: 1; min-width: 0; }
.file-card-name {
  font-family: 'JetBrains Mono', monospace; font-size: 12.5px; font-weight: 600;
  color: var(--text-primary, #fff); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.file-card-meta { font-size: 11px; color: var(--text-muted, #6a6a7a); margin-top: 1px; }
.file-card-actions { display: flex; gap: 4px; }
.file-card-btn {
  padding: 4px 10px; font-size: 11px; background: transparent;
  border: 1px solid var(--border-subtle, #1e1e28); border-radius: 4px;
  color: var(--text-muted, #6a6a7a); cursor: pointer; transition: all 0.15s;
}
.file-card-btn:hover { background: var(--bg-elevated, #1a1a24); color: var(--text-primary, #fff); }
.file-card-btn.copied { color: var(--accent-primary, var(--accent-primary)); border-color: var(--accent-primary, var(--accent-primary)); }
.file-card-chevron {
  font-size: 10px; color: var(--text-muted, #6a6a7a); transition: transform 0.2s; flex-shrink: 0;
}
.file-card.expanded .file-card-chevron { transform: rotate(90deg); }
.file-card-code {
  display: none; border-top: 1px solid var(--border-subtle, #1e1e28);
  max-height: 400px; overflow: auto;
}
.file-card.expanded .file-card-code { display: block; }
.file-card-code pre {
  margin: 0; padding: 14px 16px; background: var(--bg-secondary, #0d0d12);
  font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.6;
  color: var(--text-secondary, #a0a0b0); white-space: pre; overflow-x: auto;
}

/* ── Streaming code card (shows while AI writes code) ── */
.code-streaming-card {
  margin: 12px 0; border: 1px solid rgba(16,185,129,0.2); border-radius: 12px;
  overflow: hidden; background: var(--bg-secondary, #0d0d12);
  animation: cardPulse 2s ease-in-out infinite;
}
@keyframes cardPulse {
  0%, 100% { border-color: rgba(16,185,129,0.15); }
  50% { border-color: rgba(16,185,129,0.35); }
}
.code-streaming-header {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  background: var(--bg-tertiary, #13131a);
}
.code-streaming-spinner {
  width: 16px; height: 16px; border: 2px solid rgba(16,185,129,0.2);
  border-top-color: var(--accent-primary, var(--accent-primary)); border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.code-streaming-info { flex: 1; }
.code-streaming-name { font-family: 'JetBrains Mono', monospace; font-size: 12.5px; font-weight: 600; color: var(--text-primary, #fff); }
.code-streaming-status { font-size: 11px; color: var(--accent-primary, var(--accent-primary)); }
.code-streaming-progress { height: 2px; background: var(--bg-elevated, #1a1a24); }
.code-streaming-progress-bar {
  height: 100%; background: var(--accent-primary)), var(--accent-blue, var(--accent-primary)));
  animation: progressSweep 2s ease-in-out infinite;
}
@keyframes progressSweep { 0% { width: 5%; } 50% { width: 70%; } 100% { width: 95%; } }

/* ── Streaming indicator ── */
.streaming-indicator {
  display: flex; align-items: center; gap: 10px; padding: 8px 0; margin: 4px 0;
  font-size: 13px; color: var(--text-muted, #6a6a7a);
}
.streaming-dot {
  width: 8px; height: 8px; border-radius: 50%; background: var(--accent-primary, var(--accent-primary));
  animation: streamPulse 1.5s ease-in-out infinite;
}
@keyframes streamPulse {
  0%, 100% { opacity: 0.4; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.1); }
}

/* ── Activity Log (Claude-style tool use indicator) ── */
.streaming-activity-log {
  margin: 8px 0; padding: 10px 14px; background: var(--bg-tertiary, #13131a);
  border: 1px solid var(--border-subtle, #1e1e28); border-radius: 12px;
  font-size: 13px; overflow: hidden;
}
.activity-log-item {
  display: flex; align-items: center; gap: 10px; padding: 5px 0;
  animation: activityFadeIn 0.3s ease;
}
@keyframes activityFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
.activity-log-icon {
  width: 22px; height: 22px; border-radius: 5px; display: flex;
  align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0;
}
.activity-log-label { color: var(--text-secondary, #a0a0b0); flex: 1; }
.activity-log-status { font-size: 11px; font-weight: 600; }
.activity-log-status.active { color: var(--accent-primary, var(--accent-primary)); }
.activity-log-status.done { color: var(--text-muted, #6a6a7a); }
.activity-log-spinner {
  width: 12px; height: 12px; border: 2px solid rgba(16,185,129,0.2);
  border-top-color: var(--accent-primary, var(--accent-primary)); border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* ── Claude-style Collapsible Action Block ── */
.action-block {
  margin: 8px 0; border: 1px solid var(--border-subtle, #1e1e28); border-radius: 12px;
  overflow: hidden; background: var(--bg-tertiary, #13131a); transition: border-color 0.2s;
}
.action-block:hover { border-color: var(--border-default, #2a2a38); }
.action-block-header {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  cursor: pointer; user-select: none; transition: background 0.15s;
}
.action-block-header:hover { background: rgba(255,255,255,0.02); }
.action-block-icon {
  width: 24px; height: 24px; border-radius: 8px; display: flex;
  align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0;
  background: rgba(16,185,129,0.1);
}
.action-block-icon.streaming { background: rgba(16,185,129,0.15); }
.action-block-label {
  flex: 1; font-size: 13px; font-weight: 500; color: var(--text-secondary, #a0a0b0);
}
.action-block-chevron {
  font-size: 11px; color: var(--text-muted, #6a6a7a); transition: transform 0.2s;
  flex-shrink: 0;
}
.action-block.open .action-block-chevron { transform: rotate(90deg); }
.action-block-body {
  max-height: 0; overflow: hidden; transition: max-height 0.3s cubic-bezier(0.4,0,0.2,1);
}
.action-block.open .action-block-body { max-height: 2000px; }
.action-block-body-inner { border-top: 1px solid var(--border-subtle, #1e1e28); }

/* Narration text between action blocks */
.narration-text {
  font-size: 14.5px; line-height: 1.7; color: var(--text-secondary, #a0a0b0);
  padding: 4px 0;
}
.narration-text strong { color: var(--text-primary, #fff); font-weight: 600; }

/* ── Streaming code preview strip ── */
.streaming-code-preview {
  margin: 8px 0; border-radius: 8px; overflow: hidden; position: relative;
  border: 1px solid var(--border-subtle, #1e1e28); max-height: 68px;
}
.streaming-code-preview pre {
  margin: 0; padding: 10px 14px; background: var(--bg-secondary, #0d0d12);
  font-family: 'JetBrains Mono', monospace; font-size: 11px; line-height: 1.5;
  color: var(--text-muted, #6a6a7a); white-space: pre; overflow: hidden;
}
.streaming-code-preview::after {
  content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 32px;
  background: var(--accent-bg));
  pointer-events: none;
}

/* ── Small inline code block ── */
.md-code-block { position: relative; margin: 12px 0; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-subtle, #1e1e28); }
.md-code-header { display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; background: var(--bg-tertiary, #13131a); border-bottom: 1px solid var(--border-subtle, #1e1e28); }
.md-code-lang { font-size: 11px; color: var(--text-muted, #6a6a7a); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.md-code-block pre { margin: 0; padding: 14px 16px; background: var(--bg-secondary, #0d0d12); overflow-x: auto; font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.6; }
.md-code-block pre code { background: none !important; border: none !important; padding: 0 !important; font-size: inherit; color: var(--text-secondary, #a0a0b0); }
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
// HELPERS
// =====================================================

function getFileIcon(ext: string): string {
  const icons: Record<string, string> = {
    html: '', htm: '', tsx: '', jsx: '', ts: '', js: '',
    css: '', scss: '', json: '', md: '', py: '', sql: '',
    sh: '', yaml: '', yml: '', svg: '', txt: '',
  }
  return icons[ext] || ''
}

function getFileClass(ext: string): string {
  if (['html', 'htm'].includes(ext)) return 'html'
  if (['tsx', 'jsx'].includes(ext)) return 'tsx'
  if (['ts'].includes(ext)) return 'ts'
  if (['js'].includes(ext)) return 'js'
  if (['css', 'scss'].includes(ext)) return 'css'
  if (['json'].includes(ext)) return 'json'
  return 'default'
}

// =====================================================
// FILE CARD (Claude-style collapsed code block)
// =====================================================

function FileCard({ filename, language, code, lineCount }: {
  filename: string; language: string; code: string; lineCount: number
}) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const ext = filename.split('.').pop() || language || ''

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  return (
    <div className={`file-card${expanded ? ' expanded' : ''}`}>
      <div className="file-card-header" onClick={() => setExpanded(!expanded)}>
        <div className={`file-card-icon ${getFileClass(ext)}`}>{getFileIcon(ext)}</div>
        <div className="file-card-info">
          <div className="file-card-name">{filename}</div>
          <div className="file-card-meta">{language.toUpperCase()} · {lineCount} lines</div>
        </div>
        <div className="file-card-actions">
          <button className={`file-card-btn${copied ? ' copied' : ''}`} onClick={handleCopy}>
            {copied ? '✓' : 'Copy'}
          </button>
        </div>
        <span className="file-card-chevron">▶</span>
      </div>
      <div className="file-card-code">
        <pre>{code}</pre>
      </div>
    </div>
  )
}

// =====================================================
// STREAMING ACTIVITY LOG (Claude-style tool use)
// =====================================================

const PHASE_CONFIG: Record<string, { icon: string; bg: string; label: string }> = {
  thinking:  { icon: '', bg: 'rgba(168,85,247,.15)', label: 'Analyzing request...' },
  planning:  { icon: '', bg: 'rgba(59,130,246,.15)', label: 'Planning approach...' },
  searching: { icon: '', bg: 'rgba(168,85,247,.15)', label: 'Searching for information...' },
  creating:  { icon: '', bg: 'rgba(34,197,94,.15)',  label: 'Creating file...' },
  editing:   { icon: '', bg: 'rgba(59,130,246,.15)', label: 'Editing file...' },
  analyzing: { icon: '', bg: 'rgba(234,179,8,.15)',  label: 'Analyzing image...' },
  running:   { icon: '', bg: 'rgba(234,179,8,.15)',  label: 'Running command...' },
  styling:   { icon: '', bg: 'rgba(168,85,247,.15)', label: 'Applying design system...' },
  generating:{ icon: '', bg: 'rgba(34,197,94,.15)',  label: 'Generating code...' },
}

function StreamingActivityLog({ phase, message, completedPhases }: {
  phase: string; message?: string; completedPhases: string[]
}) {
  const config = PHASE_CONFIG[phase] || PHASE_CONFIG.thinking
  
  return (
    <div className="streaming-activity-log">
      {/* Completed phases */}
      {completedPhases.map((p, i) => {
        const c = PHASE_CONFIG[p] || PHASE_CONFIG.thinking
        return (
          <div key={i} className="activity-log-item">
            <div className="activity-log-icon" style={{ background: c.bg }}>{c.icon}</div>
            <span className="activity-log-label" style={{ color: 'var(--text-muted)' }}>{c.label}</span>
            <span className="activity-log-status done">✓</span>
          </div>
        )
      })}
      {/* Current active phase */}
      <div className="activity-log-item">
        <div className="activity-log-icon" style={{ background: config.bg }}>{config.icon}</div>
        <span className="activity-log-label">{message || config.label}</span>
        <div className="activity-log-spinner" />
      </div>
    </div>
  )
}

// =====================================================
// STREAMING CODE PREVIEW (fading code strip)
// =====================================================

function StreamingCodePreview({ code }: { code: string }) {
  // Show last ~4 lines of the code being written
  const lines = code.split('\n')
  const lastLines = lines.slice(-4).join('\n')
  
  return (
    <div className="streaming-code-preview">
      <pre>{lastLines}</pre>
    </div>
  )
}

// =====================================================
// STREAMING CODE CARD (shows while AI is writing)
// =====================================================

function StreamingCodeCard({ filename, language, linesSoFar }: {
  filename: string; language: string; linesSoFar: number
}) {
  const ext = filename.split('.').pop() || language || ''
  return (
    <div className="code-streaming-card">
      <div className="code-streaming-header">
        <div className="code-streaming-spinner" />
        <div className="code-streaming-info">
          <div className="code-streaming-name">{getFileIcon(ext)} {filename}</div>
          <div className="code-streaming-status">Writing code... {linesSoFar > 0 ? `${linesSoFar} lines` : ''}</div>
        </div>
      </div>
      <div className="code-streaming-progress">
        <div className="code-streaming-progress-bar" />
      </div>
    </div>
  )
}

// =====================================================
// CONTENT PARSER — splits content into text + file cards
// =====================================================

interface ContentSegment {
  type: 'text' | 'file' | 'streaming-file'
  text?: string
  filename?: string
  language?: string
  code?: string
  lineCount?: number
  linesSoFar?: number
  partialCode?: string
}

function parseContent(content: string, isStreaming: boolean): ContentSegment[] {
  const segments: ContentSegment[] = []
  
  // Regex for completed code blocks: ```lang:filepath\n...\n``` or ```lang\n...\n```
  const codeBlockRegex = /```(\w+)(?::([^\n]+))?\n([\s\S]*?)```/g
  
  let lastIndex = 0
  let match
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Text before this code block
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index).trim()
      if (textBefore) segments.push({ type: 'text', text: textBefore })
    }
    
    const language = match[1] || 'text'
    const filepath = match[2]?.trim() || ''
    const code = match[3] || ''
    const lineCount = code.split('\n').length
    const filename = filepath || `file.${language}`
    
    // Substantial code blocks (>5 lines) → file card; small ones → inline
    if (lineCount > 5) {
      segments.push({ type: 'file', filename, language, code: code.trim(), lineCount })
    } else {
      segments.push({ type: 'text', text: '```' + language + '\n' + code + '```' })
    }
    
    lastIndex = match.index + match[0].length
  }
  
  // Remaining text after last code block
  const remaining = content.slice(lastIndex)
  
  if (isStreaming && remaining) {
    // Check for unclosed code block (AI still writing code)
    const unclosedMatch = remaining.match(/```(\w+)(?::([^\n]+))?\n([\s\S]*)$/)
    
    if (unclosedMatch) {
      const textBefore = remaining.slice(0, remaining.indexOf('```')).trim()
      if (textBefore) segments.push({ type: 'text', text: textBefore })
      
      const lang = unclosedMatch[1] || 'text'
      const fp = unclosedMatch[2]?.trim() || `file.${lang}`
      const partialCode = unclosedMatch[3] || ''
      const linesSoFar = partialCode.split('\n').length
      
      segments.push({ type: 'streaming-file', filename: fp, language: lang, linesSoFar, partialCode: partialCode })
    } else if (remaining.trim()) {
      segments.push({ type: 'text', text: remaining.trim() })
    }
  } else if (remaining.trim()) {
    segments.push({ type: 'text', text: remaining.trim() })
  }
  
  return segments
}

// =====================================================
// SIMPLE MARKDOWN RENDERER
// =====================================================

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .split('\n\n').map(p => p.trim()).filter(Boolean)
    .map(p => {
      if (p.startsWith('### ')) return `<h3>${p.slice(4)}</h3>`
      if (p.startsWith('## ')) return `<h2>${p.slice(3)}</h2>`
      if (p.startsWith('# ')) return `<h1>${p.slice(2)}</h1>`
      if (p.match(/^[-*] /m)) {
        const items = p.split('\n').filter(l => l.match(/^[-*] /)).map(l => `<li>${l.replace(/^[-*] /, '')}</li>`).join('')
        return `<ul>${items}</ul>`
      }
      if (p.match(/^\d+\. /m)) {
        const items = p.split('\n').filter(l => l.match(/^\d+\. /)).map(l => `<li>${l.replace(/^\d+\. /, '')}</li>`).join('')
        return `<ol>${items}</ol>`
      }
      // Small inline code blocks
      if (p.startsWith('```')) {
        const m = p.match(/```(\w*)\n([\s\S]*?)```/)
        if (m) return `<div class="md-code-block"><div class="md-code-header"><span class="md-code-lang">${m[1] || 'code'}</span></div><pre><code>${m[2]}</code></pre></div>`
      }
      return `<p>${p.replace(/\n/g, '<br/>')}</p>`
    })
    .join('')
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function ChatMarkdown({ content, isStreaming, statusPhase, statusMessage }: { 
  content: string; isStreaming?: boolean; statusPhase?: string; statusMessage?: string 
}) {
  injectStyles()
  
  const segments = useMemo(() => parseContent(content, !!isStreaming), [content, isStreaming])
  const [openBlocks, setOpenBlocks] = useState<Set<number>>(new Set())
  
  const toggleBlock = useCallback((idx: number) => {
    setOpenBlocks(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }, [])
  
  // Track completed phases for the activity log
  const completedPhases = useMemo(() => {
    const phases: string[] = []
    if (!statusPhase || !isStreaming) return phases
    const order = ['thinking', 'planning', 'searching', 'analyzing', 'styling', 'creating', 'editing', 'generating', 'running']
    const currentIdx = order.indexOf(statusPhase)
    for (let i = 0; i < currentIdx && i < order.length; i++) {
      if (i === 0) phases.push(order[i])
    }
    return phases
  }, [statusPhase, isStreaming])

  // Determine action label from filename/language
  const getActionLabel = (filename: string, language: string, lineCount: number) => {
    const ext = filename.split('.').pop() || ''
    if (ext === 'html' || ext === 'htm') return `Created ${filename}`
    if (ext === 'css') return `Styled ${filename}`
    if (ext === 'js' || ext === 'ts' || ext === 'jsx' || ext === 'tsx') return `Built ${filename}`
    if (ext === 'json') return `Generated ${filename}`
    return `Created ${filename}`
  }

  const getActionIcon = (filename: string) => {
    const ext = filename.split('.').pop() || ''
    if (ext === 'html' || ext === 'htm') return ''
    if (ext === 'css') return ''
    if (ext === 'js' || ext === 'ts' || ext === 'jsx' || ext === 'tsx') return ''
    if (ext === 'json') return ''
    return ''
  }
  
  return (
    <div className="md-content">
      {segments.map((seg, i) => {
        if (seg.type === 'file') {
          const isOpen = openBlocks.has(i)
          return (
            <div key={`f-${i}-${seg.filename}`} className={`action-block${isOpen ? ' open' : ''}`}>
              <div className="action-block-header" onClick={() => toggleBlock(i)}>
                <div className="action-block-icon">{getActionIcon(seg.filename!)}</div>
                <div className="action-block-label">{getActionLabel(seg.filename!, seg.language!, seg.lineCount!)}</div>
                <span className="action-block-chevron">▶</span>
              </div>
              <div className="action-block-body">
                <div className="action-block-body-inner">
                  <FileCard filename={seg.filename!} language={seg.language!} code={seg.code!} lineCount={seg.lineCount!} />
                </div>
              </div>
            </div>
          )
        }
        if (seg.type === 'streaming-file') {
          return (
            <div key={`s-${i}-${seg.filename}`} className="action-block open" style={{ borderColor: 'rgba(16,185,129,0.2)' }}>
              <div className="action-block-header">
                <div className="action-block-icon streaming">
                  <div className="activity-log-spinner" style={{ width: 14, height: 14 }} />
                </div>
                <div className="action-block-label" style={{ color: 'var(--accent-primary, var(--accent-primary))' }}>
                  Writing {seg.filename}... ({seg.linesSoFar} lines)
                </div>
              </div>
              {seg.partialCode && seg.partialCode.length > 20 && (
                <div className="action-block-body" style={{ maxHeight: 2000 }}>
                  <div className="action-block-body-inner">
                    <StreamingCodePreview code={seg.partialCode} />
                  </div>
                </div>
              )}
            </div>
          )
        }
        // Narration text — render as visible text between action blocks
        const text = (seg.text || '').trim()
        if (!text) return null
        return <div key={`t-${i}`} className="narration-text" dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />
      })}
      {/* Activity log: show when streaming with no content yet */}
      {isStreaming && statusPhase && segments.length === 0 && (
        <StreamingActivityLog phase={statusPhase} message={statusMessage} completedPhases={completedPhases} />
      )}
      {/* Fallback if no statusPhase */}
      {isStreaming && !statusPhase && segments.length === 0 && (
        <div className="streaming-indicator">
          <div className="streaming-dot" />
          <span className="streaming-label" style={{ color: 'var(--text-secondary)' }}>Thinking...</span>
        </div>
      )}
      {isStreaming && segments.length > 0 && !segments.some(s => s.type === 'streaming-file') && (
        <span style={{ display: 'inline-block', width: 8, height: 16, background: 'var(--accent-primary, var(--accent-primary))', animation: 'blink 1s infinite', verticalAlign: 'middle', marginLeft: 4, borderRadius: 2 }} />
      )}
    </div>
  )
}

export default ChatMarkdown
