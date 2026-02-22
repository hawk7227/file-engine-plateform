'use client'
import { useState, useEffect } from 'react'
import { supabase, getUser, updateProfile } from '@/lib/supabase'

const MODELS = [
  { id: 'auto', name: 'Auto', provider: 'auto' },
  { id: 'fast', name: 'Fast', provider: 'auto' },
  { id: 'pro', name: 'Pro', provider: 'auto' },
  { id: 'premium', name: 'Premium', provider: 'auto' }
]

export function ModelSelector() {
  const [selected, setSelected] = useState('claude-sonnet-4')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    loadPreference()
  }, [])

  async function loadPreference() {
    const user = await getUser()
    if (!user) return
    
    const { data } = await supabase
      .from('profiles')
      .select('preferred_model')
      .eq('id', user.id)
      .single()
    
    if (data?.preferred_model) {
      setSelected(data.preferred_model)
    }
  }

  async function handleSelect(modelId: string) {
    setSelected(modelId)
    setOpen(false)
    
    const user = await getUser()
    if (user) {
      await updateProfile(user.id, { preferred_model: modelId })
    }
  }

  const current = MODELS.find(m => m.id === selected)

  return (
    <div className="model-selector" onClick={() => setOpen(!open)}>
      {current?.name} ▾
      {open && (
        <div className="model-dropdown">
          {MODELS.map(m => (
            <div 
              key={m.id} 
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleSelect(m.id) }}
              style={{ 
                background: m.id === selected ? 'var(--bg-elevated)' : 'transparent',
                color: m.id === selected ? 'var(--accent-primary)' : 'var(--text-secondary)'
              }}
            >
              {m.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
