'use client'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { supabase } from '@/lib/supabase'
import { BRAND_NAME } from '@/lib/brand'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

const MODEL_TIERS = [
  { id: 'auto', name: 'Auto', desc: 'Best model for your task', icon: '✨' },
  { id: 'fast', name: 'Fast', desc: 'Quick responses for rapid iteration', icon: '⚡' },
  { id: 'pro', name: 'Pro', desc: 'Best balance of speed & quality', icon: '🚀' },
  { id: 'premium', name: 'Premium', desc: 'Highest quality for complex projects', icon: '💎' }
]

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [model, setModel] = useState('fast')
  const [primaryKey, setPrimaryKey] = useState('')
  const [secondaryKey, setSecondaryKey] = useState('')
  const [hasPrimaryKey, setHasPrimaryKey] = useState(false)
  const [hasSecondaryKey, setHasSecondaryKey] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) loadSettings()
  }, [open])

  async function loadSettings() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const r = await fetch('/api/user/settings', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (!r.ok) return
      const d = await r.json()
      setModel(d.model || 'fast')
      setHasPrimaryKey(d.hasPrimaryKey)
      setHasSecondaryKey(d.hasSecondaryKey)
    } catch { /* non-fatal */ }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const body: Record<string, any> = { model }
      if (primaryKey) body.primaryKey = primaryKey
      if (secondaryKey) body.secondaryKey = secondaryKey
      await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify(body)
      })
    } catch { /* non-fatal */ }
    setSaving(false)
    onClose()
  }

  if (!open) return null

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <span className="modal-title">Settings</span>
        <button className="modal-close" onClick={onClose}>×</button>
      </div>
      <div className="modal-body">
        <div className="ai-provider-section">
          <div className="ai-provider-title">Model Selection</div>
          <div className="ai-provider-grid">
            {MODEL_TIERS.map(m => (
              <div
                key={m.id}
                className={`ai-provider-card ${model === m.id ? 'active' : ''}`}
                onClick={() => setModel(m.id)}
              >
                <div className="ai-provider-icon">{m.icon}</div>
                <div className="ai-provider-name">{m.name}</div>
                <div className="ai-provider-model">{m.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="ai-provider-section">
          <div className="ai-provider-title">API Keys (Optional — Bring Your Own)</div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Primary API Key {hasPrimaryKey && <span style={{color:'var(--accent-primary,#00ff88)',fontSize:11}}>✓ Set</span>}</label>
            <input
              type="password"
              className="form-input"
              value={primaryKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrimaryKey(e.target.value)}
              placeholder={hasPrimaryKey ? '••••••••' : 'sk-...'}
              style={{ fontSize: 13 }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Secondary API Key {hasSecondaryKey && <span style={{color:'var(--accent-primary,#00ff88)',fontSize:11}}>✓ Set</span>}</label>
            <input
              type="password"
              className="form-input"
              value={secondaryKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSecondaryKey(e.target.value)}
              placeholder={hasSecondaryKey ? '••••••••' : 'sk-...'}
              style={{ fontSize: 13 }}
            />
          </div>
          <div style={{ fontSize: 11, color: '#71717a', marginTop: 8 }}>
            Add your own keys for increased rate limits. {BRAND_NAME} routes to the best available provider automatically.
          </div>
        </div>

        <button className="btn-upgrade" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </Modal>
  )
}
