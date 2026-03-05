'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { UseChatReturn, GeneratedFile } from '@/hooks/useChat'

const CSS = `
.wpc-wrap{display:flex;flex-direction:column;height:100%;position:relative}
.wpc-msgs{flex:1;overflow-y:auto;padding:16px 12px}
.wpc-msg{margin-bottom:12px;display:flex;flex-direction:column}
.wpc-msg[data-role="user"]{align-items:flex-end}
.wpc-msg[data-role="assistant"]{align-items:flex-start}
.wpc-bubble{padding:12px 16px;border-radius:16px;max-width:85%;font-size:14px;line-height:1.65;word-break:break-word;white-space:pre-wrap}
.wpc-msg[data-role="user"] .wpc-bubble{background:linear-gradient(135deg,#10b981,#14b8a6);color:#fff;border-bottom-right-radius:4px}
.wpc-msg[data-role="assistant"] .wpc-bubble{background:var(--wp-bg-3,#18181b);color:var(--wp-text-2,#c8c8d8);border:1px solid rgba(255,255,255,.06);border-bottom-left-radius:4px}
.wpc-bubble-hdr{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.wpc-avt{width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;font-weight:800}
.wpc-avt-ai{background:var(--wp-accent-dim,rgba(16,185,129,.08));border:1px solid rgba(16,185,129,.15);color:var(--wp-accent,#10b981)}
.wpc-avt-u{background:rgba(255,255,255,.1);color:#fff}
.wpc-role{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}
.wpc-role-ai{color:var(--wp-accent,#10b981)}
.wpc-role-u{color:rgba(255,255,255,.7)}
.wpc-time{font-size:9px;color:var(--wp-text-4,#505070);margin-top:4px;padding:0 4px}
.wpc-bubble strong,.wpc-bubble b{font-weight:800;color:var(--wp-text-1,#fff)}
.wpc-msg[data-role="user"] .wpc-bubble strong{color:#fff}
.wpc-bubble code{font-family:var(--wp-mono,'JetBrains Mono',monospace);font-size:12px;background:rgba(16,185,129,.08);color:var(--wp-accent,#10b981);padding:1px 5px;border-radius:4px}
.wpc-msg[data-role="user"] .wpc-bubble code{background:rgba(255,255,255,.15);color:#fff}
.wpc-thinking{font-size:10px;color:var(--wp-purple,#b44dff);font-style:italic;margin-bottom:4px;display:flex;align-items:center;gap:4px;padding:0 4px}
.wpc-acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.wpc-pill{display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border-radius:8px;font-size:11px;font-weight:700;border:1px solid rgba(16,185,129,.2);color:var(--wp-accent,#10b981);background:rgba(16,185,129,.06);cursor:pointer;transition:all .15s}
.wpc-pill:hover{background:rgba(16,185,129,.12);border-color:rgba(16,185,129,.3)}
.wpc-btn{padding:6px 12px;border-radius:8px;font-size:11px;font-weight:700;border:1px solid rgba(59,130,255,.2);color:var(--wp-blue,#3b82ff);background:none;cursor:pointer;transition:all .15s}
.wpc-btn:hover{background:rgba(59,130,255,.06)}
.wpc-files-badge{display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:6px;font-size:10px;font-weight:700;font-family:var(--wp-mono);background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.1);color:var(--wp-accent);margin-top:6px}
.wpc-streaming{display:inline-block;animation:wp-blink 1s infinite}
.wpc-empty{text-align:center;padding:60px 24px;color:var(--wp-text-4)}
.wpc-empty-icon{font-size:48px;margin-bottom:16px;opacity:.3}
.wpc-empty-title{font-size:16px;font-weight:800;margin-bottom:6px;color:var(--wp-text-1,#fff)}
.wpc-input-area{padding:12px;border-top:1px solid var(--wp-border);flex-shrink:0}
.wpc-input-wrap{display:flex;gap:8px;align-items:flex-end;background:var(--wp-bg-3,#18181b);border-radius:12px;padding:10px 12px}
.wpc-input{flex:1;background:none;border:none;font-size:14px;color:var(--wp-text-1,#fff);outline:none;font-family:var(--wp-font);resize:none;min-height:20px;max-height:120px;line-height:1.5}
.wpc-input::placeholder{color:var(--wp-text-4,#505070)}
.wpc-send{width:32px;height:32px;border-radius:8px;background:var(--wp-accent,#10b981);border:none;color:#fff;font-weight:900;font-size:14px;cursor:pointer;flex-shrink:0;transition:all .15s;display:flex;align-items:center;justify-content:center}
.wpc-send:hover{box-shadow:0 0 16px rgba(16,185,129,.3)}
.wpc-send:disabled{opacity:.3;cursor:not-allowed}
.wpc-upload-btn{width:32px;height:32px;border-radius:8px;background:none;border:1px solid var(--wp-border);color:var(--wp-text-3);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}
.wpc-upload-btn:hover{border-color:var(--wp-accent);color:var(--wp-accent)}
.wpc-file-thumbs{display:flex;gap:6px;padding:6px 0;overflow-x:auto;flex-shrink:0}.wpc-file-thumbs::-webkit-scrollbar{display:none}
.wpc-thumb{position:relative;width:52px;height:52px;border-radius:8px;background:var(--wp-bg-4);border:1px solid var(--wp-border);display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden}
.wpc-thumb-icon{font-size:18px;opacity:.6}
.wpc-thumb-name{font-size:6px;font-weight:700;color:var(--wp-text-4);text-align:center;padding:0 2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%}
.wpc-thumb-remove{position:absolute;top:-2px;right:-2px;width:16px;height:16px;border-radius:50%;background:var(--wp-red,#ff3b5c);border:none;color:#fff;font-size:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s}
.wpc-thumb:hover .wpc-thumb-remove{opacity:1}
.wpc-thumb-img{width:100%;height:100%;object-fit:cover}
.wpc-drop-zone{position:absolute;inset:0;z-index:50;background:rgba(16,185,129,.06);border:2px dashed var(--wp-accent);border-radius:12px;display:flex;align-items:center;justify-content:center;color:var(--wp-accent);font-size:14px;font-weight:800;backdrop-filter:blur(4px)}
@keyframes wp-blink{0%,50%{opacity:1}51%,100%{opacity:0}}
@keyframes wp-pulse{0%,100%{opacity:.4}50%{opacity:1}}
@keyframes wp-dot-bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-4px)}}
.wpc-status{display:flex;align-items:center;gap:8px;padding:10px 14px;font-size:11px;font-weight:700;color:var(--wp-accent,#10b981)}
.wpc-status-dots{display:inline-flex;gap:3px}
.wpc-status-dots span{width:4px;height:4px;border-radius:50%;background:var(--wp-accent,#10b981);animation:wp-dot-bounce .6s ease-in-out infinite}
.wpc-status-dots span:nth-child(2){animation-delay:.1s}
.wpc-status-dots span:nth-child(3){animation-delay:.2s}
.wpc-status-phase{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--wp-purple,#b44dff)}
.wpc-status-msg{font-size:10px;color:var(--wp-text-3,#8888a8)}
.wpc-error-bar{display:flex;align-items:center;gap:8px;padding:10px 14px;margin:8px 12px;border-radius:10px;background:rgba(255,59,92,.06);border:1px solid rgba(255,59,92,.15);color:var(--wp-red,#ff3b5c);font-size:12px;font-weight:700}
.wpc-error-retry{padding:4px 10px;border-radius:6px;background:rgba(255,59,92,.1);border:1px solid rgba(255,59,92,.2);color:var(--wp-red,#ff3b5c);font-size:10px;font-weight:700;cursor:pointer;margin-left:auto;flex-shrink:0}
.wpc-error-retry:hover{background:rgba(255,59,92,.15)}
`

