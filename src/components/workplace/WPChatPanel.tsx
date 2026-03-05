'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { UseChatReturn, GeneratedFile } from '@/hooks/useChat'

const CSS = `
.wpc-root{display:flex;flex-direction:column;height:100%;background:var(--wp-bg,#0a0a0a);position:relative;overflow:hidden}
.wpc-scroll{flex:1;overflow-y:auto;overflow-x:hidden;padding:0 0 8px}
.wpc-scroll::-webkit-scrollbar{width:4px}
.wpc-scroll::-webkit-scrollbar-track{background:transparent}
.wpc-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:4px}
.wpc-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;padding:40px 24px;text-align:center;user-select:none}
.wpc-empty-title{font-size:20px;font-weight:600;color:var(--wp-text-1,#f0f0f0);letter-spacing:-.02em}
.wpc-empty-sub{font-size:13px;color:var(--wp-text-4,#4a4a6a);line-height:1.5}
.wpc-row{display:flex;flex-direction:column;padding:20px 20px 0;animation:wpc-in 180ms ease}
@keyframes wpc-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.wpc-row[data-role="user"]{align-items:flex-end}
.wpc-user-bubble{background:#2a2a2a;color:var(--wp-text-1,#f0f0f0);padding:10px 16px;border-radius:18px 18px 4px 18px;font-size:14px;line-height:1.6;max-width:80%;word-break:break-word;white-space:pre-wrap}
.wpc-row[data-role="assistant"]{align-items:flex-start}
.wpc-ai-body{font-size:14px;line-height:1.75;color:var(--wp-text-1,#f0f0f0);max-width:100%;word-break:break-word;white-space:pre-wrap}
.wpc-thinking-dots{display:inline-flex;align-items:center;gap:4px;height:20px;padding:4px 0}
.wpc-thinking-dots span{width:7px;height:7px;border-radius:50%;background:var(--wp-text-4,#4a4a6a);animation:wpc-bounce .9s ease-in-out infinite;flex-shrink:0}
.wpc-thinking-dots span:nth-child(2){animation-delay:.15s}
.wpc-thinking-dots span:nth-child(3){animation-delay:.3s}
@keyframes wpc-bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
.wpc-cursor{display:inline-block;width:2px;height:14px;background:var(--wp-text-1,#f0f0f0);border-radius:1px;margin-left:1px;vertical-align:text-bottom;animation:wpc-blink .9s ease-in-out infinite}
@keyframes wpc-blink{0%,100%{opacity:1}50%{opacity:0}}
.wpc-tools{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px}
.wpc-tool-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:99px;font-size:11px;font-weight:500;color:var(--wp-text-3,#8888a8);background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06)}
.wpc-tool-pill.done{color:var(--wp-accent,#10b981);background:rgba(16,185,129,.05);border-color:rgba(16,185,129,.12)}
.wpc-file-actions{margin-top:12px;display:flex;flex-wrap:wrap;gap:6px}
.wpc-action-btn{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;transition:all 150ms;border:1px solid rgba(255,255,255,.1);color:var(--wp-text-2,#c0c0d8);background:rgba(255,255,255,.04)}
.wpc-action-btn:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.16)}
.wpc-action-btn.primary{color:var(--wp-accent,#10b981);border-color:rgba(16,185,129,.2);background:rgba(16,185,129,.06)}
.wpc-action-btn.primary:hover{background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.3)}
.wpc-att-list{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px}
.wpc-att-chip{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:500;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:var(--wp-text-3,#8888a8)}
.wpc-att-img{width:120px;height:80px;object-fit:cover;border-radius:8px;border:1px solid rgba(255,255,255,.08)}
.wpc-ai-body code{font-family:var(--wp-mono,'JetBrains Mono',monospace);font-size:12px;background:rgba(255,255,255,.07);color:#e0e0e0;padding:1px 5px;border-radius:4px}
.wpc-ai-body strong{font-weight:600;color:#fff}
.wpc-error-row{margin:8px 20px;padding:10px 14px;border-radius:10px;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15);color:#f87171;font-size:12px;font-weight:500;display:flex;align-items:center;gap:8px}
.wpc-retry{margin-left:auto;padding:3px 10px;border-radius:6px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);color:#f87171;font-size:11px;cursor:pointer;white-space:nowrap}
.wpc-retry:hover{background:rgba(239,68,68,.16)}
.wpc-input-area{flex-shrink:0;padding:8px 12px 12px}
.wpc-thumbs{display:flex;gap:6px;padding:6px 4px;overflow-x:auto;flex-shrink:0}
.wpc-thumbs::-webkit-scrollbar{display:none}
.wpc-thumb{position:relative;width:52px;height:52px;border-radius:8px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden}
.wpc-thumb img{width:100%;height:100%;object-fit:cover}
.wpc-thumb-name{font-size:6px;font-weight:600;color:rgba(255,255,255,.4);padding:0 2px;text-align:center;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wpc-thumb-icon{font-size:16px;opacity:.5}
.wpc-thumb-rm{position:absolute;top:-3px;right:-3px;width:16px;height:16px;border-radius:50%;background:#ef4444;border:none;color:#fff;font-size:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 150ms}
.wpc-thumb:hover .wpc-thumb-rm{opacity:1}
.wpc-box{display:flex;align-items:flex-end;gap:0;background:#1a1a1a;border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:10px 10px 10px 14px;transition:border-color 150ms}
.wpc-box:focus-within{border-color:rgba(255,255,255,.2)}
.wpc-textarea{flex:1;background:none;border:none;outline:none;font-size:14px;line-height:1.5;color:var(--wp-text-1,#f0f0f0);font-family:var(--wp-font,system-ui,sans-serif);resize:none;min-height:22px;max-height:160px;overflow-y:auto}
.wpc-textarea::placeholder{color:rgba(255,255,255,.25)}
.wpc-textarea::-webkit-scrollbar{width:3px}
.wpc-textarea::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:3px}
.wpc-btn-row{display:flex;align-items:center;gap:6px;flex-shrink:0;margin-left:6px}
.wpc-attach{width:28px;height:28px;border-radius:8px;background:none;border:none;color:rgba(255,255,255,.3);font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:color 150ms}
.wpc-attach:hover{color:rgba(255,255,255,.6)}
.wpc-send{width:32px;height:32px;border-radius:10px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 150ms;background:var(--wp-accent,#10b981);color:#fff}
.wpc-send:disabled{background:rgba(255,255,255,.08);color:rgba(255,255,255,.25);cursor:not-allowed}
.wpc-send:not(:disabled):hover{box-shadow:0 0 16px rgba(16,185,129,.35)}
.wpc-send.stop{background:#ef4444}
.wpc-send.stop:hover{box-shadow:0 0 16px rgba(239,68,68,.35) !important}
.wpc-drop{position:absolute;inset:0;z-index:50;background:rgba(16,185,129,.04);border:2px dashed rgba(16,185,129,.4);border-radius:12px;display:flex;align-items:center;justify-content:center;color:var(--wp-accent,#10b981);font-size:14px;font-weight:600;backdrop-filter:blur(4px);pointer-events:none}
.wpc-hint{font-size:10px;color:rgba(255,255,255,.18);text-align:center;padding:5px 0 0;user-select:none}
`

