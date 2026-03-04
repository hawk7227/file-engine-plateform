'use client'

import { useState, useEffect, useCallback } from 'react'

// =====================================================
// WPAdminKeysPanel — API Key Management
// Reads/writes keys via /api/admin/keys
// Encrypted in Supabase, decrypted server-side only
// =====================================================

const CSS = `
.wak-wrap{padding:16px;height:100%;overflow-y:auto;font-family:var(--wp-font)}
.wak-hdr{font-size:14px;font-weight:800;color:var(--wp-text-1);margin-bottom:4px}
.wak-sub{font-size:10px;color:var(--wp-text-4);margin-bottom:16px;line-height:1.5}
.wak-section{margin-bottom:20px}
.wak-section-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--wp-text-3);margin-bottom:8px;display:flex;align-items:center;gap:6px}
.wak-section-title span{font-size:14px}
.wak-row{display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--wp-bg-3);border:1px solid var(--wp-border);border-radius:10px;margin-bottom:6px;transition:border-color .15s}
.wak-row:hover{border-color:var(--wp-border-2)}
.wak-row-label{font-size:9px;font-weight:700;color:var(--wp-text-2);min-width:140px;font-family:var(--wp-mono);flex-shrink:0}
.wak-row-status{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.wak-row-status.active{background:var(--wp-accent);box-shadow:0 0 6px rgba(0,245,160,.3)}
.wak-row-status.inactive{background:var(--wp-red);opacity:.4}
.wak-row-masked{font-size:10px;font-family:var(--wp-mono);color:var(--wp-text-4);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wak-row-source{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:2px 6px;border-radius:4px;flex-shrink:0}
.wak-row-source.env{background:rgba(59,130,255,.1);color:var(--wp-blue)}
.wak-row-source.database{background:rgba(0,245,160,.1);color:var(--wp-accent)}
.wak-row-source.none{background:rgba(255,59,92,.06);color:var(--wp-red)}
.wak-row-actions{display:flex;gap:4px;flex-shrink:0}
.wak-btn{padding:4px 8px;border-radius:6px;font-size:9px;font-weight:700;border:1px solid var(--wp-border);background:none;color:var(--wp-text-3);cursor:pointer;transition:all .15s}
.wak-btn:hover{border-color:var(--wp-accent);color:var(--wp-accent)}
.wak-btn.danger:hover{border-color:var(--wp-red);color:var(--wp-red)}
.wak-btn.save{border-color:var(--wp-accent);color:var(--wp-accent);background:rgba(0,245,160,.06)}
.wak-btn.save:hover{background:rgba(0,245,160,.12)}
.wak-btn:disabled{opacity:.3;cursor:not-allowed}
.wak-input{flex:1;background:var(--wp-bg-2);border:1px solid var(--wp-border);border-radius:8px;padding:6px 10px;font-size:11px;font-family:var(--wp-mono);color:var(--wp-text-1);outline:none;transition:border-color .15s}
.wak-input:focus{border-color:var(--wp-accent)}
.wak-input::placeholder{color:var(--wp-text-4)}
.wak-edit-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:8px 10px;background:var(--wp-bg-2);border:1px solid var(--wp-accent);border-radius:10px;margin-bottom:6px}
.wak-edit-row .wak-row-label{width:100%;font-size:10px;font-weight:700;color:var(--wp-accent);font-family:var(--wp-mono);margin-bottom:2px}
.wak-edit-row .wak-input{flex:1;min-width:0}
.wak-edit-row .wak-btn{flex-shrink:0}
.wak-loading{text-align:center;padding:32px;color:var(--wp-text-4);font-size:12px}
.wak-error{padding:10px 12px;border-radius:8px;background:rgba(255,59,92,.06);border:1px solid rgba(255,59,92,.15);color:var(--wp-red);font-size:11px;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:6px}
.wak-success{padding:10px 12px;border-radius:8px;background:rgba(0,245,160,.06);border:1px solid rgba(0,245,160,.15);color:var(--wp-accent);font-size:11px;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:6px}
.wak-capacity{padding:10px 12px;border-radius:10px;background:var(--wp-bg-3);border:1px solid var(--wp-border);margin-bottom:16px}
.wak-cap-row{display:flex;justify-content:space-between;align-items:center;font-size:10px;margin-bottom:4px}
.wak-cap-label{color:var(--wp-text-3);font-weight:700}
.wak-cap-value{font-family:var(--wp-mono);font-weight:800;color:var(--wp-text-1)}
.wak-cap-bar{height:4px;border-radius:2px;background:var(--wp-bg-2);margin-top:6px;overflow:hidden}
.wak-cap-fill{height:100%;border-radius:2px;background:linear-gradient(90deg,var(--wp-accent),var(--wp-cyan));transition:width .3s}
`

interface KeyInfo {
  id: string
  active: boolean
  masked: string | null
  source: 'env' | 'database' | 'none' | 'error'
  updatedAt?: string
}

const KEY_SECTIONS = [
  {
    title: 'Anthropic Keys',
    icon: '🟣',
    keys: ['ANTHROPIC_API_KEY', 'ANTHROPIC_API_KEY_1', 'ANTHROPIC_API_KEY_2']
  },
  {
    title: 'OpenAI Keys',
    icon: '🟢',
    keys: ['OPENAI_API_KEY', 'OPENAI_API_KEY_1', 'OPENAI_API_KEY_2']
  },
  {
    title: 'Media Generation',
    icon: '🎨',
    keys: ['GOOGLE_AI_API_KEY', 'ELEVENLABS_API_KEY']
  },
]

interface Props {
  toast: (title: string, message: string, type?: string) => void
  accessToken?: string | null
}

