'use client'

/**
 * WPDiffPreview — Pre-Edit Diff Preview System
 *
 * Shows side-by-side or inline diff of proposed changes.
 * User must Approve or Reject before changes apply.
 * Prevents AI agents from making silent edits.
 *
 * Features:
 *   - Unified diff view (inline red/green)
 *   - Side-by-side view toggle
 *   - Line numbers
 *   - Context lines (3 above/below change)
 *   - Impact assessment badge
 *   - Approve / Reject / "Try different approach" actions
 *   - Keyboard shortcuts: Enter = approve, Esc = reject
 */

import { useState, useEffect, useCallback, useRef } from 'react'

// ============================================
// CSS
// ============================================

const CSS = `
.wpd-overlay{position:fixed;inset:0;z-index:900;background:rgba(0,0,0,.7);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;animation:wpd-in .2s ease}
.wpd-modal{width:min(720px,92vw);max-height:84vh;background:var(--wp-bg-2);border:1px solid var(--wp-border);border-radius:12px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.wpd-header{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--wp-border);flex-shrink:0}
.wpd-title{font-size:13px;font-weight:700;color:var(--wp-text-1);flex:1}
.wpd-file{font-size:10px;font-weight:600;font-family:var(--wp-mono);color:var(--wp-purple);padding:2px 8px;border-radius:4px;background:var(--wp-purple-dim);border:1px solid rgba(167,139,250,.15)}
.wpd-impact{font-size:9px;font-weight:700;padding:2px 8px;border-radius:4px;font-family:var(--wp-mono)}
.wpd-impact.low{background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.15);color:var(--wp-accent)}
.wpd-impact.med{background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.15);color:var(--wp-yellow)}
.wpd-impact.high{background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.15);color:var(--wp-red)}
.wpd-close{width:24px;height:24px;border-radius:6px;background:none;border:1px solid var(--wp-border);color:var(--wp-text-4);font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}
.wpd-close:hover{border-color:var(--wp-border-2);color:var(--wp-text-2)}
.wpd-tabs{display:flex;gap:2px;padding:8px 16px 0;flex-shrink:0}
.wpd-tab{padding:4px 10px;border-radius:6px 6px 0 0;font-size:9px;font-weight:700;font-family:var(--wp-font);border:none;cursor:pointer;transition:all .15s}
.wpd-tab.off{background:none;color:var(--wp-text-4)}.wpd-tab.off:hover{color:var(--wp-text-2)}
.wpd-tab.on{background:var(--wp-bg-3);color:var(--wp-text-1)}
.wpd-body{flex:1;overflow:auto;font-family:var(--wp-mono);font-size:11px;line-height:1.6;background:var(--wp-bg-3)}
.wpd-line{display:flex;min-height:20px;border-bottom:1px solid rgba(255,255,255,.02)}
.wpd-ln{width:44px;text-align:right;padding:0 8px;color:var(--wp-text-4);font-size:10px;flex-shrink:0;user-select:none}
.wpd-code{flex:1;padding:0 12px;white-space:pre;overflow-x:auto;tab-size:2}
.wpd-line.add{background:rgba(52,211,153,.06)}.wpd-line.add .wpd-code{color:var(--wp-accent)}.wpd-line.add .wpd-ln{color:rgba(52,211,153,.4)}
.wpd-line.del{background:rgba(248,113,113,.06)}.wpd-line.del .wpd-code{color:var(--wp-red)}.wpd-line.del .wpd-ln{color:rgba(248,113,113,.4)}
.wpd-line.ctx{}.wpd-line.ctx .wpd-code{color:var(--wp-text-3)}
.wpd-line.hdr{background:rgba(96,165,250,.05)}.wpd-line.hdr .wpd-code{color:var(--wp-blue);font-weight:700}
.wpd-sbs{display:grid;grid-template-columns:1fr 1fr;flex:1;overflow:auto}
.wpd-sbs-pane{overflow:auto;font-family:var(--wp-mono);font-size:11px;line-height:1.6}
.wpd-sbs-pane.before{background:rgba(248,113,113,.02);border-right:1px solid var(--wp-border)}
.wpd-sbs-pane.after{background:rgba(52,211,153,.02)}
.wpd-sbs-label{padding:4px 12px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--wp-border);position:sticky;top:0;z-index:1}
.wpd-sbs-pane.before .wpd-sbs-label{background:rgba(248,113,113,.06);color:var(--wp-red)}
.wpd-sbs-pane.after .wpd-sbs-label{background:rgba(52,211,153,.06);color:var(--wp-accent)}
.wpd-footer{display:flex;align-items:center;gap:8px;padding:12px 16px;border-top:1px solid var(--wp-border);flex-shrink:0}
.wpd-summary{flex:1;font-size:10px;color:var(--wp-text-3);font-family:var(--wp-mono)}
.wpd-summary strong{color:var(--wp-text-2)}
.wpd-action{padding:6px 16px;border-radius:8px;font-size:10px;font-weight:700;cursor:pointer;font-family:var(--wp-font);transition:all .15s;border:none}
.wpd-approve{background:var(--wp-accent);color:#000}.wpd-approve:hover{opacity:.9}
.wpd-reject{background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.2);color:var(--wp-red)}.wpd-reject:hover{background:rgba(248,113,113,.15)}
.wpd-alt{background:none;border:1px solid var(--wp-border);color:var(--wp-text-3)}.wpd-alt:hover{border-color:var(--wp-border-2);color:var(--wp-text-2)}
.wpd-kbd{font-size:8px;color:var(--wp-text-4);font-family:var(--wp-mono);margin-left:4px}
@keyframes wpd-in{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:none}}
`

