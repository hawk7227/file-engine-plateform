'use client'
import { useState } from 'react'
import { supabase, getUser } from '@/lib/supabase'
import { Modal } from '@/components/ui/Modal'

interface UrlImportButtonProps {
  projectId: string
  onImport: (data: { url: string; title?: string }) => void
}

export function UrlImportButton({ projectId, onImport }: UrlImportButtonProps) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleImport() {
    if (!url) return
    setLoading(true)

    try {
      const user = await getUser()
      if (!user) return

      // Fetch URL metadata via API
      const res = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      const metadata = await res.json()

      // Save to url_imports table
      const { data } = await supabase.from('url_imports').insert({
        project_id: projectId,
        user_id: user.id,
        url,
        title: metadata.title,
        description: metadata.description
      }).select().single()

      if (data) {
        onImport({ url, title: metadata.title })
      }
      
      setOpen(false)
      setUrl('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button 
        className="tool-btn" 
        onClick={() => setOpen(true)}
        title="Import URL"
      >
        
      </button>
      
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <div className="modal-header">
            <span className="modal-title">Import URL</span>
            <button className="modal-close" onClick={() => setOpen(false)}>×</button>
          </div>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">URL</label>
              <input
                type="url"
                className="form-input"
                value={url}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <button 
              className="btn-upgrade" 
              onClick={handleImport} 
              disabled={loading || !url}
            >
              {loading ? 'Importing...' : 'Import'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
