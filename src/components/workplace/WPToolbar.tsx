'use client'

import type { DevicePreset } from './WorkplaceLayout'

const S = {
  bar: { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderBottom: '1px solid var(--wp-border)', background: 'var(--wp-bg-2)', minHeight: 36, flexShrink: 0, overflowX: 'auto' as const },
  url: { display: 'flex', alignItems: 'center', background: 'var(--wp-bg-3)', border: '1px solid var(--wp-border)', borderRadius: 8, overflow: 'hidden', minWidth: 80, maxWidth: 200, flex: 1 },
  urlLk: { padding: '0 8px', fontSize: 9, color: 'var(--wp-accent)', flexShrink: 0 },
  urlInp: { flex: 1, background: 'none', border: 'none', fontSize: 9, color: 'var(--wp-text-3)', fontFamily: 'var(--wp-mono)', padding: '5px 8px 5px 0', outline: 'none', minWidth: 40 },
  dbar: { display: 'flex', background: 'var(--wp-bg-3)', borderRadius: 8, border: '1px solid var(--wp-border)', padding: 2, gap: 1 },
  dbtn: (on: boolean) => ({ padding: '3px 6px', borderRadius: 5, fontSize: 7, fontWeight: 700, border: 'none', background: on ? 'var(--wp-accent-dim)' : 'none', color: on ? 'var(--wp-accent)' : 'var(--wp-text-4)', cursor: 'pointer', whiteSpace: 'nowrap' as const, fontFamily: 'var(--wp-font)' }),
  webBtn: (on: boolean) => ({ padding: '3px 6px', borderRadius: 5, fontSize: 7, fontWeight: 700, border: `1px solid ${on ? 'rgba(96,165,250,.25)' : 'rgba(96,165,250,.1)'}`, background: on ? 'rgba(96,165,250,.12)' : 'linear-gradient(135deg,rgba(96,165,250,.08),rgba(167,139,250,.08))', color: 'var(--wp-blue)', cursor: 'pointer', fontFamily: 'var(--wp-font)' }),
  tb: { padding: '3px 6px', borderRadius: 6, fontSize: 8, fontWeight: 700, border: '1px solid var(--wp-border)', background: 'none', color: 'var(--wp-text-4)', cursor: 'pointer', fontFamily: 'var(--wp-font)' },
  sep: { width: 1, height: 16, background: 'var(--wp-border)', flexShrink: 0 },
  env: { fontSize: 7, fontWeight: 700, fontFamily: 'var(--wp-mono)', padding: '2px 8px', borderRadius: 20, background: 'rgba(251,191,36,.08)', color: 'var(--wp-yellow)', border: '1px solid rgba(251,191,36,.1)', flexShrink: 0 },
  zoom: { fontSize: 8, color: 'var(--wp-text-3)', fontFamily: 'var(--wp-mono)', minWidth: 28, textAlign: 'center' as const },
}

interface Props {
  activeDevice: DevicePreset
  devices: DevicePreset[]
  zoom: number
  showBrowser: boolean
  previewUrl: string | null
  previewPhase: string
  onDeviceChange: (d: DevicePreset) => void
  onZoomChange: (z: number) => void
  onToggleBrowser: () => void
  toast: (t: string, m: string, type?: string) => void
}

export function WPToolbar({
  activeDevice, devices, zoom, showBrowser, previewUrl, previewPhase,
  onDeviceChange, onZoomChange, onToggleBrowser, toast,
}: Props) {
  return (
    <div style={S.bar}>
      <div style={S.url}>
        <span style={S.urlLk}>🔒</span>
        <input
          style={S.urlInp}
          value={previewUrl || 'staging.fileengine.com'}
          readOnly
        />
      </div>

      <div style={S.dbar}>
        {devices.map(d => (
          <button
            key={d.id}
            style={S.dbtn(activeDevice.id === d.id)}
            onClick={() => onDeviceChange(d)}
          >
            {d.label}
          </button>
        ))}
      </div>

      <button style={S.webBtn(showBrowser)} onClick={onToggleBrowser}>
        {showBrowser ? '✕ Web' : '+ Web'}
      </button>

      <div style={S.sep} />

      <button style={S.tb} onClick={() => onZoomChange(Math.max(0.2, zoom - 0.1))} title="Zoom Out">−</button>
      <span style={S.zoom}>{Math.round(zoom * 100)}%</span>
      <button style={S.tb} onClick={() => onZoomChange(Math.min(1.5, zoom + 0.1))} title="Zoom In">+</button>

      <button style={S.tb} onClick={() => toast('Refreshed', 'Preview reloaded', 'nfo')} title="Refresh">🔄</button>

      <div style={S.sep} />

      <span style={S.env}>STAGING</span>

      {previewPhase !== 'idle' && (
        <span style={{
          fontSize: 7, fontWeight: 700, fontFamily: 'var(--wp-mono)', padding: '2px 8px', borderRadius: 20,
          background: previewPhase === 'error' ? 'rgba(248,113,113,.08)' : previewPhase === 'previewing' || previewPhase === 'complete' ? 'rgba(52,211,153,.08)' : 'rgba(96,165,250,.08)',
          color: previewPhase === 'error' ? 'var(--wp-red)' : previewPhase === 'previewing' || previewPhase === 'complete' ? 'var(--wp-accent)' : 'var(--wp-blue)',
        }}>
          {previewPhase === 'error' ? '❌ FAIL' : previewPhase === 'previewing' || previewPhase === 'complete' ? '✅ PASS' : '⏳ ' + previewPhase.toUpperCase()}
        </span>
      )}
    </div>
  )
}
