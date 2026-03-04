'use client'

import { useState, useEffect, useCallback } from 'react'

// =====================================================
// WPAdminKeysPanel — API Key Management
// Stable layout: every row has FIXED height.
// Edit mode slides in WITHIN the same row — no reflow.
// =====================================================

const CSS = `
.wak-wrap{padding:16px;height:100%;overflow-y:auto;font-family:var(--wp-font)}
.wak-hdr{font-size:14px;font-weight:800;color:var(--wp-text-1);margin-bottom:4px;display:flex;align-items:center;gap:8px}
.wak-sub{font-size:10px;color:var(--wp-text-4);margin-bottom:16px;line-height:1.5}
.wak-section{margin-bottom:20px}
.wak-section-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--wp-text-3);margin-bottom:8px;display:flex;align-items:center;gap:6px}
.wak-section-title span{font-size:14px}

/* Single stable row — never replaced, only inner content swaps */
.wak-row{
  border-radius:10px;
  margin-bottom:6px;
  border:1px solid var(--wp-border);
  background:var(--wp-bg-3);
  overflow:hidden;
  transition:border-color .15s;
}
.wak-row.editing{border-color:var(--wp-accent);background:var(--wp-bg-2)}

/* Top line — always visible, fixed height */
.wak-row-top{
  display:flex;align-items:center;gap:8px;
  padding:8px 10px;
  min-height:36px;
}
.wak-row-status{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.wak-row-status.active{background:var(--wp-accent);box-shadow:0 0 6px rgba(0,245,160,.3)}
.wak-row-status.inactive{background:var(--wp-red);opacity:.4}
.wak-row-label{font-size:9px;font-weight:700;color:var(--wp-text-2);min-width:130px;font-family:var(--wp-mono);flex-shrink:0}
.wak-row.editing .wak-row-label{color:var(--wp-accent)}
.wak-row-masked{font-size:10px;font-family:var(--wp-mono);color:var(--wp-text-4);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wak-row-source{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:2px 6px;border-radius:4px;flex-shrink:0}
.wak-row-source.env{background:rgba(59,130,255,.1);color:var(--wp-blue)}
.wak-row-source.database{background:rgba(0,245,160,.1);color:var(--wp-accent)}
.wak-row-source.none{background:rgba(255,59,92,.06);color:var(--wp-red)}
.wak-row-actions{display:flex;gap:4px;flex-shrink:0}

/* Edit zone — expands below top line, zero height when closed */
.wak-row-edit{
  display:flex;align-items:center;gap:6px;
  padding:0 10px;
  max-height:0;overflow:hidden;
  transition:max-height .18s ease, padding .18s ease;
}
.wak-row.editing .wak-row-edit{
  max-height:48px;
  padding:0 10px 8px;
}
.wak-row-err{
  font-size:10px;font-weight:700;color:var(--wp-red);
  padding:0 10px;
  max-height:0;overflow:hidden;
  transition:max-height .15s ease, padding .15s ease;
}
.wak-row.editing.has-error .wak-row-err{
  max-height:32px;
  padding:0 10px 6px;
}

.wak-btn{padding:4px 8px;border-radius:6px;font-size:9px;font-weight:700;border:1px solid var(--wp-border);background:none;color:var(--wp-text-3);cursor:pointer;transition:all .15s;flex-shrink:0}
.wak-btn:hover{border-color:var(--wp-accent);color:var(--wp-accent)}
.wak-btn.danger:hover{border-color:var(--wp-red);color:var(--wp-red)}
.wak-btn.save{border-color:var(--wp-accent);color:var(--wp-accent);background:rgba(0,245,160,.06)}
.wak-btn.save:hover{background:rgba(0,245,160,.12)}
.wak-btn:disabled{opacity:.3;cursor:not-allowed}
.wak-input{flex:1;min-width:0;background:var(--wp-bg-3);border:1px solid var(--wp-border);border-radius:8px;padding:5px 10px;font-size:11px;font-family:var(--wp-mono);color:var(--wp-text-1);outline:none;transition:border-color .15s}
.wak-input:focus{border-color:var(--wp-accent)}
.wak-input::placeholder{color:var(--wp-text-4)}

.wak-loading{text-align:center;padding:32px;color:var(--wp-text-4);font-size:12px}
.wak-success{padding:8px 12px;border-radius:8px;background:rgba(0,245,160,.06);border:1px solid rgba(0,245,160,.15);color:var(--wp-accent);font-size:11px;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:6px}
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
    keys: ['ANTHROPIC_API_KEY', 'ANTHROPIC_API_KEY_1', 'ANTHROPIC_API_KEY_2'],
  },
  {
    title: 'OpenAI Keys',
    icon: '🟢',
    keys: ['OPENAI_API_KEY', 'OPENAI_API_KEY_1', 'OPENAI_API_KEY_2'],
  },
  {
    title: 'Media Generation',
    icon: '🎨',
    keys: ['GOOGLE_AI_API_KEY', 'ELEVENLABS_API_KEY'],
  },
]

interface Props {
  toast: (title: string, message: string, type?: string) => void
  accessToken?: string | null
}

export function WPAdminKeysPanel({ toast, accessToken }: Props) {
  const [keys, setKeys] = useState<KeyInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState<string | null>(null)
  // Per-row edit state — no global editingKey that causes full rerender
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET || ''

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (adminSecret) headers['X-Admin-Secret'] = adminSecret
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`
    return headers
  }, [accessToken, adminSecret])

  const loadKeys = useCallback(async () => {
    setLoading(true)
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
      // Surface load error as a row-level error on first key
      console.error('[WPAdminKeysPanel] loadKeys failed:', e)
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders])

  useEffect(() => { loadKeys() }, [loadKeys])

  const startEdit = (keyId: string) => {
    setEditingKey(keyId)
    setEditValues(prev => ({ ...prev, [keyId]: '' }))
    setRowErrors(prev => { const n = { ...prev }; delete n[keyId]; return n })
  }

  const cancelEdit = (keyId: string) => {
    setEditingKey(null)
    setEditValues(prev => { const n = { ...prev }; delete n[keyId]; return n })
    setRowErrors(prev => { const n = { ...prev }; delete n[keyId]; return n })
  }

  const handleSave = async (keyId: string) => {
    const val = (editValues[keyId] || '').trim()
    if (val.length < 5) {
      setRowErrors(prev => ({ ...prev, [keyId]: 'Key too short' }))
      return
    }
    setSavingKey(keyId)
    setRowErrors(prev => { const n = { ...prev }; delete n[keyId]; return n })
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/keys', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ key_name: keyId, value: val }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      setEditingKey(null)
      setEditValues(prev => { const n = { ...prev }; delete n[keyId]; return n })
      setSuccess(`${keyId} saved`)
      toast('Key Saved', `${keyId} encrypted and stored`, 'nfo')
      setTimeout(() => setSuccess(null), 3000)
      await loadKeys()
    } catch (e) {
      setRowErrors(prev => ({ ...prev, [keyId]: e instanceof Error ? e.message : 'Save failed' }))
    } finally {
      setSavingKey(null)
    }
  }

  const handleDelete = async (keyId: string) => {
    setRowErrors(prev => { const n = { ...prev }; delete n[keyId]; return n })
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/keys', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ key_name: keyId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      toast('Key Removed', `${keyId} cleared`, 'nfo')
      await loadKeys()
    } catch (e) {
      setRowErrors(prev => ({ ...prev, [keyId]: e instanceof Error ? e.message : 'Delete failed' }))
    }
  }

  const activeCount = keys.filter(k => k.active).length
  const totalCount = keys.length
  const anthropicActive = keys.filter(k => k.id.startsWith('ANTHROPIC') && k.active).length
  const openaiActive = keys.filter(k => k.id.startsWith('OPENAI') && k.active).length

  return (
    <div className="wak-wrap">
      <style>{CSS}</style>
      <div className="wak-hdr">API Keys</div>
      <div className="wak-sub">
        AES-256-GCM encrypted · Stored in Supabase · Loaded automatically by chat engine
      </div>

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
              {sectionKeys.map(k => {
                const isEditing = editingKey === k.id
                const isSaving = savingKey === k.id
                const rowError = rowErrors[k.id]
                return (
                  <div
                    key={k.id}
                    className={`wak-row${isEditing ? ' editing' : ''}${rowError && isEditing ? ' has-error' : ''}`}
                  >
                    {/* Top line — fixed height, always present */}
                    <div className="wak-row-top">
                      <div className={`wak-row-status ${k.active ? 'active' : 'inactive'}`} />
                      <span className="wak-row-label">{k.id}</span>
                      {!isEditing && (
                        <>
                          <span className="wak-row-masked">{k.masked || '—'}</span>
                          <span className={`wak-row-source ${k.source}`}>{k.source}</span>
                        </>
                      )}
                      {isEditing && <span style={{flex:1}}/>}
                      <div className="wak-row-actions">
                        {!isEditing && (
                          <>
                            <button className="wak-btn" onClick={() => startEdit(k.id)}>
                              {k.active ? 'Update' : 'Set'}
                            </button>
                            {k.active && k.source === 'database' && (
                              <button className="wak-btn danger" onClick={() => handleDelete(k.id)}>
                                Clear
                              </button>
                            )}
                          </>
                        )}
                        {isEditing && (
                          <>
                            <button
                              className="wak-btn save"
                              onClick={() => handleSave(k.id)}
                              disabled={isSaving || !(editValues[k.id] || '').trim()}
                            >
                              {isSaving ? 'Saving…' : 'Save'}
                            </button>
                            <button className="wak-btn" onClick={() => cancelEdit(k.id)} disabled={isSaving}>
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Edit zone — CSS max-height transition, no DOM swap */}
                    <div className="wak-row-edit">
                      <input
                        className="wak-input"
                        type="password"
                        placeholder={`Paste ${k.id}…`}
                        value={editValues[k.id] || ''}
                        onChange={e => setEditValues(prev => ({ ...prev, [k.id]: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSave(k.id)
                          if (e.key === 'Escape') cancelEdit(k.id)
                        }}
                        disabled={isSaving}
                        tabIndex={isEditing ? 0 : -1}
                      />
                    </div>

                    {/* Error zone — CSS max-height transition */}
                    <div className="wak-row-err">
                      {rowError && `⚠ ${rowError}`}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })
      )}
    </div>
  )
}
