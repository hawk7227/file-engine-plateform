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
import type { GeneratedFile } from '@/hooks/useChat'
import { useChat } from '@/hooks/useChat'
import { useFileEnginePreview } from '@/hooks/useFileEnginePreview'
import { assemblePreviewHtml } from '@/lib/preview-assembler'
import { useWorkspaceRealtime } from '@/hooks/useWorkspaceRealtime'
import { WPChatPanel } from './WPChatPanel'
import { WPRoutesPanel } from './WPRoutesPanel'
import { WPVideoStudio } from './WPVideoStudio'
import { WPImageStudio } from './WPImageStudio'
import { WPTeamPanel } from './WPTeamPanel'
import { WPActivityFeed } from './WPActivityFeed'
// WPToolbar removed — controls moved to sidebar
import { WPPreviewCanvas } from './WPPreviewCanvas'
import { WPCodeOutput } from './WPCodeOutput'
import { WPFileEditor } from './WPFileEditor'
import { WPDocViewer } from './WPDocViewer'
import { WPConsolePanel, useConsoleCapture } from './WPConsolePanel'
import { useConversation } from '@/hooks/useConversation'
import { WPSidebar } from './WPSidebar'
import { WPThemePanel } from './WPThemePanel'
import { WPAdminKeysPanel } from './WPAdminKeysPanel'
import { WPChatThemeOverride } from './WPChatThemeOverride'
import { WPChatFontSizer } from './WPChatFontSizer'
import { loadThemeScheme, applyTheme, saveThemeId, THEME_SCHEMES } from '@/lib/theme-engine'
import type { ThemeScheme } from '@/lib/theme-engine'
import { WPDiffPreview } from './WPDiffPreview'
import { WPPageBuilder } from './WPPageBuilder'
import { WPEditorPro } from './WPEditorPro'
import { applyVisualEdits } from '@/lib/visual-edit-patcher'
import { resolveDependencies } from '@/lib/dependency-resolver'
import { assembleFromResolved } from '@/lib/preview-assembler'
import type { ElementEdit } from './WPVisualEditor'
import type { DiffProposal } from './WPDiffPreview'

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

type LeftTab = 'chat' | 'routes' | 'video' | 'images' | 'team' | 'feed' | 'theme' | 'admin' | 'settings'
type BottomTab = 'sql' | 'md' | 'doc' | 'git' | 'diff' | 'logs' | 'console'

const LEFT_TABS: { id: LeftTab; icon: string; label: string }[] = [
  { id: 'chat', icon: '💬', label: 'Chat' },
  { id: 'routes', icon: '🗂', label: 'Routes' },
  { id: 'video', icon: '🎬', label: 'Video' },
  { id: 'images', icon: '🖼', label: 'Imgs' },
  { id: 'team', icon: '👥', label: 'Team' },
  { id: 'feed', icon: '📡', label: 'Feed' },
  { id: 'theme', icon: '🎨', label: 'Theme' },
]

