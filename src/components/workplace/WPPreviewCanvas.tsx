'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import type { DevicePreset } from './WorkplaceLayout'

// ============================================
// CSS
// ============================================

const CANVAS_CSS = `
.wp-canvas{flex:1;position:relative;overflow:hidden;background:var(--wp-bg-0);background-image:radial-gradient(circle at 50% 40%,rgba(18,28,18,.3),var(--wp-bg-0) 70%)}
.wp-device{position:absolute;cursor:grab;z-index:2}.wp-device:active{cursor:grabbing}
.wp-phone{position:relative;border:14px solid #1c1c1e;box-shadow:inset 0 0 0 2px #3a3a3c,0 0 0 2px #3a3a3c,0 30px 60px rgba(0,0,0,.5);background:#000;overflow:hidden;display:flex;flex-direction:column;transition:width .22s ease,height .22s ease}
.wp-phone-di{position:absolute;z-index:10;width:126px;height:37px;background:#000;border-radius:20px;top:12px;left:50%;transform:translateX(-50%);display:flex;align-items:center;justify-content:center}
.wp-phone-di .cam{width:10px;height:10px;border-radius:50%;background:#1a1a2e;border:1px solid #2a2a3e}
.wp-phone-hb{position:absolute;z-index:10;width:58px;height:58px;border:4px solid #3a3a3c;border-radius:50%;bottom:8px;left:50%;transform:translateX(-50%)}
.wp-phone-screen{flex:1;overflow:hidden;position:relative;background:#000}
.wp-phone-iframe{width:100%;height:100%;border:none}
.wp-hindicator{position:absolute;z-index:20;width:134px;height:5px;border-radius:3px;background:rgba(255,255,255,.15);bottom:8px;left:50%;transform:translateX(-50%)}
.wp-dlabel{text-align:center;margin-top:8px;font-family:var(--wp-mono);font-size:9px;color:var(--wp-text-4)}
.wp-empty-preview{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--wp-text-4);font-size:11px;gap:8px;text-align:center;padding:24px}
.wp-empty-preview .ep-icon{font-size:32px;opacity:.3;margin-bottom:4px}
.wp-empty-preview .ep-title{font-size:12px;font-weight:700;color:var(--wp-text-3)}
.wp-badge{position:absolute;top:6px;right:6px;z-index:30;padding:2px 8px;border-radius:6px;font-size:8px;font-weight:700;font-family:var(--wp-mono);backdrop-filter:blur(8px);animation:wp-si .25s ease}
.wp-badge.live{background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.2);color:var(--wp-accent)}
.wp-badge.loading{background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.2);color:var(--wp-blue)}
.wp-badge.error{background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.2);color:var(--wp-red)}
.wp-iframe-error{position:absolute;inset:0;z-index:25;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,.85);color:var(--wp-red);font-size:11px;padding:20px;text-align:center;gap:8px;backdrop-filter:blur(4px)}
.wp-iframe-error .err-title{font-size:13px;font-weight:700}
.wp-iframe-error .err-msg{font-size:10px;color:var(--wp-text-3);font-family:var(--wp-mono);max-width:280px;word-break:break-word}
.wp-iframe-error button{padding:4px 12px;border-radius:6px;font-size:9px;font-weight:700;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.2);color:var(--wp-red);cursor:pointer;font-family:var(--wp-font)}
.wp-browser{position:absolute;cursor:grab;border-radius:10px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.04);background:var(--wp-bg-2);display:flex;flex-direction:column;z-index:3}
.wp-browser:active{cursor:grabbing}
.wp-browser-tb{display:flex;align-items:center;height:38px;background:#1e1e24;padding:0 12px;gap:10px;flex-shrink:0;cursor:grab;user-select:none}
.wp-traffic{display:flex;gap:6px;flex-shrink:0}.wp-traffic span{width:10px;height:10px;border-radius:50%;cursor:pointer}
.t-r{background:#ff5f57;border:1px solid #e0443e}.t-y{background:#febc2e;border:1px solid #dea123}.t-g{background:#28c840;border:1px solid #1aab29}
.wp-browser-nav{display:flex;gap:6px;font-size:12px;color:#555;flex-shrink:0}
.wp-browser-url{flex:1;display:flex;align-items:center;background:#0c0c12;border:1px solid var(--wp-border);border-radius:6px;padding:4px 10px;font-size:10px;color:var(--wp-text-3);font-family:var(--wp-mono);gap:4px}
.wp-browser-url .lk{color:var(--wp-accent);font-size:9px}
.wp-browser-iframe{flex:1;border:none;width:100%}
.wp-browser-close{position:absolute;top:8px;right:8px;width:20px;height:20px;border-radius:4px;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.2);color:var(--wp-red);font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s;z-index:5}
.wp-browser:hover .wp-browser-close{opacity:1}
.wp-browser-resize{position:absolute;bottom:0;right:0;width:16px;height:16px;cursor:nwse-resize;z-index:5;display:flex;align-items:flex-end;justify-content:flex-end;color:var(--wp-text-4);font-size:10px;padding:1px 3px}
@keyframes wp-si{from{transform:translateX(20px);opacity:0}to{transform:none;opacity:1}}
`

