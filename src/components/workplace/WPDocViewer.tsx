'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

type DocTab = 'sql' | 'md' | 'doc' | 'git' | 'diff' | 'logs'

const TABS: { id: DocTab; label: string }[] = [
  { id: 'sql', label: 'SQL' },
  { id: 'md', label: 'MD' },
  { id: 'doc', label: 'DOC' },
  { id: 'git', label: 'GIT' },
  { id: 'diff', label: 'DIFF' },
  { id: 'logs', label: 'LOGS' },
]

const S = {
  tbtn: (on: boolean) => ({
    flex: 'none', padding: '4px 6px', fontSize: 6, fontWeight: 700,
    textTransform: 'uppercase' as const, letterSpacing: '.5px',
    color: on ? 'var(--wp-accent)' : 'var(--wp-text-4)',
    borderBottom: `2px solid ${on ? 'var(--wp-accent)' : 'transparent'}`,
    border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--wp-font)',
  }),
  pane: (show: boolean) => ({
    display: show ? 'block' : 'none', flex: 1, overflow: 'auto' as const,
  }),
  sqlInput: {
    width: '100%', background: 'var(--wp-bg-3)', border: '1px solid var(--wp-border)',
    borderRadius: 4, padding: '4px 8px', fontSize: 9, color: 'var(--wp-text-1)',
    fontFamily: 'var(--wp-mono)', outline: 'none', resize: 'none' as const,
  },
  sqlRun: {
    padding: '2px 8px', borderRadius: 4, fontSize: 7, fontWeight: 700,
    background: 'linear-gradient(135deg, var(--wp-accent), var(--wp-blue))',
    color: '#000', border: 'none', cursor: 'pointer', fontFamily: 'var(--wp-font)',
  },
  th: {
    padding: '4px 8px', textAlign: 'left' as const, background: 'var(--wp-bg-3)',
    color: 'var(--wp-text-3)', fontWeight: 600, borderBottom: '1px solid var(--wp-border)',
    position: 'sticky' as const, top: 0, fontSize: 8, fontFamily: 'var(--wp-mono)',
    whiteSpace: 'nowrap' as const,
  },
  td: {
    padding: '3px 8px', color: 'var(--wp-text-3)', borderBottom: '1px solid rgba(30,30,40,.5)',
    fontSize: 8, fontFamily: 'var(--wp-mono)', maxWidth: 120, overflow: 'hidden',
    textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
  },
  logBadge: (type: string) => ({
    fontSize: 5, fontWeight: 700, padding: '2px 6px', borderRadius: 10, flexShrink: 0, marginTop: 2, whiteSpace: 'nowrap' as const,
    background: type === 'pass' ? 'rgba(52,211,153,.08)' : type === 'fail' ? 'rgba(248,113,113,.08)' : type === 'fix' ? 'rgba(96,165,250,.08)' : 'rgba(251,191,36,.08)',
    color: type === 'pass' ? 'var(--wp-accent)' : type === 'fail' ? 'var(--wp-red)' : type === 'fix' ? 'var(--wp-blue)' : 'var(--wp-yellow)',
  }),
}

interface Props {
  activeTab: string
  onTabChange: (tab: string) => void
  onExpand: () => void
  expanded: boolean
  previewPhase: string
  deployments: Array<{ id: string; status: string; error?: string; url?: string; time?: number; commit?: string }>
}

