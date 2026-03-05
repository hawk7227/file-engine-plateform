'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import type { DevicePreset } from './WorkplaceLayout'
import { injectInspector } from '@/lib/preview-assembler'
import { WPVisualEditor } from './WPVisualEditor'
import type { ElementEdit } from './WPVisualEditor'

// ============================================
// CSS — Docked layout: phone centered in panel via flexbox
// No floating/absolute phone. No drag-to-position on phone.
// Browser window is the only floating element.
// ============================================

const CANVAS_CSS = `
.wp-canvas{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;overflow:auto;background:var(--wp-bg-0);background-image:radial-gradient(circle at 50% 40%,rgba(18,28,18,.2),var(--wp-bg-0) 70%);padding:16px;gap:8px}
.wp-phone-wrap{display:flex;flex-direction:column;align-items:center;flex-shrink:0;transform-origin:center center;transition:transform .18s ease}
.wp-phone{position:relative;border:14px solid #1c1c1e;box-shadow:inset 0 0 0 2px #3a3a3c,0 0 0 2px #3a3a3c,0 20px 50px rgba(0,0,0,.45);background:#000;overflow:hidden;display:flex;flex-direction:column;transition:width .22s ease,height .22s ease}
.wp-phone-di{position:absolute;z-index:10;width:126px;height:37px;background:#000;border-radius:20px;top:12px;left:50%;transform:translateX(-50%);display:flex;align-items:center;justify-content:center}
.wp-phone-di .cam{width:10px;height:10px;border-radius:50%;background:#1a1a2e;border:1px solid #2a2a3e}
.wp-phone-hb{position:absolute;z-index:10;width:58px;height:58px;border:4px solid #3a3a3c;border-radius:50%;bottom:8px;left:50%;transform:translateX(-50%)}
.wp-phone-screen{flex:1;overflow:hidden;position:relative;background:#000}
.wp-phone-iframe{width:100%;height:100%;border:none}
.wp-hindicator{position:absolute;z-index:20;width:134px;height:5px;border-radius:3px;background:rgba(255,255,255,.15);bottom:8px;left:50%;transform:translateX(-50%)}
.wp-dlabel{text-align:center;margin-top:8px;font-family:var(--wp-mono);font-size:clamp(7px,1.2vw,9px);color:var(--wp-text-4)}
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
.wp-iframe-error button{padding:4px 12px;border-radius:6px;font-size:9px;font-weight:700;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.2);color:var(--wp-red);cursor:pointer;font-family:var(--wp-font);margin:0 3px}
.wp-iframe-error .err-code{padding:4px 12px;border-radius:6px;font-size:9px;font-weight:700;background:rgba(96,165,250,.1);border:1px solid rgba(96,165,250,.2);color:var(--wp-blue);cursor:pointer;font-family:var(--wp-font)}
.wp-statusbar{position:absolute;top:0;left:0;right:0;z-index:15;height:47px;display:flex;align-items:flex-start;justify-content:space-between;padding:14px 24px 0;pointer-events:none;font-family:-apple-system,sans-serif;font-size:12px;font-weight:600;letter-spacing:-.2px}
.wp-statusbar.sb-dark{color:#fff}.wp-statusbar.sb-light{color:#000}
.wp-sb-left{display:flex;align-items:center;gap:1px}
.wp-sb-right{display:flex;align-items:center;gap:5px}
.wp-sb-signal{display:flex;gap:1px;align-items:flex-end}.wp-sb-signal span{width:3px;border-radius:1px;background:currentColor}
.wp-sb-batt{width:22px;height:10px;border:1px solid currentColor;border-radius:2px;position:relative;display:flex;align-items:center;padding:1px}
.wp-sb-batt::after{content:'';position:absolute;right:-3px;top:2px;width:2px;height:5px;background:currentColor;border-radius:0 1px 1px 0;opacity:.4}
.wp-sb-batt-fill{flex:1;height:100%;border-radius:1px;background:currentColor}
.wp-browser{position:absolute;border-radius:10px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.04);background:var(--wp-bg-2);display:flex;flex-direction:column;z-index:10;touch-action:none}
.wp-browser-tb{display:flex;align-items:center;height:38px;background:#1e1e24;padding:0 12px;gap:10px;flex-shrink:0;cursor:grab;user-select:none;touch-action:none}
.wp-traffic{display:flex;gap:6px;flex-shrink:0}.wp-traffic span{width:10px;height:10px;border-radius:50%;cursor:pointer}
.t-r{background:#ff5f57;border:1px solid #e0443e}.t-y{background:#febc2e;border:1px solid #dea123}.t-g{background:#28c840;border:1px solid #1aab29}
.wp-browser-nav{display:flex;gap:6px;font-size:12px;color:#555;flex-shrink:0}
.wp-browser-url{flex:1;display:flex;align-items:center;background:#0c0c12;border:1px solid var(--wp-border);border-radius:6px;padding:4px 10px;font-size:10px;color:var(--wp-text-3);font-family:var(--wp-mono);gap:4px}
.wp-browser-url .lk{color:var(--wp-accent);font-size:9px}
.wp-browser-iframe{flex:1;border:none;width:100%}
.wp-browser-close{position:absolute;top:8px;right:8px;width:20px;height:20px;border-radius:4px;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.2);color:var(--wp-red);font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s;z-index:5}
.wp-browser:hover .wp-browser-close{opacity:1}
.wp-browser-resize{position:absolute;bottom:0;right:0;width:16px;height:16px;cursor:nwse-resize;z-index:5;display:flex;align-items:flex-end;justify-content:flex-end;color:var(--wp-text-4);font-size:10px;padding:1px 3px;touch-action:none}
@keyframes wp-si{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
`

