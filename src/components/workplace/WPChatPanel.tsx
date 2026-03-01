'use client'

import { useState, useRef, useEffect } from 'react'
import type { UseChatReturn } from '@/hooks/useChat'

const CSS = `
.wpc-wrap{display:flex;flex-direction:column;height:100%}
.wpc-msgs{flex:1;overflow-y:auto;padding:8px}
.wpc-msg{display:flex;gap:8px;padding:8px;margin-bottom:2px}
.wpc-avt{width:20px;height:20px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:9px;flex-shrink:0;margin-top:2px}
.wpc-avt-ai{background:var(--wp-accent-dim);border:1px solid rgba(52,211,153,.15)}
.wpc-avt-u{background:var(--wp-bg-4)}
.wpc-role{font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}
.wpc-role-ai{color:var(--wp-accent)}
.wpc-role-u{color:var(--wp-text-3)}
.wpc-txt{font-size:11px;line-height:1.55;color:var(--wp-text-2);white-space:pre-wrap;word-break:break-word}
.wpc-acts{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.wpc-pill{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:5px;font-size:7px;font-weight:700;border:1px solid rgba(52,211,153,.15);color:var(--wp-accent);background:var(--wp-accent-dim);cursor:pointer;font-family:var(--wp-font);transition:background .15s}
.wpc-pill:hover{background:rgba(52,211,153,.12)}
.wpc-btn{padding:3px 8px;border-radius:5px;font-size:7px;font-weight:700;border:1px solid rgba(96,165,250,.15);color:var(--wp-blue);background:none;cursor:pointer;font-family:var(--wp-font);transition:background .15s}
.wpc-btn:hover{background:rgba(96,165,250,.06)}
.wpc-input-wrap{padding:8px;border-top:1px solid var(--wp-border);display:flex;gap:6px;align-items:center;background:var(--wp-bg-3);border-radius:8px;margin:8px}
.wpc-input{flex:1;background:none;border:none;font-size:11px;color:var(--wp-text-1);outline:none;font-family:var(--wp-font)}
.wpc-input::placeholder{color:var(--wp-text-4)}
.wpc-send{width:24px;height:24px;border-radius:8px;background:var(--wp-accent);border:none;color:#000;font-weight:900;font-size:10px;cursor:pointer;flex-shrink:0;transition:opacity .15s}
.wpc-send:disabled{opacity:.3;cursor:not-allowed}
.wpc-upload{width:24px;height:24px;border-radius:6px;background:none;border:1px solid var(--wp-border);color:var(--wp-text-4);font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}
.wpc-upload:hover{border-color:var(--wp-border-2);color:var(--wp-text-2)}
.wpc-streaming{display:inline-block;animation:wp-blink 1s infinite}
.wpc-empty{text-align:center;padding:40px 20px;color:var(--wp-text-4)}
.wpc-empty-icon{font-size:40px;margin-bottom:12px;opacity:.3}
.wpc-empty-title{font-size:13px;font-weight:700;margin-bottom:4px;color:var(--wp-text-2)}
.wpc-files-badge{display:flex;align-items:center;gap:4px;padding:2px 6px;border-radius:4px;font-size:8px;font-weight:700;font-family:var(--wp-mono);background:rgba(52,211,153,.06);border:1px solid rgba(52,211,153,.1);color:var(--wp-accent);margin-top:4px}
.wpc-thinking{font-size:9px;color:var(--wp-purple);font-style:italic;margin-bottom:4px;display:flex;align-items:center;gap:4px}
@keyframes wp-blink{0%,50%{opacity:1}51%,100%{opacity:0}}
`

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
  const msgsRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [chat.messages])

  const handleSend = async () => {
    if (!input.trim() || chat.isLoading) return
    const msg = input.trim()
    setInput('')
    logActivity('chat_send', { message_preview: msg.substring(0, 100) })
    await chat.sendMessage(msg)
  }

  return (
    <div className="wpc-wrap">
      <style>{CSS}</style>
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
                  <div className="wpc-files-badge">
                    📄 {m.files.length} file{m.files.length > 1 ? 's' : ''} generated
                  </div>
                  <div className="wpc-acts">
                    <button className="wpc-pill" onClick={() => { onExpandBottom(); onSwitchBottomTab('code') }}>
                      📄 View Code
                    </button>
                    <button className="wpc-btn" onClick={() => {
                      toast('Preview', 'Loading on device', 'nfo')
                    }}>
                      ▶ Preview
                    </button>
                    <button className="wpc-btn" onClick={onToggleBrowser}>
                      🌐 Browser
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <input
        ref={fileRef}
        type="file"
        multiple
        accept=".ts,.tsx,.js,.jsx,.html,.css,.json,.md,.txt,.py,.sql"
        style={{ display: 'none' }}
        onChange={(e) => {
          const files = e.target.files
          if (files?.length) {
            toast('Upload', `${files.length} file(s) selected`, 'nfo')
          }
        }}
      />
      <div className="wpc-input-wrap">
        <button className="wpc-upload" onClick={() => fileRef.current?.click()} title="Upload file">
          +
        </button>
        <input
          className="wpc-input"
          placeholder="Ask anything..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          disabled={chat.isLoading}
        />
        <button
          className="wpc-send"
          onClick={chat.isLoading ? chat.stopGeneration : handleSend}
          disabled={!input.trim() && !chat.isLoading}
        >
          {chat.isLoading ? '⏹' : '↑'}
        </button>
      </div>
    </div>
  )
}
