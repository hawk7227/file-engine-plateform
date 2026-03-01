'use client'

/**
 * WORKPLACE — Main Layout Orchestrator
 *
 * 2-column layout: Left sidebar (300px) + Center (flex)
 * No right panel (removed in V3.1)
 * Bottom panels collapsed by default (48px), expandable
 * Multi-device canvas with floating Chrome browser window
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'
import type { Message, GeneratedFile } from '@/hooks/useChat'
import { useChat } from '@/hooks/useChat'
import { useFileEnginePreview } from '@/hooks/useFileEnginePreview'
import { useWorkspaceRealtime } from '@/hooks/useWorkspaceRealtime'
import { WPChatPanel } from './WPChatPanel'
import { WPRoutesPanel } from './WPRoutesPanel'
import { WPVideoStudio } from './WPVideoStudio'
import { WPImageStudio } from './WPImageStudio'
import { WPTeamPanel } from './WPTeamPanel'
import { WPActivityFeed } from './WPActivityFeed'
import { WPToolbar } from './WPToolbar'
import { WPPreviewCanvas } from './WPPreviewCanvas'
import { WPCodeOutput } from './WPCodeOutput'
import { WPDocViewer } from './WPDocViewer'

// ============================================
// DEVICE PRESETS (Researched, accurate)
// ============================================

export interface DevicePreset {
  id: string
  name: string
  label: string
  cssViewport: { width: number; height: number }
  dpr: number
  screenSize: string
  frameType: 'phone-dynamic-island' | 'phone-home-button' | 'phone-android' | 'tablet' | 'browser'
  borderRadius: number
}

export const DEVICES: DevicePreset[] = [
  { id: 'se', name: 'iPhone SE', label: 'SE', cssViewport: { width: 375, height: 667 }, dpr: 2, screenSize: '4.7"', frameType: 'phone-home-button', borderRadius: 38 },
  { id: '14pm', name: 'iPhone 14 Pro Max', label: '14 PM', cssViewport: { width: 430, height: 932 }, dpr: 3, screenSize: '6.7"', frameType: 'phone-dynamic-island', borderRadius: 55 },
  { id: '15pro', name: 'iPhone 15 Pro', label: '15 Pro', cssViewport: { width: 393, height: 852 }, dpr: 3, screenSize: '6.1"', frameType: 'phone-dynamic-island', borderRadius: 50 },
  { id: '16pm', name: 'iPhone 16 Pro Max', label: '16 PM', cssViewport: { width: 440, height: 956 }, dpr: 3, screenSize: '6.9"', frameType: 'phone-dynamic-island', borderRadius: 55 },
  { id: 'pixel', name: 'Pixel 8', label: 'Pixel', cssViewport: { width: 412, height: 915 }, dpr: 2.625, screenSize: '6.2"', frameType: 'phone-android', borderRadius: 40 },
  { id: 'galaxy', name: 'Galaxy S24', label: 'Galaxy', cssViewport: { width: 360, height: 780 }, dpr: 3, screenSize: '6.2"', frameType: 'phone-android', borderRadius: 38 },
  { id: 'ipad', name: 'iPad Air', label: 'iPad', cssViewport: { width: 820, height: 1180 }, dpr: 2, screenSize: '10.9"', frameType: 'tablet', borderRadius: 18 },
]

export const BROWSER_PRESET: DevicePreset = {
  id: 'chrome', name: 'Chrome Browser', label: 'Web', cssViewport: { width: 1280, height: 800 }, dpr: 2, screenSize: '13-15"', frameType: 'browser', borderRadius: 12,
}

// ============================================
// LEFT PANEL TABS
// ============================================

type LeftTab = 'chat' | 'routes' | 'video' | 'images' | 'team' | 'feed'
type BottomTab = 'sql' | 'md' | 'doc' | 'git' | 'diff' | 'logs'

const LEFT_TABS: { id: LeftTab; icon: string; label: string }[] = [
  { id: 'chat', icon: '', label: 'Chat' },
  { id: 'routes', icon: '', label: 'Routes' },
  { id: 'video', icon: '', label: 'Video' },
  { id: 'images', icon: '', label: 'Imgs' },
  { id: 'team', icon: '', label: 'Team' },
  { id: 'feed', icon: '', label: 'Feed' },
]

// ============================================
// CSS (inline to avoid external deps)
// ============================================

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300;400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap');
:root{--wp-bg-0:#040406;--wp-bg-1:#08080c;--wp-bg-2:#0c0c12;--wp-bg-3:#111118;--wp-bg-4:#18181f;--wp-border:#1e1e28;--wp-border-2:#2a2a38;--wp-text-1:#f0f0f4;--wp-text-2:#a0a0b0;--wp-text-3:#606070;--wp-text-4:#404050;--wp-accent:#34d399;--wp-accent-dim:rgba(52,211,153,.08);--wp-purple:#a78bfa;--wp-purple-dim:rgba(167,139,250,.08);--wp-blue:#60a5fa;--wp-red:#f87171;--wp-yellow:#fbbf24;--wp-cyan:#22d3ee;--wp-font:'DM Sans',-apple-system,sans-serif;--wp-mono:'Geist Mono','JetBrains Mono',monospace}
.wp-root{display:flex;flex-direction:column;height:100vh;background:var(--wp-bg-0);color:var(--wp-text-1);font-family:var(--wp-font);-webkit-font-smoothing:antialiased;overflow:hidden}
.wp-root *{margin:0;padding:0;box-sizing:border-box}
.wp-root ::-webkit-scrollbar{width:4px;height:4px}.wp-root ::-webkit-scrollbar-track{background:transparent}.wp-root ::-webkit-scrollbar-thumb{background:var(--wp-border-2);border-radius:4px}
.wp-topbar{height:36px;display:flex;align-items:center;gap:6px;padding:0 10px;border-bottom:1px solid var(--wp-border);background:var(--wp-bg-1);flex-shrink:0}
.wp-main{flex:1;display:flex;overflow:hidden}
.wp-left{width:300px;background:var(--wp-bg-1);border-right:1px solid var(--wp-border);display:flex;flex-direction:column;flex-shrink:0}
.wp-lheader{padding:12px 14px;border-bottom:1px solid var(--wp-border);display:flex;align-items:center;gap:10px}
.wp-logo{width:28px;height:28px;border-radius:8px;background:var(--accent-primary),var(--wp-blue));display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;color:#000;flex-shrink:0;box-shadow:0 4px 16px rgba(52,211,153,.15)}
.wp-ltitle{font-size:13px;font-weight:800;letter-spacing:-.3px}
.wp-lsub{font-size:7px;color:var(--wp-text-3);font-weight:700;text-transform:uppercase;letter-spacing:1.5px}
.wp-gh{margin-left:auto;display:flex;align-items:center;gap:4px;font-size:7px;font-weight:700;padding:3px 8px;border-radius:6px;cursor:pointer;background:rgba(52,211,153,.06);border:1px solid rgba(52,211,153,.15);color:var(--wp-accent);transition:background .15s}.wp-gh:hover{background:rgba(52,211,153,.12)}
.wp-tbar{display:flex;border-bottom:1px solid var(--wp-border);overflow-x:auto;flex-shrink:0}.wp-tbar::-webkit-scrollbar{display:none}
.wp-tbtn{flex:1;padding:7px 0;text-align:center;font-size:6.5px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--wp-text-4);border:none;background:none;cursor:pointer;border-bottom:2px solid transparent;transition:all .15s;min-width:36px;white-space:nowrap;font-family:var(--wp-font)}.wp-tbtn:hover{color:var(--wp-text-2)}.wp-tbtn.on{color:var(--wp-accent);border-bottom-color:var(--wp-accent);background:var(--wp-accent-dim)}
.wp-tcontent{flex:1;overflow:hidden;position:relative}.wp-tpane{display:none;height:100%;flex-direction:column;overflow-y:auto}.wp-tpane.show{display:flex}
.wp-center{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden}
.wp-canvas-area{flex:1;display:flex;flex-direction:column;min-height:200px;overflow:hidden;position:relative}
.wp-bottom{display:flex;border-top:2px solid var(--wp-border);flex-shrink:0;position:relative;transition:height .25s ease;overflow:hidden}
.wp-bottom-left{flex:1;display:flex;flex-direction:column;border-right:1px solid var(--wp-border);min-width:0;overflow:hidden}
.wp-bottom-right{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden}
.wp-resize-v{position:absolute;top:-4px;left:0;right:0;height:8px;cursor:ns-resize;z-index:20}.wp-resize-v:hover{background:var(--accent-bg),transparent)}
.wp-pbar{display:flex;align-items:center;justify-content:space-between;padding:0 8px;height:26px;background:var(--wp-bg-3);border-bottom:1px solid var(--wp-border);flex-shrink:0}
.wp-pbar-t{font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--wp-text-3);display:flex;align-items:center;gap:4px}
.wp-pbar-t .dot{width:5px;height:5px;border-radius:50%}
.wp-pbtn{height:18px;border-radius:4px;border:none;background:none;color:var(--wp-text-4);cursor:pointer;font-size:7px;display:flex;align-items:center;justify-content:center;transition:all .1s;padding:0 6px;font-weight:700;font-family:var(--wp-font)}.wp-pbtn:hover{background:var(--wp-bg-4);color:var(--wp-text-2)}
.wp-footer{display:flex;gap:12px;padding:3px 10px;border-top:1px solid var(--wp-border);background:var(--wp-bg-1);font-size:7px;font-family:var(--wp-mono);color:var(--wp-text-4);flex-shrink:0;align-items:center}
.wp-footer span span{color:var(--wp-text-2)}
.wp-tb{padding:3px 6px;border-radius:6px;font-size:8px;font-weight:700;border:1px solid var(--wp-border);background:none;color:var(--wp-text-4);cursor:pointer;transition:all .1s;font-family:var(--wp-font)}.wp-tb:hover{border-color:var(--wp-border-2);color:var(--wp-text-2)}
.wp-tb-primary{background:var(--accent-primary),var(--wp-blue));color:#000;border:none;font-weight:800;padding:4px 10px}.wp-tb-primary:hover{box-shadow:0 0 12px rgba(52,211,153,.2)}
.wp-tsep{width:1px;height:16px;background:var(--wp-border);flex-shrink:0}
.wp-avstack{display:flex;align-items:center}.wp-avt{width:18px;height:18px;border-radius:50%;border:2px solid var(--wp-bg-1);margin-left:-6px;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:700;flex-shrink:0}.wp-avt:first-child{margin-left:0}
.wp-avcount{font-size:7px;color:var(--wp-text-3);margin-left:6px;font-weight:700}
.wp-toast-wrap{position:fixed;bottom:16px;right:16px;z-index:999;display:flex;flex-direction:column;gap:6px;pointer-events:none}
.wp-toast{padding:8px 14px;border-radius:8px;border:1px solid;font-size:10px;font-weight:700;pointer-events:auto;animation:wp-si .25s ease;backdrop-filter:blur(12px)}
.wp-toast.ok{background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.15);color:#4ade80}
.wp-toast.err{background:rgba(248,113,113,.08);border-color:rgba(248,113,113,.15);color:#f87171}
.wp-toast.nfo{background:rgba(59,130,246,.08);border-color:rgba(59,130,246,.15);color:#60a5fa}
@keyframes wp-si{from{transform:translateX(20px);opacity:0}to{transform:none;opacity:1}}
`

// ============================================
// COMPONENT
// ============================================

interface Props {
  user: User
  profile: Profile
}

export default function WorkplaceLayout({ user, profile }: Props) {
  // ── State ──
  const [leftTab, setLeftTab] = useState<LeftTab>('chat')
  const [bottomTab, setBottomTab] = useState<BottomTab>('sql')
  const [bottomHeight, setBottomHeight] = useState(48)
  const [bottomExpanded, setBottomExpanded] = useState(false)
  const [activeDevice, setActiveDevice] = useState<DevicePreset>(DEVICES[1]) // 14 Pro Max
  const [showBrowser, setShowBrowser] = useState(false)
  const [zoom, setZoom] = useState(0.7)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([])

  // ── Refs ──
  const toastRef = useRef<HTMLDivElement>(null)
  const resizingRef = useRef(false)
  const startYRef = useRef(0)
  const startHRef = useRef(0)

  // ── Hooks ──
  const chat = useChat({
    onComplete: () => {
      const lastMsg = chat.messages[chat.messages.length - 1]
      if (lastMsg?.files?.length) {
        setGeneratedFiles(lastMsg.files)
        realtime.logActivity('chat_receive', {
          files: lastMsg.files.map(f => f.path),
          message_preview: lastMsg.content.substring(0, 100),
        })
      }
    },
  })

  const preview = useFileEnginePreview()

  const realtime = useWorkspaceRealtime(
    user.id,
    profile.full_name || user.email || 'User',
    '#34d399'
  )

  // ── Toast ──
  const toast = useCallback((title: string, msg: string, type?: string) => {
    if (!toastRef.current) return
    const el = document.createElement('div')
    el.className = `wp-toast ${type || 'nfo'}`
    el.innerHTML = `<strong>${title}</strong> <span style="opacity:.7;margin-left:6px">${msg}</span>`
    toastRef.current.appendChild(el)
    setTimeout(() => {
      el.style.opacity = '0'
      el.style.transition = 'opacity .2s'
      setTimeout(() => el.remove(), 200)
    }, 2500)
  }, [])

  // ── Bottom panel resize ──
  const startResizeV = useCallback((e: React.MouseEvent) => {
    resizingRef.current = true
    startYRef.current = e.clientY
    startHRef.current = bottomHeight
    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return
      const h = startHRef.current - (ev.clientY - startYRef.current)
      setBottomHeight(Math.max(28, Math.min(500, h)))
      setBottomExpanded(h > 60)
    }
    const onUp = () => {
      resizingRef.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [bottomHeight])

  const toggleBottomExpand = useCallback(() => {
    if (bottomExpanded) {
      setBottomHeight(48)
      setBottomExpanded(false)
    } else {
      setBottomHeight(280)
      setBottomExpanded(true)
    }
  }, [bottomExpanded])

  // ── Deploy ──
  const handleDeploy = useCallback(async () => {
    if (!generatedFiles.length && !preview.files.length) {
      toast('No files', 'Generate code first', 'err')
      return
    }
    // Push files into preview state before deploying
    if (generatedFiles.length && !preview.files.length) {
      preview.setFiles(generatedFiles.map(f => ({ path: f.path, content: f.content })))
    }
    toast('Deploying', 'Build started...', 'nfo')
    realtime.logActivity('deploy_start', { file_count: preview.files.length || generatedFiles.length })
    const result = await preview.deployBoth('File Engine Project')
    if (result?.success) {
      toast('Deployed!', result.vercelUrl || 'Success', 'ok')
      realtime.logActivity('deploy_pass', { url: result.vercelUrl })
      if (result.vercelUrl) setPreviewUrl(result.vercelUrl)
    } else {
      toast('Deploy Failed', result?.error || 'Unknown error', 'err')
      realtime.logActivity('deploy_fail', { error: result?.error })
    }
  }, [generatedFiles, preview, toast, realtime])

  // ── Presence update on tab/device change ──
  useEffect(() => {
    realtime.updatePresence({
      device_preview: activeDevice.name,
      action: leftTab === 'chat' ? 'editing' : 'viewing',
    })
  }, [activeDevice, leftTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Online team count
  const onlineCount = realtime.teamMembers.filter(m => m.action !== 'idle').length || 1

  return (
    <>
      <style>{CSS}</style>
      <div className="wp-root">
        {/* ═══ TOP BAR ═══ */}
        <div className="wp-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="wp-logo" style={{ width: 22, height: 22, fontSize: 7 }}>FE</div>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '-.3px' }}>Workplace</span>
            <span style={{ fontSize: 7, color: 'var(--wp-text-4)', fontWeight: 700 }}>ADMIN v3</span>
          </div>
          <div className="wp-tsep" style={{ margin: '0 4px' }} />
          <div className="wp-avstack">
            {realtime.teamMembers.slice(0, 4).map((m, i) => (
              <div key={m.user_id} className="wp-avt" style={{
                background: m.user_id === user.id
                  ? 'var(--accent-primary),var(--wp-blue))'
                  : `hsl(${(i * 90 + 260) % 360}, 70%, 65%)`,
                color: m.user_id === user.id ? '#000' : '#fff',
              }}>
                {m.user_name?.[0]?.toUpperCase() || '?'}
              </div>
            ))}
            <span className="wp-avcount">{onlineCount} online</span>
          </div>
          <div className="wp-tsep" style={{ margin: '0 4px' }} />
          <button className="wp-tb wp-tb-primary" onClick={handleDeploy}> Deploy</button>
          <button className="wp-tb" onClick={() => {
            toast('Pushed', 'Files → master', 'ok')
            realtime.logActivity('git_push', { branch: 'master' })
          }}>⬆ Push</button>
          <button className="wp-tb"></button>
        </div>

        {/* ═══ MAIN ═══ */}
        <div className="wp-main">
          {/* ═══ LEFT PANEL ═══ */}
          <div className="wp-left">
            <div className="wp-lheader">
              <div className="wp-logo">FE</div>
              <div>
                <div className="wp-ltitle">File Engine</div>
                <div className="wp-lsub">Workplace IDE</div>
              </div>
              <div className="wp-gh"> hawk7227</div>
            </div>
            <div className="wp-tbar">
              {LEFT_TABS.map(t => (
                <button
                  key={t.id}
                  className={`wp-tbtn${leftTab === t.id ? ' on' : ''}`}
                  onClick={() => setLeftTab(t.id)}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
            <div className="wp-tcontent">
              <div className={`wp-tpane${leftTab === 'chat' ? ' show' : ''}`}>
                <WPChatPanel
                  chat={chat}
                  onExpandBottom={toggleBottomExpand}
                  onSwitchBottomTab={(tab: string) => setBottomTab(tab as BottomTab)}
                  onToggleBrowser={() => setShowBrowser(p => !p)}
                  toast={toast}
                  logActivity={realtime.logActivity}
                />
              </div>
              <div className={`wp-tpane${leftTab === 'routes' ? ' show' : ''}`}>
                <WPRoutesPanel toast={toast} />
              </div>
              <div className={`wp-tpane${leftTab === 'video' ? ' show' : ''}`}>
                <WPVideoStudio toast={toast} logActivity={realtime.logActivity} />
              </div>
              <div className={`wp-tpane${leftTab === 'images' ? ' show' : ''}`}>
                <WPImageStudio toast={toast} logActivity={realtime.logActivity} />
              </div>
              <div className={`wp-tpane${leftTab === 'team' ? ' show' : ''}`}>
                <WPTeamPanel
                  currentUserId={user.id}
                  teamMembers={realtime.teamMembers}
                  onWatch={realtime.startWatching}
                  toast={toast}
                />
              </div>
              <div className={`wp-tpane${leftTab === 'feed' ? ' show' : ''}`}>
                <WPActivityFeed activities={realtime.activities} />
              </div>
            </div>
          </div>

          {/* ═══ CENTER ═══ */}
          <div className="wp-center">
            <WPToolbar
              activeDevice={activeDevice}
              devices={DEVICES}
              zoom={zoom}
              showBrowser={showBrowser}
              previewUrl={previewUrl}
              previewPhase={preview.phase}
              onDeviceChange={setActiveDevice}
              onZoomChange={setZoom}
              onToggleBrowser={() => setShowBrowser(p => !p)}
              toast={toast}
            />
            <div className="wp-canvas-area">
              <WPPreviewCanvas
                activeDevice={activeDevice}
                showBrowser={showBrowser}
                zoom={zoom}
                previewUrl={previewUrl || preview.previewUrl}
                onCloseBrowser={() => setShowBrowser(false)}
              />
            </div>
            <div className="wp-bottom" style={{ height: bottomHeight }}>
              <div className="wp-resize-v" onMouseDown={startResizeV} />
              <div className="wp-bottom-left">
                <div className="wp-pbar">
                  <div className="wp-pbar-t">
                    <span className="dot" style={{ background: 'var(--wp-accent)' }} /> Code Output
                  </div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button className="wp-pbtn" onClick={toggleBottomExpand}>
                      {bottomExpanded ? '↓' : '↑'}
                    </button>
                    <button className="wp-pbtn" onClick={() => {
                      const code = generatedFiles.map(f => `// ${f.path}\n${f.content}`).join('\n\n')
                      navigator.clipboard.writeText(code).then(() => toast('Copied', 'Code copied', 'ok'))
                    }}></button>
                  </div>
                </div>
                <WPCodeOutput files={generatedFiles} />
              </div>
              <div className="wp-bottom-right">
                <WPDocViewer
                  activeTab={bottomTab}
                  onTabChange={(tab: string) => setBottomTab(tab as BottomTab)}
                  onExpand={toggleBottomExpand}
                  expanded={bottomExpanded}
                  previewPhase={preview.phase}
                  deployments={[]}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ═══ FOOTER ═══ */}
        <div className="wp-footer">
          <span>Device: <span>{activeDevice.name}</span></span>
          <span>Screen: <span>{activeDevice.cssViewport.width}×{activeDevice.cssViewport.height}</span></span>
          <span>DPR: <span>{activeDevice.dpr}x</span></span>
          <span>Env: <span style={{ color: 'var(--wp-yellow)' }}>STAGING</span></span>
          <span>Build: <span style={{ color: preview.phase === 'error' ? 'var(--wp-red)' : 'var(--wp-accent)' }}>
            {preview.phase === 'error' ? ' FAIL' : preview.phase === 'previewing' ? ' PASS' : preview.phase === 'idle' ? '—' : '⏳'}
          </span></span>
          <span style={{ marginLeft: 'auto' }}>Team: <span style={{ color: 'var(--wp-accent)' }}>{onlineCount} online</span></span>
        </div>

        {/* Toast container */}
        <div className="wp-toast-wrap" ref={toastRef} />
      </div>
    </>
  )
}
