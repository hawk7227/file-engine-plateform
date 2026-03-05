'use client'

/**
 * WPFileEditor — GitHub-connected file browser + live editor
 *
 * Features:
 * - Browse any GitHub repo file tree
 * - Click file → load content into editable textarea
 * - Edit inline, save → commits back to GitHub
 * - Auto-triggers preview rebuild after save
 * - Works with generated files (from chat) OR GitHub repo
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { GeneratedFile } from '@/hooks/useChat'

const CSS = `
.wfe-root{display:flex;height:100%;overflow:hidden;background:var(--wp-bg-0)}

/* ── File tree ── */
.wfe-tree{width:200px;flex-shrink:0;border-right:1px solid var(--wp-border);display:flex;flex-direction:column;overflow:hidden}
.wfe-tree-header{padding:8px 10px;border-bottom:1px solid var(--wp-border);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--wp-text-3);display:flex;align-items:center;gap:6px;flex-shrink:0}
.wfe-tree-scroll{flex:1;overflow-y:auto;overflow-x:hidden}
.wfe-tree-scroll::-webkit-scrollbar{width:3px}
.wfe-tree-scroll::-webkit-scrollbar-thumb{background:var(--wp-border-2);border-radius:2px}
.wfe-repo-form{padding:8px;border-bottom:1px solid var(--wp-border);display:flex;flex-direction:column;gap:4px;flex-shrink:0}
.wfe-repo-input{background:var(--wp-bg-3);border:1px solid var(--wp-border);border-radius:6px;padding:4px 8px;font-size:10px;color:var(--wp-text-1);font-family:var(--wp-mono);width:100%;outline:none;transition:border-color .15s}
.wfe-repo-input:focus{border-color:var(--wp-accent)}
.wfe-repo-input::placeholder{color:var(--wp-text-4)}
.wfe-load-btn{background:var(--wp-accent-dim);border:1px solid rgba(0,245,160,.2);color:var(--wp-accent);border-radius:6px;padding:4px 8px;font-size:10px;font-weight:700;cursor:pointer;font-family:var(--wp-font);transition:all .15s;text-align:center}
.wfe-load-btn:hover{background:rgba(0,245,160,.15)}
.wfe-load-btn:disabled{opacity:.4;cursor:not-allowed}
.wfe-file-row{display:flex;align-items:center;gap:5px;padding:3px 8px;cursor:pointer;font-size:10px;font-family:var(--wp-mono);color:var(--wp-text-3);border-radius:4px;margin:0 3px;transition:all .12s;white-space:nowrap;overflow:hidden}
.wfe-file-row:hover{background:var(--wp-bg-3);color:var(--wp-text-2)}
.wfe-file-row.active{background:var(--wp-accent-dim);color:var(--wp-accent);font-weight:600}
.wfe-file-row.modified{color:var(--wp-yellow)}
.wfe-file-row.modified.active{background:rgba(255,204,0,.08);color:var(--wp-yellow)}
.wfe-file-icon{font-size:10px;opacity:.6;flex-shrink:0}
.wfe-file-name{overflow:hidden;text-overflow:ellipsis;flex:1}
.wfe-dir-row{display:flex;align-items:center;gap:5px;padding:4px 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--wp-text-4);cursor:pointer;user-select:none;margin-top:4px}
.wfe-dir-row:hover{color:var(--wp-text-3)}
.wfe-empty-tree{padding:16px 8px;font-size:10px;color:var(--wp-text-4);text-align:center;line-height:1.6}
.wfe-loading{padding:12px 8px;font-size:10px;color:var(--wp-text-4);text-align:center}