// ============================================
// DIFF ENGINE
// ============================================

interface DiffLine {
  type: 'add' | 'del' | 'ctx' | 'hdr'
  content: string
  oldNum?: number
  newNum?: number
}

function computeDiff(oldStr: string, newStr: string, contextLines: number = 3): DiffLine[] {
  const oldLines = oldStr.split('\n')
  const newLines = newStr.split('\n')
  const result: DiffLine[] = []

  // Simple LCS-based diff
  const m = oldLines.length
  const n = newLines.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = oldLines[i - 1] === newLines[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }

  // Backtrack to find operations
  const ops: { type: 'eq' | 'del' | 'add'; old?: string; new?: string; oldIdx?: number; newIdx?: number }[] = []
  let i = m, j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      ops.unshift({ type: 'eq', old: oldLines[i - 1], oldIdx: i, newIdx: j })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ type: 'add', new: newLines[j - 1], newIdx: j })
      j--
    } else {
      ops.unshift({ type: 'del', old: oldLines[i - 1], oldIdx: i })
      i--
    }
  }

  // Build context-aware output
  const changed = new Set<number>()
  ops.forEach((op, idx) => { if (op.type !== 'eq') changed.add(idx) })

  // Expand to include context lines
  const visible = new Set<number>()
  changed.forEach(idx => {
    for (let c = Math.max(0, idx - contextLines); c <= Math.min(ops.length - 1, idx + contextLines); c++) {
      visible.add(c)
    }
  })

  let lastVisible = -2
  ops.forEach((op, idx) => {
    if (!visible.has(idx)) return
    if (idx > lastVisible + 1 && lastVisible >= 0) {
      result.push({ type: 'hdr', content: `@@ gap @@` })
    }
    lastVisible = idx
    switch (op.type) {
      case 'eq': result.push({ type: 'ctx', content: op.old || '', oldNum: op.oldIdx, newNum: op.newIdx }); break
      case 'del': result.push({ type: 'del', content: op.old || '', oldNum: op.oldIdx }); break
      case 'add': result.push({ type: 'add', content: op.new || '', newNum: op.newIdx }); break
    }
  })

  return result
}

function computeStats(diff: DiffLine[]) {
  let added = 0, removed = 0
  diff.forEach(l => { if (l.type === 'add') added++; if (l.type === 'del') removed++ })
  const total = added + removed
  const impact: 'low' | 'med' | 'high' = total <= 5 ? 'low' : total <= 20 ? 'med' : 'high'
  return { added, removed, total, impact }
}

