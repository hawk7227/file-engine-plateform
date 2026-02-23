'use client'

import { useState, useRef, useEffect } from 'react'
import type { UseChatReturn } from '@/hooks/useChat'

const S = {
  wrap: { display: 'flex', flexDirection: 'column' as const, height: '100%' },
  msgs: { flex: 1, overflowY: 'auto' as const, padding: 8 },
  msg: { display: 'flex', gap: 8, padding: 8, marginBottom: 2 },
  avt: { width: 20, height: 20, borderRadius: 6, display: 'flex', alignItems: 'center' as const, justifyContent: 'center' as const, fontSize: 9, flexShrink: 0, marginTop: 2 },
  avtAi: { background: 'var(--wp-accent-dim)', border: '1px solid rgba(52,211,153,.15)' },
  avtU: { background: 'var(--wp-bg-4)' },
  role: { fontSize: 7, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '.5px', marginBottom: 2 },
  roleAi: { color: 'var(--wp-accent)' },
  roleU: { color: 'var(--wp-text-3)' },
  txt: { fontSize: 11, lineHeight: 1.55, color: 'var(--wp-text-2)' },
  acts: { display: 'flex', flexWrap: 'wrap' as const, gap: 4, marginTop: 6 },
  pill: { display: 'inline-flex', alignItems: 'center' as const, gap: 4, padding: '3px 8px', borderRadius: 5, fontSize: 7, fontWeight: 700, border: '1px solid rgba(52,211,153,.15)', color: 'var(--wp-accent)', background: 'var(--wp-accent-dim)', cursor: 'pointer', fontFamily: 'var(--wp-font)' },
  btn: { padding: '3px 8px', borderRadius: 5, fontSize: 7, fontWeight: 700, border: '1px solid rgba(52,211,153,.15)', color: 'var(--wp-accent)', background: 'none', cursor: 'pointer', fontFamily: 'var(--wp-font)' },
  inputWrap: { padding: 8, borderTop: '1px solid var(--wp-border)', display: 'flex', gap: 6, alignItems: 'center', background: 'var(--wp-bg-3)', borderRadius: 8, margin: 8 },
  input: { flex: 1, background: 'none', border: 'none', fontSize: 11, color: 'var(--wp-text-1)', outline: 'none', fontFamily: 'var(--wp-font)' },
  send: { width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, var(--wp-accent), var(--wp-blue))', border: 'none', color: '#000', fontWeight: 900, fontSize: 10, cursor: 'pointer', flexShrink: 0 },
  streaming: { display: 'inline-block', animation: 'wp-blink 1s infinite' },
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
  const msgsRef = useRef<HTMLDivElement>(null)

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
    <div style={S.wrap}>
      <style>{`@keyframes wp-blink{0%,50%{opacity:1}51%,100%{opacity:0}}`}</style>
      <div style={S.msgs} ref={msgsRef}>
        {chat.messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--wp-text-4)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: 'var(--wp-text-2)' }}>Start building</div>
            <div style={{ fontSize: 11 }}>Describe what you want to create</div>
          </div>
        )}
        {chat.messages.map((m, i) => (
          <div key={m.id || i} style={S.msg}>
            <div style={{ ...S.avt, ...(m.role === 'assistant' ? S.avtAi : S.avtU) }}>
              {m.role === 'assistant' ? '⚡' : '👤'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...S.role, ...(m.role === 'assistant' ? S.roleAi : S.roleU) }}>
                {m.role === 'assistant' ? 'File Engine' : 'You'}
              </div>
              <div style={S.txt}>
                {m.content}
                {m.status === 'streaming' && <span style={S.streaming}>▊</span>}
              </div>
              {m.files && m.files.length > 0 && (
                <div style={S.acts}>
                  <button style={S.pill} onClick={() => { onExpandBottom(); onSwitchBottomTab('code') }}>
                    📄 View Code → Code Panel
                  </button>
                  <button style={S.btn} onClick={() => toast('Preview', 'Loading on device', 'nfo')}>
                    ▶ Preview
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div style={S.inputWrap}>
        <input
          style={S.input}
          placeholder="Ask anything..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          disabled={chat.isLoading}
        />
        <button
          style={{ ...S.send, opacity: !input.trim() && !chat.isLoading ? 0.4 : 1 }}
          onClick={chat.isLoading ? chat.stopGeneration : handleSend}
        >
          {chat.isLoading ? '⏹' : '↑'}
        </button>
      </div>
    </div>
  )
}