function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  const m: Record<string, string> = { ts:'📘',tsx:'📘',js:'📒',jsx:'📒',html:'🌐',css:'🎨',json:'📋',md:'📝',py:'🐍',sql:'🗄️',png:'🖼️',jpg:'🖼️',jpeg:'🖼️',pdf:'📕',txt:'📄',csv:'📊',xlsx:'📗',docx:'📘' }
  return m[ext] || '📄'
}

function renderContent(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = []
  let key = 0
  const regex = /(\*\*(.+?)\*\*|`([^`]+)`)/g
  let last = 0; let match: RegExpExecArray | null = null
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    if (match[2]) parts.push(<strong key={`s${key++}`}>{match[2]}</strong>)
    else if (match[3]) parts.push(<code key={`c${key++}`}>{match[3]}</code>)
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

interface SelectedFile { id: string; file: File; name: string; preview?: string }
interface Props {
  chat: UseChatReturn
  onExpandBottom: () => void
  onSwitchBottomTab: (tab: string) => void
  onToggleBrowser: () => void
  onPreviewFiles: (files: GeneratedFile[]) => void
  toast: (t: string, m: string, type?: string) => void
  logActivity: (type: string, detail: Record<string, unknown>) => Promise<void>
}

export function WPChatPanel({ chat, onExpandBottom, onSwitchBottomTab, onToggleBrowser, onPreviewFiles, toast, logActivity }: Props) {
  const [input, setInput] = useState('')
  const [selFiles, setSelFiles] = useState<SelectedFile[]>([])
  const [dragging, setDragging] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) el.scrollTop = el.scrollHeight
  }, [chat.messages])

  useEffect(() => {
    const el = textareaRef.current; if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [input])

  const addFiles = useCallback((fl: FileList | File[]) => {
    const BLOCKED = ['zip','tar','gz','rar','7z','bz2','xz']
    const added: SelectedFile[] = []; const rej: string[] = []
    for (const f of Array.from(fl)) {
      const ext = f.name.split('.').pop()?.toLowerCase() || ''
      if (BLOCKED.includes(ext)) { rej.push(`${f.name} (archives not supported)`); continue }
      if (f.size > 50*1024*1024) { rej.push(`${f.name} (max 50MB)`); continue }
      const sf: SelectedFile = { id: `${Date.now()}-${Math.random().toString(36).slice(2,6)}`, file: f, name: f.name }
      if (f.type.startsWith('image/')) sf.preview = URL.createObjectURL(f)
      added.push(sf)
    }
    if (rej.length) toast('Rejected', rej.join(', '), 'err')
    if (added.length) { setSelFiles(p => [...p, ...added]); toast('Attached', `${added.length} file(s)`, 'nfo') }
  }, [toast])

  const removeFile = useCallback((id: string) => {
    setSelFiles(p => { const f = p.find(x => x.id === id); if (f?.preview) URL.revokeObjectURL(f.preview); return p.filter(x => x.id !== id) })
  }, [])

  const toBase64 = useCallback((file: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader()
      r.onload = () => { const s = r.result as string; res(s.includes(',') ? s.split(',')[1] || '' : s) }
      r.onerror = () => rej(new Error('Read failed'))
      r.readAsDataURL(file)
    }), [])

  const handleSend = useCallback(async () => {
    if ((!input.trim() && !selFiles.length) || chat.isLoading) return
    const msg = input.trim(); setInput('')
    const atts: { id: string; type: 'image'|'file'; content: string; filename: string; mimeType: string }[] = []
    for (const sf of selFiles) {
      const b64 = await toBase64(sf.file)
      atts.push({ id: sf.id, type: sf.file.type.startsWith('image/') ? 'image' : 'file', content: b64, filename: sf.name, mimeType: sf.file.type || 'application/octet-stream' })
    }
    setSelFiles([])
    logActivity('chat_send', { message_preview: msg.slice(0,100), file_count: atts.length })
    await chat.sendMessage(msg, atts.length ? atts : undefined)
    textareaRef.current?.focus()
  }, [input, selFiles, chat, toBase64, logActivity])

  return (
    <div className="wpc-root" ref={rootRef}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={e => { if (rootRef.current && !rootRef.current.contains(e.relatedTarget as Node)) setDragging(false) }}
      onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files) }}
    >
      <style>{CSS}</style>
      {dragging && <div className="wpc-drop">Drop files to attach</div>}

      <div className="wpc-scroll" ref={scrollRef}>
        {chat.messages.length === 0 ? (
          <div className="wpc-empty">
            <div className="wpc-empty-title">How can I help?</div>
            <div className="wpc-empty-sub">Describe what you want to build,<br/>ask a question, or upload a file.</div>
          </div>
        ) : chat.messages.map((m, i) => (
          <div key={m.id || i} className="wpc-row" data-role={m.role === 'assistant' ? 'assistant' : 'user'}>
            {m.role === 'user' && (
              <>
                {m.attachments && m.attachments.length > 0 && (
                  <div className="wpc-att-list" style={{ justifyContent:'flex-end', marginBottom:4 }}>
                    {m.attachments.map((a, ai) =>
                      a.type === 'image'
                        ? <img key={ai} className="wpc-att-img" src={`data:${a.mimeType};base64,${a.content}`} alt={a.filename||'image'} />
                        : <div key={ai} className="wpc-att-chip">{getFileIcon(a.filename||'')} {a.filename}</div>
                    )}
                  </div>
                )}
                <div className="wpc-user-bubble">{m.content}</div>
              </>
            )}
            {m.role === 'assistant' && (
              <>
                {m.toolCalls && m.toolCalls.length > 0 && (
                  <div className="wpc-tools">
                    {m.toolCalls.slice(0,5).map((tc, ti) => (
                      <div key={ti} className={`wpc-tool-pill${tc.success !== undefined ? ' done' : ''}`}>
                        {tc.success === undefined ? '◌' : tc.success ? '✓' : '✗'} {tc.tool.replace(/_/g,' ')}
                      </div>
                    ))}
                    {m.toolCalls.length > 5 && <div className="wpc-tool-pill">+{m.toolCalls.length - 5} more</div>}
                  </div>
                )}
                <div className="wpc-ai-body">
                  {m.status === 'streaming' && !m.content
                    ? <div className="wpc-thinking-dots"><span/><span/><span/></div>
                    : <>{renderContent(m.content)}{m.status === 'streaming' && <span className="wpc-cursor"/>}</>
                  }
                </div>
                {m.files && m.files.length > 0 && (
                  <div className="wpc-file-actions">
                    <button className="wpc-action-btn primary" onClick={() => { onExpandBottom(); onSwitchBottomTab('code') }}>📄 View Code</button>
                    <button className="wpc-action-btn" onClick={() => { if (m.files) { onPreviewFiles(m.files); toast('Preview','Loaded','nfo') } }}>▶ Preview</button>
                    <button className="wpc-action-btn" onClick={onToggleBrowser}>🌐 Browser</button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {chat.error && (
        <div className="wpc-error-row">
          <span>⚠</span>
          <span style={{flex:1}}>{chat.error}</span>
          <button className="wpc-retry" onClick={() => { const last = [...chat.messages].reverse().find(m => m.role==='user'); if (last) chat.sendMessage(last.content, last.attachments) }}>Retry</button>
        </div>
      )}

      <div className="wpc-input-area">
        {selFiles.length > 0 && (
          <div className="wpc-thumbs">
            {selFiles.map(sf => (
              <div key={sf.id} className="wpc-thumb">
                {sf.preview ? <img src={sf.preview} alt={sf.name}/> : <><div className="wpc-thumb-icon">{getFileIcon(sf.name)}</div><div className="wpc-thumb-name">{sf.name}</div></>}
                <button className="wpc-thumb-rm" onClick={() => removeFile(sf.id)}>✕</button>
              </div>
            ))}
          </div>
        )}
        <div className="wpc-box">
          <textarea
            ref={textareaRef}
            className="wpc-textarea"
            placeholder="Ask anything..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            disabled={chat.isLoading}
            rows={1}
            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
          />
          <div className="wpc-btn-row">
            <button className="wpc-attach" onClick={() => fileRef.current?.click()} title="Attach file">📎</button>
            <button
              className={`wpc-send${chat.isLoading ? ' stop' : ''}`}
              onClick={chat.isLoading ? chat.stopGeneration : handleSend}
              disabled={!chat.isLoading && !input.trim() && !selFiles.length}
            >
              {chat.isLoading
                ? <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><rect width="12" height="12" rx="2"/></svg>
                : <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 12V2M2 7l5-5 5 5"/></svg>
              }
            </button>
          </div>
        </div>
        <div className="wpc-hint">Enter to send · Shift+Enter for new line</div>
      </div>

      <input ref={fileRef} type="file" multiple
        accept=".ts,.tsx,.js,.jsx,.html,.css,.json,.md,.txt,.py,.sql,.rb,.go,.rs,.yaml,.yml,.csv,.png,.jpg,.jpeg,.gif,.webp,.svg,.pdf,.docx,.xlsx"
        style={{display:'none'}}
        onChange={e => { if (e.target.files?.length) addFiles(e.target.files); e.target.value='' }}
      />
    </div>
  )
}