// ============================================
// CSS (inline to avoid external deps)
// ============================================

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300;400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap');
:root{--wp-bg-0:#040406;--wp-bg-1:#0a0a10;--wp-bg-2:#0e0e16;--wp-bg-3:#14141e;--wp-bg-4:#1a1a26;--wp-border:#1e1e2c;--wp-border-2:#2c2c40;--wp-text-1:#ffffff;--wp-text-2:#c8c8d8;--wp-text-3:#7878a0;--wp-text-4:#505070;--wp-accent:#00f5a0;--wp-accent-dim:rgba(0,245,160,.10);--wp-purple:#b44dff;--wp-purple-dim:rgba(180,77,255,.10);--wp-blue:#3b82ff;--wp-red:#ff3b5c;--wp-yellow:#ffcc00;--wp-cyan:#00e5ff;--wp-orange:#ff8a00;--wp-pink:#ff2d87;--wp-font:'DM Sans',-apple-system,sans-serif;--wp-mono:'Geist Mono','JetBrains Mono',monospace;--wp-fs:clamp(13px,1.6vw,15px);--wp-fs-sm:clamp(10px,1.2vw,12px);--wp-fs-xs:clamp(8px,1vw,10px);--wp-shadow-1:0 4px 14px rgba(0,0,0,.06);--wp-shadow-2:0 10px 30px rgba(0,0,0,.08);--wp-shadow-3:0 18px 60px rgba(0,0,0,.10)}
[data-wp-theme="light"]{--wp-bg-0:#f8f8fa;--wp-bg-1:#f0f0f4;--wp-bg-2:#e8e8ee;--wp-bg-3:#e0e0e8;--wp-bg-4:#d8d8e0;--wp-border:#d0d0da;--wp-border-2:#c0c0cc;--wp-text-1:#0a0a12;--wp-text-2:#2a2a40;--wp-text-3:#505068;--wp-text-4:#707088;--wp-accent:#00c97a;--wp-accent-dim:rgba(0,201,122,.08);--wp-purple:#9333ea;--wp-blue:#2563eb;--wp-red:#dc2626;--wp-yellow:#d97706;--wp-cyan:#0891b2;--wp-orange:#ea580c;--wp-pink:#db2777}
.wp-root{display:flex;flex-direction:column;height:100vh;background:var(--wp-bg-0);color:var(--wp-text-1);font-family:var(--wp-font);-webkit-font-smoothing:antialiased;overflow:hidden}
.wp-root *{margin:0;padding:0;box-sizing:border-box}
.wp-root ::-webkit-scrollbar{width:4px;height:4px}.wp-root ::-webkit-scrollbar-track{background:transparent}.wp-root ::-webkit-scrollbar-thumb{background:var(--wp-border-2);border-radius:4px}
.wp-topbar{height:48px;display:flex;align-items:center;gap:10px;padding:0 16px;border-bottom:1px solid var(--wp-border);background:var(--wp-bg-1);flex-shrink:0}
.wp-main{flex:1;display:flex;overflow:hidden}
.wp-left{width:var(--wp-left-w,300px);background:var(--wp-bg-1);border-right:1px solid var(--wp-border);display:flex;flex-direction:column;flex-shrink:0}
.wp-lheader{padding:12px 14px;border-bottom:1px solid var(--wp-border);display:flex;align-items:center;gap:10px}
.wp-logo{width:32px;height:32px;border-radius:8px;background:var(--wp-accent);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#000;flex-shrink:0;box-shadow:0 0 20px rgba(0,245,160,.25)}
.wp-ltitle{font-size:13px;font-weight:800;letter-spacing:-.3px}
.wp-lsub{font-size:7px;color:var(--wp-text-3);font-weight:700;text-transform:uppercase;letter-spacing:1.5px}
.wp-gh{margin-left:auto;display:flex;align-items:center;gap:4px;font-size:7px;font-weight:700;padding:3px 8px;border-radius:6px;cursor:pointer;background:rgba(52,211,153,.06);border:1px solid rgba(52,211,153,.15);color:var(--wp-accent);transition:background .15s}.wp-gh:hover{background:rgba(52,211,153,.12)}
.wp-tbar{display:flex;border-bottom:1px solid var(--wp-border);overflow-x:auto;flex-shrink:0}.wp-tbar::-webkit-scrollbar{display:none}
.wp-tbtn{flex:1;padding:10px 0;text-align:center;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--wp-text-3);border:none;background:none;cursor:pointer;border-bottom:2px solid transparent;transition:all .15s;min-width:44px;white-space:nowrap;font-family:var(--wp-font)}.wp-tbtn:hover{color:var(--wp-text-1)}.wp-tbtn.on{color:var(--wp-accent);border-bottom-color:var(--wp-accent);background:var(--wp-accent-dim)}
.wp-tcontent{flex:1;overflow:hidden;position:relative}.wp-tpane{display:none;height:100%;flex-direction:column;overflow-y:auto}.wp-tpane.show{display:flex}
.wp-center{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden}
.wp-right{background:var(--wp-bg-0);border-left:1px solid var(--wp-border);display:flex;flex-direction:column;flex-shrink:0;overflow:hidden;min-width:0}
.wp-canvas-area{flex:1;display:flex;flex-direction:column;min-height:200px;overflow:hidden;position:relative}
.wp-bottom{display:flex;border-top:2px solid var(--wp-border);flex-shrink:0;position:relative;transition:height .25s ease;overflow:hidden}
.wp-bottom-left{flex:1;display:flex;flex-direction:column;border-right:1px solid var(--wp-border);min-width:0;overflow:hidden}
.wp-bottom-right{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden}
.wp-resize-v{position:absolute;top:-4px;left:0;right:0;height:8px;cursor:ns-resize;z-index:20}.wp-resize-v:hover{background:transparent}
.wp-resize-h{width:6px;cursor:col-resize;background:transparent;flex-shrink:0;position:relative;z-index:10;transition:background .15s}.wp-resize-h:hover{background:var(--wp-accent-dim)}.wp-resize-h:active{background:var(--wp-accent)}
.wp-pbar{display:flex;align-items:center;justify-content:space-between;padding:0 12px;height:32px;background:var(--wp-bg-3);border-bottom:1px solid var(--wp-border);flex-shrink:0}
.wp-pbar-t{font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--wp-text-3);display:flex;align-items:center;gap:4px}
.wp-pbar-t .dot{width:5px;height:5px;border-radius:50%}
.wp-pbtn{height:18px;border-radius:4px;border:none;background:none;color:var(--wp-text-4);cursor:pointer;font-size:7px;display:flex;align-items:center;justify-content:center;transition:all .1s;padding:0 6px;font-weight:700;font-family:var(--wp-font)}.wp-pbtn:hover{background:var(--wp-bg-4);color:var(--wp-text-2)}
.wp-footer{display:flex;gap:14px;padding:5px 14px;border-top:1px solid var(--wp-border);background:var(--wp-bg-1);font-size:10px;font-family:var(--wp-mono);color:var(--wp-text-3);flex-shrink:0;align-items:center}
.wp-footer span span{color:var(--wp-text-2)}
.wp-tb{padding:6px 12px;border-radius:8px;font-size:12px;font-weight:800;border:1px solid var(--wp-border-2);background:none;color:var(--wp-text-2);cursor:pointer;transition:all .15s;font-family:var(--wp-font);letter-spacing:.01em}.wp-tb:hover{border-color:var(--wp-accent);color:var(--wp-text-1);background:var(--wp-bg-3)}
.wp-tb-primary{background:var(--wp-accent);color:#000;border:none;font-weight:900;padding:7px 16px;font-size:13px;border-radius:8px;text-transform:uppercase;letter-spacing:.03em}.wp-tb-primary:hover{box-shadow:0 0 20px rgba(0,245,160,.3);transform:translateY(-1px)}
.wp-tsep{width:1px;height:16px;background:var(--wp-border);flex-shrink:0}
.wp-avstack{display:flex;align-items:center}.wp-avt{width:24px;height:24px;border-radius:50%;border:2px solid var(--wp-bg-1);margin-left:-8px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex-shrink:0}.wp-avt:first-child{margin-left:0}
.wp-avcount{font-size:7px;color:var(--wp-text-3);margin-left:6px;font-weight:700}
.wp-toast-wrap{position:fixed;bottom:16px;right:16px;z-index:999;display:flex;flex-direction:column;gap:6px;pointer-events:none}
.wp-toast{padding:8px 14px;border-radius:8px;border:1px solid;font-size:10px;font-weight:700;pointer-events:auto;animation:wp-si .25s ease;backdrop-filter:blur(12px)}
.wp-toast.ok{background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.15);color:#4ade80}
.wp-toast.err{background:rgba(248,113,113,.08);border-color:rgba(248,113,113,.15);color:#f87171}
.wp-toast.nfo{background:rgba(59,130,246,.08);border-color:rgba(59,130,246,.15);color:#60a5fa}
@keyframes wp-si{from{transform:translateX(20px);opacity:0}to{transform:none;opacity:1}}
.wp-tool-rail{width:40px;flex-shrink:0;background:var(--wp-bg-2);border-right:1px solid var(--wp-border);display:flex;flex-direction:column;align-items:center;padding:8px 0;gap:2px;overflow:hidden}
.wp-tool-btn{width:32px;height:32px;border-radius:8px;border:none;background:none;color:var(--wp-text-3);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;transition:all .15s;flex-shrink:0;position:relative}
.wp-tool-btn:hover{background:var(--wp-bg-4);color:var(--wp-text-1)}
.wp-tool-btn.on{background:var(--wp-accent-dim);color:var(--wp-accent)}
.wp-tool-btn.danger{color:var(--wp-red)}
.wp-tool-sep{width:24px;height:1px;background:var(--wp-border);margin:4px 0;flex-shrink:0}
.wp-tool-panel{position:absolute;top:0;bottom:0;left:40px;width:240px;background:var(--wp-bg-1);border-right:1px solid var(--wp-border);z-index:30;display:flex;flex-direction:column;overflow:hidden;animation:wp-tpslide .18s ease}
@keyframes wp-tpslide{from{transform:translateX(-10px);opacity:0}to{transform:none;opacity:1}}
.wp-tp-hdr{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid var(--wp-border);flex-shrink:0}
.wp-tp-hdr-title{font-size:11px;font-weight:700;color:var(--wp-text-1)}
.wp-tp-close{background:none;border:none;color:var(--wp-text-4);font-size:14px;cursor:pointer;line-height:1;padding:2px}
.wp-tp-close:hover{color:var(--wp-text-2)}
.wp-tp-body{flex:1;overflow-y:auto;padding:12px}
.wp-device-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:12px}
.wp-dv-btn{padding:6px 4px;border-radius:6px;border:1px solid var(--wp-border);background:var(--wp-bg-3);color:var(--wp-text-3);font-size:9px;font-weight:700;cursor:pointer;text-align:center;transition:all .15s;font-family:var(--wp-font)}
.wp-dv-btn:hover{border-color:var(--wp-border-2);color:var(--wp-text-2)}
.wp-dv-btn.on{border-color:var(--wp-accent);background:var(--wp-accent-dim);color:var(--wp-accent)}
.wp-tp-label{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--wp-text-4);margin-bottom:6px;display:block}
.wp-zoom-row{display:flex;align-items:center;gap:6px;margin-bottom:12px}
.wp-zoom-btn{width:28px;height:28px;border-radius:6px;border:1px solid var(--wp-border);background:var(--wp-bg-3);color:var(--wp-text-2);font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
.wp-zoom-btn:hover{border-color:var(--wp-accent);color:var(--wp-accent)}
.wp-zoom-val{flex:1;text-align:center;font-size:11px;font-weight:700;color:var(--wp-text-1);font-family:var(--wp-mono)}
@media(max-width:768px){.wp-left{position:fixed;left:0;top:48px;bottom:32px;z-index:50;width:280px;transform:translateX(-100%);transition:transform .22s ease}.wp-left.open{transform:none}.wp-mobile-toggle{display:flex}.wp-center{width:100%}.wp-bottom{height:48px!important}.wp-main{flex-direction:column}.wp-canvas-area{min-height:340px;max-height:50vh}.wp-footer{flex-wrap:wrap;gap:6px}}
@media(min-width:769px){.wp-mobile-toggle{display:none}.wp-left{transform:none!important}}
@media(min-width:769px) and (max-width:1024px){.wp-left{width:240px}.wp-canvas-area{min-height:300px}}
@media(max-width:480px){.wp-topbar{padding:0 8px;gap:6px}.wp-topbar .wp-tb{font-size:10px;padding:4px 8px}.wp-footer{font-size:8px}.wp-lheader{padding:10px 12px}.wp-ltitle{font-size:14px}}
`

// ============================================
// COMPONENT
// ============================================

interface Props {
  user: User
  profile: Profile
  accessToken?: string | null
}

export default function WorkplaceLayout({ user, profile, accessToken }: Props) {
  // ── State ──
  const [leftTab, setLeftTab] = useState<LeftTab>('chat')
  const [bottomTab, setBottomTab] = useState<BottomTab>('sql')
  const consoleCapture = useConsoleCapture()
  const [bottomHeight, setBottomHeight] = useState(48)
  const [bottomExpanded, setBottomExpanded] = useState(false)
  const [activeDevice, setActiveDevice] = useState<DevicePreset>(DEVICES[1]) // 14 Pro Max
  const [showBrowser, setShowBrowser] = useState(false)
  const [zoom, setZoom] = useState(0.7)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  // User-set base URL for real project preview (e.g. https://patient.medazonhealth.com)
  // GitHub coords for dependency resolution — mirrors what user sets in file editor
  const [githubOwner, setGithubOwner] = useState<string>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('wp-github-owner') || '' : ''
  )
  const [githubRepo, setGithubRepo] = useState<string>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('wp-github-repo') || '' : ''
  )
  const [githubBranch, setGithubBranch] = useState<string>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('wp-github-branch') || 'main' : 'main'
  )
  const [resolvingDeps, setResolvingDeps] = useState(false)
  const resolveAbortRef = useRef<AbortController | null>(null)

  const [projectBaseUrl, setProjectBaseUrl] = useState<string>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('wp-project-base-url') || '' : ''
  )
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([])
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [themeScheme, setThemeScheme] = useState<ThemeScheme>(() => {
    if (typeof window !== 'undefined') return loadThemeScheme()
    return loadThemeScheme()
  })
  const theme = themeScheme.category === 'light' ? 'light' : 'dark'
  const [rotated, setRotated] = useState(false)

  // ── Conversation persistence ──
  const initialChatId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('chat') || undefined : undefined
  const conv = useConversation(initialChatId)

  // §8: Apply theme scheme on mount and when it changes
  useEffect(() => {
    applyTheme(themeScheme)
    return () => { document.documentElement.removeAttribute('data-wp-theme') }
  }, [themeScheme])
  const [refreshKey, setRefreshKey] = useState(0)
  const [diffProposal, setDiffProposal] = useState<DiffProposal | null>(null)
  const [editorOpenFile, setEditorOpenFile] = useState<string | null>(null)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('wp-sidebar-collapsed') === 'true'
    }
    return false
  })
  const [sidebarNav, setSidebarNav] = useState('chats')
  const [leftWidth, setLeftWidth] = useState(300)
  const [pageBuilderMode, setPageBuilderMode] = useState(false)
  const [editorProVisible, setEditorProVisible] = useState(false)
  const [rightWidth, setRightWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wp-right-w')
      return saved ? parseInt(saved) : Math.min(700, Math.floor(window.innerWidth * 0.45))
    }
    return 700
  })
  const [toolPanel, setToolPanel] = useState<'none'|'device'|'theme'|'admin'|'settings'>('none')
  const toggleTool = (panel: 'device'|'theme'|'admin'|'settings') =>
    setToolPanel(p => p === panel ? 'none' : panel)

  // ── Horizontal resize (left panel ↔ center) ──
  const startResizeH = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = leftWidth
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX
      setLeftWidth(Math.max(200, Math.min(600, startW + delta)))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [leftWidth])

  // ── Horizontal resize (center ↔ right panel) ──
  const startResizeRight = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = rightWidth
    const onMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX
      const newW = Math.max(400, Math.min(1200, startW + delta))
      setRightWidth(newW)
      try { localStorage.setItem('wp-right-w', String(newW)) } catch {}
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [rightWidth])

  // ── Load conversation from URL on mount ──
  useEffect(() => {
    if (!initialChatId || conv.isLoading) return
    conv.loadConversation(initialChatId).then(messages => {
      if (messages.length > 0) {
        // Restore messages into chat state
        const restored = messages.map(m => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: m.created_at,
          status: 'complete' as const,
        }))
        chat.setMessages(restored)

        // Restore generated files from last assistant message
        const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant' && m.files_json)
        if (lastAssistant?.files_json && Array.isArray(lastAssistant.files_json)) {
          const files = lastAssistant.files_json as { path: string; content: string; language?: string }[]
          setGeneratedFiles(files.map(f => ({ path: f.path, content: f.content, language: f.language || 'text' })))
        }
      }
    })
    // Load recent chats for sidebar
    conv.loadRecentChats()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Build preview HTML from generated files (debounced 150ms) ──
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!generatedFiles.length) {
      setPreviewHtml(null)
      return
    }
    debounceRef.current = setTimeout(() => {
      const html = assemblePreviewHtml(generatedFiles)
      setPreviewHtml(html)
      if (html) setRefreshKey(k => k + 1)
    }, 150)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [generatedFiles])

  // ── Refs ──
  const toastRef = useRef<HTMLDivElement>(null)
  const resizingRef = useRef(false)
  const startYRef = useRef(0)
  const startHRef = useRef(0)

  // ── Hooks ──
  const chat = useChat({
    onMessage: async (msg) => {
      // Auto-create conversation on first user message
      if (msg.role === 'user') {
        if (!conv.conversationId) {
          try {
            await conv.createConversation({ model: 'auto' })
          } catch { /* non-fatal — chat still works without persistence */ }
        }
        if (conv.conversationId) {
          conv.saveUserMessage(msg.content, msg.attachments as unknown[] | undefined)
        }
      }
    },
    onComplete: async (files) => {
      if (files?.length) {
        setGeneratedFiles(files)
        realtime.logActivity('chat_receive', {
          files: files.map(f => f.path),
          message_preview: 'File generation complete',
        })
      }
      // Save assistant message to DB
      if (conv.conversationId && chat.messages.length >= 2) {
        const lastAssistant = [...chat.messages].reverse().find(m => m.role === 'assistant')
        if (lastAssistant) {
          conv.saveAssistantMessage(lastAssistant.content, {
            files_json: files?.map(f => ({ path: f.path, content: f.content, language: f.language })) || undefined,
          })
          // Auto-title after first exchange
          const firstUser = chat.messages.find(m => m.role === 'user')
          if (firstUser) {
            conv.generateTitle(firstUser.content, lastAssistant.content.slice(0, 300))
          }
        }
      }
    },
    onFilesUpdated: (files) => {
      // Real-time: update preview as soon as files stream in (before onComplete)
      if (files?.length) {
        setGeneratedFiles(files)
      }
    },
    onSandboxPreview: (url) => {
      // Sandbox dev server is running — load it directly in the iframe
      console.log(`[Workplace] Sandbox preview URL: ${url}`)
      setPreviewUrl(url)
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

  // ── Preview files from chat message ──
  // ── Sidebar handlers ──
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev
      localStorage.setItem('wp-sidebar-collapsed', String(next))
      return next
    })
  }, [])

  const handleNewChat = useCallback(() => {
    chat.clearMessages()
    setGeneratedFiles([])
    setPreviewHtml(null)
    // Clear URL param
    const url = new URL(window.location.href)
    url.searchParams.delete('chat')
    window.history.replaceState({}, '', url.toString())
  }, [chat])

  const handleSelectChat = useCallback((id: string) => {
    conv.loadConversation(id).then(messages => {
      if (messages.length > 0) {
        const restored = messages.map(m => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: m.created_at,
          status: 'complete' as const,
        }))
        chat.setMessages(restored)
        const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant' && m.files_json)
        if (lastAssistant?.files_json && Array.isArray(lastAssistant.files_json)) {
          const files = lastAssistant.files_json as { path: string; content: string; language?: string }[]
          setGeneratedFiles(files.map(f => ({ path: f.path, content: f.content, language: f.language || 'text' })))
        } else {
          setGeneratedFiles([])
        }
      }
    })
    // Update URL
    const url = new URL(window.location.href)
    url.searchParams.set('chat', id)
    window.history.replaceState({}, '', url.toString())
    // Close mobile sidebar
    setMobileSidebarOpen(false)
  }, [conv, chat])

  const handleRenameChat = useCallback((id: string, title: string) => {
    conv.renameConversation(title).then(() => conv.loadRecentChats())
  }, [conv])

  const handleDeleteChat = useCallback((id: string) => {
    conv.deleteConversation().then(() => {
      conv.loadRecentChats()
      if (conv.conversationId === id) {
        handleNewChat()
      }
    })
  }, [conv, handleNewChat])

  const handleArchiveChat = useCallback((id: string) => {
    conv.archiveConversation().then(() => conv.loadRecentChats())
  }, [conv])

  const handleSidebarSearch = useCallback((query: string) => {
    if (query.length >= 2) {
      conv.loadRecentChats({ search: query })
    } else {
      conv.loadRecentChats()
    }
  }, [conv])

  // Load recent chats on mount
  useEffect(() => {
    conv.loadRecentChats()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleElementClick = useCallback((component: string | null, tag: string) => {
    // Find matching file in generated files
    if (!component) return
    // Try exact filename match: Button -> Button.tsx, button.tsx
    const match = generatedFiles.find(f => {
      const name = f.path.split('/').pop()?.replace(/\.tsx?$/, '') || ''
      return name.toLowerCase() === component.toLowerCase()
    }) || generatedFiles.find(f => f.path.includes(component))
    if (match) {
      setEditorOpenFile(match.path)
      // Expand bottom panel if collapsed — but not when Page Builder is active
      if (!bottomExpanded && !pageBuilderMode) {
        setBottomHeight(300)
        setBottomExpanded(true)
      }
    }
  }, [generatedFiles, bottomExpanded])

  const handleEditorSave = useCallback((files: GeneratedFile[]) => {
    setGeneratedFiles(files)
  }, [])

  // ── Layout-level local file upload — opens file + expands bottom panel ──
  const layoutUploadRef = useRef<HTMLInputElement>(null)
  // ── Derive a URL route from a Next.js file path ──
  // page-2026-03-05T063503.402.tsx         → /  (root page by filename heuristic)
  // app/checkout/page.tsx                   → /checkout
  // app/(marketing)/about/page.tsx          → /about
  // src/app/patients/[id]/page.tsx          → /patients/[id]
  const deriveRouteFromPath = useCallback((filePath: string): string => {
    // Normalise slashes, remove leading ./
    let p = filePath.replace(/\\/g, '/').replace(/^\.\//, '')
    // Strip src/ prefix
    p = p.replace(/^src\//, '')
    // If no directory structure (bare filename), treat as root page
    if (!p.includes('/')) return '/'
    // Strip app/ prefix
    p = p.replace(/^app\//, '')
    // Remove route groups like (marketing)/
    p = p.replace(/\([^)]+\)\//g, '')
    // Remove trailing /page.tsx or /route.ts
    p = p.replace(/\/(page|layout|route|loading|error)\.tsx?$/, '')
    p = p.replace(/\.(tsx?|jsx?)$/, '')
    // If empty after stripping, it's the root
    if (!p || p === 'page' || p === 'index') return '/'
    return '/' + p
  }, [])

  const handleLayoutUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const text = ev.target?.result as string
      if (typeof text !== 'string') return

      // Always open in editor
      setEditorOpenFile(file.name)
      if (!bottomExpanded && !pageBuilderMode) { setBottomHeight(320); setBottomExpanded(true) }
      toast('Opened', file.name, 'ok')

      // If GitHub coords set → resolve full dependency graph from repo
      if (githubOwner.trim() && githubRepo.trim()) {
        // Cancel any previous resolution
        resolveAbortRef.current?.abort()
        const ctrl = new AbortController()
        resolveAbortRef.current = ctrl

        setResolvingDeps(true)
        setPreviewHtml(null)
        toast('Resolving', 'Fetching dependencies from GitHub…', 'nfo')

        try {
          const resolved = await resolveDependencies(
            file.name, text,
            { owner: githubOwner, repo: githubRepo, branch: githubBranch },
            ctrl.signal
          )
          if (ctrl.signal.aborted) return

          // Build preview from full resolved tree — NO stripping, real imports replaced with CDN globals
          const html = assembleFromResolved(file.name, resolved)
          setPreviewHtml(html)
          setPreviewUrl(null)
          setRefreshKey(k => k + 1)

          // Put all resolved files into generatedFiles so editor can see them
          const files = Object.entries(resolved).map(([path, content]) => ({
            path, content, language: path.split('.').pop() || 'text'
          }))
          setGeneratedFiles(files)
          toast('Ready', `${Object.keys(resolved).length} file(s) resolved`, 'ok')
        } catch (err) {
          if (!ctrl.signal.aborted) {
            toast('Resolve failed', String(err), 'err')
            // Fallback: put just this file in assembler
            setGeneratedFiles([{ path: file.name, content: text, language: file.name.split('.').pop() || 'text' }])
          }
        } finally {
          if (!ctrl.signal.aborted) setResolvingDeps(false)
        }
        return
      }

      // No GitHub coords — put single file into assembler (simple self-contained files)
      setGeneratedFiles([{ path: file.name, content: text, language: file.name.split('.').pop() || 'text' }])
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [bottomExpanded, githubOwner, githubRepo, githubBranch, toast])

  // ── Visual edit write-back: apply DOM edits to source files ──
  const handleCommitEdits = useCallback((edits: ElementEdit[]) => {
    setGeneratedFiles(prev => {
      const patched = applyVisualEdits(prev, edits)
      toast('Edits committed', `${edits.length} element(s) updated in source`, 'ok')
      return patched
    })
  }, [toast])

  const handlePreviewFiles = useCallback((files: GeneratedFile[]) => {
    if (files.length > 0) {
      setGeneratedFiles(files)
    }
  }, [])

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
        <WPChatThemeOverride />
        <WPChatFontSizer />
        {/* ═══ TOP BAR — minimal: logo + team presence + deploy only ═══ */}
        <div className="wp-topbar">
          <button className="wp-tb wp-mobile-toggle" onClick={() => setMobileSidebarOpen(p => !p)} style={{ padding: '3px 6px' }}>☰</button>
          <div className="wp-logo" style={{ width: 28, height: 28, fontSize: 8, borderRadius: 8 }}>FE</div>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-.3px' }}>Workplace</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            <div className="wp-avstack">
              {realtime.teamMembers.slice(0, 4).map((m, i) => (
                <div key={m.user_id} className="wp-avt" style={{
                  background: m.user_id === user.id ? 'var(--wp-accent)' : `hsl(${(i * 90 + 260) % 360}, 70%, 65%)`,
                  color: m.user_id === user.id ? '#000' : '#fff',
                }}>
                  {m.user_name?.[0]?.toUpperCase() || '?'}
                </div>
              ))}
              <span className="wp-avcount">{onlineCount} online</span>
            </div>
            <div className="wp-tsep" style={{ margin: '0 4px' }} />
            <button className="wp-tb wp-tb-primary" onClick={handleDeploy}>▶ Deploy</button>
            <button className="wp-tb" onClick={() => { toast('Pushed', 'Files → master', 'ok'); realtime.logActivity('git_push', { branch: 'master' }) }}>⬆ Push</button>
          </div>
        </div>



        {/* ═══ SIDEBAR ═══ */}
        <WPSidebar
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
          recentChats={conv.recentChats}
          activeChatId={conv.conversationId}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          onRenameChat={handleRenameChat}
          onDeleteChat={handleDeleteChat}
          onArchiveChat={handleArchiveChat}
          onSearch={handleSidebarSearch}
          activeNav={sidebarNav}
          onNavChange={setSidebarNav}
          userName={profile.full_name || ''}
          userEmail={user.email || ''}
        />

        {/* ═══ MAIN ═══ */}
        <div className="wp-main">
          {/* ═══ LEFT PANEL — tool rail + chat + slide-in tool panels ═══ */}
          <div className={`wp-left${mobileSidebarOpen ? ' open' : ''}`} style={{ width: leftWidth, flexDirection: 'row', overflow: 'visible', position: 'relative' }}>

            {/* ── Tool Rail (40px) ── */}
            <div className="wp-tool-rail">
              {/* Device picker */}
              <button
                className={`wp-tool-btn${toolPanel === 'device' ? ' on' : ''}`}
                onClick={() => toggleTool('device')}
                title="Device & Zoom"
              >📱</button>

              <div className="wp-tool-sep" />

              {/* Zoom in/out */}
              <button
                className="wp-tool-btn"
                onClick={() => setZoom(z => Math.min(1.5, parseFloat((z + 0.1).toFixed(1))))}
                title="Zoom In"
              >＋</button>
              <button
                className="wp-tool-btn"
                style={{ fontSize: 11, fontWeight: 900 }}
                onClick={() => setZoom(z => Math.max(0.2, parseFloat((z - 0.1).toFixed(1))))}
                title="Zoom Out"
              >－</button>
              <button
                className="wp-tool-btn"
                style={{ fontSize: 9, fontWeight: 700 }}
                onClick={() => setZoom(0.7)}
                title={`Zoom: ${Math.round(zoom * 100)}% — click to reset`}
              >{Math.round(zoom * 100)}%</button>

              <div className="wp-tool-sep" />

              {/* Rotate */}
              <button
                className={`wp-tool-btn${rotated ? ' on' : ''}`}
                onClick={() => setRotated(r => !r)}
                title="Rotate landscape"
              >↺</button>

              {/* Browser overlay */}
              <button
                className={`wp-tool-btn${showBrowser ? ' on' : ''}`}
                onClick={() => setShowBrowser(p => !p)}
                title="Browser overlay"
              >🌐</button>

              <div className="wp-tool-sep" />

              {/* Open file from device */}
              <button
                className="wp-tool-btn"
                onClick={() => layoutUploadRef.current?.click()}
                title="Open file from device"
                style={{ fontSize: 12 }}
              >↑📄</button>

              <div className="wp-tool-sep" />

              {/* Theme */}
              <button
                className={`wp-tool-btn${toolPanel === 'theme' ? ' on' : ''}`}
                onClick={() => toggleTool('theme')}
                title="Theme"
              >🎨</button>

              {/* Admin */}
              <button
                className={`wp-tool-btn${toolPanel === 'admin' ? ' on' : ''}`}
                onClick={() => toggleTool('admin')}
                title="Admin Keys"
              >🔑</button>

              {/* Settings */}
              <button
                className={`wp-tool-btn${toolPanel === 'settings' ? ' on' : ''}`}
                onClick={() => toggleTool('settings')}
                title="Settings"
              >⚙</button>

              <div style={{ flex: 1 }} />
              <div className="wp-tool-sep" />

              {/* Page Builder mode toggle */}
              <button
                className={`wp-tool-btn${pageBuilderMode ? ' on' : ''}`}
                onClick={() => setPageBuilderMode(p => !p)}
                title={pageBuilderMode ? 'Exit Page Builder' : 'Page Builder — Visual editor, device frames, design analyzer'}
                style={{ fontSize: 12, fontWeight: 900 }}
              >⊞</button>

              {/* EditorPro right panel toggle */}
              <button
                className={`wp-tool-btn${editorProVisible ? ' on' : ''}`}
                onClick={() => setEditorProVisible(p => !p)}
                title={editorProVisible ? 'Close EditorPro' : 'EditorPro — Device preview, browser modes, safe zones, visual editing'}
                style={{ fontSize: 10, fontWeight: 700 }}
              >EP</button>
            </div>

            {/* ── Slide-in Tool Panel (appears over chat, inside left column) ── */}
            {toolPanel !== 'none' && (
              <div className="wp-tool-panel">
                <div className="wp-tp-hdr">
                  <span className="wp-tp-hdr-title">
                    {toolPanel === 'device' ? '📱 Device & Zoom'
                      : toolPanel === 'theme' ? '🎨 Theme'
                      : toolPanel === 'admin' ? '🔑 Admin Keys'
                      : '⚙ Settings'}
                  </span>
                  <button className="wp-tp-close" onClick={() => setToolPanel('none')}>✕</button>
                </div>
                <div className="wp-tp-body">
                  {toolPanel === 'device' && (
                    <>
                      <span className="wp-tp-label">Device</span>
                      <div className="wp-device-grid">
                        {DEVICES.map(d => (
                          <button
                            key={d.id}
                            className={`wp-dv-btn${activeDevice.id === d.id ? ' on' : ''}`}
                            onClick={() => setActiveDevice(d)}
                          >
                            <div>{d.label}</div>
                            <div style={{ fontSize: 8, opacity: .6, fontWeight: 400 }}>{d.screenSize}</div>
                          </button>
                        ))}
                        <button
                          className={`wp-dv-btn${activeDevice.id === BROWSER_PRESET.id ? ' on' : ''}`}
                          onClick={() => setActiveDevice(BROWSER_PRESET)}
                          style={{ gridColumn: 'span 2' }}
                        >
                          <div>🌐 Web Browser</div>
                          <div style={{ fontSize: 8, opacity: .6, fontWeight: 400 }}>1280×800</div>
                        </button>
                      </div>

                      <span className="wp-tp-label">Zoom</span>
                      <div className="wp-zoom-row">
                        <button className="wp-zoom-btn" onClick={() => setZoom(z => Math.max(0.2, parseFloat((z - 0.1).toFixed(1))))}>−</button>
                        <span className="wp-zoom-val">{Math.round(zoom * 100)}%</span>
                        <button className="wp-zoom-btn" onClick={() => setZoom(z => Math.min(1.5, parseFloat((z + 0.1).toFixed(1))))}>+</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 12 }}>
                        {[50, 70, 100].map(p => (
                          <button key={p} className={`wp-dv-btn${Math.round(zoom*100) === p ? ' on' : ''}`} onClick={() => setZoom(p/100)}>{p}%</button>
                        ))}
                      </div>

                      <span className="wp-tp-label">Orientation</span>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                        <button className={`wp-dv-btn${!rotated ? ' on' : ''}`} style={{ flex: 1 }} onClick={() => setRotated(false)}>Portrait</button>
                        <button className={`wp-dv-btn${rotated ? ' on' : ''}`} style={{ flex: 1 }} onClick={() => setRotated(true)}>Landscape</button>
                      </div>

                      <span className="wp-tp-label">GitHub Repo</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                        {[
                          { label: 'Owner', key: 'owner', val: githubOwner, set: setGithubOwner, ph: 'hawk7227' },
                          { label: 'Repo', key: 'repo', val: githubRepo, set: setGithubRepo, ph: 'patientpanel' },
                          { label: 'Branch', key: 'branch', val: githubBranch, set: setGithubBranch, ph: 'main' },
                        ].map(({ label, key, val, set, ph }) => (
                          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 9, color: 'var(--wp-text-4)', width: 36, flexShrink: 0 }}>{label}</span>
                            <input
                              style={{ flex: 1, background: 'var(--wp-bg-3)', border: '1px solid var(--wp-border)', borderRadius: 6, padding: '5px 7px', fontSize: 10, color: 'var(--wp-text-1)', fontFamily: 'var(--wp-mono)', outline: 'none' }}
                              placeholder={ph}
                              value={val}
                              onChange={e => { set(e.target.value); localStorage.setItem('wp-github-' + key, e.target.value) }}
                              spellCheck={false}
                              autoComplete="off"
                            />
                          </div>
                        ))}
                        <div style={{ fontSize: 8, color: 'var(--wp-text-4)', lineHeight: 1.5, marginTop: 2 }}>
                          {resolvingDeps
                            ? '⏳ Resolving dependencies…'
                            : githubOwner && githubRepo
                              ? '✓ Uploading a file will fetch its full import tree from this repo'
                              : 'Set owner + repo to enable real-project preview'}
                        </div>
                      </div>

                      <span className="wp-tp-label">Project URL</span>
                      <div style={{ marginBottom: 12 }}>
                        <input
                          style={{
                            width: '100%', background: 'var(--wp-bg-3)', border: '1px solid var(--wp-border)',
                            borderRadius: 6, padding: '6px 8px', fontSize: 10, color: 'var(--wp-text-1)',
                            fontFamily: 'var(--wp-mono)', outline: 'none',
                          }}
                          placeholder="https://patient.medazonhealth.com"
                          value={projectBaseUrl}
                          onChange={e => {
                            setProjectBaseUrl(e.target.value)
                            localStorage.setItem('wp-project-base-url', e.target.value)
                          }}
                          spellCheck={false}
                          autoComplete="off"
                        />
                        <div style={{ fontSize: 8, color: 'var(--wp-text-4)', marginTop: 4, lineHeight: 1.5 }}>
                          Set your live/staging URL. Uploaded files preview against this instead of Babel.
                        </div>
                        {projectBaseUrl && (
                          <button
                            onClick={() => setPreviewUrl(projectBaseUrl.replace(/\/$/, '') + '/')}
                            style={{
                              marginTop: 6, width: '100%', padding: '5px 0', borderRadius: 6,
                              background: 'var(--wp-accent-dim)', border: '1px solid rgba(0,245,160,.2)',
                              color: 'var(--wp-accent)', fontSize: 9, fontWeight: 700, cursor: 'pointer',
                              fontFamily: 'var(--wp-font)',
                            }}
                          >↗ Open root in phone</button>
                        )}
                      </div>

                      <span className="wp-tp-label">Device Info</span>
                      <div style={{ fontSize: 9, color: 'var(--wp-text-3)', lineHeight: 1.8, fontFamily: 'var(--wp-mono)' }}>
                        <div>{activeDevice.name}</div>
                        <div>{activeDevice.cssViewport.width}×{activeDevice.cssViewport.height} @{activeDevice.dpr}x</div>
                        <div>{activeDevice.screenSize}</div>
                      </div>
                    </>
                  )}
                  {toolPanel === 'theme' && (
                    <WPThemePanel activeSchemeId={themeScheme.id} onSchemeChange={(scheme) => { setThemeScheme(scheme); saveThemeId(scheme.id) }} />
                  )}
                  {toolPanel === 'admin' && (
                    <WPAdminKeysPanel toast={toast} accessToken={accessToken} />
                  )}
                  {toolPanel === 'settings' && (
                    <div style={{ color: 'var(--wp-text-3)', fontSize: 12 }}>
                      <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--wp-text-1)' }}>Settings</div>
                      <div style={{ opacity: .6 }}>Coming soon.</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Chat (fills remaining width) ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
              <WPChatPanel
                chat={chat}
                onExpandBottom={toggleBottomExpand}
                onSwitchBottomTab={(tab: string) => setBottomTab(tab as BottomTab)}
                onToggleBrowser={() => setShowBrowser(p => !p)}
                onPreviewFiles={handlePreviewFiles}
                toast={toast}
                logActivity={realtime.logActivity}
              />
            </div>
          </div>

          {/* ═══ RESIZE HANDLE ═══ */}
          <div className="wp-resize-h" onMouseDown={startResizeH} />

          {/* ═══ CENTER — always shows preview ═══ */}
          <div className="wp-center">
            <>
            <div className="wp-canvas-area">
              <WPPreviewCanvas
                activeDevice={activeDevice}
                showBrowser={showBrowser}
                zoom={zoom}
                previewUrl={previewUrl || preview.previewUrl}
                previewHtml={previewHtml}
                rotated={rotated}
                theme={theme}
                refreshKey={refreshKey}
                onCloseBrowser={() => setShowBrowser(false)}
                onFallbackToCode={() => { toggleBottomExpand(); setBottomTab('sql') }}
                onElementClick={handleElementClick}
                onCommitEdits={handleCommitEdits}
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
                <WPFileEditor
                    generatedFiles={generatedFiles}
                    onFilesSave={handleEditorSave}
                    onLiveUpdate={setGeneratedFiles}
                    toast={toast}
                    openFilePath={editorOpenFile}
                    onOpenFileConsumed={() => setEditorOpenFile(null)}
                  />
              </div>
              <div className="wp-bottom-right">
                {bottomTab === 'console' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div className="wp-pbar">
                      <div className="wp-pbar-t">
                        <span className="dot" style={{ background: consoleCapture.entries.some(e => e.level === 'error') ? 'var(--wp-red)' : 'var(--wp-accent)' }} /> Console
                        {consoleCapture.entries.length > 0 && (
                          <span style={{ fontSize: 8, color: 'var(--wp-text-4)', marginLeft: 4 }}>({consoleCapture.entries.length})</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 2 }}>
                        <button className="wp-pbtn" onClick={() => setBottomTab('sql')}>✕</button>
                      </div>
                    </div>
                    <WPConsolePanel entries={consoleCapture.entries} onClear={consoleCapture.clear} />
                  </div>
                ) : (
                  <WPDocViewer
                    activeTab={bottomTab}
                    onTabChange={(tab: string) => setBottomTab(tab as BottomTab)}
                    onExpand={toggleBottomExpand}
                    expanded={bottomExpanded}
                    previewPhase={preview.phase}
                    deployments={[]}
                    onConsoleTab={() => setBottomTab('console')}
                    consoleCount={consoleCapture.entries.length}
                    consoleHasErrors={consoleCapture.entries.some(e => e.level === 'error')}
                  />
                )}
              </div>
            </div>
            {/* eslint-disable-next-line */}
            </>
            )}
          </div>
        </div>

        {/* ═══ RIGHT PANEL — EditorPro ═══ */}
        {editorProVisible && (
          <div className="wp-right" style={{ width: rightWidth, transition: 'width .2s' }}>
            <WPEditorPro
              code={generatedFiles[0]?.content || ''}
              onCodeChange={(newCode) => {
                if (generatedFiles.length > 0) {
                  setGeneratedFiles(prev => [{ ...prev[0], content: newCode }, ...prev.slice(1)])
                }
              }}
              visible={editorProVisible}
              onClose={() => setEditorProVisible(false)}
              previewHtml={previewHtml || undefined}
              filename={generatedFiles[0]?.path || 'component.tsx'}
            />
          </div>
        )}

        {/* ═══ FOOTER ═══ */}
        <div className="wp-footer">
          <span>Device: <span>{activeDevice.name}</span></span>
          <span>Screen: <span>{activeDevice.cssViewport.width}×{activeDevice.cssViewport.height}</span></span>
          <span>DPR: <span>{activeDevice.dpr}x</span></span>
          <span>Theme: <span style={{ color: 'var(--wp-accent)' }}>{themeScheme.name}</span></span>
          {rotated && <span style={{ color: 'var(--wp-purple)' }}>LANDSCAPE</span>}
          <span>Env: <span style={{ color: 'var(--wp-yellow)' }}>STAGING</span></span>
          <span>Build: <span style={{ color: preview.phase === 'error' ? 'var(--wp-red)' : 'var(--wp-accent)' }}>
            {preview.phase === 'error' ? ' FAIL' : preview.phase === 'previewing' ? ' PASS' : preview.phase === 'idle' ? '—' : '⏳'}
          </span></span>
          <span style={{ marginLeft: 'auto' }}>Team: <span style={{ color: 'var(--wp-accent)' }}>{onlineCount} online</span></span>
        </div>

        {/* Hidden file input for layout-level upload */}
        <input
          ref={layoutUploadRef}
          type="file"
          style={{ display: 'none' }}
          accept=".ts,.tsx,.js,.jsx,.html,.css,.json,.md,.txt,.py,.sql,.yaml,.yml,.sh,.env,.prisma,.graphql,.vue,.svelte"
          onChange={handleLayoutUpload}
        />

        {/* Toast container */}
        <div className="wp-toast-wrap" ref={toastRef} />

        {/* Mobile sidebar backdrop */}
        {mobileSidebarOpen && (
          <div onClick={() => setMobileSidebarOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,.5)' }} className="wp-mobile-toggle" />
        )}
      </div>

      {/* Diff preview overlay (portal-level, outside wp-root to avoid overflow:hidden) */}
      {diffProposal && (
        <WPDiffPreview
          proposal={diffProposal}
          onApprove={() => {
            toast('Applied', `Changes to ${diffProposal.filePath}`, 'ok')
            setDiffProposal(null)
          }}
          onReject={() => {
            toast('Rejected', 'Changes discarded', 'err')
            setDiffProposal(null)
          }}
          onAlternative={() => {
            toast('Alternative', 'Requesting different approach...', 'nfo')
            setDiffProposal(null)
          }}
        />
      )}
    </>
  )
}
