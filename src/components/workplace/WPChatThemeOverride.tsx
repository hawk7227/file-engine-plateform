'use client'

import { useEffect } from 'react'

const STYLE_ID = 'streamsai-chat-theme-override'

const CSS = `
:root{
  --streams-bg:#09090b;
  --streams-bg2:#111114;
  --streams-bg3:#18181b;
  --streams-bg4:#27272a;
  --streams-bdr:rgba(255,255,255,.06);
  --streams-bdr2:rgba(255,255,255,.12);
  --streams-t1:#fafafa;
  --streams-t2:#a1a1aa;
  --streams-t3:#52525b;
  --streams-brand:#10b981;
  --streams-brand2:#14b8a6;
  --streams-font:'Inter',system-ui,sans-serif;
  --streams-mono:'JetBrains Mono',monospace;
  --streams-chat-scale: 1;
  --streams-chat-scale-mobile: 0.98;
}
.wp-root,.wpc-wrap{
  --wp-font: var(--streams-font) !important;
  --wp-mono: var(--streams-mono) !important;
}
.wpc-wrap,.wpc-wrap *{ font-family: var(--streams-font) !important; }
.wpc-wrap{ background: var(--streams-bg) !important; color: var(--streams-t1) !important; }

/* 3) Sidebar */
.wp-sb-section-label{ font-size:9px!important;font-weight:700!important;color:var(--streams-t3)!important;text-transform:uppercase!important }
.wp-sb-chat{ font-size:12px!important;color:var(--streams-t2)!important }
.wp-sb-chat.active{ background:rgba(16,185,129,.06)!important;color:var(--streams-brand)!important }

/* 4) Chat header */
.wpc-header-title,.chat-hd-title{ font-size:12px!important;font-weight:600!important }
.wpc-token-bar,.token-bar{ font-size:10px!important;font-family:var(--streams-mono)!important;color:var(--streams-t3)!important }

/* 5) Messages */
.wpc-txt{ font-size:calc(13px * var(--streams-chat-scale))!important;line-height:1.65!important;color:var(--streams-t2)!important;white-space:pre-wrap!important;word-break:break-word!important }
.wpc-msg{ margin-bottom:4px!important }
.wpc-msg .wpc-txt{ padding:10px 14px!important;border-radius:16px!important;max-width:75%!important }
.wpc-msg[data-role="user"] .wpc-txt,.msg.user .msg-bubble{ background:linear-gradient(135deg,#10b981,#14b8a6)!important;color:#fff!important;border-bottom-right-radius:4px!important }
.wpc-msg[data-role="assistant"] .wpc-txt,.msg.ai .msg-bubble{ background:var(--streams-bg3)!important;color:var(--streams-t2)!important;border:1px solid rgba(255,255,255,.06)!important;border-bottom-left-radius:4px!important }
.wpc-role{ font-size:calc(9px * var(--streams-chat-scale))!important;font-weight:700!important;letter-spacing:.5px!important;text-transform:uppercase!important }
.wpc-role-ai{ color:var(--streams-brand)!important }
.wpc-role-u{ color:var(--streams-t3)!important }
.wpc-time,.msg-time{ font-size:9px!important;color:var(--streams-t3)!important }
.wpc-txt code,.msg-bubble code{ font-family:var(--streams-mono)!important;font-size:calc(11px * var(--streams-chat-scale))!important;color:var(--streams-brand)!important;background:rgba(16,185,129,.06)!important;padding:1px 4px!important;border-radius:4px!important }
.wpc-txt .wpc-status,.wpc-txt .preview-hint{ font-size:calc(11px * var(--streams-chat-scale))!important;color:var(--streams-t3)!important }

/* 6) Input */
.wpc-input{ font-size:calc(13px * var(--streams-chat-scale))!important;color:var(--streams-t1)!important }
.wpc-input::placeholder{ color:var(--streams-t3)!important }
.wpc-input-wrap{ background:var(--streams-bg3)!important;border-radius:12px!important;padding:8px 12px!important;min-height:42px!important }
.wpc-send{ background:var(--streams-brand)!important;color:#fff!important;font-size:12px!important;font-weight:600!important;width:28px!important;height:28px!important;border-radius:8px!important }
.wpc-pill{ font-size:calc(10px * var(--streams-chat-scale))!important;padding:4px 10px!important;border-radius:6px!important;font-weight:700!important }
.wpc-btn{ font-size:calc(10px * var(--streams-chat-scale))!important;padding:4px 10px!important;border-radius:6px!important;font-weight:700!important }
.wpc-avt{ width:24px!important;height:24px!important;border-radius:8px!important;font-size:10px!important }
.wpc-files-badge{ font-size:9px!important;font-family:var(--streams-mono)!important }
.wpc-thinking{ font-size:10px!important;color:var(--streams-brand2)!important }
.wpc-empty-title{ font-size:15px!important;font-weight:800!important }

/* 7) Preview */
.wp-pbtn,.pv-tab{ font-size:10px!important;font-weight:500!important;color:var(--streams-t3)!important }
.pv-tab.on{ background:var(--streams-brand)!important;color:#fff!important }
.pv-console,.wpc-console{ font-family:var(--streams-mono)!important;font-size:10px!important;color:var(--streams-t3)!important }

/* Scrollbars */
.wp-root ::-webkit-scrollbar,.wpc-wrap ::-webkit-scrollbar{ width:5px!important;height:5px!important }
.wp-root ::-webkit-scrollbar-thumb,.wpc-wrap ::-webkit-scrollbar-thumb{ background:var(--streams-bg4)!important;border-radius:3px!important }
.wp-root ::selection,.wpc-wrap ::selection{ background:rgba(16,185,129,.3)!important }

/* iPhone separate */
@media (max-width:430px),(pointer:coarse){
  .wpc-txt{ font-size:calc(13px * var(--streams-chat-scale-mobile))!important;line-height:1.65!important }
  .wpc-input{ font-size:calc(13px * var(--streams-chat-scale-mobile))!important }
  .wpc-pill,.wpc-btn{ font-size:calc(10px * var(--streams-chat-scale-mobile))!important }
  .wpc-role{ font-size:calc(9px * var(--streams-chat-scale-mobile))!important }
  .wpc-msg .wpc-txt,.msg-bubble{ max-width:88%!important;padding:9px 12px!important;border-radius:14px!important }
  .wpc-msgs{ padding-left:12px!important;padding-right:12px!important }
  .wpc-header,.chat-hd{ height:42px!important }
  .wpc-input-area{ padding:8px 10px!important }
  .wpc-input-wrap{ padding:6px 10px!important;min-height:38px!important }
}
@media (max-height:740px) and (max-width:430px){
  .wpc-header,.chat-hd{ height:38px!important }
  .wpc-msgs{ padding-top:8px!important;padding-bottom:8px!important }
}
`

export function WPChatThemeOverride() {
  useEffect(() => {
    const ensureFontLink = (href: string) => {
      const existing = document.querySelector(`link[href="${href}"]`)
      if (existing) return
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      document.head.appendChild(link)
    }
    ensureFontLink(
      'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap'
    )
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
    if (!style) {
      style = document.createElement('style')
      style.id = STYLE_ID
      document.head.appendChild(style)
    }
    style.textContent = CSS
    const savedDesktop = window.localStorage.getItem('streams-chat-scale')
    if (savedDesktop) {
      const n = Number(savedDesktop)
      if (Number.isFinite(n)) document.documentElement.style.setProperty('--streams-chat-scale', String(n))
    }
    const savedMobile = window.localStorage.getItem('streams-chat-scale-mobile')
    if (savedMobile) {
      const n = Number(savedMobile)
      if (Number.isFinite(n)) document.documentElement.style.setProperty('--streams-chat-scale-mobile', String(n))
    }
  }, [])
  return null
}
