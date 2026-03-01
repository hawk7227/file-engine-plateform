'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import type { DevicePreset } from './WorkplaceLayout'

// ============================================
// CSS for device frames
// ============================================

const CANVAS_CSS = `
.wp-canvas{flex:1;position:relative;overflow:hidden;background:var(--wp-bg-0);background-image:radial-gradient(circle at 50% 40%,rgba(18,28,18,.3),var(--wp-bg-0) 70%)}
.wp-device{position:absolute;cursor:grab;transition:filter .15s;z-index:2}.wp-device:active{cursor:grabbing}.wp-device:hover{filter:drop-shadow(0 0 24px rgba(52,211,153,.06))}
.wp-phone{position:relative;border:14px solid #1c1c1e;border-radius:55px;box-shadow:inset 0 0 0 2px #3a3a3c,0 0 0 2px #3a3a3c,0 30px 60px rgba(0,0,0,.5);background:#000;overflow:hidden;display:flex;flex-direction:column}
.wp-phone-di{position:absolute;z-index:10;width:126px;height:37px;background:#000;border-radius:20px;top:12px;left:50%;transform:translateX(-50%);display:flex;align-items:center;justify-content:center}
.wp-phone-di .cam{width:10px;height:10px;border-radius:50%;background:#1a1a2e;border:1px solid #2a2a3e}
.wp-phone-screen{flex:1;border-radius:41px;overflow:hidden;position:relative;background:#000}
.wp-phone-iframe{width:100%;height:100%;border:none;background:#fff}
.wp-hindicator{position:absolute;z-index:20;width:134px;height:5px;border-radius:3px;background:rgba(255,255,255,.15);bottom:8px;left:50%;transform:translateX(-50%)}
.wp-dlabel{text-align:center;margin-top:8px;font-family:var(--wp-mono);font-size:9px;color:var(--wp-text-4)}
.wp-browser{position:absolute;cursor:grab;border-radius:10px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.04);background:var(--wp-bg-2);display:flex;flex-direction:column;z-index:3}
.wp-browser:active{cursor:grabbing}
.wp-browser-tb{display:flex;align-items:center;height:38px;background:#1e1e24;padding:0 12px;gap:10px;flex-shrink:0;cursor:grab;user-select:none}
.wp-traffic{display:flex;gap:6px;flex-shrink:0}.wp-traffic span{width:10px;height:10px;border-radius:50%;cursor:pointer}
.t-r{background:#ff5f57;border:1px solid #e0443e}.t-y{background:#febc2e;border:1px solid #dea123}.t-g{background:#28c840;border:1px solid #1aab29}
.wp-browser-nav{display:flex;gap:6px;font-size:12px;color:#555;flex-shrink:0}
.wp-browser-url{flex:1;display:flex;align-items:center;background:#0c0c12;border:1px solid var(--wp-border);border-radius:6px;padding:4px 10px;font-size:10px;color:var(--wp-text-3);font-family:var(--wp-mono);gap:4px}
.wp-browser-url .lk{color:var(--wp-accent);font-size:9px}
.wp-browser-iframe{flex:1;border:none;width:100%;background:#fff}
.wp-browser-close{position:absolute;top:8px;right:8px;width:20px;height:20px;border-radius:4px;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.2);color:var(--wp-red);font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s;z-index:5}
.wp-browser:hover .wp-browser-close{opacity:1}
.wp-browser-resize{position:absolute;bottom:0;right:0;width:16px;height:16px;cursor:nwse-resize;z-index:5;display:flex;align-items:flex-end;justify-content:flex-end;color:var(--wp-text-4);font-size:10px;padding:1px 3px}
`

// ============================================
// DRAGGABLE MIXIN
// ============================================

function useDraggable(ref: React.RefObject<HTMLDivElement | null>, handleSelector?: string) {
  const dragging = useRef(false)
  const offset = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const handle = handleSelector ? el.querySelector(handleSelector) as HTMLElement : el

    const onDown = (e: MouseEvent) => {
      // Don't drag from iframes or interactive elements
      if ((e.target as HTMLElement).tagName === 'IFRAME' || (e.target as HTMLElement).tagName === 'INPUT') return
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

    if (handle) {
      handle.addEventListener('mousedown', onDown)
    }
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
// COMPONENT
// ============================================

interface Props {
  activeDevice: DevicePreset
  showBrowser: boolean
  zoom: number
  previewUrl: string | null
  onCloseBrowser: () => void
}

export function WPPreviewCanvas({ activeDevice, showBrowser, zoom, previewUrl, onCloseBrowser }: Props) {
  const phoneRef = useRef<HTMLDivElement>(null)
  const browserRef = useRef<HTMLDivElement>(null)
  const [browserSize, setBrowserSize] = useState({ w: 640, h: 440 })

  useDraggable(phoneRef)
  useDraggable(browserRef, '.wp-browser-tb')

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
      const nw = Math.max(320, startSize.current.w + (ev.clientX - startMouse.current.x))
      const nh = Math.max(240, startSize.current.h + (ev.clientY - startMouse.current.y))
      setBrowserSize({ w: nw, h: nh })
    }
    const onUp = () => {
      resizeRef.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [browserSize])

  const iframeSrc = previewUrl || 'about:blank'
  const { width: vw, height: vh } = activeDevice.cssViewport

  return (
    <>
      <style>{CANVAS_CSS}</style>
      <div className="wp-canvas">
        {/* PHONE DEVICE */}
        <div
          ref={phoneRef}
          className="wp-device"
          style={{ left: '50%', top: '50%', transform: `translate(-50%, -50%) scale(${zoom})` }}
        >
          <div className="wp-phone" style={{ width: vw, height: vh, borderRadius: 55 }}>
            {activeDevice.frameType === 'phone-dynamic-island' && (
              <div className="wp-phone-di"><div className="cam" /></div>
            )}
            <div className="wp-phone-screen">
              <iframe
                className="wp-phone-iframe"
                src={iframeSrc}
                style={{ width: vw, height: vh }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                title="Mobile Preview"
              />
            </div>
            <div className="wp-hindicator" />
          </div>
          <div className="wp-dlabel">
            {activeDevice.name} · {vw}×{vh} · @{activeDevice.dpr}x
          </div>
        </div>

        {/* CHROME BROWSER WINDOW */}
        {showBrowser && (
          <div
            ref={browserRef}
            className="wp-browser"
            style={{ left: '60%', top: '8%', width: browserSize.w, height: browserSize.h }}
          >
            <div className="wp-browser-close" onClick={onCloseBrowser}></div>
            <div className="wp-browser-tb">
              <div className="wp-traffic">
                <span className="t-r" onClick={onCloseBrowser} />
                <span className="t-y" />
                <span className="t-g" />
              </div>
              <div className="wp-browser-nav">
                <span style={{ opacity: .4 }}>‹</span> › ⟳
              </div>
              <div className="wp-browser-url">
                <span className="lk"></span>
                {previewUrl || 'staging.fileengine.com'}
              </div>
            </div>
            <iframe
              className="wp-browser-iframe"
              src={iframeSrc}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              title="Desktop Preview"
            />
            <div className="wp-browser-resize" onMouseDown={onBrowserResizeDown}>⌟</div>
          </div>
        )}
      </div>
    </>
  )
}
