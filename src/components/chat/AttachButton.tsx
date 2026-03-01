'use client'
import { useRef, useState } from 'react'
import { UploadedFile } from '@/hooks/useFileUpload'

interface AttachButtonProps {
  files: UploadedFile[]
  uploading: boolean
  progress: number
  onUpload: (files: FileList) => void
  onRemove: (fileId: string) => void
  disabled?: boolean
}

export function AttachButton({ 
  files, 
  uploading, 
  progress, 
  onUpload, 
  onRemove,
  disabled = false 
}: AttachButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [showPanel, setShowPanel] = useState(false)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files)
      e.target.value = ''
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files)
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function getFileIcon(type: UploadedFile['type'], name: string): string {
    if (type === 'image') return ''
    if (type === 'document') {
      if (name.endsWith('.pdf')) return ''
      if (name.endsWith('.csv') || name.endsWith('.xlsx')) return ''
      return ''
    }
    if (type === 'code') {
      if (name.endsWith('.ts') || name.endsWith('.tsx')) return ''
      if (name.endsWith('.js') || name.endsWith('.jsx')) return ''
      if (name.endsWith('.py')) return ''
      if (name.endsWith('.html')) return ''
      if (name.endsWith('.css')) return ''
      if (name.endsWith('.json')) return ''
      return ''
    }
    return ''
  }

  return (
    <div className="attach-container">
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileSelect}
        multiple
        hidden
        accept="image/*,.pdf,.js,.ts,.jsx,.tsx,.html,.css,.json,.md,.py,.sql,.csv,.txt,.env,.yml,.yaml"
      />
      
      <button 
        className={`tool-btn ${files.length > 0 ? 'has-files' : ''}`}
        onClick={() => files.length > 0 ? setShowPanel(!showPanel) : inputRef.current?.click()}
        disabled={disabled || uploading}
        title={files.length > 0 ? `${files.length} files attached` : 'Attach files'}
        style={files.length > 0 ? { borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', position: 'relative' } : { position: 'relative' }}
      >
        {uploading ? '⏳' : ''}
        {files.length > 0 && (
          <span style={{
            position: 'absolute',
            top: -4,
            right: -4,
            background: 'var(--accent-primary)',
            color: 'var(--bg-primary)',
            fontSize: 10,
            fontWeight: 700,
            width: 16,
            height: 16,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>{files.length}</span>
        )}
      </button>

      {showPanel && files.length > 0 && (
        <div 
          className="attach-panel"
          onDrop={handleDrop} 
          onDragOver={handleDragOver}
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            width: 280,
            maxHeight: 320,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: 8,
            overflow: 'hidden',
            zIndex: 100,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 12px',
            borderBottom: '1px solid var(--border-subtle)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-secondary)'
          }}>
            <span>Attached Files ({files.length})</span>
            <button 
              onClick={() => inputRef.current?.click()}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 10px',
                fontSize: 11,
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              + Add
            </button>
          </div>
          
          <div style={{ maxHeight: 200, overflowY: 'auto', padding: 8 }}>
            {files.map(file => (
              <div 
                key={file.id} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 8,
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 6
                }}
              >
                {file.preview ? (
                  <img 
                    src={file.preview} 
                    alt={file.name} 
                    style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} 
                  />
                ) : (
                  <span style={{ fontSize: 24, width: 36, textAlign: 'center' }}>
                    {getFileIcon(file.type, file.name)}
                  </span>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    fontSize: 12, 
                    fontWeight: 500, 
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    {formatSize(file.size)} • {file.type}
                  </div>
                </div>
                <button 
                  onClick={() => onRemove(file.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 4,
                    fontSize: 12
                  }}
                >
                  
                </button>
              </div>
            ))}
          </div>

          {uploading && (
            <div style={{ height: 3, background: 'var(--bg-tertiary)', margin: '0 8px 8px', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                background: 'var(--accent-primary), var(--accent-blue))',
                width: `${progress}%`,
                transition: 'width 0.3s'
              }} />
            </div>
          )}

          <div style={{
            padding: '8px 12px',
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--text-muted)',
            borderTop: '1px dashed var(--border-subtle)'
          }}>
            Drop files here or click "Add"
          </div>
        </div>
      )}

      {!showPanel && files.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {files.slice(0, 3).map(file => (
            <span 
              key={file.id} 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 12,
                fontSize: 11,
                color: 'var(--text-secondary)'
              }}
            >
              {getFileIcon(file.type, file.name)} {file.name.slice(0, 12)}{file.name.length > 12 && '...'}
            </span>
          ))}
          {files.length > 3 && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              background: 'var(--accent-glow)',
              border: '1px solid var(--accent-primary)',
              borderRadius: 12,
              fontSize: 11,
              color: 'var(--accent-primary)'
            }}>
              +{files.length - 3} more
            </span>
          )}
        </div>
      )}
    </div>
  )
}
