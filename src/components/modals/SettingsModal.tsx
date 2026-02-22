'use client'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { supabase, getUser, updateProfile } from '@/lib/supabase'
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
  const [model, setModel] = useState('auto')
  const [primaryKey, setPrimaryKey] = useState('')
  const [secondaryKey, setSecondaryKey] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) loadSettings()
  }, [open])

  async function loadSettings() {
    const user = await getUser()
    if (!user) return

    const { data } = await supabase
      .from('profiles')
      .select('preferred_model, claude_api_key, openai_api_key')
      .eq('id', user.id)
      .single()

    if (data) {
      setModel(data.preferred_model || 'auto')
      setPrimaryKey(data.claude_api_key || '')
      setSecondaryKey(data.openai_api_key || '')
    }
  }

  async function handleSave() {
    setSaving(true)
    const user = await getUser()
    if (user) {
      await updateProfile(user.id, {
        preferred_model: model,
        claude_api_key: primaryKey || null,
        openai_api_key: secondaryKey || null
      })
    }
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
            <label className="form-label">Primary API Key</label>
            <input
              type="password"
              className="form-input"
              value={primaryKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrimaryKey(e.target.value)}
              placeholder="sk-..."
              style={{ fontSize: 13 }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Secondary API Key</label>
            <input
              type="password"
              className="form-input"
              value={secondaryKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSecondaryKey(e.target.value)}
              placeholder="sk-..."
              style={{ fontSize: 13 }}
            />
          </div>
          <div style={{ fontSize: 11, color: '#71717a', marginTop: 8 }}>
            Add your own keys to increase rate limits. {BRAND_NAME} routes to the best available provider automatically.
          </div>
        </div>

        <button className="btn-upgrade" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </Modal>
  )
}