// ============================================
// DRAGGABLE HOOK
// ============================================
function useDraggable(ref: React.RefObject<HTMLDivElement | null>, handleSelector?: string) {
  const dragging = useRef(false)
  const offset = useRef({ x: 0, y: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handle = handleSelector ? el.querySelector(handleSelector) as HTMLElement : el
    const onDown = (e: MouseEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'IFRAME' || tag === 'INPUT' || tag === 'BUTTON') return
      dragging.current = true
      offset.current = { x: e.clientX - el.offsetLeft, y: e.clientY - el.offsetTop }
      e.preventDefault()
    }
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      el.style.left = (e.clientX - offset.current.x) + 'px'
      el.style.top = (e.clientY - offset.current.y) + 'px'
      el.style.transform = 'none'
    }
    const onUp = () => { dragging.current = false }
    if (handle) handle.addEventListener('mousedown', onDown)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      if (handle) handle.removeEventListener('mousedown', onDown)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [ref, handleSelector])
}

// ============================================
// THEME CSS INJECTION — wraps preview HTML with light/dark overrides
// ============================================
function wrapWithTheme(html: string, theme: 'dark' | 'light'): string {
  const themeCSS = theme === 'dark'
    ? 'html,body{background:#111;color:#eee}a{color:#60a5fa}'
    : 'html,body{background:#fff;color:#111}a{color:#2563eb}'
  // Inject theme CSS before closing </head> or at top of document
  if (html.includes('</head>')) {
    return html.replace('</head>', `<style data-wp-theme>${themeCSS}</style></head>`)
  }
  return `<style data-wp-theme>${themeCSS}</style>${html}`
}

// ============================================
// COMPONENT
// ============================================
interface Props {
  activeDevice: DevicePreset
  showBrowser: boolean
  zoom: number
  previewUrl: string | null
  previewHtml?: string | null
  rotated: boolean
  theme: 'dark' | 'light'
  refreshKey: number
  onCloseBrowser: () => void
}

