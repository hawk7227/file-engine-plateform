'use client'

/**
 * WP PAGE BUILDER — Visual Page Builder Mode
 *
 * Activated via ⊞ toggle in tool rail. Replaces center canvas when active.
 * Three integrated systems:
 *   S1 — Monaco TSX editor + live iframe preview + click-to-inspect
 *   S2 — Accurate device frames with real safe-area overlays + rulers
 *   S3 — Image → AI design analysis → annotated color/font/spacing chart
 *
 * Default workspace = Chat Preview. This is a mode, not the default.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'

// ─────────────────────────────────────────────────────────────────
// DEVICE DATABASE — spec-accurate (Apple HIG + Android Material)
// ─────────────────────────────────────────────────────────────────

interface SafeArea { top: number; bottom: number; left: number; right: number }

interface PBDevice {
  id: string
  name: string
  group: 'iphone' | 'android' | 'tablet' | 'desktop'
  cssW: number; cssH: number
  dpr: number
  screenSize: string
  frameType: 'dynamic-island' | 'notch' | 'home-button' | 'android' | 'tablet' | 'desktop'
  outerRadius: number   // phone outer corner radius CSS px
  screenRadius: number  // screen corner radius CSS px
  safe: SafeArea        // portrait
  safeLand: SafeArea    // landscape
  statusBar: number     // height of status bar inside safe.top
  homeIndicator: number // height of home indicator inside safe.bottom
  diWidth: number       // Dynamic Island pill width (0 if none)
  diHeight: number      // Dynamic Island pill height (0 if none)
  notchW: number        // notch width for non-DI notch phones
  notchH: number        // notch height
  browserChrome: number // mobile Safari/Chrome chrome height when visible
}

const PB_DEVICES: PBDevice[] = [
  // ── iPhones ─────────────────────────────────────────────────
  { id:'se3', name:'iPhone SE 3rd', group:'iphone', cssW:375, cssH:667, dpr:2, screenSize:'4.7"',
    frameType:'home-button', outerRadius:38, screenRadius:3,
    safe:{top:20,bottom:0,left:0,right:0}, safeLand:{top:0,bottom:0,left:0,right:0},
    statusBar:20, homeIndicator:0, diWidth:0, diHeight:0, notchW:0, notchH:0, browserChrome:50 },
  { id:'iph14', name:'iPhone 14', group:'iphone', cssW:390, cssH:844, dpr:3, screenSize:'6.1"',
    frameType:'notch', outerRadius:50, screenRadius:44,
    safe:{top:47,bottom:34,left:0,right:0}, safeLand:{top:0,bottom:21,left:47,right:47},
    statusBar:47, homeIndicator:34, diWidth:120, diHeight:34, notchW:126, notchH:34, browserChrome:52 },
  { id:'iph14pro', name:'iPhone 14 Pro', group:'iphone', cssW:393, cssH:852, dpr:3, screenSize:'6.1"',
    frameType:'dynamic-island', outerRadius:50, screenRadius:44,
    safe:{top:59,bottom:34,left:0,right:0}, safeLand:{top:0,bottom:21,left:59,right:59},
    statusBar:59, homeIndicator:34, diWidth:126, diHeight:37, notchW:0, notchH:0, browserChrome:52 },
  { id:'iph15pro', name:'iPhone 15 Pro', group:'iphone', cssW:393, cssH:852, dpr:3, screenSize:'6.1"',
    frameType:'dynamic-island', outerRadius:50, screenRadius:44,
    safe:{top:59,bottom:34,left:0,right:0}, safeLand:{top:0,bottom:21,left:59,right:59},
    statusBar:59, homeIndicator:34, diWidth:126, diHeight:37, notchW:0, notchH:0, browserChrome:52 },
  { id:'iph15pm', name:'iPhone 15 Pro Max', group:'iphone', cssW:430, cssH:932, dpr:3, screenSize:'6.7"',
    frameType:'dynamic-island', outerRadius:55, screenRadius:49,
    safe:{top:59,bottom:34,left:0,right:0}, safeLand:{top:0,bottom:21,left:59,right:59},
    statusBar:59, homeIndicator:34, diWidth:126, diHeight:37, notchW:0, notchH:0, browserChrome:52 },
  { id:'iph16pro', name:'iPhone 16 Pro', group:'iphone', cssW:402, cssH:874, dpr:3, screenSize:'6.3"',
    frameType:'dynamic-island', outerRadius:52, screenRadius:46,
    safe:{top:62,bottom:34,left:0,right:0}, safeLand:{top:0,bottom:21,left:62,right:62},
    statusBar:62, homeIndicator:34, diWidth:126, diHeight:37, notchW:0, notchH:0, browserChrome:52 },
  { id:'iph16pm', name:'iPhone 16 Pro Max', group:'iphone', cssW:440, cssH:956, dpr:3, screenSize:'6.9"',
    frameType:'dynamic-island', outerRadius:56, screenRadius:50,
    safe:{top:62,bottom:34,left:0,right:0}, safeLand:{top:0,bottom:21,left:62,right:62},
    statusBar:62, homeIndicator:34, diWidth:126, diHeight:37, notchW:0, notchH:0, browserChrome:52 },
  // ── Android ─────────────────────────────────────────────────
  { id:'pixel8', name:'Pixel 8', group:'android', cssW:412, cssH:915, dpr:2.625, screenSize:'6.2"',
    frameType:'android', outerRadius:42, screenRadius:36,
    safe:{top:28,bottom:24,left:0,right:0}, safeLand:{top:0,bottom:24,left:0,right:0},
    statusBar:28, homeIndicator:24, diWidth:0, diHeight:0, notchW:0, notchH:0, browserChrome:56 },
  { id:'s24', name:'Samsung S24', group:'android', cssW:360, cssH:780, dpr:3, screenSize:'6.2"',
    frameType:'android', outerRadius:42, screenRadius:36,
    safe:{top:24,bottom:24,left:0,right:0}, safeLand:{top:0,bottom:24,left:0,right:0},
    statusBar:24, homeIndicator:24, diWidth:0, diHeight:0, notchW:0, notchH:0, browserChrome:56 },
  { id:'s24ultra', name:'Galaxy S24 Ultra', group:'android', cssW:384, cssH:824, dpr:3, screenSize:'6.8"',
    frameType:'android', outerRadius:44, screenRadius:38,
    safe:{top:24,bottom:24,left:0,right:0}, safeLand:{top:0,bottom:24,left:0,right:0},
    statusBar:24, homeIndicator:24, diWidth:0, diHeight:0, notchW:0, notchH:0, browserChrome:56 },
  // ── Tablets ─────────────────────────────────────────────────
  { id:'ipadair', name:'iPad Air', group:'tablet', cssW:820, cssH:1180, dpr:2, screenSize:'10.9"',
    frameType:'tablet', outerRadius:18, screenRadius:12,
    safe:{top:24,bottom:20,left:0,right:0}, safeLand:{top:24,bottom:20,left:0,right:0},
    statusBar:24, homeIndicator:20, diWidth:0, diHeight:0, notchW:0, notchH:0, browserChrome:50 },
  { id:'ipadpro', name:'iPad Pro 12.9"', group:'tablet', cssW:1024, cssH:1366, dpr:2, screenSize:'12.9"',
    frameType:'tablet', outerRadius:18, screenRadius:12,
    safe:{top:24,bottom:20,left:0,right:0}, safeLand:{top:24,bottom:20,left:0,right:0},
    statusBar:24, homeIndicator:20, diWidth:0, diHeight:0, notchW:0, notchH:0, browserChrome:50 },
  // ── Desktop ─────────────────────────────────────────────────
  { id:'d1280', name:'Desktop 1280', group:'desktop', cssW:1280, cssH:720, dpr:1, screenSize:'1280×720',
    frameType:'desktop', outerRadius:8, screenRadius:4,
    safe:{top:0,bottom:0,left:0,right:0}, safeLand:{top:0,bottom:0,left:0,right:0},
    statusBar:0, homeIndicator:0, diWidth:0, diHeight:0, notchW:0, notchH:0, browserChrome:72 },
  { id:'d1440', name:'Desktop 1440', group:'desktop', cssW:1440, cssH:900, dpr:1, screenSize:'1440×900',
    frameType:'desktop', outerRadius:8, screenRadius:4,
    safe:{top:0,bottom:0,left:0,right:0}, safeLand:{top:0,bottom:0,left:0,right:0},
    statusBar:0, homeIndicator:0, diWidth:0, diHeight:0, notchW:0, notchH:0, browserChrome:72 },
  { id:'d1920', name:'Desktop 1920', group:'desktop', cssW:1920, cssH:1080, dpr:1, screenSize:'1920×1080',
    frameType:'desktop', outerRadius:8, screenRadius:4,
    safe:{top:0,bottom:0,left:0,right:0}, safeLand:{top:0,bottom:0,left:0,right:0},
    statusBar:0, homeIndicator:0, diWidth:0, diHeight:0, notchW:0, notchH:0, browserChrome:72 },
]

// ─────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────

const CSS = `
.pb-root{display:flex;flex-direction:column;height:100%;background:var(--wp-bg-0);overflow:hidden;font-family:var(--wp-font)}
.pb-root *{box-sizing:border-box;margin:0;padding:0}
.pb-root ::-webkit-scrollbar{width:4px;height:4px}
.pb-root ::-webkit-scrollbar-thumb{background:var(--wp-border-2);border-radius:4px}

/* ── Mode bar ── */
.pb-modebar{height:36px;display:flex;align-items:center;gap:0;border-bottom:1px solid var(--wp-border);background:var(--wp-bg-1);flex-shrink:0;padding:0 8px}
.pb-mode-btn{height:28px;padding:0 14px;border-radius:6px;border:none;background:none;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--wp-text-3);cursor:pointer;transition:all .15s;font-family:var(--wp-font)}
.pb-mode-btn:hover{color:var(--wp-text-1)}
.pb-mode-btn.on{background:var(--wp-accent-dim);color:var(--wp-accent)}
.pb-sep{width:1px;height:16px;background:var(--wp-border);margin:0 6px}

