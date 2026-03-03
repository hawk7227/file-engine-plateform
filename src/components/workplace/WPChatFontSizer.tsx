'use client'

import { useEffect, useMemo, useState } from 'react'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

const isMobileNow = () =>
  window.matchMedia('(max-width: 430px), (pointer: coarse)').matches

const KEY_DESKTOP = 'streams-chat-scale'
const KEY_MOBILE = 'streams-chat-scale-mobile'
const VAR_DESKTOP = '--streams-chat-scale'
const VAR_MOBILE = '--streams-chat-scale-mobile'

function readScale(key: string, fallback: number) {
  const raw = window.localStorage.getItem(key)
  const n = raw ? Number(raw) : NaN
  return Number.isFinite(n) ? n : fallback
}

function applyScale(cssVar: string, key: string, v: number) {
  const clamped = clamp(Number(v.toFixed(2)), 0.8, 1.35)
  document.documentElement.style.setProperty(cssVar, String(clamped))
  window.localStorage.setItem(key, String(clamped))
  return clamped
}

export function WPChatFontSizer() {
  const [scale, setScale] = useState<number>(1)
  const [mode, setMode] = useState<'desktop' | 'mobile'>('desktop')

  const api = useMemo(() => {
    const getTarget = () => {
      const mobile = isMobileNow()
      return mobile
        ? { cssVar: VAR_MOBILE, key: KEY_MOBILE, mode: 'mobile' as const }
        : { cssVar: VAR_DESKTOP, key: KEY_DESKTOP, mode: 'desktop' as const }
    }

    const apply = (next: number) => {
      const t = getTarget()
      setMode(t.mode)
      const v = applyScale(t.cssVar, t.key, next)
      setScale(v)
    }

    return {
      inc: () => apply(scale + 0.05),
      dec: () => apply(scale - 0.05),
      reset: () => apply(1),
      apply,
      refreshMode: () => {
        const t = getTarget()
        setMode(t.mode)
        const v = readScale(t.key, 1)
        const applied = applyScale(t.cssVar, t.key, v)
        setScale(applied)
      },
    }
  }, [scale])

  useEffect(() => {
    // Load correct scale for current device
    const mobile = isMobileNow()
    setMode(mobile ? 'mobile' : 'desktop')

    const v = mobile ? readScale(KEY_MOBILE, 0.98) : readScale(KEY_DESKTOP, 1)
    const applied = mobile
      ? applyScale(VAR_MOBILE, KEY_MOBILE, v)
      : applyScale(VAR_DESKTOP, KEY_DESKTOP, v)

    setScale(applied)

    // Keyboard shortcuts: Ctrl/Cmd + = / - / 0
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return

      if (e.key === '=' || e.key === '+') {
        e.preventDefault()
        api.inc()
      } else if (e.key === '-') {
        e.preventDefault()
        api.dec()
      } else if (e.key === '0') {
        e.preventDefault()
        api.reset()
      }
    }

    // If the viewport changes (rotate / resize), refresh which scale we’re controlling
    const onResize = () => api.refreshMode()

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onResize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        right: 14,
        bottom: 14,
        zIndex: 9999,
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        padding: '8px 10px',
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,.12)',
        background: 'rgba(17,17,20,.85)',
        backdropFilter: 'blur(10px)',
        color: '#fafafa',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
      aria-label="Chat font size controls"
    >
      <div style={{ fontSize: 10, color: 'rgba(161,161,170,.9)', marginRight: 6 }}>
        {mode === 'mobile' ? 'iPhone' : 'Desktop'}
      </div>

      <button
        onClick={api.dec}
        style={{
          height: 28,
          padding: '0 10px',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,.12)',
          background: 'transparent',
          color: '#a1a1aa',
          cursor: 'pointer',
          fontWeight: 600,
        }}
        title="Decrease font size (Ctrl/Cmd + -)"
      >
        A−
      </button>

      <button
        onClick={api.reset}
        style={{
          height: 28,
          padding: '0 10px',
          borderRadius: 8,
          border: '1px solid rgba(16,185,129,.25)',
          background: 'rgba(16,185,129,.12)',
          color: '#10b981',
          cursor: 'pointer',
          fontWeight: 700,
        }}
        title="Reset font size (Ctrl/Cmd + 0)"
      >
        {Math.round(scale * 100)}%
      </button>

      <button
        onClick={api.inc}
        style={{
          height: 28,
          padding: '0 10px',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,.12)',
          background: 'transparent',
          color: '#a1a1aa',
          cursor: 'pointer',
          fontWeight: 600,
        }}
        title="Increase font size (Ctrl/Cmd + =)"
      >
        A+
      </button>
    </div>
  )
}