// ============================================
// THEME CSS INJECTION
// ============================================
function wrapWithTheme(html: string, theme: 'dark' | 'light'): string {
  const themeCSS = theme === 'dark'
    ? 'html,body{background:#111;color:#eee}a{color:#60a5fa}'
    : 'html,body{background:#fff;color:#111}a{color:#2563eb}'
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
  onClosePreview?: () => void
  onFallbackToCode?: () => void
  onElementClick?: (component: string | null, tag: string) => void
  onCommitEdits?: (edits: ElementEdit[]) => void
}

export function WPPreviewCanvas({
  activeDevice, showBrowser, zoom, previewUrl, previewHtml,
  rotated, theme, refreshKey, onCloseBrowser, onFallbackToCode, onElementClick, onCommitEdits,
}: Props) {
  const phoneIframeRef = useRef<HTMLIFrameElement>(null)
  const browserIframeRef = useRef<HTMLIFrameElement>(null)
  const [browserSize, setBrowserSize] = useState({ w: 640, h: 440 })
  const [browserPos, setBrowserPos] = useState({ x: 40, y: 40 })
  const [iframeStatus, setIframeStatus] = useState<'empty' | 'loading' | 'live' | 'error'>('empty')
  const [iframeError, setIframeError] = useState<string | null>(null)
  const [visualEditorOpen, setVisualEditorOpen] = useState(false)

  // Compute dimensions with rotation
  const baseW = activeDevice.cssViewport.width
  const baseH = activeDevice.cssViewport.height
  const vw = rotated ? baseH : baseW
  const vh = rotated ? baseW : baseH
  const phoneRadius = rotated ? Math.max(18, activeDevice.borderRadius - 10) : activeDevice.borderRadius
  const screenRadius = Math.max(0, phoneRadius - 14)

  const themedHtml = previewHtml ? injectInspector(wrapWithTheme(previewHtml, theme)) : null

  const toggleVisualEditor = useCallback(() => {
    setVisualEditorOpen(prev => {
      const next = !prev
      const msg = next ? 'fe-activate-inspector' : 'fe-deactivate-inspector'
      phoneIframeRef.current?.contentWindow?.postMessage({ type: msg }, '*')
      browserIframeRef.current?.contentWindow?.postMessage({ type: msg }, '*')
      return next
    })
  }, [])

  // Auto-refresh iframes when content or refreshKey changes
  // Uses document.open/write/close instead of srcdoc to preserve scroll position
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
        // Hot reload: write directly to iframe document instead of replacing srcdoc
        // This preserves scroll position and doesn't destroy the browsing context
        try {
          const doc = frame.contentDocument
          if (doc) {
            doc.open()
            doc.write(themedHtml)
            doc.close()
          } else {
            // Fallback to srcdoc if contentDocument not accessible (cross-origin)
            frame.srcdoc = themedHtml
          }
        } catch {
          // Fallback for security restrictions
          frame.srcdoc = themedHtml
        }
      }
    })

    const timer = setTimeout(() => {
      setIframeStatus('live')
      if (visualEditorOpen) {
        phoneIframeRef.current?.contentWindow?.postMessage({ type: 'fe-activate-inspector' }, '*')
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [themedHtml, previewUrl, refreshKey])

  // Iframe error listeners
  useEffect(() => {
    const frame = phoneIframeRef.current
    if (!frame) return
    const onError = () => {
      setIframeStatus('error')
      setIframeError('Preview failed to load.')
    }
    frame.addEventListener('error', onError)
    return () => frame.removeEventListener('error', onError)
  }, [])

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'wp-iframe-error') {
        setIframeStatus('error')
        setIframeError(e.data.message || 'Runtime error in preview')
      }
      if (e.data?.type === 'fe-click-edit') {
        onElementClick?.(e.data.component || null, e.data.tag || '')
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onElementClick])

  // Browser drag — pointer capture guarantees mouseup even over iframes
  const onBrowserDragDown = useCallback((e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement
    const startX = e.clientX - browserPos.x
    const startY = e.clientY - browserPos.y
    el.setPointerCapture(e.pointerId)
    const onMove = (ev: PointerEvent) => {
      setBrowserPos({ x: ev.clientX - startX, y: ev.clientY - startY })
    }
    const onUp = () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
  }, [browserPos])

  // Browser resize — pointer capture
  const onBrowserResizeDown = useCallback((e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement
    const sw = browserSize.w, sh = browserSize.h, sx = e.clientX, sy = e.clientY
    el.setPointerCapture(e.pointerId)
    e.stopPropagation()
    const onMove = (ev: PointerEvent) => {
      setBrowserSize({ w: Math.max(320, sw + (ev.clientX - sx)), h: Math.max(240, sh + (ev.clientY - sy)) })
    }
    const onUp = () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
  }, [browserSize])

  // Status bar clock
  const [clockTime, setClockTime] = useState('')
  useEffect(() => {
    const tick = () => setClockTime(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [])

  const hasContent = !!(previewUrl || previewHtml)
  const iframeSrc = previewUrl || undefined
  const showDI = activeDevice.frameType === 'phone-dynamic-island' && !rotated
  const showHB = activeDevice.frameType === 'phone-home-button' && !rotated
  const showHomeInd = activeDevice.frameType !== 'phone-home-button'
  const showStatusBar = !rotated && activeDevice.frameType !== 'phone-home-button'
  const sbColorClass = theme === 'dark' ? 'sb-dark' : 'sb-light'

  return (
    <>
      <style>{CANVAS_CSS}</style>
      <div className="wp-canvas">
        {/* PHONE — centered via flexbox parent, scaled via transform */}
        {/* Edit button — floats top-left of canvas */}
        {hasContent && (
          <button
            onClick={toggleVisualEditor}
            style={{
              position: 'absolute', top: 12, left: 12, zIndex: 50,
              padding: '5px 12px', borderRadius: 8,
              background: visualEditorOpen ? '#00f5a0' : 'rgba(0,0,0,.7)',
              color: visualEditorOpen ? '#000' : '#00f5a0',
              border: '1px solid rgba(0,245,160,.3)',
              font: '700 11px/20px monospace',
              cursor: 'pointer', backdropFilter: 'blur(8px)',
              transition: 'all .15s',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            {visualEditorOpen ? '✕ Exit Edit' : '✏ Edit'}
          </button>
        )}

        <div className="wp-phone-wrap" style={{ transform: `scale(${zoom})` }}>
          <div className="wp-phone" style={{ width: vw, height: vh, borderRadius: phoneRadius }}>
            {showDI && <div className="wp-phone-di"><div className="cam" /></div>}
            {showHB && <div className="wp-phone-hb" />}
            {showStatusBar && (
              <div className={`wp-statusbar ${sbColorClass}`}>
                <div className="wp-sb-left">{clockTime}</div>
                <div className="wp-sb-right">
                  <div className="wp-sb-signal">
                    <span style={{ height: 4 }} /><span style={{ height: 6 }} /><span style={{ height: 8 }} /><span style={{ height: 10 }} />
                  </div>
                  <span style={{ fontSize: 10 }}>5G</span>
                  <div className="wp-sb-batt"><div className="wp-sb-batt-fill" style={{ width: '80%' }} /></div>
                </div>
              </div>
            )}
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
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => {
                          setIframeError(null)
                          setIframeStatus('loading')
                          if (phoneIframeRef.current && themedHtml) {
                            try {
                              const doc = phoneIframeRef.current.contentDocument
                              if (doc) { doc.open(); doc.write(themedHtml); doc.close() }
                              else { phoneIframeRef.current.srcdoc = themedHtml }
                            } catch { phoneIframeRef.current.srcdoc = themedHtml }
                          }
                        }}>Retry</button>
                        {onFallbackToCode && (
                          <button className="err-code" onClick={onFallbackToCode}>View Code</button>
                        )}
                      </div>
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

        {/* BROWSER WINDOW — floating, draggable via pointer capture */}
        {showBrowser && (
          <div
            className="wp-browser"
            style={{ position: 'absolute', left: browserPos.x, top: browserPos.y, width: browserSize.w, height: browserSize.h }}
          >
            <div className="wp-browser-close" onClick={onCloseBrowser}>✕</div>
            <div className="wp-browser-tb" onPointerDown={onBrowserDragDown}>
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
            <div className="wp-browser-resize" onPointerDown={onBrowserResizeDown}>⌟</div>
          </div>
        )}
      </div>

        {/* Visual editor panel — floats over canvas */}
        <WPVisualEditor
          iframeRef={phoneIframeRef}
          visible={visualEditorOpen}
          onClose={() => {
            setVisualEditorOpen(false)
            phoneIframeRef.current?.contentWindow?.postMessage({ type: 'fe-deactivate-inspector' }, '*')
          }}
          onCommitEdits={onCommitEdits}
        />
    </>
  )
}