/* ── Split layout ── */
.pb-body{flex:1;display:flex;overflow:hidden;min-height:0}
.pb-editor-pane{width:40%;min-width:280px;max-width:60%;display:flex;flex-direction:column;border-right:1px solid var(--wp-border);overflow:hidden;flex-shrink:0}
.pb-preview-pane{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative}
.pb-resize-h{width:6px;cursor:col-resize;background:transparent;flex-shrink:0;transition:background .15s}
.pb-resize-h:hover,.pb-resize-h:active{background:var(--wp-accent-dim)}

/* ── Editor pane ── */
.pb-editor-header{height:36px;display:flex;align-items:center;gap:8px;padding:0 12px;border-bottom:1px solid var(--wp-border);flex-shrink:0;background:var(--wp-bg-2)}
.pb-editor-title{font-size:10px;font-weight:700;color:var(--wp-text-3);text-transform:uppercase;letter-spacing:.06em}
.pb-editor-body{flex:1;overflow:hidden;position:relative}
.pb-monaco{width:100%;height:100%}
.pb-editor-fallback{width:100%;height:100%;resize:none;background:var(--wp-bg-2);border:none;color:var(--wp-text-1);font-family:var(--wp-mono);font-size:12px;line-height:1.6;padding:12px;outline:none}

/* ── Inspector panel ── */
.pb-inspector{width:220px;flex-shrink:0;background:var(--wp-bg-1);border-left:1px solid var(--wp-border);display:flex;flex-direction:column;overflow:hidden}
.pb-insp-hdr{padding:10px 12px 8px;border-bottom:1px solid var(--wp-border);flex-shrink:0}
.pb-insp-title{font-size:10px;font-weight:700;color:var(--wp-text-1);text-transform:uppercase;letter-spacing:.06em}
.pb-insp-tag{font-size:9px;color:var(--wp-accent);font-family:var(--wp-mono);margin-top:2px}
.pb-insp-body{flex:1;overflow-y:auto;padding:10px}
.pb-insp-section{margin-bottom:14px}
.pb-insp-section-title{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--wp-text-4);margin-bottom:7px}
.pb-insp-row{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.pb-insp-label{font-size:9px;color:var(--wp-text-4);width:52px;flex-shrink:0}
.pb-insp-val{flex:1;background:var(--wp-bg-3);border:1px solid var(--wp-border);border-radius:5px;padding:4px 7px;font-size:10px;color:var(--wp-text-1);font-family:var(--wp-mono);outline:none;width:100%}
.pb-insp-val:focus{border-color:rgba(0,245,160,.4)}
.pb-color-swatch{width:26px;height:26px;border-radius:6px;border:1px solid var(--wp-border-2);cursor:pointer;position:relative;overflow:hidden;flex-shrink:0}
.pb-color-swatch input{position:absolute;inset:-4px;opacity:0;cursor:pointer;width:140%;height:140%}
.pb-slider{flex:1;-webkit-appearance:none;appearance:none;height:3px;border-radius:2px;background:var(--wp-border-2);outline:none;cursor:pointer}
.pb-slider::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;border-radius:50%;background:var(--wp-accent);cursor:pointer;box-shadow:0 0 4px rgba(0,245,160,.4)}
.pb-slider-val{width:32px;text-align:right;font-size:9px;color:var(--wp-text-3);font-family:var(--wp-mono);flex-shrink:0}
.pb-empty-insp{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--wp-text-4);font-size:10px;text-align:center;padding:20px}
.pb-empty-insp-icon{font-size:24px;opacity:.3}

