'use client'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { supabase, getUser, updateProfile } from '@/lib/supabase'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

const MODELS = {
  claude: [
    { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', desc: 'Fast & Capable' },
    { id: 'claude-opus-4', name: 'Claude Opus 4', desc: 'Most Intelligent' }
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', desc: 'Fast & Smart' },
    { id: 'o1', name: 'o1', desc: 'Reasoning' }
  ]
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [provider, setProvider] = useState<'claude' | 'openai'>('claude')
  const [model, setModel] = useState('claude-sonnet-4')
  const [claudeKey, setClaudeKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
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
      setModel(data.preferred_model || 'claude-sonnet-4')
      setProvider(data.preferred_model?.startsWith('gpt') || data.preferred_model === 'o1' ? 'openai' : 'claude')
      setClaudeKey(data.claude_api_key || '')
      setOpenaiKey(data.openai_api_key || '')
    }
  }

  async function handleSave() {
    setSaving(true)
    const user = await getUser()
    if (user) {
      await updateProfile(user.id, {
        preferred_model: model,
        claude_api_key: claudeKey || null,
        openai_api_key: openaiKey || null
      })
    }
    setSaving(false)
    onClose()
  }

  function handleProviderChange(p: 'claude' | 'openai') {
    setProvider(p)
    setModel(MODELS[p][0].id)
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
          <div className="ai-provider-title">AI Provider</div>
          <div className="ai-provider-grid">
            <div 
              className={`ai-provider-card ${provider === 'claude' ? 'active' : ''}`}
              onClick={() => handleProviderChange('claude')}
            >
              <div className="ai-provider-icon">🟠</div>
              <div className="ai-provider-name">Claude API</div>
              <div className="ai-provider-model">Sonnet 4 / Opus 4</div>
            </div>
            <div 
              className={`ai-provider-card ${provider === 'openai' ? 'active' : ''}`}
              onClick={() => handleProviderChange('openai')}
            >
              <div className="ai-provider-icon">🟢</div>
              <div className="ai-provider-name">OpenAI</div>
              <div className="ai-provider-model">GPT-4o / o1</div>
            </div>
          </div>
        </div>

        <div className="ai-provider-section">
          <div className="ai-provider-title">Model Selection</div>
          <div className="ai-provider-grid">
            {(MODELS as Record<string, any[]>)[provider].map((m: any) => (
              <div 
                key={m.id}
                className={`ai-provider-card ${model === m.id ? 'active' : ''}`}
                onClick={() => setModel(m.id)}
              >
                <div className="ai-provider-icon">{model === m.id ? '⚡' : '○'}</div>
                <div className="ai-provider-name">{m.name}</div>
                <div className="ai-provider-model">{m.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="ai-provider-section">
          <div className="ai-provider-title">API Keys (Optional)</div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Claude API Key</label>
            <input
              type="password"
              className="form-input"
              value={claudeKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClaudeKey(e.target.value)}
              placeholder="sk-ant-..."
              style={{ fontSize: 13 }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">OpenAI API Key</label>
            <input
              type="password"
              className="form-input"
              value={openaiKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              style={{ fontSize: 13 }}
            />
          </div>
        </div>

        <button className="btn-upgrade" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </Modal>
  )
}
