'use client'

import { useState, useCallback } from 'react'
import { THEME_SCHEMES, applyTheme, saveThemeId } from '@/lib/theme-engine'
import type { ThemeScheme } from '@/lib/theme-engine'

// =====================================================
// WPThemePanel — Full color scheme picker
//
// - Grid of preset schemes (dark, light, bold categories)
// - Live preview swatches per scheme
// - Click to apply instantly
// - Current scheme highlighted
// =====================================================

const CSS = `
.wpt-panel{padding:12px;overflow-y:auto;height:100%}
.wpt-title{font-size:11px;font-weight:700;color:var(--wp-text-1);margin-bottom:12px}
.wpt-cat{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--wp-text-3);margin:12px 0 6px;padding-bottom:4px;border-bottom:1px solid var(--wp-border)}
.wpt-cat:first-of-type{margin-top:0}
.wpt-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.wpt-card{position:relative;padding:8px;border-radius:10px;border:2px solid var(--wp-border);cursor:pointer;transition:all .18s ease;overflow:hidden}
.wpt-card:hover{border-color:var(--wp-text-4);transform:translateY(-1px)}
.wpt-card.active{border-color:var(--wp-accent);box-shadow:0 0 0 1px var(--wp-accent)}
.wpt-card-name{font-size:9px;font-weight:700;margin-bottom:6px;letter-spacing:.02em}
.wpt-swatches{display:flex;gap:3px;margin-bottom:4px}
.wpt-swatch{width:16px;height:16px;border-radius:4px;border:1px solid rgba(128,128,128,.2);flex-shrink:0}
.wpt-preview{height:28px;border-radius:6px;display:flex;align-items:center;padding:0 6px;gap:4px;font-size:7px;font-weight:600;overflow:hidden}
.wpt-preview-dot{width:6px;height:6px;border-radius:99px;flex-shrink:0}
.wpt-preview-bar{flex:1;height:3px;border-radius:2px;opacity:.3}
.wpt-check{position:absolute;top:5px;right:5px;width:14px;height:14px;border-radius:99px;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:900}
`

interface Props {
  activeSchemeId: string
  onSchemeChange: (scheme: ThemeScheme) => void
}

export function WPThemePanel({ activeSchemeId, onSchemeChange }: Props) {
  const handleSelect = useCallback((scheme: ThemeScheme) => {
    applyTheme(scheme)
    saveThemeId(scheme.id)
    onSchemeChange(scheme)
  }, [onSchemeChange])

  const categories: { key: string; label: string; schemes: ThemeScheme[] }[] = [
    { key: 'dark', label: '🌙 Dark', schemes: THEME_SCHEMES.filter(s => s.category === 'dark') },
    { key: 'light', label: '☀️ Light', schemes: THEME_SCHEMES.filter(s => s.category === 'light') },
    { key: 'bold', label: '🔥 Bold & Bright', schemes: THEME_SCHEMES.filter(s => s.category === 'bold') },
  ]

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="wpt-panel">
        <div className="wpt-title">Color Schemes</div>

        {categories.map(cat => (
          <div key={cat.key}>
            <div className="wpt-cat">{cat.label}</div>
            <div className="wpt-grid">
              {cat.schemes.map(scheme => {
                const c = scheme.colors
                const isActive = scheme.id === activeSchemeId
                return (
                  <div
                    key={scheme.id}
                    className={`wpt-card${isActive ? ' active' : ''}`}
                    onClick={() => handleSelect(scheme)}
                    style={{ background: c.bg1 }}
                  >
                    {isActive && (
                      <div className="wpt-check" style={{ background: c.accent, color: c.bg0 }}>✓</div>
                    )}
                    <div className="wpt-card-name" style={{ color: c.text1 }}>{scheme.name}</div>
                    <div className="wpt-swatches">
                      <div className="wpt-swatch" style={{ background: c.bg0 }} title="Background" />
                      <div className="wpt-swatch" style={{ background: c.bg2 }} title="Panel" />
                      <div className="wpt-swatch" style={{ background: c.accent }} title="Accent" />
                      <div className="wpt-swatch" style={{ background: c.purple }} title="Purple" />
                      <div className="wpt-swatch" style={{ background: c.blue }} title="Blue" />
                      <div className="wpt-swatch" style={{ background: c.red }} title="Red" />
                      <div className="wpt-swatch" style={{ background: c.yellow }} title="Yellow" />
                    </div>
                    <div className="wpt-preview" style={{ background: c.bg0, border: `1px solid ${c.border}` }}>
                      <div className="wpt-preview-dot" style={{ background: c.accent }} />
                      <span style={{ color: c.text2, fontSize: 7 }}>Preview</span>
                      <div className="wpt-preview-bar" style={{ background: c.accent }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