/* ── Preview pane ── */
.pb-preview-canvas{flex:1;display:flex;align-items:center;justify-content:center;overflow:auto;background:var(--wp-bg-0);background-image:radial-gradient(circle at 50% 40%,rgba(18,28,18,.15),transparent 70%);padding:24px;position:relative}
.pb-device-wrap{display:flex;flex-direction:column;align-items:center;flex-shrink:0}
.pb-device-label{text-align:center;margin-top:8px;font-size:9px;color:var(--wp-text-4);font-family:var(--wp-mono)}
.pb-preview-toolbar{height:36px;display:flex;align-items:center;gap:6px;padding:0 12px;border-bottom:1px solid var(--wp-border);background:var(--wp-bg-1);flex-shrink:0}
.pb-ptb-btn{height:24px;padding:0 10px;border-radius:5px;border:1px solid var(--wp-border);background:none;color:var(--wp-text-3);font-size:9px;font-weight:700;cursor:pointer;transition:all .15s;font-family:var(--wp-font);text-transform:uppercase;letter-spacing:.04em}
.pb-ptb-btn:hover{border-color:var(--wp-border-2);color:var(--wp-text-1)}
.pb-ptb-btn.on{background:var(--wp-accent-dim);border-color:rgba(0,245,160,.2);color:var(--wp-accent)}
.pb-zoom-val{font-size:9px;font-family:var(--wp-mono);color:var(--wp-text-3);min-width:28px;text-align:center}