export function WPAdminKeysPanel({ toast, accessToken }: Props) {
  const [keys, setKeys] = useState<KeyInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  // Admin secret — set NEXT_PUBLIC_ADMIN_SECRET in Vercel
  // Must match ADMIN_PANEL_SECRET on server side
  const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET || ''

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    // Include admin secret if available
    if (adminSecret) {
      headers['X-Admin-Secret'] = adminSecret
    }
    // Always include Bearer token too as fallback
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }
    return headers
  }, [accessToken, adminSecret])

  const loadKeys = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/keys', { headers })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setKeys(data.keys || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load keys')
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders])

  // Load keys on mount (admin secret = instant auth, no waiting)
  useEffect(() => { loadKeys() }, [loadKeys])

  const handleSave = async (keyName: string) => {
    if (!editValue.trim() || editValue.trim().length < 5) {
      setError('Key value too short')
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/keys', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ key_name: keyName, value: editValue.trim() })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      setEditingKey(null)
      setEditValue('')
      setSuccess(`${keyName} saved`)
      toast('Key Saved', `${keyName} encrypted and stored`, 'nfo')
      setTimeout(() => setSuccess(null), 3000)
      await loadKeys()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save key')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (keyName: string) => {
    setError(null)
    setSuccess(null)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/keys', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ key_name: keyName })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      toast('Key Removed', `${keyName} cleared`, 'nfo')
      await loadKeys()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete key')
    }
  }

  const runDebug = useCallback(async () => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/keys/debug', { headers })
      const data = await res.json()
      console.table(data.checks)
      setError(`DEBUG (check console): ${JSON.stringify(data.checks, null, 2)}`)
    } catch (e) {
      setError(`Debug fetch failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [getAuthHeaders])

  const activeCount = keys.filter(k => k.active).length
  const totalCount = keys.length
  const anthropicActive = keys.filter(k => k.id.startsWith('ANTHROPIC') && k.active).length
  const openaiActive = keys.filter(k => k.id.startsWith('OPENAI') && k.active).length

  return (
    <div className="wak-wrap">
      <style>{CSS}</style>
      <div className="wak-hdr">API Keys <button className="wak-btn" onClick={runDebug} style={{marginLeft:8,fontSize:9}}>⚙ Debug</button></div>
      <div className="wak-sub">
        Encrypted with AES-256-GCM. Stored in Supabase — no env vars needed.
        Keys are loaded automatically by the chat engine.
      </div>

      {error && <div className="wak-error"><span>⚠</span> {error}</div>}
      {success && <div className="wak-success"><span>✓</span> {success}</div>}

      <div className="wak-capacity">
        <div className="wak-cap-row">
          <span className="wak-cap-label">Active Keys</span>
          <span className="wak-cap-value">{activeCount} / {totalCount}</span>
        </div>
        <div className="wak-cap-row">
          <span className="wak-cap-label">Anthropic</span>
          <span className="wak-cap-value">{anthropicActive} key{anthropicActive !== 1 ? 's' : ''}</span>
        </div>
        <div className="wak-cap-row">
          <span className="wak-cap-label">OpenAI</span>
          <span className="wak-cap-value">{openaiActive} key{openaiActive !== 1 ? 's' : ''}</span>
        </div>
        <div className="wak-cap-row">
          <span className="wak-cap-label">Est. Capacity</span>
          <span className="wak-cap-value">~{activeCount * 50} req/min</span>
        </div>
        <div className="wak-cap-bar">
          <div className="wak-cap-fill" style={{ width: `${totalCount > 0 ? (activeCount / totalCount) * 100 : 0}%` }} />
        </div>
      </div>

      {loading ? (
        <div className="wak-loading">Loading keys...</div>
      ) : (
        KEY_SECTIONS.map(section => {
          const sectionKeys = keys.filter(k => section.keys.includes(k.id))
          if (sectionKeys.length === 0) return null
          return (
            <div key={section.title} className="wak-section">
              <div className="wak-section-title">
                <span>{section.icon}</span> {section.title}
              </div>
              {sectionKeys.map(k => (
                editingKey === k.id ? (
                  <div key={k.id} className="wak-edit-row">
                    <span className="wak-row-label">{k.id}</span>
                    <input
                      className="wak-input"
                      type="password"
                      placeholder={`Paste ${k.id}...`}
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSave(k.id); if (e.key === 'Escape') { setEditingKey(null); setEditValue(''); setError(null) } }}
                      autoFocus
                      disabled={saving}
                    />
                    <button className="wak-btn save" onClick={() => handleSave(k.id)} disabled={saving || !editValue.trim()}>
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button className="wak-btn" onClick={() => { setEditingKey(null); setEditValue(''); setError(null) }}>
                      Esc
                    </button>
                    {error && editingKey === k.id && (
                      <div style={{width:'100%',marginTop:4,padding:'4px 8px',borderRadius:6,background:'rgba(255,59,92,.1)',border:'1px solid rgba(255,59,92,.2)',color:'var(--wp-red)',fontSize:10,fontWeight:700}}>
                        ⚠ {error}
                      </div>
                    )}
                  </div>
                ) : (
                  <div key={k.id} className="wak-row">
                    <div className={`wak-row-status ${k.active ? 'active' : 'inactive'}`} />
                    <span className="wak-row-label">{k.id}</span>
                    <span className="wak-row-masked">{k.masked || '—'}</span>
                    <span className={`wak-row-source ${k.source}`}>{k.source}</span>
                    <div className="wak-row-actions">
                      <button className="wak-btn" onClick={() => { setEditingKey(k.id); setEditValue('') }}>
                        {k.active ? 'Update' : 'Set'}
                      </button>
                      {k.active && k.source === 'database' && (
                        <button className="wak-btn danger" onClick={() => handleDelete(k.id)}>
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                )
              ))}
            </div>
          )
        })
      )}
    </div>
  )
}