// ============================================
// PUBLIC INTERFACE
// ============================================

export interface DiffProposal {
  filePath: string
  oldContent: string
  newContent: string
  reason: string
}

interface Props {
  proposal: DiffProposal
  onApprove: () => void
  onReject: () => void
  onAlternative: () => void
}

export function WPDiffPreview({ proposal, onApprove, onReject, onAlternative }: Props) {
  const [view, setView] = useState<'unified' | 'split'>('unified')
  const bodyRef = useRef<HTMLDivElement>(null)

  const diff = computeDiff(proposal.oldContent, proposal.newContent)
  const stats = computeStats(diff)

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onApprove() }
      if (e.key === 'Escape') { e.preventDefault(); onReject() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onApprove, onReject])

  // Split view data
  const oldLines = diff.filter(l => l.type !== 'add').map(l => ({ ...l, type: l.type === 'del' ? 'del' as const : l.type }))
  const newLines = diff.filter(l => l.type !== 'del').map(l => ({ ...l, type: l.type === 'add' ? 'add' as const : l.type }))

  return (
    <>
      <style>{CSS}</style>
      <div className="wpd-overlay" onClick={e => { if (e.target === e.currentTarget) onReject() }}>
        <div className="wpd-modal">
          {/* Header */}
          <div className="wpd-header">
            <div className="wpd-title">Pre-Edit Review</div>
            <div className="wpd-file">{proposal.filePath}</div>
            <div className={`wpd-impact ${stats.impact}`}>
              {stats.impact === 'low' ? 'LOW' : stats.impact === 'med' ? 'MEDIUM' : 'HIGH'} IMPACT
            </div>
            <button className="wpd-close" onClick={onReject}>✕</button>
          </div>

          {/* Reason */}
          {proposal.reason && (
            <div style={{ padding: '8px 16px', fontSize: 10, color: 'var(--wp-text-3)', borderBottom: '1px solid var(--wp-border)' }}>
              {proposal.reason}
            </div>
          )}

          {/* View tabs */}
          <div className="wpd-tabs">
            <button className={`wpd-tab ${view === 'unified' ? 'on' : 'off'}`} onClick={() => setView('unified')}>Unified</button>
            <button className={`wpd-tab ${view === 'split' ? 'on' : 'off'}`} onClick={() => setView('split')}>Side-by-Side</button>
          </div>

          {/* Diff body */}
          {view === 'unified' ? (
            <div className="wpd-body" ref={bodyRef}>
              {diff.map((line, idx) => (
                <div key={idx} className={`wpd-line ${line.type}`}>
                  <div className="wpd-ln">{line.type === 'del' ? line.oldNum : line.type === 'add' ? line.newNum : line.oldNum}</div>
                  <div className="wpd-code">
                    {line.type === 'hdr' ? line.content : `${line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' '} ${line.content}`}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="wpd-sbs">
              <div className="wpd-sbs-pane before">
                <div className="wpd-sbs-label">BEFORE</div>
                {oldLines.map((line, idx) => (
                  <div key={idx} className={`wpd-line ${line.type}`}>
                    <div className="wpd-ln">{line.oldNum}</div>
                    <div className="wpd-code">{line.content}</div>
                  </div>
                ))}
              </div>
              <div className="wpd-sbs-pane after">
                <div className="wpd-sbs-label">AFTER</div>
                {newLines.map((line, idx) => (
                  <div key={idx} className={`wpd-line ${line.type}`}>
                    <div className="wpd-ln">{line.newNum}</div>
                    <div className="wpd-code">{line.content}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="wpd-footer">
            <div className="wpd-summary">
              <strong>+{stats.added}</strong> / <strong>-{stats.removed}</strong> lines · {stats.total} total changes
            </div>
            <button className="wpd-action wpd-alt" onClick={onAlternative}>Try Different</button>
            <button className="wpd-action wpd-reject" onClick={onReject}>Reject <span className="wpd-kbd">Esc</span></button>
            <button className="wpd-action wpd-approve" onClick={onApprove}>Approve <span className="wpd-kbd">Enter</span></button>
          </div>
        </div>
      </div>
    </>
  )
}