/* ── Device frame ── */
.pb-frame{position:relative;background:#1c1c1e;box-shadow:inset 0 0 0 2px #3a3a3c,0 0 0 2px #3a3a3c,0 24px 64px rgba(0,0,0,.5),0 0 0 12px #111;display:flex;flex-direction:column}
.pb-screen{position:relative;overflow:hidden;flex:1;background:#000}
.pb-iframe{width:100%;height:100%;border:none;display:block}
.pb-di{position:absolute;top:12px;left:50%;transform:translateX(-50%);background:#000;border-radius:20px;z-index:20;pointer-events:none}
.pb-notch{position:absolute;top:0;left:50%;transform:translateX(-50%);background:#1c1c1e;border-radius:0 0 18px 18px;z-index:20;pointer-events:none}
.pb-home-btn{position:absolute;bottom:10px;left:50%;transform:translateX(-50%);width:44px;height:44px;border-radius:50%;border:2px solid #3a3a3c;z-index:20;pointer-events:none}
.pb-home-ind{position:absolute;bottom:8px;left:50%;transform:translateX(-50%);width:134px;height:5px;border-radius:3px;background:rgba(255,255,255,.15);z-index:20;pointer-events:none}

/* ── Safe zone overlay ── */
.pb-safe-overlay{position:absolute;inset:0;z-index:30;pointer-events:none}
.pb-safe-top{position:absolute;top:0;left:0;right:0;background:rgba(255,50,50,.18);border-bottom:1px dashed rgba(255,80,80,.5)}
.pb-safe-bottom{position:absolute;bottom:0;left:0;right:0;background:rgba(255,50,50,.18);border-top:1px dashed rgba(255,80,80,.5)}
.pb-safe-left{position:absolute;top:0;bottom:0;left:0;background:rgba(255,50,50,.18);border-right:1px dashed rgba(255,80,80,.5)}
.pb-safe-right{position:absolute;top:0;bottom:0;right:0;background:rgba(255,50,50,.18);border-left:1px dashed rgba(255,80,80,.5)}
.pb-safe-label{position:absolute;font-size:8px;font-weight:700;color:rgba(255,100,100,.9);font-family:monospace;letter-spacing:.04em;background:rgba(0,0,0,.6);padding:1px 4px;border-radius:3px;pointer-events:none;white-space:nowrap}
.pb-safe-label.top{bottom:3px;left:50%;transform:translateX(-50%)}
.pb-safe-label.bottom{top:3px;left:50%;transform:translateX(-50%)}
.pb-safe-label.left{right:3px;top:50%;transform:translateY(-50%)}
.pb-safe-label.right{left:3px;top:50%;transform:translateY(-50%)}

/* ── Ruler ── */
.pb-ruler-h{position:absolute;top:0;left:0;right:0;height:16px;background:rgba(10,10,20,.8);z-index:10;display:flex;align-items:flex-end;overflow:hidden;pointer-events:none}
.pb-ruler-v{position:absolute;top:0;left:0;bottom:0;width:16px;background:rgba(10,10,20,.8);z-index:10;display:flex;overflow:hidden;pointer-events:none}

/* ── Device selector (in modebar area) ── */
.pb-dev-picker{display:flex;align-items:center;gap:4px;overflow-x:auto;flex:1}
.pb-dev-picker::-webkit-scrollbar{display:none}
.pb-dev-chip{height:22px;padding:0 10px;border-radius:5px;border:1px solid var(--wp-border);background:none;color:var(--wp-text-4);font-size:9px;font-weight:700;cursor:pointer;white-space:nowrap;transition:all .15s;font-family:var(--wp-font)}
.pb-dev-chip:hover{border-color:var(--wp-border-2);color:var(--wp-text-2)}
.pb-dev-chip.on{border-color:var(--wp-accent);background:var(--wp-accent-dim);color:var(--wp-accent)}
.pb-dev-group{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--wp-text-4);padding:0 4px;flex-shrink:0}

/* ── Status bar overlay ── */
.pb-statusbar{position:absolute;top:0;left:0;right:0;z-index:25;display:flex;align-items:flex-start;justify-content:space-between;padding:0 20px;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-weight:600;letter-spacing:-.2px;color:#fff}
.pb-sb-right{display:flex;align-items:center;gap:5px}

/* ── Image analyzer ── */
.pb-analyzer{display:flex;flex-direction:column;height:100%;overflow:hidden}
.pb-drop-zone{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;border:2px dashed var(--wp-border-2);border-radius:16px;margin:16px;gap:12px;cursor:pointer;transition:all .2s;color:var(--wp-text-3)}
.pb-drop-zone:hover,.pb-drop-zone.drag{border-color:var(--wp-accent);background:var(--wp-accent-dim);color:var(--wp-accent)}
.pb-drop-icon{font-size:40px;opacity:.5}
.pb-drop-title{font-size:14px;font-weight:700;color:var(--wp-text-1)}
.pb-drop-sub{font-size:11px;opacity:.7}
.pb-analysis-layout{display:flex;height:100%;overflow:hidden;gap:0}
.pb-analysis-left{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:12px;min-width:0}
.pb-analysis-right{width:300px;flex-shrink:0;overflow:auto;padding:12px;border-left:1px solid var(--wp-border)}
.pb-img-preview{width:100%;border-radius:8px;border:1px solid var(--wp-border);overflow:hidden;position:relative}
.pb-img-preview img{width:100%;display:block}
.pb-anno-canvas{position:absolute;inset:0;pointer-events:none}
.pb-token-card{background:var(--wp-bg-2);border:1px solid var(--wp-border);border-radius:10px;padding:12px;flex-shrink:0}
.pb-token-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--wp-text-3);margin-bottom:10px}
.pb-color-grid{display:flex;flex-wrap:wrap;gap:8px}
.pb-color-item{display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer}
.pb-color-swatch-lg{width:40px;height:40px;border-radius:8px;border:1px solid rgba(255,255,255,.1);transition:transform .15s}
.pb-color-swatch-lg:hover{transform:scale(1.1)}
.pb-color-hex{font-size:8px;font-family:var(--wp-mono);color:var(--wp-text-3)}
.pb-color-name{font-size:8px;color:var(--wp-text-4);text-align:center;max-width:48px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pb-typo-row{display:flex;align-items:baseline;gap:10px;padding:6px 0;border-bottom:1px solid var(--wp-border)}
.pb-typo-row:last-child{border-bottom:none}
.pb-typo-sample{font-weight:var(--w,400);line-height:1.2}
.pb-typo-meta{font-size:9px;color:var(--wp-text-4);font-family:var(--wp-mono);margin-left:auto;flex-shrink:0}
.pb-spacing-viz{display:flex;gap:6px;flex-wrap:wrap}
.pb-spacing-chip{display:flex;flex-direction:column;align-items:center;gap:3px}
.pb-spacing-bar{background:var(--wp-accent);border-radius:2px;opacity:.6}
.pb-spacing-val{font-size:8px;color:var(--wp-text-4);font-family:var(--wp-mono)}
.pb-generate-btn{width:100%;padding:10px;border-radius:10px;background:var(--wp-accent);border:none;color:#000;font-size:12px;font-weight:900;cursor:pointer;transition:all .2s;margin-top:8px;font-family:var(--wp-font);letter-spacing:.03em}
.pb-generate-btn:hover{box-shadow:0 0 20px rgba(0,245,160,.3);transform:translateY(-1px)}
.pb-generate-btn:disabled{opacity:.4;pointer-events:none}
.pb-analyzing{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;flex:1;color:var(--wp-text-3);font-size:12px}
.pb-spinner{width:32px;height:32px;border:3px solid var(--wp-border);border-top-color:var(--wp-accent);border-radius:50%;animation:pb-spin .8s linear infinite}
@keyframes pb-spin{to{transform:rotate(360deg)}}
.pb-analysis-result{display:flex;flex-direction:column;gap:8px}
.pb-result-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--wp-border);font-size:10px}
.pb-result-key{color:var(--wp-text-4);text-transform:uppercase;letter-spacing:.04em;font-size:8px;font-weight:700}
.pb-result-val{color:var(--wp-text-1);font-family:var(--wp-mono);font-size:9px}
`

// ─────────────────────────────────────────────────────────────────
// SAFE AREA OVERLAY COMPONENT
// ─────────────────────────────────────────────────────────────────

function SafeZoneOverlay({ device, rotated, visible }: {
  device: PBDevice; rotated: boolean; visible: boolean
}) {
  if (!visible) return null
  const sa = rotated ? device.safeLand : device.safe
  const hasTop = sa.top > 0
  const hasBottom = sa.bottom > 0
  const hasLeft = sa.left > 0
  const hasRight = sa.right > 0
  if (!hasTop && !hasBottom && !hasLeft && !hasRight) return null

  return (
    <div className="pb-safe-overlay">
      {hasTop && (
        <div className="pb-safe-top" style={{ height: sa.top }}>
          <span className="pb-safe-label top">{sa.top}px</span>
        </div>
      )}
      {hasBottom && (
        <div className="pb-safe-bottom" style={{ height: sa.bottom }}>
          <span className="pb-safe-label bottom">{sa.bottom}px</span>
        </div>
      )}
      {hasLeft && (
        <div className="pb-safe-left" style={{ width: sa.left }}>
          <span className="pb-safe-label left">{sa.left}px</span>
        </div>
      )}
      {hasRight && (
        <div className="pb-safe-right" style={{ width: sa.right }}>
          <span className="pb-safe-label right">{sa.right}px</span>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// DEVICE FRAME + IFRAME
// ─────────────────────────────────────────────────────────────────

function DeviceFrame({ device, rotated, zoom, html, previewUrl, showSafe, showChrome, iframeRef }: {
  device: PBDevice; rotated: boolean; zoom: number
  html: string | null; previewUrl: string | null
  showSafe: boolean; showChrome: boolean
  iframeRef: React.RefObject<HTMLIFrameElement>
}) {
  const cssW = rotated ? device.cssH : device.cssW
  const cssH = rotated ? device.cssW : device.cssH
  const sa = rotated ? device.safeLand : device.safe
  const frameW = cssW + 28
  const frameH = cssH + (device.group === 'desktop' ? 0 : 28)
  const screenR = rotated ? Math.max(6, device.screenRadius - 10) : device.screenRadius
  const chromePad = showChrome ? device.browserChrome : 0

  // Inject real safe area CSS vars + optional chrome offset into preview
  const safeCSS = `
    :root {
      --sat:${sa.top}px; --sab:${sa.bottom}px; --sal:${sa.left}px; --sar:${sa.right}px;
    }
    html { padding-top: ${chromePad}px; box-sizing: border-box; }
  `

  useEffect(() => {
    if (!iframeRef.current) return
    const frame = iframeRef.current
    const content = html || (previewUrl ? null : EMPTY_HTML)
    if (previewUrl) {
      frame.src = previewUrl
    } else if (content) {
      const injected = injectSafeCSS(content, safeCSS)
      try {
        const doc = frame.contentDocument
        if (doc) { doc.open(); doc.write(injected); doc.close() }
        else frame.srcdoc = injected
      } catch { frame.srcdoc = injected }
    }
  }, [html, previewUrl, sa.top, sa.bottom, sa.left, sa.right, chromePad])

  const isPhone = device.group === 'iphone' || device.group === 'android'
  const isDI = device.frameType === 'dynamic-island' && !rotated
  const isNotch = device.frameType === 'notch' && !rotated
  const isHB = device.frameType === 'home-button'

  return (
    <div className="pb-device-wrap" style={{ transform: `scale(${zoom})`, transformOrigin: 'center top' }}>
      <div
        className="pb-frame"
        style={{
          width: frameW,
          height: device.group === 'desktop' ? frameH : frameH,
          borderRadius: rotated
            ? Math.max(12, device.outerRadius - 12)
            : device.outerRadius,
          position: 'relative',
        }}
      >
        {/* Status bar for phones */}
        {isPhone && (
          <div style={{
            position: 'absolute', top: 14, left: 14, right: 14, zIndex: 30,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            padding: `${isDI ? 16 : isHB ? 6 : 14}px 10px 0`,
            color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: '-.2px',
            fontFamily: '-apple-system,sans-serif', pointerEvents: 'none',
          }}>
            <span>9:41</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="16" height="11" viewBox="0 0 16 11"><rect x="0" y="4" width="3" height="7" rx="1" fill="currentColor" opacity=".4"/><rect x="4" y="2" width="3" height="9" rx="1" fill="currentColor" opacity=".6"/><rect x="8" y="0" width="3" height="11" rx="1" fill="currentColor" opacity=".8"/><rect x="12" y="0" width="3" height="11" rx="1" fill="currentColor"/></svg>
              <svg width="16" height="12" viewBox="0 0 16 12"><rect x="0" y="3" width="13" height="8" rx="2" fill="none" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="4" width="9" height="6" rx="1" fill="currentColor" opacity=".7"/><rect x="13" y="4.5" width="2" height="3" rx="1" fill="currentColor" opacity=".4"/></svg>
            </div>
          </div>
        )}

        {/* Dynamic Island */}
        {isDI && device.diWidth > 0 && (
          <div className="pb-di" style={{
            width: device.diWidth, height: device.diHeight,
            top: 14 + (device.statusBar - device.diHeight) / 2,
          }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#1a1a2e', border: '1px solid #2a2a3e', margin: '50% auto 0', transform: 'translateY(-50%)' }} />
          </div>
        )}

        {/* Notch */}
        {isNotch && device.notchW > 0 && (
          <div className="pb-notch" style={{ width: device.notchW, height: device.notchH }} />
        )}

        {/* Screen area */}
        <div
          className="pb-screen"
          style={{
            position: 'absolute',
            top: 14, left: 14,
            width: cssW, height: cssH,
            borderRadius: screenR,
          }}
        >
          {/* Browser chrome simulation */}
          {showChrome && device.group !== 'desktop' && chromePad > 0 && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: chromePad,
              background: 'rgba(30,30,40,.95)', zIndex: 50, display: 'flex',
              alignItems: 'flex-end', padding: '6px 12px', gap: 8,
              borderBottom: '1px solid rgba(255,255,255,.08)',
            }}>
              <div style={{ flex: 1, background: 'rgba(255,255,255,.07)', borderRadius: 8, height: 28, display: 'flex', alignItems: 'center', padding: '0 10px' }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', fontFamily: 'monospace' }}>🔒 patient.medazonhealth.com</span>
              </div>
            </div>
          )}

          <iframe
            ref={iframeRef}
            className="pb-iframe"
            style={{ borderRadius: screenR }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            title="preview"
          />

          <SafeZoneOverlay device={device} rotated={rotated} visible={showSafe} />
        </div>

        {/* Home button */}
        {isHB && !rotated && <div className="pb-home-btn" style={{ bottom: 10 }} />}

        {/* Home indicator */}
        {!isHB && isPhone && !rotated && device.homeIndicator > 0 && (
          <div className="pb-home-ind" style={{ bottom: 14 + 6 }} />
        )}
      </div>

      {/* Device label */}
      <div className="pb-device-label">
        {device.name} · {cssW}×{cssH} @{device.dpr}x · safe ↑{(rotated ? device.safeLand : device.safe).top} ↓{(rotated ? device.safeLand : device.safe).bottom}
      </div>
    </div>
  )
}

function injectSafeCSS(html: string, css: string): string {
  const tag = `<style data-safe-area>${css}</style>`
  if (html.includes('</head>')) return html.replace('</head>', tag + '</head>')
  if (html.includes('<body')) return html.replace('<body', tag + '<body')
  return tag + html
}

const EMPTY_HTML = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#111;color:#444;font-family:-apple-system,sans-serif;display:flex;height:100vh;align-items:center;justify-content:center;font-size:12px;text-align:center}svg{opacity:.15}</style></head><body><div><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/></svg><br><br>No file loaded</div></body></html>`

// ─────────────────────────────────────────────────────────────────
// IMAGE ANALYZER (System 3 — Claude-in-Claude)
// ─────────────────────────────────────────────────────────────────

interface DesignTokens {
  colors: Array<{ hex: string; name: string; usage: string }>
  typography: Array<{ size: number; weight: number; family: string; usage: string; lineHeight?: number }>
  spacing: number[]
  radii: number[]
  shadows: string[]
  layout: string
}

function ImageAnalyzer({ onGenerateCode }: { onGenerateCode: (tokens: DesignTokens, imageB64: string) => void }) {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageB64, setImageB64] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [tokens, setTokens] = useState<DesignTokens | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [generating, setGenerating] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  const loadFile = useCallback((f: File) => {
    setImageFile(f)
    setTokens(null)
    setError(null)
    const url = URL.createObjectURL(f)
    setImageUrl(url)
    const reader = new FileReader()
    reader.onload = ev => {
      const b64 = (ev.target?.result as string).split(',')[1]
      setImageB64(b64)
    }
    reader.readAsDataURL(f)
  }, [])

  const analyze = useCallback(async () => {
    if (!imageB64) return
    setAnalyzing(true)
    setError(null)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system: `You are a design systems engineer. Analyze the screenshot and extract ALL design tokens.
Return ONLY valid JSON matching this exact schema — no markdown, no explanation:
{
  "colors": [{"hex":"#xxxxxx","name":"Primary Green","usage":"accents"}],
  "typography": [{"size":16,"weight":400,"family":"Inter","usage":"body","lineHeight":1.5}],
  "spacing": [4,8,12,16,24,32,48],
  "radii": [4,8,12,999],
  "shadows": ["0 4px 14px rgba(0,0,0,.08)"],
  "layout": "flexbox column"
}
Extract every unique color. Include at minimum 3 typography sizes. Spacing must be an array of numbers.`,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageB64 } },
              { type: 'text', text: 'Extract all design tokens from this UI screenshot. Return only JSON.' }
            ]
          }]
        })
      })
      const data = await res.json()
      const raw = data.content?.[0]?.text || ''
      const clean = raw.replace(/```json|```/g, '').trim()
      const parsed: DesignTokens = JSON.parse(clean)
      setTokens(parsed)
    } catch (e) {
      setError(String(e))
    } finally {
      setAnalyzing(false)
    }
  }, [imageB64])

  const handleGenerateCode = useCallback(async () => {
    if (!tokens || !imageB64) return
    setGenerating(true)
    onGenerateCode(tokens, imageB64)
    setGenerating(false)
  }, [tokens, imageB64, onGenerateCode])

  return (
    <div className="pb-analyzer">
      <style>{CSS}</style>
      {!imageUrl ? (
        <div
          className={`pb-drop-zone${dragging ? ' drag' : ''}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) loadFile(f) }}
        >
          <div className="pb-drop-icon">🖼</div>
          <div className="pb-drop-title">Drop a screenshot here</div>
          <div className="pb-drop-sub">PNG, JPG, WebP · Any UI design or mockup</div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f) }} />
        </div>
      ) : analyzing ? (
        <div className="pb-analyzing">
          <div className="pb-spinner" />
          <div>Analyzing design tokens…</div>
          <div style={{ fontSize: 10, opacity: .5 }}>Extracting colors, typography, spacing, layout</div>
        </div>
      ) : (
        <div className="pb-analysis-layout">
          <div className="pb-analysis-left">
            {/* Image preview */}
            <div className="pb-img-preview">
              <img ref={imgRef} src={imageUrl} alt="Design" style={{ width: '100%' }} />
            </div>

            {/* Analyze / Re-analyze button */}
            {!tokens && (
              <button className="pb-generate-btn" onClick={analyze}>
                🔍 Analyze Design Tokens
              </button>
            )}
            {tokens && (
              <button className="pb-generate-btn" onClick={analyze} style={{ background: 'var(--wp-bg-3)', border: '1px solid var(--wp-border)', color: 'var(--wp-text-2)' }}>
                ↺ Re-analyze
              </button>
            )}
            {error && <div style={{ fontSize: 10, color: 'var(--wp-red)', padding: '6px 0' }}>Error: {error}</div>}
          </div>

          <div className="pb-analysis-right">
            {tokens ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Colors */}
                <div className="pb-token-card">
                  <div className="pb-token-title">Colors ({tokens.colors.length})</div>
                  <div className="pb-color-grid">
                    {tokens.colors.map((c, i) => (
                      <div key={i} className="pb-color-item" title={c.usage}>
                        <div className="pb-color-swatch-lg" style={{ background: c.hex }} />
                        <div className="pb-color-hex">{c.hex}</div>
                        <div className="pb-color-name">{c.name}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Typography */}
                <div className="pb-token-card">
                  <div className="pb-token-title">Typography</div>
                  {tokens.typography.map((t, i) => (
                    <div key={i} className="pb-typo-row">
                      <span style={{ fontSize: Math.min(t.size, 24), fontWeight: t.weight, color: 'var(--wp-text-1)', flex: 1 }}>
                        {t.usage}
                      </span>
                      <span className="pb-typo-meta">{t.size}px · {t.weight} · {t.family}</span>
                    </div>
                  ))}
                </div>

                {/* Spacing */}
                <div className="pb-token-card">
                  <div className="pb-token-title">Spacing Scale</div>
                  <div className="pb-spacing-viz">
                    {tokens.spacing.map((s, i) => (
                      <div key={i} className="pb-spacing-chip">
                        <div className="pb-spacing-bar" style={{ width: Math.min(s * 2, 80), height: 8 }} />
                        <div className="pb-spacing-val">{s}px</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Radii */}
                <div className="pb-token-card">
                  <div className="pb-token-title">Border Radii</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {tokens.radii.map((r, i) => (
                      <div key={i} style={{ width: 32, height: 32, background: 'var(--wp-bg-3)', borderRadius: Math.min(r, 16), border: '1px solid var(--wp-border-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: 'var(--wp-text-4)', fontFamily: 'var(--wp-mono)' }}>
                        {r}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Layout */}
                <div className="pb-token-card">
                  <div className="pb-token-title">Layout</div>
                  <div style={{ fontSize: 11, color: 'var(--wp-text-2)', fontFamily: 'var(--wp-mono)' }}>{tokens.layout}</div>
                </div>

                {/* Generate TSX */}
                <button
                  className="pb-generate-btn"
                  onClick={handleGenerateCode}
                  disabled={generating}
                >
                  {generating ? '⏳ Generating…' : '⚡ Generate TSX from Design'}
                </button>

                {/* New image */}
                <button
                  onClick={() => { setImageUrl(null); setImageFile(null); setTokens(null); setImageB64(null) }}
                  style={{ width: '100%', padding: '7px', borderRadius: 8, border: '1px solid var(--wp-border)', background: 'none', color: 'var(--wp-text-3)', fontSize: 10, cursor: 'pointer', fontFamily: 'var(--wp-font)' }}
                >
                  ← Upload different image
                </button>
              </div>
            ) : (
              <div style={{ color: 'var(--wp-text-4)', fontSize: 11, padding: '20px 0', textAlign: 'center' }}>
                Click "Analyze Design Tokens" to extract colors, fonts, and spacing from the image.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

interface Props {
  initialCode?: string
  initialFilename?: string
}

type PBMode = 'preview' | 'editor' | 'analyzer'

export function WPPageBuilder({ initialCode = '', initialFilename = 'component.tsx' }: Props) {
  const [mode, setMode] = useState<PBMode>('preview')
  const [code, setCode] = useState(initialCode)
  const [filename, setFilename] = useState(initialFilename)
  const [device, setDevice] = useState<PBDevice>(PB_DEVICES[3]) // iPhone 15 Pro default
  const [rotated, setRotated] = useState(false)
  const [zoom, setZoom] = useState(0.65)
  const [showSafe, setShowSafe] = useState(true)
  const [showChrome, setShowChrome] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [selectedElement, setSelectedElement] = useState<{ uid: string; tag: string; styles: Record<string,string> } | null>(null)
  const [editorWidth, setEditorWidth] = useState(42) // percent
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const resizingRef = useRef(false)
  const monacoContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [monacoLoaded, setMonacoLoaded] = useState(false)
  const editorInstanceRef = useRef<any>(null)
  const analyzerTokensRef = useRef<DesignTokens | null>(null)

  // ── Build preview HTML whenever code changes ──
  useEffect(() => {
    if (!code.trim()) { setPreviewHtml(null); return }
    const timer = setTimeout(() => {
      // Import assemblePreviewHtml dynamically to avoid circular dep issues
      import('@/lib/preview-assembler').then(({ assemblePreviewHtml }) => {
        const html = assemblePreviewHtml([{ path: filename, content: code, language: filename.split('.').pop() || 'tsx' }])
        setPreviewHtml(html)
      })
    }, 400)
    return () => clearTimeout(timer)
  }, [code, filename])

  // ── Load Monaco from CDN ──
  useEffect(() => {
    if (mode !== 'editor' || monacoLoaded) return
    if ((window as any).monaco) { initMonaco(); return }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js'
    script.onload = () => {
      const require = (window as any).require
      require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } })
      require(['vs/editor/editor.main'], () => { initMonaco() })
    }
    document.head.appendChild(script)
  }, [mode])

  const initMonaco = useCallback(() => {
    if (!monacoContainerRef.current || editorInstanceRef.current) return
    const monaco = (window as any).monaco
    if (!monaco) return
    const editor = monaco.editor.create(monacoContainerRef.current, {
      value: code,
      language: 'typescript',
      theme: 'vs-dark',
      fontSize: 12,
      lineHeight: 19,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      folding: true,
      renderLineHighlight: 'line',
      padding: { top: 12, bottom: 12 },
      fontFamily: "'JetBrains Mono', 'Geist Mono', monospace",
      fontLigatures: true,
      smoothScrolling: true,
      cursorSmoothCaretAnimation: 'on',
    })
    editor.onDidChangeModelContent(() => {
      setCode(editor.getValue())
    })
    editorInstanceRef.current = editor
    setMonacoLoaded(true)
  }, [code])

  // ── Listen for element clicks from iframe ──
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'fe-element-selected') {
        setSelectedElement(e.data.element)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // ── Apply style change to iframe + patch code ──
  const applyStyle = useCallback((prop: string, value: string) => {
    if (!selectedElement) return
    setSelectedElement(prev => prev ? { ...prev, styles: { ...prev.styles, [prop]: value } } : null)
    iframeRef.current?.contentWindow?.postMessage({ type: 'fe-apply-style', uid: selectedElement.uid, prop, value }, '*')
  }, [selectedElement])

  const applyText = useCallback((text: string) => {
    if (!selectedElement) return
    iframeRef.current?.contentWindow?.postMessage({ type: 'fe-apply-text', uid: selectedElement.uid, text }, '*')
  }, [selectedElement])

  // ── Horizontal resize ──
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    resizingRef.current = true
    const startX = e.clientX
    const startW = editorWidth
    const total = (e.currentTarget as HTMLElement).closest('.pb-body')?.clientWidth || 800
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX
      const pct = Math.max(25, Math.min(70, startW + (delta / total * 100)))
      setEditorWidth(pct)
      editorInstanceRef.current?.layout()
    }
    const onUp = () => {
      resizingRef.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [editorWidth])

  // ── Handle image-to-code generation ──
  const handleGenerateCode = useCallback(async (tokens: DesignTokens, imageB64: string) => {
    analyzerTokensRef.current = tokens
    setMode('editor')
    // Give Monaco a moment to mount then stream code
    setTimeout(async () => {
      const colorVars = tokens.colors.map(c => `  --color-${c.name.toLowerCase().replace(/\s+/g, '-')}: ${c.hex};`).join('\n')
      const typographySizes = tokens.typography.map(t => `/* ${t.usage}: ${t.size}px ${t.weight} ${t.family} */`).join('\n')
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4000,
            system: `You are an expert React/TSX developer. Generate a pixel-perfect TSX component from the design screenshot.
Use ONLY these design tokens:
Colors: ${tokens.colors.map(c => `${c.name}=${c.hex}`).join(', ')}
Typography: ${tokens.typography.map(t => `${t.usage}:${t.size}px/${t.weight}`).join(', ')}
Spacing: ${tokens.spacing.join(', ')}px
Border Radii: ${tokens.radii.join(', ')}px
Layout: ${tokens.layout}

Rules:
- Output ONLY valid TSX code, no markdown, no explanation
- Use inline styles only (no Tailwind, no CSS imports)
- Use const Component: React.FC = () => with export default
- Use React.useState for interactive elements
- Make it pixel-perfect to the screenshot
- Component must be self-contained and render immediately`,
            messages: [{
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageB64 } },
                { type: 'text', text: `Generate a pixel-perfect TSX component that matches this screenshot exactly. Use these tokens:\n${colorVars}\n${typographySizes}` }
              ]
            }]
          })
        })
        const data = await res.json()
        const raw = data.content?.[0]?.text || ''
        const clean = raw.replace(/```tsx?|```/g, '').trim()
        setCode(clean)
        setFilename('GeneratedComponent.tsx')
        if (editorInstanceRef.current) {
          editorInstanceRef.current.setValue(clean)
        }
      } catch (e) {
        console.error('Code generation failed:', e)
      }
    }, 500)
  }, [])

  const parsePx = (v: string) => parseFloat(v) || 0
  const toHex = (color: string) => {
    if (!color || color === 'transparent') return '#000000'
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

  const groups = ['iphone', 'android', 'tablet', 'desktop'] as const

  return (
    <>
      <style>{CSS}</style>
      <div className="pb-root">

        {/* ── Mode bar + Device picker ── */}
        <div className="pb-modebar">
          {(['preview', 'editor', 'analyzer'] as PBMode[]).map(m => (
            <button key={m} className={`pb-mode-btn${mode === m ? ' on' : ''}`} onClick={() => setMode(m)}>
              {m === 'preview' ? '👁 Preview' : m === 'editor' ? '✏ Editor' : '🔍 Analyzer'}
            </button>
          ))}

          <div className="pb-sep" />

          {/* Device chips — always visible */}
          <div className="pb-dev-picker">
            {groups.map(g => (
              <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                <span className="pb-dev-group">{g}</span>
                {PB_DEVICES.filter(d => d.group === g).map(d => (
                  <button
                    key={d.id}
                    className={`pb-dev-chip${device.id === d.id ? ' on' : ''}`}
                    onClick={() => setDevice(d)}
                    title={`${d.cssW}×${d.cssH} · safe ↑${d.safe.top}px ↓${d.safe.bottom}px`}
                  >
                    {d.name.replace('iPhone ', '').replace('Samsung ', '').replace('Desktop ', '')}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="pb-body">

          {/* ── LEFT: Code editor (only in editor mode) ── */}
          {mode === 'editor' && (
            <>
              <div className="pb-editor-pane" style={{ width: `${editorWidth}%` }}>
                <div className="pb-editor-header">
                  <span className="pb-editor-title">
                    {filename}
                  </span>
                  <button
                    onClick={() => {
                      const blob = new Blob([code], { type: 'text/plain' })
                      const a = document.createElement('a')
                      a.href = URL.createObjectURL(blob)
                      a.download = filename
                      a.click()
                    }}
                    style={{ marginLeft: 'auto', padding: '2px 8px', borderRadius: 5, border: '1px solid var(--wp-border)', background: 'none', color: 'var(--wp-text-3)', fontSize: 9, cursor: 'pointer', fontWeight: 700, fontFamily: 'var(--wp-font)' }}
                  >
                    ↓ Save
                  </button>
                </div>
                <div className="pb-editor-body">
                  {/* Monaco container */}
                  <div ref={monacoContainerRef} className="pb-monaco" style={{ display: monacoLoaded ? 'block' : 'none' }} />
                  {/* Fallback textarea until Monaco loads */}
                  {!monacoLoaded && (
                    <textarea
                      ref={textareaRef}
                      className="pb-editor-fallback"
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      placeholder="// Paste or type TSX here..."
                      spellCheck={false}
                      autoComplete="off"
                    />
                  )}
                </div>
              </div>

              <div className="pb-resize-h" onMouseDown={startResize} />
            </>
          )}

          {/* ── CENTER: Preview + Device frame ── */}
          {mode !== 'analyzer' && (
            <div className="pb-preview-pane">
              {/* Preview toolbar */}
              <div className="pb-preview-toolbar">
                <button className={`pb-ptb-btn${showSafe ? ' on' : ''}`} onClick={() => setShowSafe(s => !s)}>
                  🔴 Safe Zones
                </button>
                <button className={`pb-ptb-btn${showChrome ? ' on' : ''}`} onClick={() => setShowChrome(s => !s)}>
                  🌐 Browser Chrome
                </button>
                <button className={`pb-ptb-btn${rotated ? ' on' : ''}`} onClick={() => setRotated(r => !r)}>
                  ↺ Rotate
                </button>
                <div className="pb-sep" />
                <button className="pb-ptb-btn" onClick={() => setZoom(z => Math.min(1.5, Math.round((z + 0.1) * 10) / 10))}>＋</button>
                <span className="pb-zoom-val">{Math.round(zoom * 100)}%</span>
                <button className="pb-ptb-btn" onClick={() => setZoom(z => Math.max(0.2, Math.round((z - 0.1) * 10) / 10))}>－</button>
                <button className="pb-ptb-btn" onClick={() => setZoom(0.65)} style={{ fontSize: 8 }}>Reset</button>
                {mode === 'editor' && selectedElement && (
                  <>
                    <div className="pb-sep" />
                    <button
                      className="pb-ptb-btn on"
                      onClick={() => { iframeRef.current?.contentWindow?.postMessage({ type: 'fe-activate-inspector' }, '*') }}
                    >
                      👆 Click to Select
                    </button>
                  </>
                )}
              </div>

              {/* Canvas */}
              <div className="pb-preview-canvas">
                <DeviceFrame
                  device={device}
                  rotated={rotated}
                  zoom={zoom}
                  html={previewHtml}
                  previewUrl={null}
                  showSafe={showSafe}
                  showChrome={showChrome}
                  iframeRef={iframeRef}
                />
              </div>
            </div>
          )}

          {/* ── RIGHT: Inspector panel (editor mode + element selected) ── */}
          {mode === 'editor' && selectedElement && (
            <div className="pb-inspector">
              <div className="pb-insp-hdr">
                <div className="pb-insp-title">Inspector</div>
                <div className="pb-insp-tag">&lt;{selectedElement.tag}&gt;</div>
              </div>
              <div className="pb-insp-body">

                {/* Colors */}
                <div className="pb-insp-section">
                  <div className="pb-insp-section-title">Color</div>
                  <div className="pb-insp-row">
                    <span className="pb-insp-label">Text</span>
                    <div className="pb-color-swatch" style={{ background: selectedElement.styles.color || '#fff' }}>
                      <input type="color" value={toHex(selectedElement.styles.color || '#ffffff')} onChange={e => applyStyle('color', e.target.value)} />
                    </div>
                    <input className="pb-insp-val" value={selectedElement.styles.color || ''} onChange={e => applyStyle('color', e.target.value)} />
                  </div>
                  <div className="pb-insp-row">
                    <span className="pb-insp-label">BG</span>
                    <div className="pb-color-swatch" style={{ background: selectedElement.styles.backgroundColor || 'transparent' }}>
                      <input type="color" value={toHex(selectedElement.styles.backgroundColor || '#000000')} onChange={e => applyStyle('backgroundColor', e.target.value)} />
                    </div>
                    <input className="pb-insp-val" value={selectedElement.styles.backgroundColor || ''} onChange={e => applyStyle('backgroundColor', e.target.value)} />
                  </div>
                </div>

                {/* Typography */}
                <div className="pb-insp-section">
                  <div className="pb-insp-section-title">Typography</div>
                  <div className="pb-insp-row">
                    <span className="pb-insp-label">Size</span>
                    <input type="range" className="pb-slider" min={8} max={96} step={1}
                      value={parsePx(selectedElement.styles.fontSize || '16px')}
                      onChange={e => applyStyle('fontSize', e.target.value + 'px')} />
                    <span className="pb-slider-val">{parsePx(selectedElement.styles.fontSize || '16px')}px</span>
                  </div>
                  <div className="pb-insp-row">
                    <span className="pb-insp-label">Weight</span>
                    <input type="range" className="pb-slider" min={100} max={900} step={100}
                      value={parsePx(selectedElement.styles.fontWeight || '400')}
                      onChange={e => applyStyle('fontWeight', e.target.value)} />
                    <span className="pb-slider-val">{selectedElement.styles.fontWeight || '400'}</span>
                  </div>
                  <div className="pb-insp-row">
                    <span className="pb-insp-label">Line H</span>
                    <input type="range" className="pb-slider" min={1} max={3} step={0.05}
                      value={parseFloat(selectedElement.styles.lineHeight || '1.5') || 1.5}
                      onChange={e => applyStyle('lineHeight', e.target.value)} />
                    <span className="pb-slider-val">{(parseFloat(selectedElement.styles.lineHeight || '1.5') || 1.5).toFixed(1)}</span>
                  </div>
                </div>

                {/* Spacing */}
                <div className="pb-insp-section">
                  <div className="pb-insp-section-title">Spacing</div>
                  <div className="pb-insp-row">
                    <span className="pb-insp-label">Padding</span>
                    <input type="range" className="pb-slider" min={0} max={80} step={1}
                      value={parsePx(selectedElement.styles.padding || '0px')}
                      onChange={e => applyStyle('padding', e.target.value + 'px')} />
                    <span className="pb-slider-val">{parsePx(selectedElement.styles.padding || '0px')}px</span>
                  </div>
                  <div className="pb-insp-row">
                    <span className="pb-insp-label">Radius</span>
                    <input type="range" className="pb-slider" min={0} max={60} step={1}
                      value={parsePx(selectedElement.styles.borderRadius || '0px')}
                      onChange={e => applyStyle('borderRadius', e.target.value + 'px')} />
                    <span className="pb-slider-val">{parsePx(selectedElement.styles.borderRadius || '0px')}px</span>
                  </div>
                  <div className="pb-insp-row">
                    <span className="pb-insp-label">Opacity</span>
                    <input type="range" className="pb-slider" min={0} max={1} step={0.01}
                      value={parseFloat(selectedElement.styles.opacity || '1')}
                      onChange={e => applyStyle('opacity', e.target.value)} />
                    <span className="pb-slider-val">{Math.round(parseFloat(selectedElement.styles.opacity || '1') * 100)}%</span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {mode === 'editor' && !selectedElement && (
            <div className="pb-inspector">
              <div className="pb-empty-insp">
                <div className="pb-empty-insp-icon">👆</div>
                <div>Click <strong>👆 Click to Select</strong> then tap any element in the preview</div>
              </div>
            </div>
          )}

          {/* ── Analyzer mode ── */}
          {mode === 'analyzer' && (
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <ImageAnalyzer onGenerateCode={handleGenerateCode} />
            </div>
          )}

        </div>
      </div>
    </>
  )
}
