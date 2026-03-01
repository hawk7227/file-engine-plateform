'use client'

import { useState } from 'react'

const S = {
  sec: { padding: '12px 14px', borderBottom: '1px solid var(--wp-border)' },
  label: { fontSize: 7, fontWeight: 700, color: 'var(--wp-text-3)', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: 6, display: 'block' },
  inp: { width: '100%', background: 'var(--wp-bg-3)', border: '1px solid var(--wp-border)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: 'var(--wp-text-1)', fontFamily: 'var(--wp-font)', outline: 'none', resize: 'none' as const, lineHeight: 1.5 },
  chip: (on: boolean) => ({ flex: 1, padding: '6px 4px', borderRadius: 8, fontSize: 8, fontWeight: 700, border: `1px solid ${on ? 'rgba(167,139,250,.2)' : 'var(--wp-border)'}`, background: on ? 'var(--wp-purple-dim)' : 'var(--wp-bg-3)', color: on ? 'var(--wp-purple)' : 'var(--wp-text-3)', cursor: 'pointer', textAlign: 'center' as const, fontFamily: 'var(--wp-font)' }),
  gbtn: { width: '100%', padding: 10, borderRadius: 12, fontSize: 11, fontWeight: 900, border: 'none', cursor: 'pointer', fontFamily: 'var(--wp-font)', background: '#ec4899', color: '#fff' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, padding: 8 },
  cell: (bg: string) => ({ aspectRatio: '1', borderRadius: 8, border: '1px solid var(--wp-border)', overflow: 'hidden', cursor: 'pointer', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, transition: 'transform .15s' }),
}

interface Props {
  toast: (t: string, m: string, type?: string) => void
  logActivity: (type: string, detail: Record<string, unknown>) => Promise<void>
}

export function WPImageStudio({ toast, logActivity }: Props) {
  const [prompt, setPrompt] = useState('Clean UI dashboard, dark theme, data viz')
  const [size, setSize] = useState('1024x1024')
  const [images, setImages] = useState<Array<{ id: string; url: string | null; icon: string; bg: string }>>([
    { id: '1', url: null, icon: '', bg: 'var(--wp-accent)' },
    { id: '2', url: null, icon: '', bg: 'var(--wp-accent)' },
    { id: '3', url: null, icon: '', bg: 'var(--wp-accent)' },
    { id: '4', url: null, icon: '', bg: 'var(--wp-accent)' },
    { id: '5', url: null, icon: '', bg: 'var(--wp-accent)' },
    { id: '6', url: null, icon: '', bg: 'var(--wp-accent)' },
  ])

  const handleGenerate = async () => {
    toast('Generating', `4 images at ${size}`, 'nfo')
    logActivity('image_generate', { prompt: prompt.substring(0, 100), size })

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, size, n: 4 }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.images?.length) {
          setImages(prev => {
            const next = [...prev]
            data.images.forEach((url: string, i: number) => {
              if (next[i]) next[i] = { ...next[i], url }
            })
            return next
          })
          toast('Done', `${data.images.length} images generated`, 'ok')
        }
      } else {
        toast('Error', 'Generation failed', 'err')
      }
    } catch {
      toast('Error', 'API unreachable', 'err')
    }
  }

  return (
    <div>
      <div style={S.sec}>
        <span style={S.label}>Prompt</span>
        <textarea style={S.inp} rows={2} value={prompt} onChange={e => setPrompt(e.target.value)} />
      </div>
      <div style={S.sec}>
        <div style={{ fontSize: 8, color: 'var(--wp-text-3)', marginBottom: 4 }}>Size</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['1024x1024', '1792x1024', '1024x1792'].map(s => (
            <button key={s} style={S.chip(size === s)} onClick={() => setSize(s)}>
              {s === '1024x1024' ? '1024²' : s}
            </button>
          ))}
        </div>
      </div>
      <div style={S.sec}>
        <button style={S.gbtn} onClick={handleGenerate}> Generate Images</button>
      </div>
      <div style={S.sec}>
        <span style={S.label}>Gallery</span>
        <div style={S.grid}>
          {images.map(img => (
            <div
              key={img.id}
              style={S.cell(img.bg)}
              onClick={() => {
                if (img.url) { toast('Image', 'Opening full size', 'nfo'); window.open(img.url, '_blank') }
              }}
            >
              {img.url ? <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : img.icon}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