function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  const m: Record<string, string> = { ts: '📘', tsx: '📘', js: '📒', jsx: '📒', html: '🌐', css: '🎨', json: '📋', md: '📝', py: '🐍', sql: '🗄', png: '🖼', jpg: '🖼', pdf: '📕', txt: '📄' }
  return m[ext] || '📄'
}

function renderMarkdown(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = []
  let key = 0
  const regex = /(\*\*(.+?)\*\*|`([^`]+)`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null = null
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    if (match[2]) parts.push(<strong key={`b${key++}`}>{match[2]}</strong>)
    else if (match[3]) parts.push(<code key={`c${key++}`}>{match[3]}</code>)
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts
}

function formatTime(d?: Date): string {
  if (!d) return ''
  const h = d.getHours()
  const m = d.getMinutes()
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

interface SelectedFile { id: string; file: File; name: string; size: number; preview?: string }

interface Props {
  chat: UseChatReturn
  onExpandBottom: () => void
  onSwitchBottomTab: (tab: string) => void
  onToggleBrowser: () => void
  onPreviewFiles: (files: GeneratedFile[]) => void
  toast: (t: string, m: string, type?: string) => void
  logActivity: (type: string, detail: Record<string, unknown>) => Promise<void>
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export function WPChatPanel({ chat, onExpandBottom, onSwitchBottomTab, onToggleBrowser, onPreviewFiles, toast, logActivity }: Props) {
  const [input, setInput] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
  const [dragging, setDragging] = useState(false)
  const msgsRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [chat.messages])

  const addFiles = useCallback((files: FileList | File[]) => {
    const MAX = 50 * 1024 * 1024
    const BLOCKED_EXTS = ['zip', 'tar', 'gz', 'rar', '7z', 'bz2', 'xz']
    const nf: SelectedFile[] = []
    const rej: string[] = []
    for (const f of Array.from(files)) {
      const ext = f.name.split('.').pop()?.toLowerCase() || ''
      if (BLOCKED_EXTS.includes(ext)) { rej.push(`${f.name} (archive files not supported)`); continue }
      if (f.size > MAX) { rej.push(`${f.name} (max 50MB)`); continue }
      const sf: SelectedFile = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, file: f, name: f.name, size: f.size }
      if (f.type.startsWith('image/')) sf.preview = URL.createObjectURL(f)
      nf.push(sf)
    }
    if (rej.length) toast('File rejected', rej.join(', '), 'err')
    if (nf.length) { setSelectedFiles(p => [...p, ...nf]); toast('Files', `${nf.length} file(s) attached`, 'nfo') }
  }, [toast])

  const removeFile = useCallback((id: string) => {
    setSelectedFiles(p => {
      const f = p.find(x => x.id === id)
      if (f?.preview) URL.revokeObjectURL(f.preview)
      return p.filter(x => x.id !== id)
    })
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true) }, [])
  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (dropRef.current && !dropRef.current.contains(e.relatedTarget as Node)) setDragging(false)
  }, [])
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => { const s = reader.result as string; resolve(s.includes(',') ? s.split(',')[1] || '' : s) }
      reader.onerror = () => reject(new Error('Read failed'))
      reader.readAsDataURL(file)
    })
  }, [])
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
  }, [addFiles])

  const handleSend = async () => {
    if ((!input.trim() && !selectedFiles.length) || chat.isLoading) return
    const msg = input.trim(); setInput('')
    const att: { id: string; type: 'image' | 'file'; content: string; filename: string; mimeType: string }[] = []
    for (const sf of selectedFiles) {
      const b64 = await fileToBase64(sf.file)
      att.push({ id: sf.id, type: sf.file.type.startsWith('image/') ? 'image' : 'file', content: b64, filename: sf.name, mimeType: sf.file.type || 'application/octet-stream' })
    }
    setSelectedFiles([])
    logActivity('chat_send', { message_preview: msg.substring(0, 100), file_count: att.length })
    await chat.sendMessage(msg, att.length > 0 ? att : undefined)
  }

  return (
    <div className="wpc-wrap" ref={dropRef} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      <style>{CSS}</style>
      {dragging && <div className="wpc-drop-zone">Drop files here</div>}
      <div className="wpc-msgs" ref={msgsRef}>
        {chat.messages.length === 0 && (
          <div className="wpc-empty">
            <div className="wpc-empty-icon">⚡</div>
            <div className="wpc-empty-title">Start building</div>
            <div>Describe what you want to create</div>
          </div>
        )}
        {chat.messages.map((m, i) => (
          <div key={m.id || i} className="wpc-msg" data-role={m.role === 'assistant' ? 'assistant' : 'user'}>
            {m.thinking && (
              <div className="wpc-thinking">💭 {m.thinking.substring(0, 80)}{m.thinking.length > 80 ? '...' : ''}</div>
            )}
            <div className="wpc-bubble">
              <div className="wpc-bubble-hdr">
                <div className={`wpc-avt ${m.role === 'assistant' ? 'wpc-avt-ai' : 'wpc-avt-u'}`}>
                  {m.role === 'assistant' ? 'S' : '→'}
                </div>
                <span className={`wpc-role ${m.role === 'assistant' ? 'wpc-role-ai' : 'wpc-role-u'}`}>
                  {m.role === 'assistant' ? 'StreamsAI' : 'You'}
                </span>
              </div>
              {renderMarkdown(m.content)}
              {m.status === 'streaming' && !m.content && (
                <div className="wpc-status">
                  <div className="wpc-status-dots"><span /><span /><span /></div>
                  {m.statusPhase && <span className="wpc-status-phase">{m.statusPhase}</span>}
                  {m.statusMessage && <span className="wpc-status-msg">{m.statusMessage}</span>}
                  {!m.statusPhase && !m.statusMessage && <span className="wpc-status-msg">Processing...</span>}
                </div>
              )}
              {m.status === 'streaming' && m.content && <span className="wpc-streaming">▊</span>}
              {m.files && m.files.length > 0 && (
                <>
                  <div className="wpc-files-badge">📄 {m.files.length} file{m.files.length > 1 ? 's' : ''} generated</div>
                  <div className="wpc-acts">
                    <button className="wpc-pill" onClick={() => { onExpandBottom(); onSwitchBottomTab('code') }}>📄 View Code</button>
                    <button className="wpc-btn" onClick={() => { if (m.files) { onPreviewFiles(m.files); toast('Preview', 'Loaded on device', 'nfo') } }}>▶ Preview</button>
                    <button className="wpc-btn" onClick={onToggleBrowser}>🌐 Browser</button>
                  </div>
                </>
              )}
            </div>
            <div className="wpc-time">{formatTime(m.timestamp ? new Date(m.timestamp) : undefined)}</div>
          </div>
        ))}
      </div>
      <input ref={fileRef} type="file" multiple accept=".ts,.tsx,.js,.jsx,.html,.css,.json,.md,.txt,.py,.sql,.rb,.go,.rs,.yaml,.yml,.csv,.png,.jpg,.jpeg,.gif,.webp,.svg,.pdf,.docx,.xlsx" style={{ display: 'none' }} onChange={e => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = '' }} />
      {chat.error && (
        <div className="wpc-error-bar">
          <span>⚠</span>
          <span style={{ flex: 1 }}>{chat.error}</span>
          <button className="wpc-error-retry" onClick={() => { const lastUser = [...chat.messages].reverse().find(m => m.role === 'user'); if (lastUser) chat.sendMessage(lastUser.content, lastUser.attachments) }}>Retry</button>
        </div>
      )}
      <div className="wpc-input-area">
        {selectedFiles.length > 0 && (
          <div className="wpc-file-thumbs">
            {selectedFiles.map(sf => (
              <div key={sf.id} className="wpc-thumb">
                {sf.preview ? (
                  <img className="wpc-thumb-img" src={sf.preview} alt={sf.name} />
                ) : (
                  <>
                    <div className="wpc-thumb-icon">{getFileIcon(sf.name)}</div>
                    <div className="wpc-thumb-name">{sf.name}</div>
                  </>
                )}
                <div className="wpc-thumb-remove" onClick={() => removeFile(sf.id)}>✕</div>
              </div>
            ))}
          </div>
        )}
        <div className="wpc-input-wrap">
          <button className="wpc-upload-btn" onClick={() => fileRef.current?.click()} title="Attach files">📎</button>
          <textarea className="wpc-input" placeholder="Ask anything..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }} disabled={chat.isLoading} rows={1} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}></textarea>
          <button className="wpc-send" onClick={chat.isLoading ? chat.stopGeneration : handleSend} disabled={!input.trim() && !selectedFiles.length && !chat.isLoading}>
            {chat.isLoading ? '⏹' : '↑'}
          </button>
        </div>
        {chat.isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 10, fontWeight: 700, color: 'var(--wp-accent,#10b981)' }}>
            <div className="wpc-status-dots"><span /><span /><span /></div>
            Generating response...
            <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--wp-text-4)', fontSize: 9, cursor: 'pointer', fontWeight: 700 }} onClick={chat.stopGeneration}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  )
}