/* ── Editor ── */
.wfe-editor{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden}
.wfe-editor-bar{display:flex;align-items:center;gap:6px;padding:0 10px;height:32px;border-bottom:1px solid var(--wp-border);background:var(--wp-bg-2);flex-shrink:0}
.wfe-editor-path{font-size:10px;font-family:var(--wp-mono);color:var(--wp-text-3);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wfe-editor-path span{color:var(--wp-accent)}
.wfe-save-btn{padding:3px 10px;border-radius:5px;font-size:9px;font-weight:700;cursor:pointer;transition:all .15s;font-family:var(--wp-font);white-space:nowrap;flex-shrink:0}
.wfe-save-btn.dirty{background:var(--wp-accent);color:#000;border:none}
.wfe-save-btn.dirty:hover{box-shadow:0 0 12px rgba(0,245,160,.3)}
.wfe-save-btn.clean{background:none;border:1px solid var(--wp-border);color:var(--wp-text-4);cursor:default}
.wfe-save-btn:disabled{opacity:.5;cursor:not-allowed}
.wfe-saved-badge{font-size:8px;color:var(--wp-accent);font-weight:700;opacity:0;transition:opacity .3s}
.wfe-saved-badge.show{opacity:1}
.wfe-copy-btn{padding:3px 8px;border-radius:5px;font-size:9px;font-weight:700;background:none;border:1px solid var(--wp-border);color:var(--wp-text-4);cursor:pointer;font-family:var(--wp-font);transition:all .15s;flex-shrink:0}
.wfe-copy-btn:hover{background:var(--wp-bg-4);color:var(--wp-text-2)}
.wfe-editor-body{flex:1;position:relative;overflow:hidden}
.wfe-line-numbers{position:absolute;left:0;top:0;bottom:0;width:40px;padding:12px 0;background:var(--wp-bg-1);border-right:1px solid var(--wp-border);font-size:10px;line-height:1.6;font-family:var(--wp-mono);color:var(--wp-text-4);text-align:right;padding-right:8px;overflow:hidden;pointer-events:none;z-index:2;user-select:none}
.wfe-ln{display:block;height:16px}
.wfe-textarea{position:absolute;inset:0;left:40px;resize:none;background:transparent;border:none;outline:none;padding:12px;font-size:10px;line-height:1.6;font-family:var(--wp-mono);color:var(--wp-text-1);tab-size:2;caret-color:var(--wp-accent);z-index:1;overflow:auto;white-space:pre}
.wfe-textarea::-webkit-scrollbar{width:4px;height:4px}
.wfe-textarea::-webkit-scrollbar-thumb{background:var(--wp-border-2);border-radius:2px}
.wfe-placeholder{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;color:var(--wp-text-4);font-size:11px;text-align:center;padding:24px}
.wfe-placeholder-icon{font-size:32px;opacity:.2}
.wfe-status-bar{height:20px;display:flex;align-items:center;gap:12px;padding:0 10px;background:var(--wp-bg-2);border-top:1px solid var(--wp-border);font-size:8px;font-family:var(--wp-mono);color:var(--wp-text-4);flex-shrink:0}
.wfe-status-bar .accent{color:var(--wp-accent)}
.wfe-status-bar .warn{color:var(--wp-yellow)}
.wfe-error{padding:6px 10px;background:rgba(239,68,68,.06);border-top:1px solid rgba(239,68,68,.15);color:#f87171;font-size:9px;font-family:var(--wp-mono);flex-shrink:0}
`

// ── File icons ───────────────────────────────────────────────────────────────

function fileIcon(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  const m: Record<string, string> = {
    ts:'📘', tsx:'📘', js:'📒', jsx:'📒', html:'🌐', css:'🎨',
    json:'📋', md:'📝', py:'🐍', sql:'🗄️', yaml:'⚙️', yml:'⚙️',
    sh:'⚡', bash:'⚡', env:'🔑', gitignore:'🚫', lock:'🔒',
    prisma:'🔷', graphql:'🔷', vue:'💚', svelte:'🟠',
  }
  return m[ext] || '📄'
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface TreeFile {
  path: string
  sha: string
  size?: number
  source: 'github' | 'generated'
}

interface OpenFile {
  path: string
  content: string
  originalContent: string
  sha: string             // GitHub SHA for updates ('generated' for local files)
  source: 'github' | 'generated'
  loading?: boolean
}

// v2 — props stable, cache-bust for Vercel
interface Props {
  generatedFiles: GeneratedFile[]
  onFilesSave?: (files: GeneratedFile[]) => void
  toast: (title: string, msg: string, type?: string) => void
  openFilePath?: string | null          // set externally (e.g. from inspector click)
  onOpenFileConsumed?: () => void        // called after we've opened it
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WPFileEditor({ generatedFiles, onFilesSave, toast, openFilePath, onOpenFileConsumed }: Props) {
  // GitHub repo config
  const [owner, setOwner] = useState('')
  const [repoName, setRepoName] = useState('')
  const [branch, setBranch] = useState('main')

  // Tree state
  const [treeFiles, setTreeFiles] = useState<TreeFile[]>([])
  const [treeLoading, setTreeLoading] = useState(false)
  const [treeError, setTreeError] = useState<string | null>(null)
  const [collapsedDirs, setCollapsedDirs] = useState<Set<string>>(new Set())

  // Open file state
  const [openFile, setOpenFile] = useState<OpenFile | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedBadge, setSavedBadge] = useState(false)
  const [editorError, setEditorError] = useState<string | null>(null)
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 })
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumsRef = useRef<HTMLDivElement>(null)

  // ── Respond to external file open request (e.g. inspector click) ─────────
  useEffect(() => {
    if (!openFilePath) return
    const file = treeFiles.find(f => f.path === openFilePath)
    if (file) {
      openTreeFile(file)
    } else {
      // File not in tree yet — create a virtual entry for generated file
      const gf = generatedFiles.find(f => f.path === openFilePath)
      if (gf) {
        setOpenFile({ path: gf.path, content: gf.content, originalContent: gf.content, sha: 'generated', source: 'generated' })
      }
    }
    onOpenFileConsumed?.()
  }, [openFilePath]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync generated files into tree ──────────────────────────────────────────
  useEffect(() => {
    if (!generatedFiles.length) return
    const genEntries: TreeFile[] = generatedFiles.map(f => ({
      path: f.path, sha: 'generated', source: 'generated',
    }))
    setTreeFiles(prev => {
      // Merge: keep github entries, replace/add generated
      const github = prev.filter(e => e.source === 'github')
      const paths = new Set(github.map(e => e.path))
      return [...github, ...genEntries.filter(e => !paths.has(e.path))]
    })
  }, [generatedFiles])

  // ── Load GitHub repo tree ────────────────────────────────────────────────────
  const loadTree = useCallback(async () => {
    if (!owner.trim() || !repoName.trim()) return
    setTreeLoading(true); setTreeError(null)
    try {
      const res = await fetch(`/api/github/tree?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repoName)}&branch=${encodeURIComponent(branch)}`)
      const data = await res.json() as { tree?: TreeFile[]; error?: string; truncated?: boolean }
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to load tree')
      const entries: TreeFile[] = (data.tree || []).map(e => ({ ...e, source: 'github' as const }))
      // Merge with generated files
      const genPaths = new Set(treeFiles.filter(e => e.source === 'generated').map(e => e.path))
      const merged = [...entries.filter(e => !genPaths.has(e.path)), ...treeFiles.filter(e => e.source === 'generated')]
      setTreeFiles(merged)
      if (data.truncated) toast('Tree truncated', 'Repo is large — showing first 100k files', 'nfo')
      toast('Loaded', `${entries.length} files from ${owner}/${repoName}`, 'ok')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setTreeError(msg)
      toast('GitHub Error', msg, 'err')
    } finally {
      setTreeLoading(false)
    }
  }, [owner, repoName, branch, treeFiles, toast])

  // ── Open a file ──────────────────────────────────────────────────────────────
  const openTreeFile = useCallback(async (file: TreeFile) => {
    // Check if already open
    if (openFile?.path === file.path) return

    if (file.source === 'generated') {
      const gf = generatedFiles.find(f => f.path === file.path)
      if (gf) {
        setOpenFile({ path: gf.path, content: gf.content, originalContent: gf.content, sha: 'generated', source: 'generated' })
      }
      return
    }

    // Load from GitHub
    setOpenFile({ path: file.path, content: '', originalContent: '', sha: file.sha, source: 'github', loading: true })
    setEditorError(null)
    try {
      const res = await fetch(`/api/github/file?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repoName)}&path=${encodeURIComponent(file.path)}`)
      const data = await res.json() as { content?: string; sha?: string; error?: string }
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to load file')
      setOpenFile({ path: file.path, content: data.content!, originalContent: data.content!, sha: data.sha!, source: 'github' })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setEditorError(msg)
      setOpenFile(null)
    }
  }, [openFile, generatedFiles, owner, repoName])

  // ── Save file ────────────────────────────────────────────────────────────────
  const saveFile = useCallback(async () => {
    if (!openFile || saving) return
    if (openFile.content === openFile.originalContent) return
    setSaving(true); setEditorError(null)
    try {
      if (openFile.source === 'generated') {
        // Update generated files array and trigger preview rebuild
        const updated = generatedFiles.map(f =>
          f.path === openFile.path ? { ...f, content: openFile.content } : f
        )
        onFilesSave?.(updated)
        setOpenFile(prev => prev ? { ...prev, originalContent: prev.content } : null)
        setSavedBadge(true); setTimeout(() => setSavedBadge(false), 2000)
        toast('Saved', `${openFile.path} updated`, 'ok')
        return
      }

      // Save to GitHub
      const res = await fetch('/api/github/file', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner, repo: repoName, path: openFile.path,
          content: openFile.content, sha: openFile.sha,
          message: `Edit ${openFile.path} via File Engine`,
          branch,
        }),
      })
      const data = await res.json() as { success?: boolean; commitSha?: string; error?: string }
      if (!res.ok || data.error) throw new Error(data.error || 'Save failed')

      // Update SHA for next save
      setOpenFile(prev => prev ? { ...prev, originalContent: prev.content } : null)
      setSavedBadge(true); setTimeout(() => setSavedBadge(false), 2000)
      toast('Committed', `${openFile.path.split('/').pop()} → ${data.commitSha?.slice(0, 7)}`, 'ok')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setEditorError(msg)
      toast('Save Failed', msg, 'err')
    } finally {
      setSaving(false)
    }
  }, [openFile, saving, generatedFiles, onFilesSave, owner, repoName, branch, toast])

  // ── Keyboard shortcut: Cmd/Ctrl+S ───────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        saveFile()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [saveFile])

  // ── Sync line numbers scroll with textarea ───────────────────────────────────
  const syncLineScroll = useCallback(() => {
    if (textareaRef.current && lineNumsRef.current) {
      lineNumsRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }, [])

  // ── Tab key handling ─────────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = e.currentTarget
      const start = ta.selectionStart; const end = ta.selectionEnd
      const newVal = ta.value.slice(0, start) + '  ' + ta.value.slice(end)
      setOpenFile(prev => prev ? { ...prev, content: newVal } : null)
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 2 })
    }
  }, [])

  const handleCursorMove = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget
    const text = ta.value.slice(0, ta.selectionStart)
    const lines = text.split('\n')
    setCursorPos({ line: lines.length, col: lines[lines.length - 1].length + 1 })
  }, [])

  // ── Build directory tree from flat paths ────────────────────────────────────
  const getDirs = (files: TreeFile[]): string[] => {
    const dirs = new Set<string>()
    files.forEach(f => {
      const parts = f.path.split('/')
      for (let i = 1; i < parts.length; i++) {
        dirs.add(parts.slice(0, i).join('/'))
      }
    })
    return Array.from(dirs).sort()
  }

  const toggleDir = (dir: string) => {
    setCollapsedDirs(prev => {
      const next = new Set(prev)
      if (next.has(dir)) next.delete(dir)
      else next.add(dir)
      return next
    })
  }

  // ── Render tree ─────────────────────────────────────────────────────────────
  const renderTree = () => {
    if (treeLoading) return <div className="wfe-loading">⏳ Loading tree...</div>
    if (!treeFiles.length) {
      return (
        <div className="wfe-empty-tree">
          {generatedFiles.length > 0
            ? `${generatedFiles.length} generated file(s)\nClick to edit`
            : 'Enter owner/repo above\nto browse GitHub files'
          }
        </div>
      )
    }

    const dirs = getDirs(treeFiles)
    const rootFiles = treeFiles.filter(f => !f.path.includes('/'))
    const isDirVisible = (dir: string): boolean => {
      const parts = dir.split('/')
      for (let i = 1; i < parts.length; i++) {
        if (collapsedDirs.has(parts.slice(0, i).join('/'))) return false
      }
      return true
    }
    const isDirCollapsed = (dir: string) => collapsedDirs.has(dir)

    return (
      <div style={{ paddingBottom: 8 }}>
        {/* Root files */}
        {rootFiles.map(f => (
          <FileRow key={f.path} file={f} indent={0} active={openFile?.path === f.path}
            modified={openFile?.path === f.path && openFile.content !== openFile.originalContent}
            onClick={() => openTreeFile(f)} />
        ))}
        {/* Directories */}
        {dirs.map(dir => {
          if (!isDirVisible(dir)) return null
          const depth = dir.split('/').length - 1
          const label = dir.split('/').pop() || dir
          const collapsed = isDirCollapsed(dir)
          const children = treeFiles.filter(f => {
            const fdir = f.path.includes('/') ? f.path.split('/').slice(0, -1).join('/') : ''
            return fdir === dir
          })
          return (
            <div key={dir}>
              <div className="wfe-dir-row" style={{ paddingLeft: 8 + depth * 10 }} onClick={() => toggleDir(dir)}>
                <span style={{ fontSize: 8 }}>{collapsed ? '▶' : '▼'}</span>
                <span>📁</span>
                <span style={{ fontSize: 10, fontFamily: 'var(--wp-mono)', color: 'var(--wp-text-3)' }}>{label}</span>
              </div>
              {!collapsed && children.map(f => (
                <FileRow key={f.path} file={f} indent={depth + 1}
                  active={openFile?.path === f.path}
                  modified={openFile?.path === f.path && openFile.content !== openFile.originalContent}
                  onClick={() => openTreeFile(f)} />
              ))}
            </div>
          )
        })}
      </div>
    )
  }

  const isDirty = openFile ? openFile.content !== openFile.originalContent : false
  const lineCount = (openFile?.content || '').split('\n').length

  return (
    <div className="wfe-root">
      <style>{CSS}</style>

      {/* ── File tree ── */}
      <div className="wfe-tree">
        <div className="wfe-tree-header">
          <span>📁</span> Files
          {treeFiles.length > 0 && (
            <span style={{ marginLeft: 'auto', opacity: .5 }}>{treeFiles.length}</span>
          )}
        </div>

        {/* GitHub repo input */}
        <div className="wfe-repo-form">
          <input
            className="wfe-repo-input"
            placeholder="owner"
            value={owner}
            onChange={e => setOwner(e.target.value)}
          />
          <input
            className="wfe-repo-input"
            placeholder="repo-name"
            value={repoName}
            onChange={e => setRepoName(e.target.value)}
          />
          <input
            className="wfe-repo-input"
            placeholder="branch (main)"
            value={branch}
            onChange={e => setBranch(e.target.value || 'main')}
          />
          <button
            className="wfe-load-btn"
            onClick={loadTree}
            disabled={treeLoading || !owner.trim() || !repoName.trim()}
          >
            {treeLoading ? '⏳ Loading...' : '⬇ Load Repo'}
          </button>
          {treeError && <div style={{ fontSize: 8, color: '#f87171', padding: '2px 0' }}>{treeError}</div>}
        </div>

        <div className="wfe-tree-scroll">{renderTree()}</div>
      </div>

      {/* ── Editor ── */}
      <div className="wfe-editor">
        <div className="wfe-editor-bar">
          <div className="wfe-editor-path">
            {openFile
              ? <><span>{openFile.source === 'github' ? `${owner}/${repoName}/` : ''}</span>{openFile.path}{isDirty ? ' •' : ''}</>
              : 'No file open'
            }
          </div>
          {openFile && (
            <>
              <span className={`wfe-saved-badge${savedBadge ? ' show' : ''}`}>✓ Saved</span>
              <button
                className="wfe-copy-btn"
                onClick={() => navigator.clipboard.writeText(openFile.content).then(() => toast('Copied', '', 'ok'))}
              >
                📋
              </button>
              <button
                className={`wfe-save-btn${isDirty ? ' dirty' : ' clean'}`}
                onClick={saveFile}
                disabled={!isDirty || saving}
              >
                {saving ? '⏳ Saving...' : openFile.source === 'github' ? '↑ Commit' : '✓ Apply'}
              </button>
            </>
          )}
        </div>

        <div className="wfe-editor-body">
          {!openFile && (
            <div className="wfe-placeholder">
              <div className="wfe-placeholder-icon">📝</div>
              <div>Select a file to edit</div>
              <div style={{ fontSize: 9, opacity: .5, marginTop: 4 }}>
                {generatedFiles.length > 0 ? 'Generated files are in the tree →' : 'Load a repo or generate code first'}
              </div>
            </div>
          )}
          {openFile?.loading && (
            <div className="wfe-placeholder">
              <div style={{ fontSize: 9, color: 'var(--wp-accent)' }}>⏳ Loading {openFile.path}...</div>
            </div>
          )}
          {openFile && !openFile.loading && (
            <>
              {/* Line numbers */}
              <div className="wfe-line-numbers" ref={lineNumsRef}>
                {Array.from({ length: lineCount }, (_, i) => (
                  <span key={i} className="wfe-ln">{i + 1}</span>
                ))}
              </div>
              {/* Editable textarea */}
              <textarea
                ref={textareaRef}
                className="wfe-textarea"
                value={openFile.content}
                onChange={e => setOpenFile(prev => prev ? { ...prev, content: e.target.value } : null)}
                onScroll={syncLineScroll}
                onKeyDown={handleKeyDown}
                onClick={handleCursorMove}
                onKeyUp={handleCursorMove}
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
              />
            </>
          )}
        </div>

        {editorError && <div className="wfe-error">⚠ {editorError}</div>}

        {/* Status bar */}
        <div className="wfe-status-bar">
          {openFile ? (
            <>
              <span className="accent">{openFile.source === 'github' ? '⬡ GitHub' : '⚡ Generated'}</span>
              <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
              <span>{lineCount} lines</span>
              {isDirty && <span className="warn">● Unsaved changes</span>}
              <span style={{ marginLeft: 'auto' }}>⌘S to save</span>
            </>
          ) : (
            <span>Ready</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── FileRow subcomponent ──────────────────────────────────────────────────────

function FileRow({ file, indent, active, modified, onClick }: {
  file: TreeFile; indent: number; active: boolean; modified: boolean; onClick: () => void
}) {
  const name = file.path.split('/').pop() || file.path
  return (
    <div
      className={`wfe-file-row${active ? ' active' : ''}${modified ? ' modified' : ''}`}
      style={{ paddingLeft: 8 + indent * 10 }}
      onClick={onClick}
      title={file.path}
    >
      <span className="wfe-file-icon">{fileIcon(file.path)}</span>
      <span className="wfe-file-name">{name}</span>
      {file.source === 'generated' && (
        <span style={{ fontSize: 7, opacity: .5, flexShrink: 0 }}>gen</span>
      )}
    </div>
  )
}
