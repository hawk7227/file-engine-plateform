'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { UseChatReturn } from '@/hooks/useChat'

const CSS = `
.wpc-wrap{display:flex;flex-direction:column;height:100%}
.wpc-msgs{flex:1;overflow-y:auto;padding:8px}
.wpc-msg{display:flex;gap:8px;padding:8px;margin-bottom:2px}
.wpc-avt{width:20px;height:20px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:9px;flex-shrink:0;margin-top:2px}
.wpc-avt-ai{background:var(--wp-accent-dim);border:1px solid rgba(52,211,153,.15)}
.wpc-avt-u{background:var(--wp-bg-4)}
.wpc-role{font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}
.wpc-role-ai{color:var(--wp-accent)}.wpc-role-u{color:var(--wp-text-3)}
.wpc-txt{font-size:11px;line-height:1.55;color:var(--wp-text-2);white-space:pre-wrap;word-break:break-word}
.wpc-acts{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.wpc-pill{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:5px;font-size:7px;font-weight:700;border:1px solid rgba(52,211,153,.15);color:var(--wp-accent);background:var(--wp-accent-dim);cursor:pointer;font-family:var(--wp-font);transition:background .15s}
.wpc-pill:hover{background:rgba(52,211,153,.12)}
.wpc-btn{padding:3px 8px;border-radius:5px;font-size:7px;font-weight:700;border:1px solid rgba(96,165,250,.15);color:var(--wp-blue);background:none;cursor:pointer;font-family:var(--wp-font);transition:background .15s}
.wpc-btn:hover{background:rgba(96,165,250,.06)}
.wpc-input-area{padding:8px;border-top:1px solid var(--wp-border);flex-shrink:0}
.wpc-input-wrap{display:flex;gap:6px;align-items:center;background:var(--wp-bg-3);border-radius:8px;padding:6px 8px}
.wpc-input{flex:1;background:none;border:none;font-size:11px;color:var(--wp-text-1);outline:none;font-family:var(--wp-font)}
.wpc-input::placeholder{color:var(--wp-text-4)}
.wpc-send{width:24px;height:24px;border-radius:8px;background:var(--wp-accent);border:none;color:#000;font-weight:900;font-size:10px;cursor:pointer;flex-shrink:0;transition:opacity .15s}
.wpc-send:disabled{opacity:.3;cursor:not-allowed}
.wpc-upload-btn{width:24px;height:24px;border-radius:6px;background:none;border:1px solid var(--wp-border);color:var(--wp-text-4);font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}
.wpc-upload-btn:hover{border-color:var(--wp-border-2);color:var(--wp-text-2)}
.wpc-streaming{display:inline-block;animation:wp-blink 1s infinite}
.wpc-empty{text-align:center;padding:40px 20px;color:var(--wp-text-4)}
.wpc-empty-icon{font-size:40px;margin-bottom:12px;opacity:.3}
.wpc-empty-title{font-size:13px;font-weight:700;margin-bottom:4px;color:var(--wp-text-2)}
.wpc-files-badge{display:flex;align-items:center;gap:4px;padding:2px 6px;border-radius:4px;font-size:8px;font-weight:700;font-family:var(--wp-mono);background:rgba(52,211,153,.06);border:1px solid rgba(52,211,153,.1);color:var(--wp-accent);margin-top:4px}
.wpc-thinking{font-size:9px;color:var(--wp-purple);font-style:italic;margin-bottom:4px;display:flex;align-items:center;gap:4px}
.wpc-file-thumbs{display:flex;gap:4px;padding:4px 0;overflow-x:auto;flex-shrink:0}
.wpc-file-thumbs::-webkit-scrollbar{display:none}
.wpc-thumb{position:relative;width:48px;height:48px;border-radius:6px;background:var(--wp-bg-4);border:1px solid var(--wp-border);display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden}
.wpc-thumb-icon{font-size:16px;opacity:.6}
.wpc-thumb-name{font-size:5px;font-weight:700;color:var(--wp-text-4);text-align:center;padding:0 2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%}
.wpc-thumb-remove{position:absolute;top:-2px;right:-2px;width:14px;height:14px;border-radius:50%;background:var(--wp-red);border:1px solid rgba(248,113,113,.3);color:#fff;font-size:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s}
.wpc-thumb:hover .wpc-thumb-remove{opacity:1}
.wpc-thumb-img{width:100%;height:100%;object-fit:cover}
.wpc-drop-zone{position:absolute;inset:0;z-index:50;background:rgba(52,211,153,.06);border:2px dashed var(--wp-accent);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--wp-accent);font-size:12px;font-weight:700;backdrop-filter:blur(4px)}
@keyframes wp-blink{0%,50%{opacity:1}51%,100%{opacity:0}}
`

function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  const m: Record<string, string> = { ts: '📘', tsx: '📘', js: '📒', jsx: '📒', html: '🌐', css: '🎨', json: '📋', md: '📝', py: '🐍', sql: '🗄', png: '🖼', jpg: '🖼', jpeg: '🖼', gif: '🖼', svg: '🖼', pdf: '📕', txt: '📄' }
  return m[ext] || '📄'
}

