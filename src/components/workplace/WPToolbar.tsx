'use client'

import type { DevicePreset } from './WorkplaceLayout'

const CSS = `
.wpt-bar{display:flex;align-items:center;gap:6px;padding:4px 8px;border-bottom:1px solid var(--wp-border);background:var(--wp-bg-2);min-height:36px;flex-shrink:0;overflow-x:auto}
.wpt-bar::-webkit-scrollbar{display:none}
.wpt-url{display:flex;align-items:center;background:var(--wp-bg-3);border:1px solid var(--wp-border);border-radius:8px;overflow:hidden;min-width:80px;max-width:200px;flex:1}
.wpt-url-lk{padding:0 8px;font-size:9px;color:var(--wp-accent);flex-shrink:0}
.wpt-url-inp{flex:1;background:none;border:none;font-size:9px;color:var(--wp-text-3);font-family:var(--wp-mono);padding:5px 8px 5px 0;outline:none;min-width:40px}
.wpt-dbar{display:flex;background:var(--wp-bg-3);border-radius:8px;border:1px solid var(--wp-border);padding:2px;gap:1px}
.wpt-dbtn{padding:3px 6px;border-radius:5px;font-size:7px;font-weight:700;border:none;cursor:pointer;white-space:nowrap;font-family:var(--wp-font);transition:background .15s,color .15s}
.wpt-dbtn.off{background:none;color:var(--wp-text-4)}.wpt-dbtn.off:hover{color:var(--wp-text-2)}
.wpt-dbtn.on{background:var(--wp-accent-dim);color:var(--wp-accent)}
.wpt-sep{width:1px;height:16px;background:var(--wp-border);flex-shrink:0}
.wpt-btn{padding:3px 6px;border-radius:8px;font-size:8px;font-weight:700;border:1px solid var(--wp-border);background:none;color:var(--wp-text-4);cursor:pointer;font-family:var(--wp-font);transition:all .15s;white-space:nowrap}
.wpt-btn:hover{border-color:var(--wp-border-2);color:var(--wp-text-2)}
.wpt-btn.active{background:var(--wp-accent-dim);border-color:rgba(52,211,153,.2);color:var(--wp-accent)}
.wpt-web{padding:3px 6px;border-radius:5px;font-size:7px;font-weight:700;cursor:pointer;font-family:var(--wp-font);transition:all .15s}
.wpt-web.off{border:1px solid rgba(96,165,250,.1);background:rgba(167,139,250,.08);color:var(--wp-blue)}
.wpt-web.on{border:1px solid rgba(96,165,250,.25);background:rgba(96,165,250,.12);color:var(--wp-blue)}
.wpt-zoom{font-size:8px;color:var(--wp-text-3);font-family:var(--wp-mono);min-width:28px;text-align:center}
.wpt-env{font-size:7px;font-weight:700;font-family:var(--wp-mono);padding:2px 8px;border-radius:20px;background:rgba(251,191,36,.08);color:var(--wp-yellow);border:1px solid rgba(251,191,36,.1);flex-shrink:0}
.wpt-phase{font-size:7px;font-weight:700;font-family:var(--wp-mono);padding:2px 8px;border-radius:20px;flex-shrink:0}
.wpt-phase.err{background:rgba(248,113,113,.08);color:var(--wp-red)}
.wpt-phase.ok{background:rgba(52,211,153,.08);color:var(--wp-accent)}
.wpt-phase.busy{background:rgba(96,165,250,.08);color:var(--wp-blue)}
.wpt-theme{padding:3px 8px;border-radius:6px;font-size:9px;border:1px solid var(--wp-border);background:none;cursor:pointer;transition:all .15s}
.wpt-theme.dark{color:var(--wp-yellow)}.wpt-theme.light{color:var(--wp-blue)}
.wpt-theme:hover{border-color:var(--wp-border-2)}
.wpt-rotate{padding:3px 6px;border-radius:6px;font-size:9px;border:1px solid var(--wp-border);background:none;color:var(--wp-text-4);cursor:pointer;transition:all .15s}
.wpt-rotate:hover{border-color:var(--wp-border-2);color:var(--wp-text-2)}
.wpt-rotate.on{background:var(--wp-purple-dim);border-color:rgba(167,139,250,.2);color:var(--wp-purple)}
`

interface Props {
  activeDevice: DevicePreset
  devices: DevicePreset[]
  zoom: number
  showBrowser: boolean
  previewUrl: string | null
  previewPhase: string
  rotated: boolean
  theme: 'dark' | 'light'
  onDeviceChange: (d: DevicePreset) => void
  onZoomChange: (z: number) => void
  onToggleBrowser: () => void
  onToggleRotation: () => void
  onToggleTheme: () => void
  onRefresh: () => void
  toast: (t: string, m: string, type?: string) => void
}

export function WPToolbar({
  activeDevice, devices, zoom, showBrowser, previewUrl, previewPhase,
  rotated, theme,
  onDeviceChange, onZoomChange, onToggleBrowser, onToggleRotation, onToggleTheme, onRefresh, toast,
}: Props) {
  const phaseClass = previewPhase === 'error' ? 'err' : (previewPhase === 'previewing' || previewPhase === 'complete') ? 'ok' : 'busy'
  const phaseText = previewPhase === 'error' ? 'FAIL' : (previewPhase === 'previewing' || previewPhase === 'complete') ? 'PASS' : previewPhase.toUpperCase()

  return (
    <>
      <style>{CSS}</style>
      <div className="wpt-bar">
        {/* URL bar */}
        <div className="wpt-url">
          <span className="wpt-url-lk">🔒</span>
          <input className="wpt-url-inp" value={previewUrl || 'staging.fileengine.com'} readOnly />
        </div>

        {/* Device selector */}
        <div className="wpt-dbar">
          {devices.map(d => (
            <button key={d.id} className={`wpt-dbtn ${activeDevice.id === d.id ? 'on' : 'off'}`} onClick={() => onDeviceChange(d)}>
              {d.label}
            </button>
          ))}
        </div>

        {/* Rotation toggle */}
        <button className={`wpt-rotate ${rotated ? 'on' : ''}`} onClick={onToggleRotation} title="Rotate device">
          ↻ {rotated ? 'Land' : 'Port'}
        </button>

        {/* Theme toggle */}
        <button className={`wpt-theme ${theme}`} onClick={onToggleTheme} title="Toggle preview theme">
          {theme === 'dark' ? '☀ Light' : '🌙 Dark'}
        </button>

        {/* Browser toggle */}
        <button className={`wpt-web ${showBrowser ? 'on' : 'off'}`} onClick={onToggleBrowser}>
          {showBrowser ? '✓ Web' : '+ Web'}
        </button>

        <div className="wpt-sep" />

        {/* Zoom controls */}
        <button className="wpt-btn" onClick={() => onZoomChange(Math.max(0.2, zoom - 0.1))} title="Zoom Out">−</button>
        <span className="wpt-zoom">{Math.round(zoom * 100)}%</span>
        <button className="wpt-btn" onClick={() => onZoomChange(Math.min(1.5, zoom + 0.1))} title="Zoom In">+</button>

        {/* Refresh */}
        <button className="wpt-btn" onClick={onRefresh} title="Refresh preview">⟳</button>

        <div className="wpt-sep" />

        <span className="wpt-env">STAGING</span>

        {previewPhase !== 'idle' && (
          <span className={`wpt-phase ${phaseClass}`}>{phaseText}</span>
        )}
      </div>
    </>
  )
}