export function WPPreviewCanvas({
  activeDevice, showBrowser, zoom, previewUrl, previewHtml,
  rotated, theme, refreshKey, onCloseBrowser,
}: Props) {
  const phoneRef = useRef<HTMLDivElement>(null)
  const browserRef = useRef<HTMLDivElement>(null)
  const phoneIframeRef = useRef<HTMLIFrameElement>(null)
  const browserIframeRef = useRef<HTMLIFrameElement>(null)
  const [browserSize, setBrowserSize] = useState({ w: 640, h: 440 })
  const [iframeStatus, setIframeStatus] = useState<'empty' | 'loading' | 'live' | 'error'>('empty')
  const [iframeError, setIframeError] = useState<string | null>(null)

  useDraggable(phoneRef)
  useDraggable(browserRef, '.wp-browser-tb')

  // Compute dimensions with rotation
  const baseW = activeDevice.cssViewport.width
  const baseH = activeDevice.cssViewport.height
  const vw = rotated ? baseH : baseW
  const vh = rotated ? baseW : baseH
  const phoneRadius = rotated ? Math.max(18, activeDevice.borderRadius - 10) : activeDevice.borderRadius
  const screenRadius = Math.max(0, phoneRadius - 14)

  // Themed HTML
  const themedHtml = previewHtml ? wrapWithTheme(previewHtml, theme) : null

  // Auto-refresh iframes when content or refreshKey changes
  useEffect(() => {
    if (!themedHtml && !previewUrl) {
      setIframeStatus('empty')
      setIframeError(null)
      return
    }
    setIframeStatus('loading')
    setIframeError(null)

    const frames = [phoneIframeRef.current, browserIframeRef.current].filter(Boolean)
    frames.forEach(frame => {
      if (!frame) return
      if (previewUrl) {
        frame.src = previewUrl
      } else if (themedHtml) {
        frame.srcdoc = themedHtml
      }
    })

    const timer = setTimeout(() => setIframeStatus('live'), 600)
    return () => clearTimeout(timer)
  }, [themedHtml, previewUrl, refreshKey])

  // Listen for iframe errors
  useEffect(() => {
    const frame = phoneIframeRef.current
    if (!frame) return
    const onError = () => {
      setIframeStatus('error')
      setIframeError('Preview failed to load. Check generated code for errors.')
    }
    frame.addEventListener('error', onError)
    return () => frame.removeEventListener('error', onError)
  }, [])

  // Capture iframe runtime errors via message
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'wp-iframe-error') {
        setIframeStatus('error')
        setIframeError(e.data.message || 'Runtime error in preview')
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // Browser resize
  const resizeRef = useRef(false)
  const startSize = useRef({ w: 0, h: 0 })
  const startMouse = useRef({ x: 0, y: 0 })
  const onBrowserResizeDown = useCallback((e: React.MouseEvent) => {
    resizeRef.current = true
    startSize.current = { w: browserSize.w, h: browserSize.h }
    startMouse.current = { x: e.clientX, y: e.clientY }
    e.preventDefault()
    e.stopPropagation()
    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return
      setBrowserSize({
        w: Math.max(320, startSize.current.w + (ev.clientX - startMouse.current.x)),
        h: Math.max(240, startSize.current.h + (ev.clientY - startMouse.current.y)),
      })
    }
    const onUp = () => {
      resizeRef.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [browserSize])

  const hasContent = !!(previewUrl || previewHtml)
  const iframeSrc = previewUrl || undefined
  const showDI = activeDevice.frameType === 'phone-dynamic-island' && !rotated
  const showHB = activeDevice.frameType === 'phone-home-button' && !rotated
  const showHomeInd = activeDevice.frameType !== 'phone-home-button'

  return (
    <>
      <style>{CANVAS_CSS}</style>
      <div className="wp-canvas">
        {/* PHONE DEVICE */}
        <div ref={phoneRef} className="wp-device" style={{ left: '50%', top: '50%', transform: `translate(-50%, -50%) scale(${zoom})` }}>
          <div className="wp-phone" style={{ width: vw, height: vh, borderRadius: phoneRadius }}>
            {showDI && <div className="wp-phone-di"><div className="cam" /></div>}
            {showHB && <div className="wp-phone-hb" />}
            <div className="wp-phone-screen" style={{ borderRadius: screenRadius }}>
              {hasContent ? (
                <>
                  <iframe
                    ref={phoneIframeRef}
                    className="wp-phone-iframe"
                    src={iframeSrc}
                    srcDoc={!previewUrl ? (themedHtml || undefined) : undefined}
                    style={{ width: vw, height: vh, pointerEvents: 'auto', background: theme === 'dark' ? '#111' : '#fff' }}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                    title="Mobile Preview"
                  />
                  {iframeStatus !== 'empty' && (
                    <div className={`wp-badge ${iframeStatus}`}>
                      {iframeStatus === 'loading' ? '⏳ Loading' : iframeStatus === 'error' ? '✕ Error' : '● Live'}
                    </div>
                  )}
                  {iframeStatus === 'error' && iframeError && (
                    <div className="wp-iframe-error">
                      <div className="err-title">Preview Error</div>
                      <div className="err-msg">{iframeError}</div>
                      <button onClick={() => { setIframeError(null); setIframeStatus('loading') }}>Retry</button>
                    </div>
                  )}
                </>
              ) : (
                <div className="wp-empty-preview">
                  <div className="ep-icon">📱</div>
                  <div className="ep-title">No preview loaded</div>
                  <div>Generate code in Chat to see it here</div>
                </div>
              )}
            </div>
            {showHomeInd && <div className="wp-hindicator" />}
          </div>
          <div className="wp-dlabel">
            {activeDevice.name} · {vw}×{vh}{rotated ? ' (landscape)' : ''} · @{activeDevice.dpr}x
          </div>
        </div>

        {/* CHROME BROWSER WINDOW */}
        {showBrowser && (
          <div ref={browserRef} className="wp-browser" style={{ left: '60%', top: '8%', width: browserSize.w, height: browserSize.h }}>
            <div className="wp-browser-close" onClick={onCloseBrowser}>✕</div>
            <div className="wp-browser-tb">
              <div className="wp-traffic">
                <span className="t-r" onClick={onCloseBrowser} /><span className="t-y" /><span className="t-g" />
              </div>
              <div className="wp-browser-nav"><span style={{ opacity: .4 }}>‹</span> › ⟳</div>
              <div className="wp-browser-url"><span className="lk">🔒</span>{previewUrl || 'about:blank'}</div>
            </div>
            {hasContent ? (
              <iframe
                ref={browserIframeRef}
                className="wp-browser-iframe"
                src={iframeSrc}
                srcDoc={!previewUrl ? (themedHtml || undefined) : undefined}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                title="Desktop Preview"
                style={{ pointerEvents: 'auto', background: theme === 'dark' ? '#111' : '#fff' }}
              />
            ) : (
              <div className="wp-empty-preview" style={{ background: '#fff', color: '#999' }}>
                <div className="ep-icon">🌐</div>
                <div className="ep-title" style={{ color: '#666' }}>No content</div>
              </div>
            )}
            <div className="wp-browser-resize" onMouseDown={onBrowserResizeDown}>⌟</div>
          </div>
        )}
      </div>
    </>
  )
}
