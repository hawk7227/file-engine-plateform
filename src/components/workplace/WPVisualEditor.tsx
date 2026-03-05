'use client'

/**
 * WPVisualEditor — Webflow-style visual editing panel
 *
 * Lives OUTSIDE the iframe. Receives selected element info via postMessage.
 * Sends style changes back into the iframe via postMessage.
 * The iframe script applies them live with no page reload.
 */

import { useState, useEffect, useCallback, useRef } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SelectedElement {
  uid: string           // unique id injected into the element
  tag: string
  text: string
  rect: { top: number; left: number; width: number; height: number }
  styles: {
    color: string
    backgroundColor: string
    fontSize: string
    fontWeight: string
    padding: string
    borderRadius: string
    opacity: string
    letterSpacing: string
    lineHeight: string
    textAlign: string
    display: string
    width: string
    height: string
  }
}

interface Props {
  iframeRef: React.RefObject<HTMLIFrameElement>
  visible: boolean
  onClose: () => void
}

const CSS = `
.wve-panel {
  position: absolute;
  right: 12px;
  top: 12px;
  bottom: 12px;
  width: 260px;
  background: #111115;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  z-index: 100;
  box-shadow: 0 20px 60px rgba(0,0,0,.6);
  overflow: hidden;
  animation: wve-in 180ms ease;
}
@keyframes wve-in { from { opacity:0; transform:translateX(16px) } to { opacity:1; transform:none } }

.wve-header {
  padding: 14px 16px 10px;
  border-bottom: 1px solid rgba(255,255,255,.07);
  flex-shrink: 0;
}
.wve-title { font-size: 11px; font-weight: 700; color: #fff; letter-spacing: .02em; }
.wve-tag {
  display: inline-block; margin-top: 4px;
  padding: 2px 8px; border-radius: 6px;
  background: rgba(0,245,160,.08); border: 1px solid rgba(0,245,160,.15);
  color: #00f5a0; font-size: 10px; font-family: monospace;
}
.wve-close {
  position: absolute; top: 12px; right: 12px;
  width: 22px; height: 22px; border-radius: 6px;
  background: rgba(255,255,255,.06); border: none;
  color: rgba(255,255,255,.4); font-size: 12px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all .15s;
}
.wve-close:hover { background: rgba(255,255,255,.12); color: #fff; }

.wve-body { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 2px; }
.wve-body::-webkit-scrollbar { width: 3px; }
.wve-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 2px; }

.wve-section { margin-bottom: 10px; }
.wve-section-title {
  font-size: 8px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .1em; color: rgba(255,255,255,.3);
  padding: 4px 0 6px;
}

.wve-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.wve-label { font-size: 10px; color: rgba(255,255,255,.4); width: 60px; flex-shrink: 0; }

.wve-input {
  flex: 1; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.08);
  border-radius: 6px; padding: 5px 8px;
  font-size: 11px; color: #fff; font-family: monospace;
  outline: none; transition: border-color .15s;
}
.wve-input:focus { border-color: rgba(0,245,160,.4); }

.wve-slider {
  flex: 1; -webkit-appearance: none; appearance: none;
  height: 4px; border-radius: 2px;
  background: rgba(255,255,255,.1); outline: none; cursor: pointer;
}
.wve-slider::-webkit-slider-thumb {
  -webkit-appearance: none; width: 14px; height: 14px;
  border-radius: 50%; background: #00f5a0; cursor: pointer;
  box-shadow: 0 0 6px rgba(0,245,160,.4);
}
.wve-slider-val {
  width: 36px; text-align: right; font-size: 10px;
  color: rgba(255,255,255,.5); font-family: monospace; flex-shrink: 0;
}

.wve-color-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.wve-swatch {
  width: 28px; height: 28px; border-radius: 7px; border: 1px solid rgba(255,255,255,.12);
  cursor: pointer; flex-shrink: 0; position: relative; overflow: hidden;
}
.wve-swatch input[type=color] {
  position: absolute; inset: -4px; opacity: 0; cursor: pointer; width: 140%; height: 140%;
}
.wve-text-input {
  flex: 1; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.08);
  border-radius: 6px; padding: 5px 8px; font-size: 11px; color: #fff;
  font-family: monospace; outline: none; transition: border-color .15s;
}
.wve-text-input:focus { border-color: rgba(0,245,160,.4); }

.wve-textarea {
  width: 100%; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.08);
  border-radius: 8px; padding: 8px; font-size: 12px; color: #fff;
  font-family: inherit; outline: none; resize: vertical; min-height: 60px;
  transition: border-color .15s; line-height: 1.5;
}
.wve-textarea:focus { border-color: rgba(0,245,160,.4); }

.wve-align-row { display: flex; gap: 4px; }
.wve-align-btn {
  flex: 1; padding: 5px; border-radius: 6px; border: 1px solid rgba(255,255,255,.08);
  background: rgba(255,255,255,.04); color: rgba(255,255,255,.5);
  font-size: 12px; cursor: pointer; transition: all .15s; text-align: center;
}
.wve-align-btn:hover, .wve-align-btn.on {
  background: rgba(0,245,160,.1); border-color: rgba(0,245,160,.2); color: #00f5a0;
}

.wve-empty {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 8px; color: rgba(255,255,255,.2);
  font-size: 11px; text-align: center; padding: 24px;
}
.wve-empty-icon { font-size: 28px; opacity: .3; }

.wve-footer {
  padding: 10px 12px; border-top: 1px solid rgba(255,255,255,.07);
  display: flex; gap: 6px; flex-shrink: 0;
}
.wve-reset {
  flex: 1; padding: 7px; border-radius: 8px;
  background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08);
  color: rgba(255,255,255,.4); font-size: 11px; font-weight: 600; cursor: pointer;
  transition: all .15s;
}
.wve-reset:hover { background: rgba(255,255,255,.08); color: #fff; }
.wve-done {
  flex: 2; padding: 7px; border-radius: 8px;
  background: #00f5a0; border: none;
  color: #000; font-size: 11px; font-weight: 700; cursor: pointer;
  transition: all .15s;
}
.wve-done:hover { box-shadow: 0 0 16px rgba(0,245,160,.3); }
`