export function WPDocViewer({ activeTab, onTabChange, onExpand, expanded, previewPhase, deployments }: Props) {
  // SQL State
  const [sqlQuery, setSqlQuery] = useState('SELECT id, email, plan FROM subscriptions LIMIT 10')
  const [sqlResults, setSqlResults] = useState<Array<Record<string, unknown>>>([])
  const [sqlCols, setSqlCols] = useState<string[]>([])
  const [sqlRunning, setSqlRunning] = useState(false)
  const [sqlError, setSqlError] = useState<string | null>(null)
  const [sqlMeta, setSqlMeta] = useState('')

  const runSql = useCallback(async () => {
    if (!sqlQuery.trim()) return
    setSqlRunning(true)
    setSqlError(null)
    const start = Date.now()

    try {
      const res = await fetch('/api/admin/workplace/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sqlQuery }),
      })
      const data = await res.json()
      const elapsed = Date.now() - start

      if (!res.ok) {
        setSqlError(data.error || 'Query failed')
        setSqlResults([])
        setSqlCols([])
      } else {
        setSqlResults(data.rows || [])
        setSqlCols(data.columns || (data.rows?.[0] ? Object.keys(data.rows[0]) : []))
        setSqlMeta(`${data.rows?.length || 0} rows · ${elapsed}ms`)
      }
    } catch (err) {
      setSqlError('API unreachable')
    } finally {
      setSqlRunning(false)
    }
  }, [sqlQuery])

  // Log entries (from props + hardcoded for demo)
  const logs = deployments.length > 0 ? deployments : [
    { id: '1', status: 'pass', commit: '7f2c812', time: 12.3, url: 'preview-7f2c.vercel.app' },
    { id: '2', status: 'fix', error: 'Missing import · FIX-003' },
    { id: '3', status: 'fail', error: 'Module not found: PricingTable', commit: 'a3b4c5d' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="wp-pbar">
        <div className="wp-pbar-t">
          <span className="dot" style={{ background: 'var(--wp-purple)' }} /> Documents
        </div>
        <div style={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {TABS.map(t => (
            <button key={t.id} style={S.tbtn(activeTab === t.id)} onClick={() => onTabChange(t.id)}>
              {t.label}
            </button>
          ))}
          <button className="wp-pbtn" onClick={onExpand} style={{ marginLeft: 4 }}>
            {expanded ? '↓' : '↑'}
          </button>
        </div>
      </div>

      {/* SQL */}
      <div style={S.pane(activeTab === 'sql')}>
        <div style={{ padding: 4, display: 'flex', gap: 4, borderBottom: '1px solid var(--wp-border)' }}>
          <textarea
            style={S.sqlInput}
            rows={2}
            value={sqlQuery}
            onChange={e => setSqlQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) runSql() }}
            placeholder="SELECT * FROM ..."
          />
          <button style={S.sqlRun} onClick={runSql} disabled={sqlRunning}>
            {sqlRunning ? '⏳' : '▶ Run'}
          </button>
        </div>
        {sqlError && (
          <div style={{ padding: '4px 8px', fontSize: 8, color: 'var(--wp-red)', background: 'rgba(248,113,113,.04)' }}>
            ❌ {sqlError}
          </div>
        )}
        {sqlMeta && (
          <div style={{ padding: '4px 8px', fontSize: 7, color: 'var(--wp-text-4)', fontFamily: 'var(--wp-mono)', display: 'flex', justifyContent: 'space-between' }}>
            <span>{sqlMeta}</span>
            <span>Ctrl+Enter to run</span>
          </div>
        )}
        {sqlCols.length > 0 && (
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{sqlCols.map(c => <th key={c} style={S.th}>{c}</th>)}</tr></thead>
              <tbody>
                {sqlResults.map((row, i) => (
                  <tr key={i}>
                    {sqlCols.map(c => <td key={c} style={S.td}>{String(row[c] ?? '')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MARKDOWN */}
      <div style={S.pane(activeTab === 'md')}>
        <div style={{ padding: 8, fontSize: 10, color: 'var(--wp-text-2)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--wp-text-1)' }}>README.md</strong><br /><br />
          File Engine is an AI-powered code generation platform.<br /><br />
          <strong style={{ color: 'var(--wp-text-1)' }}>## Features</strong><br />
          • Dual-provider AI (Claude + GPT)<br />
          • 20 native tools<br />
          • Vercel preview deploys<br />
          • GitHub integration
        </div>
      </div>

      {/* DOC */}
      <div style={S.pane(activeTab === 'doc')}>
        <div style={{ padding: 8, fontSize: 9, color: 'var(--wp-text-3)' }}>
          No document loaded. Open a file from Git tab.
        </div>
      </div>

      {/* GIT */}
      <div style={S.pane(activeTab === 'git')}>
        <div style={{ padding: 8, fontSize: 9, color: 'var(--wp-text-3)', fontFamily: 'var(--wp-mono)', lineHeight: 1.8 }}>
          📁 src/<br />
          &nbsp;&nbsp;📁 app/<br />
          &nbsp;&nbsp;&nbsp;&nbsp;📁 api/<br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;📄 chat/route.ts <span style={{ color: 'var(--wp-accent)' }}>M</span><br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;📄 deploy/route.ts<br />
          &nbsp;&nbsp;&nbsp;&nbsp;📄 page.tsx <span style={{ color: 'var(--wp-accent)' }}>M</span><br />
          &nbsp;&nbsp;📁 components/<br />
          &nbsp;&nbsp;&nbsp;&nbsp;📄 PricingTable.tsx <span style={{ color: 'var(--wp-blue)' }}>A</span><br />
          &nbsp;&nbsp;📁 lib/<br />
          &nbsp;&nbsp;&nbsp;&nbsp;📄 ai.ts <span style={{ color: 'var(--wp-accent)' }}>M</span>
        </div>
      </div>

      {/* DIFF */}
      <div style={S.pane(activeTab === 'diff')}>
        <div style={{ padding: 8, fontSize: 9, fontFamily: 'var(--wp-mono)', lineHeight: 1.5 }}>
          <span style={{ color: 'var(--wp-text-4)' }}>--- a/src/app/api/chat/route.ts</span><br />
          <span style={{ color: 'var(--wp-text-4)' }}>+++ b/src/app/api/chat/route.ts</span><br />
          <span style={{ color: 'var(--wp-text-4)' }}>@@ -89,3 +89,5 @@</span><br />
          <span style={{ color: 'var(--wp-text-3)' }}> const stream = new SSEStream()</span><br />
          <span style={{ color: 'var(--wp-red)' }}>- stream.timeout = 15000</span><br />
          <span style={{ color: 'var(--wp-accent)' }}>+ stream.timeout = 30000</span><br />
          <span style={{ color: 'var(--wp-accent)' }}>+ stream.on(&apos;error&apos;, handleTimeout)</span>
        </div>
      </div>

      {/* LOGS */}
      <div style={S.pane(activeTab === 'logs')}>
        {logs.map((l, i) => (
          <div key={l.id || i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px',
            borderBottom: '1px solid var(--wp-border)', cursor: 'pointer',
          }}>
            <span style={S.logBadge(l.status)}>
              {l.status === 'pass' ? '✅ PASS' : l.status === 'fail' ? '❌ FAIL' : l.status === 'fix' ? '🔧 FIX' : '⚡ ACT'}
            </span>
            <div>
              <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--wp-text-1)' }}>
                {l.status === 'pass' ? `Build ${l.commit || ''}` : l.status === 'fix' ? 'Auto-fix' : l.status === 'fail' ? `Build ${l.commit || ''}` : 'Action'}
              </div>
              <div style={{ fontSize: 7, color: 'var(--wp-text-4)', marginTop: 1 }}>
                {l.status === 'pass' ? `${l.time}s · ${l.url || ''}` : l.error || ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
