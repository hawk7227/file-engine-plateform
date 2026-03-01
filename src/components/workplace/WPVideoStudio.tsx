'use client'

import { useState } from 'react'

const S = {
  sec: { padding: '12px 14px', borderBottom: '1px solid var(--wp-border)' },
  label: { fontSize: 7, fontWeight: 700, color: 'var(--wp-text-3)', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: 6, display: 'block' },
  inp: { width: '100%', background: 'var(--wp-bg-3)', border: '1px solid var(--wp-border)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: 'var(--wp-text-1)', fontFamily: 'var(--wp-font)', outline: 'none' },
  chips: { display: 'flex', gap: 4 },
  chip: (on: boolean) => ({ flex: 1, padding: '6px 4px', borderRadius: 8, fontSize: 8, fontWeight: 700, border: `1px solid ${on ? 'rgba(52,211,153,.2)' : 'var(--wp-border)'}`, background: on ? 'var(--wp-accent-dim)' : 'var(--wp-bg-3)', color: on ? 'var(--wp-accent)' : 'var(--wp-text-3)', cursor: 'pointer', textAlign: 'center' as const, fontFamily: 'var(--wp-font)' }),
  gbtn: { width: '100%', padding: 10, borderRadius: 12, fontSize: 11, fontWeight: 900, border: 'none', cursor: 'pointer', fontFamily: 'var(--wp-font)', background: 'var(--wp-accent)', color: '#000' },
  pipe: { padding: 10, background: 'var(--wp-bg-3)', border: '1px solid var(--wp-border)', borderRadius: 12, marginBottom: 6 },
}

interface Props {
  toast: (t: string, m: string, type?: string) => void
  logActivity: (type: string, detail: Record<string, unknown>) => Promise<void>
}

export function WPVideoStudio({ toast, logActivity }: Props) {
  const [model, setModel] = useState('gen4-turbo')
  const [aspect, setAspect] = useState('16:9')
  const [title, setTitle] = useState('Product Demo Explainer')
  const [prompt, setPrompt] = useState('30-second explainer showing File Engine workflow')

  const handleGenerate = () => {
    toast('Pipeline', 'Rendering started', 'nfo')
    logActivity('video_generate', { title, model, aspect })
  }

  return (
    <div>
      <div style={S.sec}><span style={S.label}>Title</span><input style={S.inp} value={title} onChange={e => setTitle(e.target.value)} /></div>
      <div style={S.sec}><span style={S.label}>Prompt</span><textarea style={{ ...S.inp, resize: 'none', lineHeight: 1.5 }} rows={3} value={prompt} onChange={e => setPrompt(e.target.value)} /></div>
      <div style={S.sec}>
        <div style={{ fontSize: 8, color: 'var(--wp-text-3)', marginBottom: 4 }}>Model</div>
        <div style={S.chips}>
          {['gen4-turbo', 'gen4.5', 'gen3a'].map(m => (
            <button key={m} style={S.chip(model === m)} onClick={() => setModel(m)}>{m === 'gen4-turbo' ? 'Gen-4 Turbo' : m === 'gen4.5' ? 'Gen-4.5' : 'Gen-3α'}</button>
          ))}
        </div>
        <div style={{ fontSize: 8, color: 'var(--wp-text-3)', margin: '8px 0 4px' }}>Aspect</div>
        <div style={S.chips}>
          {['16:9', '9:16', '1:1'].map(a => (
            <button key={a} style={S.chip(aspect === a)} onClick={() => setAspect(a)}>{a}</button>
          ))}
        </div>
      </div>
      <div style={S.sec}><button style={S.gbtn} onClick={handleGenerate}> Generate Video</button></div>
      <div style={S.sec}><span style={S.label}>Pipeline</span>
        <div style={S.pipe}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700 }}>Demo v2</span>
            <span style={{ fontSize: 6, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: 'rgba(96,165,250,.1)', color: 'var(--wp-blue)' }}>RENDERING</span>
          </div>
          <div style={{ height: 4, background: 'var(--wp-bg-4)', borderRadius: 4, overflow: 'hidden', marginTop: 6 }}>
            <div style={{ width: '68%', height: '100%', borderRadius: 4, background: 'var(--wp-accent)' }} />
          </div>
        </div>
        <div style={S.pipe}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700 }}>Explainer v1</span>
            <span style={{ fontSize: 6, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: 'rgba(52,211,153,.1)', color: 'var(--wp-accent)' }}>DONE</span>
          </div>
          <div style={{ height: 4, background: 'var(--wp-bg-4)', borderRadius: 4, overflow: 'hidden', marginTop: 6 }}>
            <div style={{ width: '100%', height: '100%', borderRadius: 4, background: 'var(--wp-accent)' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