// ── Helpers ───────────────────────────────────────────────────────────────────

function parsePx(val: string): number {
  return parseFloat(val) || 0
}

function toHex(color: string): string {
  if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return '#000000'
  if (color.startsWith('#')) return color
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext('2d')
  if (!ctx) return '#000000'
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WPVisualEditor({ iframeRef, visible, onClose }: Props) {
  const [selected, setSelected] = useState<SelectedElement | null>(null)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Listen for element selection from iframe ──────────────────────────────
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'fe-element-selected') {
        const el: SelectedElement = e.data.element
        setSelected(el)
        setEdits({}) // clear prev edits
      }
      if (e.data?.type === 'fe-deselect') {
        setSelected(null)
        setEdits({})
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // ── Send style update to iframe ───────────────────────────────────────────
  const applyStyle = useCallback((prop: string, value: string) => {
    if (!selected) return
    setEdits(prev => ({ ...prev, [prop]: value }))
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage({
        type: 'fe-apply-style',
        uid: selected.uid,
        prop,
        value,
      }, '*')
    }, 30)
  }, [selected, iframeRef])

  // ── Send text update to iframe ────────────────────────────────────────────
  const applyText = useCallback((text: string) => {
    if (!selected) return
    setEdits(prev => ({ ...prev, __text: text }))
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage({
        type: 'fe-apply-text',
        uid: selected.uid,
        text,
      }, '*')
    }, 30)
  }, [selected, iframeRef])

  const reset = useCallback(() => {
    if (!selected) return
    iframeRef.current?.contentWindow?.postMessage({
      type: 'fe-reset-element',
      uid: selected.uid,
    }, '*')
    setEdits({})
  }, [selected, iframeRef])

  const get = (prop: string, fallback = ''): string => {
    if (edits[prop] !== undefined) return edits[prop]
    if (selected?.styles) {
      const s = selected.styles as Record<string, string>
      return s[prop] ?? fallback
    }
    return fallback
  }

  if (!visible) return null

  return (
    <>
      <style>{CSS}</style>
      <div className="wve-panel">
        <div className="wve-header">
          <div className="wve-title">Visual Editor</div>
          {selected && <div className="wve-tag">&lt;{selected.tag}&gt;</div>}
          <button className="wve-close" onClick={onClose}>✕</button>
        </div>

        {!selected ? (
          <div className="wve-empty">
            <div className="wve-empty-icon">👆</div>
            <div>Click any element<br/>in the preview to edit it</div>
          </div>
        ) : (
          <>
            <div className="wve-body">

              {/* ── Text content ── */}
              {selected.text && (
                <div className="wve-section">
                  <div className="wve-section-title">Content</div>
                  <textarea
                    className="wve-textarea"
                    value={edits.__text ?? selected.text}
                    onChange={e => applyText(e.target.value)}
                    placeholder="Text content..."
                  />
                </div>
              )}

              {/* ── Typography ── */}
              <div className="wve-section">
                <div className="wve-section-title">Typography</div>

                {/* Font size */}
                <div className="wve-row">
                  <span className="wve-label">Size</span>
                  <input
                    type="range" className="wve-slider"
                    min={8} max={96} step={1}
                    value={parsePx(get('fontSize', '16px'))}
                    onChange={e => applyStyle('fontSize', e.target.value + 'px')}
                  />
                  <span className="wve-slider-val">{parsePx(get('fontSize', '16px'))}px</span>
                </div>

                {/* Font weight */}
                <div className="wve-row">
                  <span className="wve-label">Weight</span>
                  <input
                    type="range" className="wve-slider"
                    min={100} max={900} step={100}
                    value={parsePx(get('fontWeight', '400'))}
                    onChange={e => applyStyle('fontWeight', e.target.value)}
                  />
                  <span className="wve-slider-val">{get('fontWeight', '400')}</span>
                </div>

                {/* Line height */}
                <div className="wve-row">
                  <span className="wve-label">Line H</span>
                  <input
                    type="range" className="wve-slider"
                    min={1} max={3} step={0.05}
                    value={parseFloat(get('lineHeight', '1.5')) || 1.5}
                    onChange={e => applyStyle('lineHeight', e.target.value)}
                  />
                  <span className="wve-slider-val">{(parseFloat(get('lineHeight', '1.5')) || 1.5).toFixed(2)}</span>
                </div>

                {/* Letter spacing */}
                <div className="wve-row">
                  <span className="wve-label">Spacing</span>
                  <input
                    type="range" className="wve-slider"
                    min={-2} max={10} step={0.1}
                    value={parsePx(get('letterSpacing', '0px'))}
                    onChange={e => applyStyle('letterSpacing', e.target.value + 'px')}
                  />
                  <span className="wve-slider-val">{parsePx(get('letterSpacing', '0px'))}px</span>
                </div>

                {/* Text align */}
                <div className="wve-row">
                  <span className="wve-label">Align</span>
                  <div className="wve-align-row" style={{ flex: 1 }}>
                    {['left', 'center', 'right', 'justify'].map(a => (
                      <button
                        key={a}
                        className={`wve-align-btn${get('textAlign') === a ? ' on' : ''}`}
                        onClick={() => applyStyle('textAlign', a)}
                      >
                        {a === 'left' ? '≡' : a === 'center' ? '≡' : a === 'right' ? '≡' : '≡'}
                        <span style={{ fontSize: 7, display: 'block' }}>{a[0].toUpperCase()}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Colors ── */}
              <div className="wve-section">
                <div className="wve-section-title">Colors</div>

                {/* Text color */}
                <div className="wve-color-row">
                  <div
                    className="wve-swatch"
                    style={{ background: get('color', '#000') }}
                  >
                    <input
                      type="color"
                      value={toHex(get('color', '#000000'))}
                      onChange={e => applyStyle('color', e.target.value)}
                    />
                  </div>
                  <input
                    className="wve-text-input"
                    value={get('color', '')}
                    onChange={e => applyStyle('color', e.target.value)}
                    placeholder="Text color"
                  />
                </div>

                {/* Background */}
                <div className="wve-color-row">
                  <div
                    className="wve-swatch"
                    style={{ background: get('backgroundColor', 'transparent') }}
                  >
                    <input
                      type="color"
                      value={toHex(get('backgroundColor', '#ffffff'))}
                      onChange={e => applyStyle('backgroundColor', e.target.value)}
                    />
                  </div>
                  <input
                    className="wve-text-input"
                    value={get('backgroundColor', '')}
                    onChange={e => applyStyle('backgroundColor', e.target.value)}
                    placeholder="Background color"
                  />
                </div>
              </div>

              {/* ── Spacing ── */}
              <div className="wve-section">
                <div className="wve-section-title">Spacing</div>

                {/* Padding */}
                <div className="wve-row">
                  <span className="wve-label">Padding</span>
                  <input
                    type="range" className="wve-slider"
                    min={0} max={80} step={1}
                    value={parsePx(get('padding', '0px'))}
                    onChange={e => applyStyle('padding', e.target.value + 'px')}
                  />
                  <span className="wve-slider-val">{parsePx(get('padding', '0px'))}px</span>
                </div>

                {/* Border radius */}
                <div className="wve-row">
                  <span className="wve-label">Radius</span>
                  <input
                    type="range" className="wve-slider"
                    min={0} max={60} step={1}
                    value={parsePx(get('borderRadius', '0px'))}
                    onChange={e => applyStyle('borderRadius', e.target.value + 'px')}
                  />
                  <span className="wve-slider-val">{parsePx(get('borderRadius', '0px'))}px</span>
                </div>

                {/* Opacity */}
                <div className="wve-row">
                  <span className="wve-label">Opacity</span>
                  <input
                    type="range" className="wve-slider"
                    min={0} max={1} step={0.01}
                    value={parseFloat(get('opacity', '1'))}
                    onChange={e => applyStyle('opacity', e.target.value)}
                  />
                  <span className="wve-slider-val">{Math.round(parseFloat(get('opacity', '1')) * 100)}%</span>
                </div>
              </div>

              {/* ── Size ── */}
              <div className="wve-section">
                <div className="wve-section-title">Size</div>
                <div className="wve-row">
                  <span className="wve-label">Width</span>
                  <input
                    className="wve-input"
                    value={get('width', 'auto')}
                    onChange={e => applyStyle('width', e.target.value)}
                    placeholder="auto / 100px / 50%"
                  />
                </div>
                <div className="wve-row">
                  <span className="wve-label">Height</span>
                  <input
                    className="wve-input"
                    value={get('height', 'auto')}
                    onChange={e => applyStyle('height', e.target.value)}
                    placeholder="auto / 100px"
                  />
                </div>
              </div>

            </div>

            <div className="wve-footer">
              <button className="wve-reset" onClick={reset}>↺ Reset</button>
              <button className="wve-done" onClick={() => { setSelected(null); setEdits({}) }}>
                ✓ Done
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
