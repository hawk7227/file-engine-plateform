'use client'

import { useEffect } from 'react'

const STYLE_ID = 'streamsai-chat-theme-override'

// Base theme + WP mappings + chat typography + iPhone rules
const CSS = `
/* -----------------------------------------------------------
   StreamsAI Chat Theme Override (late-injected)
   Goal: match demo colors, fonts, sizing WITHOUT touching WP files
----------------------------------------------------------- */

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

  /* Desktop font scaling (default) */
  --streams-chat-scale: 1;

  /* Mobile font scaling (separate) */
  --streams-chat-scale-mobile: 0.98;
}

/* ------------------------------
   Map Workplace theme vars -> Demo vars
   (WP files use --wp-* extensively)
------------------------------ */
.wp-root,
.wpc-wrap{
  --wp-bg-0: var(--streams-bg) !important;
  --wp-bg-1: var(--streams-bg2) !important;
  --wp-bg-2: var(--streams-bg2) !important;
  --wp-bg-3: var(--streams-bg3) !important;
  --wp-bg-4: var(--streams-bg4) !important;

  --wp-border: var(--streams-bdr) !important;
  --wp-border-2: var(--streams-bdr2) !important;

  --wp-text-1: var(--streams-t1) !important;
  --wp-text-2: var(--streams-t2) !important;
  --wp-text-3: var(--streams-t3) !important;
  --wp-text-4: var(--streams-t3) !important;

  --wp-accent: var(--streams-brand) !important;
  --wp-accent-dim: rgba(16,185,129,.08) !important;

  --wp-font: var(--streams-font) !important;
  --wp-mono: var(--streams-mono) !important;
}

/* Force Inter across the chat surface */
.wp-root, .wp-root *{
  font-family: var(--streams-font) !important;
}

.wpc-wrap{
  background: var(--streams-bg) !important;
  color: var(--streams-t1) !important;
}

/* ------------------------------
   Match the HTML demo message typography (DESKTOP)
------------------------------ */
.wpc-txt{
  font-size: calc(13px * var(--streams-chat-scale)) !important;
  line-height: 1.65 !important;
  color: var(--streams-t2) !important;
}

.wpc-role{
  font-size: calc(9px * var(--streams-chat-scale)) !important;
  letter-spacing: .5px !important;
}

.wpc-input{
  font-size: calc(13px * var(--streams-chat-scale)) !important;
  color: var(--streams-t1) !important;
}
.wpc-input::placeholder{
  color: var(--streams-t3) !important;
}

.wpc-pill, .wpc-btn{
  font-size: calc(10px * var(--streams-chat-scale)) !important;
}

/* scrollbars */
.wp-root ::-webkit-scrollbar,
.wpc-wrap ::-webkit-scrollbar{
  width: 5px !important;
  height: 5px !important;
}
.wp-root ::-webkit-scrollbar-thumb,
.wpc-wrap ::-webkit-scrollbar-thumb{
  background: var(--streams-bg4) !important;
  border-radius: 3px !important;
}

/* selection */
.wp-root ::selection,
.wpc-wrap ::selection{
  background: rgba(16,185,129,.3) !important;
}

/* -----------------------------------------------------------
   iPhone / small-screen adjustments (SEPARATE)
   prevents the “cramped like your screenshot” effect
----------------------------------------------------------- */
@media (max-width: 430px), (pointer:coarse) {
  .wpc-txt{
    font-size: calc(13px * var(--streams-chat-scale-mobile)) !important;
    line-height: 1.65 !important;
  }
  .wpc-input{
    font-size: calc(13px * var(--streams-chat-scale-mobile)) !important;
  }
  .wpc-pill, .wpc-btn{
    font-size: calc(10px * var(--streams-chat-scale-mobile)) !important;
  }

  /* give bubbles breathing room */
  .wpc-msg-bubble,
  .msg-bubble{
    max-width: 88% !important;
    padding: 9px 12px !important;
    border-radius: 14px !important;
  }

  /* reduce edge padding */
  .wpc-msgs,
  .msgs{
    padding-left: 12px !important;
    padding-right: 12px !important;
  }

  /* compact header/input */
  .wpc-header,
  .chat-hd{
    height: 42px !important;
  }

  .wpc-input-row,
  .chat-input{
    padding: 10px 12px !important;
  }
}

@media (max-height: 740px) and (max-width: 430px) {
  .wpc-header,
  .chat-hd{
    height: 38px !important;
  }
  .wpc-msgs,
  .msgs{
    padding-top: 10px !important;
    padding-bottom: 10px !important;
  }
}
`

export function WPChatThemeOverride() {
  useEffect(() => {
    // Ensure Inter + JetBrains Mono are available
    const ensureFontLink = (href: string) => {
      const existing = document.querySelector(`link[href="${href}"]`)
      if (existing) return
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      document.head.appendChild(link)
    }

    ensureFontLink(
      'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'
    )

    // Inject CSS as the last style tag (wins)
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
    if (!style) {
      style = document.createElement('style')
      style.id = STYLE_ID
      document.head.appendChild(style)
    }
    style.textContent = CSS

    // Restore saved desktop scale
    const savedDesktop = window.localStorage.getItem('streams-chat-scale')
    if (savedDesktop) {
      const n = Number(savedDesktop)
      if (Number.isFinite(n)) {
        document.documentElement.style.setProperty('--streams-chat-scale', String(n))
      }
    }

    // Restore saved mobile scale
    const savedMobile = window.localStorage.getItem('streams-chat-scale-mobile')
    if (savedMobile) {
      const n = Number(savedMobile)
      if (Number.isFinite(n)) {
        document.documentElement.style.setProperty('--streams-chat-scale-mobile', String(n))
      }
    }
  }, [])

  return null
}