interface SelectedFile {
  id: string
  file: File
  name: string
  preview?: string
}

interface Props {
  chat: UseChatReturn
  onExpandBottom: () => void
  onSwitchBottomTab: (tab: string) => void
  onToggleBrowser: () => void
  toast: (t: string, m: string, type?: string) => void
  logActivity: (type: string, detail: Record<string, unknown>) => Promise<void>
}

export function WPChatPanel({ chat, onExpandBottom, onSwitchBottomTab, onToggleBrowser, toast, logActivity }: Props) {
  const [input, setInput] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
  const [dragging, setDragging] = useState(false)
  const msgsRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [chat.messages])

  // Create preview URLs for image files
  const addFiles = useCallback((files: FileList | File[]) => {
    const newFiles: SelectedFile[] = Array.from(files).map(f => {
      const sf: SelectedFile = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, file: f, name: f.name }
      if (f.type.startsWith('image/')) {
        sf.preview = URL.createObjectURL(f)
      }
      return sf
    })
    setSelectedFiles(prev => [...prev, ...newFiles])
    toast('Files', `${newFiles.length} file(s) attached`, 'nfo')
  }, [toast])

  const removeFile = useCallback((id: string) => {
    setSelectedFiles(prev => {
      const f = prev.find(p => p.id === id)
      if (f?.preview) URL.revokeObjectURL(f.preview)
      return prev.filter(p => p.id !== id)
    })
  }, [])

  // Drag and drop handlers
  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true) }, [])
  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (dropRef.current && !dropRef.current.contains(e.relatedTarget as Node)) setDragging(false)
  }, [])
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
  }, [addFiles])

  const handleSend = async () => {
    if ((!input.trim() && !selectedFiles.length) || chat.isLoading) return
    const msg = input.trim()
    setInput('')
    setSelectedFiles([])
    logActivity('chat_send', { message_preview: msg.substring(0, 100), file_count: selectedFiles.length })
    await chat.sendMessage(msg)
  }

  return (
    <div className="wpc-wrap" ref={dropRef} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      <style>{CSS}</style>

      {/* Drop overlay */}
      {dragging && (
        <div className="wpc-drop-zone">Drop files here</div>
      )}

      <div className="wpc-msgs" ref={msgsRef}>
        {chat.messages.length === 0 && (
          <div className="wpc-empty">
            <div className="wpc-empty-icon">⚡</div>
            <div className="wpc-empty-title">Start building</div>
            <div>Describe what you want to create</div>
          </div>
        )}
        {chat.messages.map((m, i) => (
          <div key={m.id || i} className="wpc-msg">
            <div className={`wpc-avt ${m.role === 'assistant' ? 'wpc-avt-ai' : 'wpc-avt-u'}`}>
              {m.role === 'assistant' ? '⚡' : '→'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={`wpc-role ${m.role === 'assistant' ? 'wpc-role-ai' : 'wpc-role-u'}`}>
                {m.role === 'assistant' ? 'File Engine' : 'You'}
              </div>
              {m.thinking && (
                <div className="wpc-thinking">
                  💭 {m.thinking.substring(0, 80)}{m.thinking.length > 80 ? '...' : ''}
                </div>
              )}
              <div className="wpc-txt">
                {m.content}
                {m.status === 'streaming' && <span className="wpc-streaming">▊</span>}
              </div>
              {m.files && m.files.length > 0 && (
                <>
                  <div className="wpc-files-badge">📄 {m.files.length} file{m.files.length > 1 ? 's' : ''} generated</div>
                  <div className="wpc-acts">
                    <button className="wpc-pill" onClick={() => { onExpandBottom(); onSwitchBottomTab('code') }}>📄 View Code</button>
                    <button className="wpc-btn" onClick={() => toast('Preview', 'Loading on device', 'nfo')}>▶ Preview</button>
                    <button className="wpc-btn" onClick={onToggleBrowser}>🌐 Browser</button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* File input (hidden) */}
      <input
        ref={fileRef} type="file" multiple
        accept=".ts,.tsx,.js,.jsx,.html,.css,.json,.md,.txt,.py,.sql,.png,.jpg,.jpeg,.gif,.svg,.pdf"
        style={{ display: 'none' }}
        onChange={e => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = '' }}
      />

      {/* Input area */}
      <div className="wpc-input-area">
        {/* File preview thumbnails */}
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
          <button className="wpc-upload-btn" onClick={() => fileRef.current?.click()} title="Attach files">+</button>
          <input
            className="wpc-input" placeholder="Ask anything..."
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            disabled={chat.isLoading}
          />
          <button className="wpc-send" onClick={chat.isLoading ? chat.stopGeneration : handleSend} disabled={!input.trim() && !selectedFiles.length && !chat.isLoading}>
            {chat.isLoading ? '⏹' : '↑'}
          </button>
        </div>
      </div>
    </div>
  )
}
