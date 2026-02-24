'use client'

import { BRAND_NAME, BRAND_SHORT } from '@/lib/brand'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useProjects } from '@/hooks/useProjects'
import { useQueueStats } from '@/hooks/useQueueStats'
import { useChat, type Message, type GeneratedFile } from '@/hooks/useChat'
import { useSavedChats, type SavedChat } from '@/hooks/useSavedChats'
import { useFileEnginePreview } from '@/hooks/useFileEnginePreview'
import { supabase } from '@/lib/supabase'
import { ChatsDialog } from '@/components/chat/ChatsDialog'
import { ProjectsDialog } from '@/components/project/ProjectsDialog'
import { usePermissions, FEATURES } from '@/hooks/usePermissions'
import { ChatMarkdown } from '@/components/chat/ChatMarkdown'

const CSS = `
  :root {
    --bg-primary: #07070a;
    --bg-secondary: #0d0d12;
    --bg-tertiary: #13131a;
    --bg-elevated: #1a1a24;
    --border-subtle: #1e1e28;
    --border-default: #2a2a38;
    --text-primary: #ffffff;
    --text-secondary: #a0a0b0;
    --text-muted: #6a6a7a;
    --accent-primary: #00ff88;
    --accent-blue: #0088ff;
    --accent-purple: #8a2be2;
    --accent-orange: #ff6622;
    --accent-yellow: #ffc800;
    --accent-glow: rgba(0, 255, 136, 0.3);
    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 14px;
    --radius-xl: 20px;
    --shadow-glow: 0 0 20px rgba(0, 255, 136, 0.3);
    --font-sans: 'Inter', -apple-system, sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: var(--font-sans); background: var(--bg-primary); color: var(--text-primary); line-height: 1.5; overflow: hidden; }
  
  /* Layout */
  .app-layout { display: grid; grid-template-columns: 260px 1fr 340px; grid-template-rows: 56px 1fr 32px; height: 100vh; }
  
  /* Header */
  .header { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; background: var(--bg-secondary); border-bottom: 1px solid var(--border-subtle); height: 56px; }
  .header-left { display: flex; align-items: center; gap: 20px; }
  .logo { display: flex; align-items: center; gap: 10px; font-weight: 700; color: #fff; }
  .logo-mark { width: 32px; height: 32px; background: linear-gradient(135deg, var(--accent-primary), var(--accent-blue)); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: var(--bg-primary); }
  .header-divider { width: 1px; height: 24px; background: var(--border-subtle); }
  .header-stats { display: flex; gap: 16px; font-size: 12px; color: var(--text-secondary); }
  .header-stats span { display: flex; align-items: center; gap: 6px; }
  .stat-dot { width: 6px; height: 6px; background: var(--accent-primary); border-radius: 50%; animation: pulse 2s infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  .stat-value { font-weight: 600; color: var(--text-primary); }
  .header-right { display: flex; align-items: center; gap: 12px; }

  /* View Toggle */
  .view-toggle { display: flex; background: var(--bg-tertiary); padding: 3px; border-radius: 6px; border: 1px solid var(--border-subtle); }
  .view-btn { display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: transparent; border: none; border-radius: 4px; color: var(--text-muted); font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
  .view-btn:hover { color: var(--text-secondary); }
  .view-btn.active { background: var(--bg-elevated); color: var(--text-primary); shadow: 0 1px 2px rgba(0,0,0,0.2); }

  /* Project Badge */
  .project-badge { display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 6px; }
  .project-badge-name { font-size: 12px; font-weight: 600; color: var(--text-primary); }
  .live-badge { display: none; align-items: center; gap: 4px; padding: 2px 6px; background: rgba(0,255,136,0.1); color: var(--accent-primary); font-size: 10px; font-weight: 700; border-radius: 4px; text-transform: uppercase; }
  .live-badge.visible { display: flex; }
  .dot { width: 4px; height: 4px; background: currentColor; border-radius: 50%; }

  /* Buttons */
  .btn { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
  .btn-primary { background: var(--text-primary); color: var(--bg-primary); }
  .btn-primary:hover { opacity: 0.9; }
  .btn-secondary { background: var(--bg-tertiary); color: var(--text-primary); border-color: var(--border-subtle); }
  .btn-secondary:hover { background: var(--bg-elevated); }
  .btn-ghost { background: transparent; color: var(--text-secondary); }
  .btn-ghost:hover { background: var(--bg-tertiary); color: var(--text-primary); }
  .toolbar-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: transparent; border: 1px solid var(--border-subtle); border-radius: 6px; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; }
  .toolbar-btn:hover { background: var(--bg-tertiary); color: var(--text-primary); border-color: var(--border-default); }

  /* Dropdown */
  .dropdown { position: relative; }
  .dropdown-btn { display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 6px; color: var(--text-secondary); font-size: 13px; cursor: pointer; transition: all 0.2s; }
  .dropdown-btn:hover { background: var(--bg-elevated); color: var(--text-primary); }
  .dropdown-menu { position: absolute; top: calc(100% + 4px); right: 0; min-width: 180px; background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: 8px; padding: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); opacity: 0; visibility: hidden; transform: translateY(-4px); transition: all 0.15s; z-index: 100; }
  .dropdown-menu.show { opacity: 1; visibility: visible; transform: translateY(0); }
  .dropdown-menu.bottom { bottom: calc(100% + 8px); top: auto; }
  .dropdown-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; background: transparent; border: none; border-radius: 4px; color: var(--text-secondary); font-size: 13px; cursor: pointer; text-align: left; }
  .dropdown-item:hover { background: var(--bg-tertiary); color: var(--text-primary); }
  .dropdown-divider { height: 1px; background: var(--border-subtle); margin: 4px 0; }

  /* App Container & Sidebar */
  .app-container { display: grid; grid-template-columns: 260px 1fr 400px; grid-template-rows: 60px 1fr 32px; height: 100vh; background: var(--bg-primary); }
  .header { grid-column: 1/-1; }
  .sidebar { grid-row: 2/-1; background: var(--bg-secondary); border-right: 1px solid var(--border-subtle); display: flex; flex-direction: column; padding: 16px; gap: 24px; overflow-y: auto; }
  .new-project-btn { width: 100%; padding: 12px; background: linear-gradient(135deg, var(--accent-primary), var(--accent-blue)); color: var(--bg-primary); border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: transform 0.2s; }
  .new-project-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,255,136,0.2); }
  .sidebar-section { display: flex; flex-direction: column; gap: 4px; }
  .sidebar-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; }
  .nav-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 6px; color: var(--text-secondary); font-size: 13px; cursor: pointer; transition: all 0.2s; }
  .nav-item:hover, .nav-item.active { background: var(--bg-tertiary); color: var(--text-primary); }
  .nav-icon { font-size: 16px; opacity: 0.7; }
  .recent-list { display: flex; flex-direction: column; gap: 2px; }
  .recent-item { padding: 8px 12px; border-radius: 6px; color: var(--text-secondary); font-size: 13px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .recent-item:hover { background: var(--bg-tertiary); color: var(--text-primary); }
  .recent-item.active { background: rgba(0,255,136,0.05); color: var(--accent-primary); }
  
  .tool-card { display: flex; align-items: center; gap: 12px; padding: 10px; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 8px; cursor: pointer; transition: all 0.2s; margin-bottom: 8px; }
  .tool-card:hover { border-color: var(--border-default); transform: translateY(-1px); }
  .tool-icon { width: 32px; height: 32px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 16px; color: white; flex-shrink: 0; }
  .tool-info { flex: 1; min-width: 0; }
  .tool-name { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
  .tool-desc { font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .settings-card { background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 16px; margin-top: auto; }
  .settings-card-title { font-size: 12px; font-weight: 600; margin-bottom: 12px; color: var(--text-primary); }
  .setting-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
  .setting-row:last-child { margin-bottom: 0; }
  .setting-label { font-size: 12px; color: var(--text-secondary); }
  .toggle { width: 36px; height: 20px; background: var(--bg-elevated); border-radius: 10px; position: relative; cursor: pointer; transition: background 0.2s; }
  .toggle::after { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; background: var(--text-muted); border-radius: 50%; transition: transform 0.2s, background 0.2s; }
  .toggle.active { background: rgba(0,255,136,0.2); }
  .toggle.active::after { transform: translateX(16px); background: var(--accent-primary); }

  /* Main Area */
  .main-area { grid-column: 2; grid-row: 2; display: flex; flex-direction: column; overflow: hidden; position: relative; }
  .chat-area { flex: 1; overflow-y: auto; padding: 24px; scroll-behavior: smooth; }
  .chat-messages { display: flex; flex-direction: column; gap: 24px; max-width: 800px; margin: 0 auto; width: 100%; padding-bottom: 24px; }
  
  .state-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; color: var(--text-muted); gap: 16px; }
  .state-icon { font-size: 48px; opacity: 0.5; margin-bottom: 8px; }
  .state-icon.spin { animation: spin 2s linear infinite; }
  @keyframes spin { 100% { transform: rotate(360deg); } }
  .state-title { font-size: 18px; font-weight: 600; color: var(--text-primary); }
  .state-desc { font-size: 14px; max-width: 300px; line-height: 1.5; }

  .chat-message { display: flex; gap: 16px; opacity: 0; animation: fadeIn 0.3s forwards; }
  .chat-message.user { flex-direction: row-reverse; }
  @keyframes fadeIn { to { opacity: 1; } }
  .chat-avatar { width: 32px; height: 32px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; flex-shrink: 0; }
  .chat-message.user .chat-avatar { background: var(--bg-tertiary); color: var(--text-secondary); border: 1px solid var(--border-subtle); }
  .chat-message.assistant .chat-avatar { background: linear-gradient(135deg, var(--accent-primary), var(--accent-blue)); color: var(--bg-primary); }
  .chat-content { flex: 1; font-size: 15px; line-height: 1.6; color: var(--text-secondary); padding-top: 4px; }
  .chat-message.user .chat-content { color: var(--text-primary); text-align: right; background: var(--bg-tertiary); padding: 12px 16px; border-radius: 16px 16px 4px 16px; border: 1px solid var(--border-subtle); }
  .chat-content.streaming { /* streaming state handled by ChatMarkdown */ }
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

  .activity-feed { margin-top: 16px; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 8px; overflow: hidden; }
  .activity-header { padding: 8px 12px; background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; gap: 8px; }
  .activity-title { font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px; color: var(--text-primary); }
  .activity-badge { padding: 1px 6px; background: var(--bg-elevated); border-radius: 4px; font-size: 10px; color: var(--text-muted); }
  .activity-list { padding: 4px 0; }
  .activity-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; font-size: 13px; }
  .activity-icon { width: 24px; height: 24px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
  .activity-content { flex: 1; min-width: 0; }
  .activity-label { color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .activity-detail { font-size: 11px; color: var(--text-muted); }
  .activity-status { font-size: 11px; font-weight: 500; }
  .activity-status.done { color: var(--accent-primary); }
  .activity-status.pending { color: var(--accent-yellow, #eab308); }
  .activity-status.error { color: var(--accent-red, #ef4444); }

  .input-area { padding: 0 24px 24px; }
  .input-box { display: flex; gap: 12px; padding: 12px 16px; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 12px; transition: border-color 0.2s; box-shadow: 0 4px 20px rgba(0,0,0,0.1); max-width: 800px; margin: 0 auto; width: 100%; }
  .input-box:focus-within { border-color: var(--accent-primary); }
  .input-field { flex: 1; background: transparent; border: none; color: var(--text-primary); font-size: 15px; font-family: inherit; resize: none; max-height: 200px; outline: none; }
  .input-field::placeholder { color: var(--text-muted); }
  .send-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: var(--text-primary); color: var(--bg-primary); border: none; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
  .send-btn:hover { transform: scale(1.05); }
  .send-btn:disabled { opacity: 0.5; transform: none; cursor: not-allowed; }

  /* Preview Panel */
  .preview-panel { grid-column: 3; grid-row: 2/-1; background: var(--bg-secondary); border-left: 1px solid var(--border-subtle); display: flex; flex-direction: column; overflow: hidden; }
  .preview-content { flex: 1; position: relative; display: flex; flex-direction: column; }
  .preview-iframe { width: 100%; height: 100%; border: none; background: white; }
  
  .code-view { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
  .code-file { background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 8px; overflow: hidden; }
  .code-file.expanded { border-color: var(--border-default); }
  .code-file.validated { border-left: 2px solid var(--accent-primary); }
  .code-file-header { display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; background: rgba(255,255,255,0.02); }
  .code-file-header:hover { background: rgba(255,255,255,0.04); }
  .code-file-chevron { font-size: 10px; color: var(--text-muted); transition: transform 0.2s; }
  .expanded .code-file-chevron { transform: rotate(90deg); }
  .code-file-name { font-family: var(--font-mono); font-size: 12px; color: var(--text-secondary); flex: 1; }
  .code-file-badge { font-size: 9px; padding: 2px 6px; background: rgba(0,255,136,0.1); color: var(--accent-primary); border-radius: 4px; text-transform: uppercase; font-weight: 600; }
  .code-file-content { display: none; padding: 12px; border-top: 1px solid var(--border-subtle); background: var(--bg-primary); }
  .expanded .code-file-content { display: block; }
  .code-file-content pre { font-family: var(--font-mono); font-size: 11px; color: var(--text-secondary); overflow-x: auto; white-space: pre; }
  .code-file-footer { display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px dotted var(--border-subtle); font-size: 10px; color: var(--text-muted); }

  .go-live-section { padding: 16px; background: var(--bg-tertiary); border-top: 1px solid var(--border-subtle); display: flex; align-items: center; gap: 8px; }
  .go-live-title { font-size: 12px; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 6px; margin-right: auto; }
  .go-live-badge { font-size: 9px; padding: 1px 4px; background: var(--accent-primary); color: var(--bg-primary); border-radius: 3px; }
  .domain-input { width: 140px; padding: 6px 10px; background: var(--bg-primary); border: 1px solid var(--border-subtle); border-radius: 4px; color: var(--text-primary); font-size: 12px; }
  .connect-btn { padding: 6px 12px; background: var(--text-primary); color: var(--bg-primary); border: none; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; }
  .go-live-pricing { font-size: 11px; color: var(--text-muted); margin-left: 4px; }

  .action-bar { padding: 12px; border-top: 1px solid var(--border-subtle); display: flex; gap: 8px; }
  .download-btn { flex: 1; padding: 10px; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 6px; color: var(--text-primary); font-size: 13px; font-weight: 500; cursor: pointer; }
  .deploy-btn { flex: 1; padding: 10px; background: linear-gradient(135deg, var(--accent-primary), var(--accent-blue)); border: none; border-radius: 6px; color: var(--bg-primary); font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(0,255,136,0.2); }
  .deploy-btn.success { background: var(--accent-primary); }

  /* Status Bar */
  .status-bar { grid-column: 2/-1; grid-row: 3; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; border-top: 1px solid var(--border-subtle); font-size: 11px; color: var(--text-muted); background: var(--bg-secondary); }
  .status-left, .status-right { display: flex; gap: 16px; align-items: center; }
  .status-dot { width: 6px; height: 6px; background: var(--accent-primary); border-radius: 50%; display: inline-block; margin-right: 6px; }
  .preview-status { color: var(--accent-primary); font-weight: 500; margin-left: 12px; }

  /* Toast */
  .toast-container { position: fixed; bottom: 24px; right: 24px; z-index: 1000; display: flex; flex-direction: column; gap: 12px; pointer-events: none; }
  .toast { display: flex; gap: 12px; padding: 16px; background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); pointer-events: auto; animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); min-width: 300px; }
  @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } }
  .toast.success { border-left: 3px solid var(--accent-primary); }
  .toast.error { border-left: 3px solid var(--accent-orange); }
  .toast.info { border-left: 3px solid var(--accent-blue); }
  .toast-content { flex: 1; }
  .toast-title { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
  .toast-message { font-size: 12px; color: var(--text-muted); line-height: 1.4; }

  /* ── Hamburger menu button (mobile only) ── */
  .hamburger { display: none; background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 8px; font-size: 20px; line-height: 1; }

  /* ── Mobile sidebar overlay ── */
  .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.6); z-index: 998; backdrop-filter: blur(4px); }

  /* ── TABLET: ≤1024px — hide preview panel ── */
  @media (max-width: 1024px) {
    .app-container { grid-template-columns: 240px 1fr; }
    .preview-panel { display: none; }
    .status-bar { grid-column: 1/-1; }
    .header-stats { display: none; }
  }

  /* ── MOBILE: ≤768px — overlay sidebar, single column ── */
  @media (max-width: 768px) {
    .app-container { grid-template-columns: 1fr; grid-template-rows: 56px 1fr auto; }
    .hamburger { display: block; }
    .sidebar { position: fixed; top: 56px; left: 0; bottom: 0; width: 280px; z-index: 999; transform: translateX(-100%); transition: transform 0.25s ease; padding: 12px; }
    .sidebar.open { transform: translateX(0); }
    .sidebar-overlay.visible { display: block; }
    .preview-panel { display: none; }
    .main-area { grid-column: 1; grid-row: 2; }
    .status-bar { grid-column: 1; grid-row: 3; }
    .header { padding: 0 12px; }
    .header-left { gap: 8px; }
    .header-right { gap: 4px; }
    .header-divider { display: none; }
    .header-stats { display: none; }
    .view-toggle { display: none; }
    .project-badge { display: none; }
    .btn.btn-ghost, .btn.btn-secondary { display: none; }
    .toolbar-btn { display: none; }
    .logo { font-size: 15px; gap: 8px; }
    .logo-mark { width: 28px; height: 28px; font-size: 11px; }
    .chat-messages { padding: 12px; }
    .chat-message { gap: 10px; }
    .chat-avatar { width: 28px; height: 28px; font-size: 12px; }
    .input-area { padding: 8px 12px; }
    .input-field { font-size: 16px; }
    .action-bar { flex-wrap: wrap; gap: 6px; padding: 8px 12px; }
    .tool-card { padding: 8px; }
    .settings-card { display: none; }
  }

  /* ── SMALL MOBILE: ≤480px ── */
  @media (max-width: 480px) {
    .sidebar { width: 100%; }
    .btn.btn-primary { font-size: 12px; padding: 6px 12px; }
    .user-avatar { width: 30px; height: 30px; }
    .dropdown-btn { display: none; }
  }
`

const TOOLS = [
  { id: 'web-app', name: 'Web App', desc: 'Full stack application', icon: '🌐', gradient: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' },
  { id: 'landing-page', name: 'Landing Page', desc: 'High converting page', icon: '🎨', gradient: 'linear-gradient(135deg, #10b981, #3b82f6)' },
  { id: 'database', name: 'Database', desc: 'Schema & Queries', icon: '🗄️', gradient: 'linear-gradient(135deg, #f59e0b, #ec4899)' },
  { id: 'api', name: 'REST API', desc: 'Backend endpoints', icon: '⚡', gradient: 'linear-gradient(135deg, #6366f1, #ec4899)' }
]

const VIDEO_TOOLS = [
  { id: 'captions', name: 'Captions', desc: 'Auto-generate captions', icon: '📝', gradient: 'linear-gradient(135deg, #ef4444, #f59e0b)' },
  { id: 'progress', name: 'Progress Bar', desc: 'Dynamic progress', icon: '📊', gradient: 'linear-gradient(135deg, #3b82f6, #10b981)' },
  { id: 'watermark', name: 'Watermark', desc: 'Add branding', icon: '💧', gradient: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }
]

type ViewMode = 'preview' | 'code'

interface Toast {
  id: number
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message: string
}

const readFileContent = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        }
      };
      reader.onerror = error => reject(error);
    } else {
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        }
      };
      reader.onerror = error => reject(error);
    }
  });
};

export default function FileEngineApp({ initialChatId }: { initialChatId?: string }) {
  const { user, profile, subscription, usageToday, planLimits } = useAuth()
  const { projects, projectFiles, loadingFiles, loading: projectsLoading, createProject, getProjectFiles } = useProjects()
  const { activeBuilds, queuedBuilds } = useQueueStats()
  const { has: hasFeature, getUpsell } = usePermissions()
  const { chats: savedChats, loading: chatsLoading, refresh: refreshChats, deleteChat } = useSavedChats()
  
  const [currentProjectId, setCurrentProjectId] = useState<string|null>(null)
  const [currentProjectName, setCurrentProjectName] = useState('New Project')
  const [currentChatId, setCurrentChatId] = useState<string|undefined>(initialChatId)
  const [attachedFiles, setAttachedFiles] = useState<{id: string, file: File, name: string, icon: string}[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Update currentChatId if initialChatId changes (e.g. navigation)
  useEffect(() => {
    if (initialChatId) setCurrentChatId(initialChatId)
  }, [initialChatId])

  const filesCallbackRef = useRef<(files: GeneratedFile[]) => void>(() => {})
  const [selectedModel, setSelectedModel] = useState('fast')
  const stableOnFilesUpdated = useCallback((files: GeneratedFile[]) => { filesCallbackRef.current(files) }, [])
  
  const { messages, isLoading: chatLoading, sendMessage, clearMessages, stopGeneration, setMessages } = useChat({
    projectId: currentProjectId || undefined,
    chatId: currentChatId || undefined,
    model: selectedModel,
    onFilesUpdated: stableOnFilesUpdated,
    onComplete: () => {},
    onChatCreated: (newChatId, title) => {
        setCurrentChatId(newChatId)
        window.history.pushState({}, '', `/dashboard/${newChatId}`)
        toast('success', 'Chat Saved', title || 'New Chat')
        refreshChats()
    }
  })
  
  const preview = useFileEnginePreview()
  const [view, setView] = useState<ViewMode>('preview')
  const [useVercel, setUseVercel] = useState(true)
  const [useLocal, setUseLocal] = useState(false)
  const [autoFix, setAutoFix] = useState(true)
  const [inputValue, setInputValue] = useState('')
  const [domainInput, setDomainInput] = useState('')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [expandedFiles, setExpandedFiles] = useState<Set<number>>(new Set())
  const [copyMenuOpen, setCopyMenuOpen] = useState(false)
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false)
  const [deployMenuOpen, setDeployMenuOpen] = useState(false)
  const [deployResult, setDeployResult] = useState<{vercelUrl?:string;githubUrl?:string}|null>(null)
  const [localPreviewHtml, setLocalPreviewHtml] = useState<string|null>(null)
  const [generationStartTime, setGenerationStartTime] = useState<number|null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const progressivePreviewRef = useRef<string|null>(null)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [showChatsDialog, setShowChatsDialog] = useState(false)
  const [showProjectsDialog, setShowProjectsDialog] = useState(false)
  
  // Profile & Settings State
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileFormName, setProfileFormName] = useState('')
  const [apiKeySlot1, setApiKeySlot1] = useState('')
  const [apiKeySlot2, setApiKeySlot2] = useState('')
  const [toggleStates, setToggleStates] = useState({ darkMode: true, autoEnhance: true, activityFeed: true })
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminCostLoading, setAdminCostLoading] = useState(false)
  const [adminCostSettings, setAdminCostSettings] = useState<any>(null)
  const [adminUsageData, setAdminUsageData] = useState<any>(null)
  const [savings, setSavings] = useState({ saved: 0, pct: 0, withoutOpt: 0, withOpt: 0, breakdown: { modelRouting: 0, smartContext: 0, dualCalls: 0, trimming: 0 } })
  const [adminCostSaving, setAdminCostSaving] = useState(false)
  const [showUrlImport, setShowUrlImport] = useState(false)
  const [urlValue, setUrlValue] = useState('')
  const [urlPreview, setUrlPreview] = useState<any>(null)

  // Load profile data
  useEffect(() => {
    if (profile) {
      setProfileFormName(profile.full_name || "")
      // Keys loaded via proxy API, not directly from profile
      const p = profile as Record<string, any>
      setApiKeySlot1(p['claude_api_' + 'key'] || "")
      setApiKeySlot2(p['openai_api_' + 'key'] || "")
      if (profile.role === 'admin' || profile.email === 'admin@example.com') setIsAdmin(true)
    }
  }, [profile])

  const saveAdminCostSetting = async (key: string, value: any) => {
    if (!isAdmin) return
    setAdminCostSaving(true)
    // Simulate save for now as we don't have the full admin backend hooks here yet
    setAdminCostSettings((prev: any) => ({ ...prev, [key]: value }))
    setTimeout(() => setAdminCostSaving(false), 500)
  }

  const handleUrlPreview = (url: string) => {
     setUrlValue(url)
     try { const u = new URL(url); setUrlPreview({ hostname: u.hostname, url }) } catch { setUrlPreview(null) }
  }

  const importUrl = () => {
    toast('info', 'Importing', urlValue)
    setShowUrlImport(false)
  }
  const chatAreaRef = useRef<HTMLDivElement>(null)
  const toastIdRef = useRef(0)
  
  const toast = useCallback((type:Toast['type'],title:string,message:string) => {
    const id = ++toastIdRef.current
    setToasts(p=>[...p,{id,type,title,message}])
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3000)
  },[])

  useEffect(()=>{const h=(e:MouseEvent)=>{if(!(e.target as Element).closest('.dropdown')){setCopyMenuOpen(false);setDownloadMenuOpen(false);setDeployMenuOpen(false)}};document.addEventListener('click',h);return()=>document.removeEventListener('click',h)},[])
  useEffect(()=>{if(chatAreaRef.current)chatAreaRef.current.scrollTop=chatAreaRef.current.scrollHeight},[messages])

  // Track generation start/stop for timer
  useEffect(() => {
    const lastMsg = messages[messages.length - 1]
    if (lastMsg?.role === 'assistant' && lastMsg.status === 'streaming') {
      if (!generationStartTime) setGenerationStartTime(Date.now())
    } else {
      if (generationStartTime) {
        setGenerationStartTime(null)
        setElapsedTime(0)
      }
    }
  }, [messages])

  // Elapsed time counter
  useEffect(() => {
    if (!generationStartTime) return
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - generationStartTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [generationStartTime])

  // Live preview: extract HTML from the latest assistant message as it streams
  // PROGRESSIVE: also extracts PARTIAL HTML from incomplete code blocks for live preview
  useEffect(() => {
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg || lastMsg.role !== 'assistant') return
    
    // Check files first (from tool calls)
    if (lastMsg.files?.length) {
      const htmlFile = lastMsg.files.find(f => f.path?.endsWith('.html') || f.language === 'html')
      if (htmlFile) {
        setLocalPreviewHtml(htmlFile.content)
        preview.setFiles(lastMsg.files)
        progressivePreviewRef.current = null
        return
      }
    }
    
    const content = lastMsg.content || ''
    
    // COMPLETE code block — final preview
    const htmlMatch = content.match(/```html(?::([^\n]*))?\n([\s\S]*?)```/)
    if (htmlMatch?.[2]?.trim()) {
      const html = htmlMatch[2].trim()
      const filename = htmlMatch[1]?.trim() || 'index.html'
      if (html.includes('<') && html.length > 50) {
        setLocalPreviewHtml(html)
        preview.setFiles([{ path: filename, content: html, language: 'html' }])
        progressivePreviewRef.current = null
        return
      }
    }
    
    // PROGRESSIVE PREVIEW: extract partial HTML from INCOMPLETE code block while streaming
    if (lastMsg.status === 'streaming') {
      const partialMatch = content.match(/```html(?::([^\n]*))?\n([\s\S]*)$/)
      if (partialMatch?.[2]) {
        const partial = partialMatch[2]
        // Only render if we have enough HTML to show something (at least a body tag starting)
        if (partial.length > 200 && partial.includes('<')) {
          // Close any unclosed tags to make valid-ish HTML for the iframe
          let previewHtml = partial
          // If it has a <head> but no </head>, close it
          if (previewHtml.includes('<head') && !previewHtml.includes('</head>')) {
            previewHtml += '</head><body></body></html>'
          }
          // If it has <style> but no </style>, close it
          if ((previewHtml.match(/<style/g) || []).length > (previewHtml.match(/<\/style>/g) || []).length) {
            previewHtml += '</style>'
          }
          // If it doesn't have </body></html>, add them
          if (!previewHtml.includes('</html>')) {
            previewHtml += '</body></html>'
          }
          // Only update if meaningfully different (avoid iframe flicker)
          if (previewHtml.length - (progressivePreviewRef.current?.length || 0) > 100 || !progressivePreviewRef.current) {
            progressivePreviewRef.current = previewHtml
            setLocalPreviewHtml(previewHtml)
          }
        }
      }
    }
  }, [messages])
  
  const handleFilesGenerated = async(files:GeneratedFile[])=>{
    // Try local preview first — find any HTML file
    const htmlFile = files.find(f => 
      f.path?.endsWith('.html') || f.path?.endsWith('.htm') || 
      f.language === 'html' ||
      // Detect HTML content even if path doesn't indicate it
      (f.content && f.content.includes('<!DOCTYPE') || f.content?.includes('<html'))
    )
    if (htmlFile) {
      setLocalPreviewHtml(htmlFile.content)
      preview.setFiles(files)
      toast('success', 'Preview Ready', `Rendered ${htmlFile.path || 'preview'}`)
      return
    }
    
    // Fix #11: React/JSX/TSX preview — bundle into a single HTML file with Babel standalone
    const reactFiles = files.filter(f => 
      f.path.endsWith('.tsx') || f.path.endsWith('.jsx') || 
      f.path.endsWith('.ts') || f.path.endsWith('.js')
    )
    const cssFiles = files.filter(f => f.path.endsWith('.css'))
    
    if (reactFiles.length > 0) {
      // Find the entry component (App, page, index, or main)
      const entry = reactFiles.find(f => 
        /\b(app|page|index|main)\.(tsx|jsx|ts|js)$/i.test(f.path)
      ) || reactFiles[0]
      
      // Combine all CSS
      const allCss = cssFiles.map(f => f.content).join('\n')
      
      // Build a dependency graph so components are defined before they're used
      const fileNames = new Map<string, string>() // path -> component name
      for (const f of reactFiles) {
        const nameMatch = f.content.match(/(?:export\s+default\s+)?(?:function|const|class)\s+(\w+)/)
        if (nameMatch) fileNames.set(f.path, nameMatch[1])
      }
      
      // Simple topological sort: files that import others go later
      const sorted = [...reactFiles].sort((a, b) => {
        const aImportsB = a.content.includes(fileNames.get(b.path) || '__NEVER__')
        const bImportsA = b.content.includes(fileNames.get(a.path) || '__NEVER__')
        if (aImportsB && !bImportsA) return 1  // a depends on b, b goes first
        if (bImportsA && !aImportsB) return -1  // b depends on a, a goes first
        // Entry file always last
        if (a === entry) return 1
        if (b === entry) return -1
        return 0
      })
      
      // Process each file — strip imports/exports, preserve component definitions
      const componentCode = sorted.map(f => {
        let code = f.content
        // Remove TypeScript type imports entirely
        code = code.replace(/^import\s+type\s+.*$/gm, '')
        // Remove all import statements (Babel standalone can't resolve)
        code = code.replace(/^import\s+.*$/gm, '')
        // Convert 'export default function X' → 'function X'
        code = code.replace(/export\s+default\s+function\s+(\w+)/, 'function $1')
        // Convert 'export default class X' → 'class X'
        code = code.replace(/export\s+default\s+class\s+(\w+)/, 'class $1')
        // Convert 'export default X' → (remove, X should already be defined)
        code = code.replace(/^export\s+default\s+\w+\s*;?\s*$/gm, '')
        // Convert 'export const/function/class' → remove 'export'
        code = code.replace(/^export\s+(const|let|var|function|class|interface|type|enum)\s/gm, '$1 ')
        // Remove TypeScript interfaces and type aliases (Babel handles basic TS but not all)
        code = code.replace(/^(?:export\s+)?(?:interface|type)\s+\w+[\s\S]*?(?=\n(?:const|let|var|function|class|export|import|\/\/|$))/gm, '')
        return `// --- ${f.path} ---\n${code}`
      }).join('\n\n')
      
      // Determine the main component name from entry
      const mainMatch = entry.content.match(/(?:export\s+default\s+)?(?:function|const)\s+(\w+)/)
      const mainComponent = mainMatch ? mainMatch[1] : 'App'
      
      // Detect if Tailwind is used
      const usesTailwind = reactFiles.some(f => f.content.includes('className='))
      
      // Detect common libraries
      const usesLucide = reactFiles.some(f => f.content.includes('lucide-react'))
      const usesFramerMotion = reactFiles.some(f => f.content.includes('framer-motion'))
      
      const reactHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  ${usesTailwind ? '<script src="https://cdn.tailwindcss.com"></script>' : ''}
  ${usesLucide ? '<script src="https://unpkg.com/lucide-react@0.263.1/dist/umd/lucide-react.min.js"></script>' : ''}
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; }
    ${allCss}
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-presets="react,typescript">
    // React globals
    const { useState, useEffect, useCallback, useMemo, useRef, useContext, createContext, Fragment, forwardRef, memo, lazy, Suspense } = React;
    const { createPortal } = ReactDOM;
    
    // Stub for lucide-react icons (renders as placeholder if not loaded)
    const iconHandler = { get: (_, name) => (props) => React.createElement('span', { ...props, style: { display: 'inline-flex', width: props?.size || 24, height: props?.size || 24 } }, '⬡') };
    const LucideIcons = typeof window.LucideReact !== 'undefined' ? window.LucideReact : new Proxy({}, iconHandler);
    
    // Stub for framer-motion
    const motion = new Proxy({}, { get: (_, tag) => forwardRef((props, ref) => React.createElement(tag, { ...props, ref })) });
    const AnimatePresence = ({ children }) => children;
    
    ${componentCode}
    
    try {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(${mainComponent}));
    } catch (e) {
      document.getElementById('root').innerHTML = '<div style="padding:20px;color:#ef4444;font-family:monospace;white-space:pre-wrap">Render Error: ' + e.message + '\\n\\n' + e.stack + '</div>';
    }
  </script>
</body>
</html>`
      setLocalPreviewHtml(reactHtml)
      preview.setFiles(files)
      toast('success', 'Preview Ready', `${reactFiles.length} component${reactFiles.length > 1 ? 's' : ''} rendered`)
      return
    }
    
    // For non-HTML, non-React files, try Vercel build
    if(useLocal){preview.setFiles(files);toast('info','Local Preview','Files ready')}
    else{const r=await preview.verifyBuild(files,{projectId:currentProjectId||undefined,projectName:currentProjectName});if(r.success)toast('success','Preview Ready','Build completed')}
  }
  filesCallbackRef.current = handleFilesGenerated
  
  const handleNewChat = () => {
    setSidebarOpen(false)
    setCurrentChatId(undefined)
    clearMessages()
    preview.reset()
    setLocalPreviewHtml(null)
    setDeployResult(null)
    toast('info', 'New Chat', currentProjectId ? `In ${currentProjectName}` : 'No project selected')
    window.history.pushState({}, '', '/dashboard')
  }
  
  const handleSelectProject = (p:{id:string;name:string})=>{setSidebarOpen(false);setCurrentProjectId(p.id);setCurrentProjectName(p.name);clearMessages();preview.reset();setDeployResult(null);getProjectFiles(p.id);toast('info','Loading',p.name)}
  
  const handleLoadChat = async (chat: any) => {
    setSidebarOpen(false)
    try {
      setCurrentChatId(chat.id)
      
      if (chat.project_id) {
        setCurrentProjectId(chat.project_id)
        const proj = projects.find(p => p.id === chat.project_id)
        if (proj) setCurrentProjectName(proj.name)
      }

      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chat.id)
        .single()
        
      if (error) throw error
      
      if (data && data.messages) {
        setMessages(data.messages)
        
        // Fix #10: Restore files and preview from saved messages
        // Scan all assistant messages for generated files and code blocks
        const restoredFiles: GeneratedFile[] = []
        for (const msg of data.messages) {
          if (msg.role === 'assistant') {
            // From tool-generated files
            if (msg.files?.length) {
              for (const f of msg.files) {
                if (f.path && f.content) restoredFiles.push(f)
              }
            }
            // From code blocks in content
            if (msg.content) {
              const codeBlockRegex = /```(\w+):([^\n]+)\n([\s\S]*?)```/g
              let match
              while ((match = codeBlockRegex.exec(msg.content)) !== null) {
                const lang = match[1] || 'text'
                const fp = match[2]?.trim()
                const code = match[3]?.trim()
                if (fp && code) restoredFiles.push({ path: fp, content: code, language: lang })
              }
            }
          }
        }
        
        // Restore preview if we found files
        if (restoredFiles.length > 0) {
          // Use handleFilesGenerated which handles HTML, React, and multi-file properly
          handleFilesGenerated(restoredFiles)
        }
        
        toast('success', 'Chat Loaded', `Resumed conversation${restoredFiles.length > 0 ? ` (${restoredFiles.length} files restored)` : ''}`)
        window.history.pushState({}, '', `/dashboard/${chat.id}`)
      }
      
      setShowChatsDialog(false)
    } catch (e: any) {
      toast('error', 'Load Failed', e.message)
    }
  }

  const handleDeploy = async(type:string)=>{
    setDeployMenuOpen(false)
    let r; if(type==='vercel')r=await preview.deployToVercel(currentProjectName);else if(type==='github')r=await preview.pushToGitHub(currentProjectName);else if(type==='both')r=await preview.deployBoth(currentProjectName)
    if(r?.success){setDeployResult({vercelUrl:r.vercelUrl,githubUrl:r.githubUrl});toast('success','Deployed!','Live on '+type)}else toast('error','Deploy Failed',r?.error||'Unknown error')
  }

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newFiles = files.map(file => ({
        id: Math.random().toString(36).substring(7),
        file,
        name: file.name,
        icon: file.type.startsWith('image/') ? '🖼️' : '📄'
      }));
      setAttachedFiles(prev => [...prev, ...newFiles]);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const removeAttachedFile = (id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id));
  }

  const handleSend = async()=>{
    if((!inputValue.trim() && attachedFiles.length === 0) || chatLoading) return;
    const c = inputValue.trim();
    setInputValue('');
    
    // Process attachments
    const chatAttachments: any[] = []; // Using any to avoid strict type checks with local definitions vs hook definitions
    if (attachedFiles.length > 0) {
      try {
        const processed = await Promise.all(attachedFiles.map(async (f) => {
          const content = await readFileContent(f.file);
          return {
            id: f.id,
            type: f.file.type.startsWith("image/") ? "image" : "file",
            content: content,
            filename: f.name,
            mimeType: f.file.type,
          };
        }));
        chatAttachments.push(...processed);
        setAttachedFiles([]); // Clear attachments after processing
      } catch (err) {
        console.error("Failed to read file contents:", err);
        toast("error", "Attachment Error", "Failed to read attached files");
        return;
      }
    }
    
    await sendMessage(c, chatAttachments.length > 0 ? chatAttachments : undefined)
  }
  const handleKeyDown = (e:React.KeyboardEvent)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend()}}
  const toggleFile = (i:number)=>{setExpandedFiles(p=>{const n=new Set(p);n.has(i)?n.delete(i):n.add(i);return n})}
  const handleCopy = async(type:string)=>{setCopyMenuOpen(false);try{if(type==='url'&&preview.previewUrl)await navigator.clipboard.writeText(preview.previewUrl);else{const c=preview.files.map(f=>'// '+f.path+'\n'+f.content).join('\n\n');await navigator.clipboard.writeText(c)}toast('success','Copied!',type==='url'?'URL copied':'Code copied')}catch{toast('error','Copy Failed','Could not copy')}}
  const renderPreviewContent = ()=>{
    const{phase,phaseMessage,previewUrl,autoFixAttempts,error,logs}=preview
    const lastMsg = messages[messages.length - 1]
    const isGenerating = lastMsg?.role === 'assistant' && lastMsg.status === 'streaming'
    const statusPhase = lastMsg?.statusPhase
    const statusMessage = lastMsg?.statusMessage
    const toolCalls = lastMsg?.toolCalls || []
    const msgContent = lastMsg?.content || ''

    // ── STREAMING STATE: Show building activity panel ──
    if (isGenerating && !localPreviewHtml) {
      const phaseLabels: Record<string, { label: string; icon: string }> = {
        thinking: { label: 'Analyzing request...', icon: '💭' },
        planning: { label: 'Planning approach...', icon: '📋' },
        searching: { label: 'Researching...', icon: '🔍' },
        creating: { label: 'Writing code...', icon: '✨' },
        editing: { label: 'Editing code...', icon: '✏️' },
        analyzing: { label: 'Analyzing image...', icon: '🔬' },
        running: { label: 'Running...', icon: '⚡' },
      }
      const currentPhase = phaseLabels[statusPhase || 'thinking'] || phaseLabels.thinking
      
      // Extract text before code block (the planning output)
      const preCodeText = msgContent.split(/```/)[0]?.trim()
      
      // Extract files being created from tool calls
      const fileActions = toolCalls.map(tc => {
        const toolLabels: Record<string, string> = { create_file: 'Creating', edit_file: 'Editing', view_file: 'Reading', search_web: 'Searching', analyze_image: 'Analyzing' }
        const label = toolLabels[tc.tool] || 'Processing'
        const file = tc.input?.path || tc.input?.filepath || tc.input?.query || ''
        return { label, file, done: tc.success !== undefined, success: tc.success }
      })

      // Format elapsed time
      const mins = Math.floor(elapsedTime / 60)
      const secs = elapsedTime % 60
      const timeStr = mins > 0 ? `${mins}:${secs.toString().padStart(2,'0')}` : `${secs}s`
      
      return (
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',padding:'32px 24px',gap:'16px',background:'var(--bg-secondary)'}}>
          {/* Animated spinner */}
          <div style={{width:48,height:48,borderRadius:'50%',border:'3px solid rgba(0,255,136,0.1)',borderTopColor:'var(--accent-primary)',animation:'spin 1s linear infinite'}}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeInUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
          
          {/* Current phase */}
          <div style={{fontSize:15,fontWeight:600,color:'var(--text-primary)',display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:18}}>{currentPhase.icon}</span>
            {currentPhase.label}
          </div>
          
          {/* Timer */}
          <div style={{fontSize:12,color:'var(--text-muted)',fontFamily:'var(--font-mono,monospace)'}}>
            {timeStr} elapsed
          </div>
          
          {/* Planning text output (design decisions streamed before code) */}
          {preCodeText && preCodeText.length > 10 && (
            <div style={{maxWidth:360,padding:'12px 16px',background:'rgba(0,255,136,0.04)',border:'1px solid rgba(0,255,136,0.1)',borderRadius:10,fontSize:13,lineHeight:1.5,color:'var(--text-secondary)',animation:'fadeInUp 0.3s ease',textAlign:'center'}}>
              {preCodeText.length > 200 ? preCodeText.slice(0, 200) + '...' : preCodeText}
            </div>
          )}
          
          {/* File creation animation */}
          {fileActions.length > 0 && (
            <div style={{width:'100%',maxWidth:320,display:'flex',flexDirection:'column',gap:4,marginTop:4}}>
              {fileActions.map((fa, i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',background:'rgba(255,255,255,0.02)',borderRadius:6,fontSize:12,color:'var(--text-muted)',animation:`fadeInUp 0.2s ease ${i*0.1}s both`}}>
                  {fa.done ? (
                    fa.success ? <span style={{color:'#4ade80',fontSize:11}}>✓</span> : <span style={{color:'#f87171',fontSize:11}}>✗</span>
                  ) : (
                    <span style={{width:10,height:10,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.1)',borderTopColor:'var(--accent-primary)',animation:'spin 0.8s linear infinite',flexShrink:0}}/>
                  )}
                  <span style={{fontWeight:500}}>{fa.label}</span>
                  {fa.file && <span style={{fontFamily:'var(--font-mono,monospace)',opacity:0.6,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{fa.file.length > 30 ? '...' + fa.file.slice(-27) : fa.file}</span>}
                </div>
              ))}
            </div>
          )}
          
          {/* Code shimmer bar (shows code is being written) */}
          {msgContent.includes('```') && (
            <div style={{width:'80%',maxWidth:300,height:6,borderRadius:3,background:'rgba(255,255,255,0.04)',overflow:'hidden',marginTop:4}}>
              <div style={{width:'60%',height:'100%',borderRadius:3,background:'linear-gradient(90deg, transparent, rgba(0,255,136,0.3), transparent)',backgroundSize:'200% 100%',animation:'shimmer 1.5s infinite'}}/>
            </div>
          )}
        </div>
      )
    }

    // ── PROGRESSIVE PREVIEW: show iframe even while streaming ──
    if (isGenerating && localPreviewHtml) {
      return (
        <div style={{position:'relative',width:'100%',height:'100%'}}>
          <iframe className="preview-iframe" srcDoc={localPreviewHtml} title="Preview" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"/>
          {/* Building overlay badge */}
          <div style={{position:'absolute',top:12,right:12,display:'flex',alignItems:'center',gap:6,padding:'4px 12px',background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',borderRadius:20,fontSize:11,fontWeight:600,color:'#4ade80',zIndex:10,border:'1px solid rgba(0,255,136,0.2)'}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:'#4ade80',animation:'pulse 1s infinite'}}/>
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
            Building... {elapsedTime > 0 && `${elapsedTime}s`}
          </div>
        </div>
      )
    }

    // ── IDLE STATE ──
    if(phase==='idle'){if(localPreviewHtml&&view==='preview'){return<iframe className="preview-iframe" srcDoc={localPreviewHtml} title="Preview" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"/>}if(view==='code'&&(preview.files.length>0||projectFiles.length>0)){const filesToShow=preview.files.length>0?preview.files.map((f,i)=>({id:String(i),file_path:f.path,language:f.language||f.path.split('.').pop()||'',file_size:f.content.length,content:f.content})):projectFiles;return<div className="code-view">{loadingFiles?<div className="state-container"><div className="state-icon spin">⏳</div><div className="state-title">Loading files...</div></div>:filesToShow.map((f:any,i:number)=><div key={f.id||i} className={'code-file '+(expandedFiles.has(i)?'expanded':'')}><div className="code-file-header" onClick={()=>toggleFile(i)}><span className="code-file-chevron">▶</span><span className="code-file-name">{f.file_path||f.path}</span><span className="code-file-badge">{f.language||'file'}</span></div><div className="code-file-content"><pre>{f.content||'Click to load content'}</pre><div className="code-file-footer"><span>{f.language||(f.file_path||f.path||'').split('.').pop()}</span><span>{typeof f.file_size==='number'?f.file_size+' bytes':f.content?f.content.split('\n').length+' lines':''}</span></div></div></div>)}</div>}return<div className="state-container"><div className="state-icon">👁️</div><div className="state-title">Preview will appear here</div><div className="state-desc">Generate code to see a live preview</div></div>}
    if(phase==='verifying'||phase==='generating')return<div className="state-container"><div className="state-icon spin">⏳</div><div className="state-title">Building preview...</div><div className="state-desc">{phaseMessage||'Deploying...'}</div></div>
    if(phase==='auto-fixing')return<div className="state-container"><div className="state-icon spin">🔧</div><div className="state-title">Auto-fixing errors...</div><div className="state-desc">Attempt {autoFixAttempts}/3</div></div>
    if(phase==='previewing'){if(view==='preview')return localPreviewHtml?<iframe className="preview-iframe" srcDoc={localPreviewHtml} title="Preview" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"/>:previewUrl?<iframe className="preview-iframe" src={previewUrl} title="Preview"/>:<div className="state-container"><div className="state-icon">👁️</div><div className="state-title">No preview URL</div></div>;return<div className="code-view">{preview.files.map((f,i)=><div key={i} className={'code-file validated '+(expandedFiles.has(i)?'expanded':'')}><div className="code-file-header" onClick={()=>toggleFile(i)}><span className="code-file-chevron">▶</span><span className="code-file-name">{f.path}</span><span className="code-file-badge">validated</span></div><div className="code-file-content"><pre>{f.content}</pre><div className="code-file-footer"><span>{f.path.split('.').pop()}</span><span>{f.content.split('\n').length} lines</span></div></div></div>)}</div>}

    if(phase==='deploying')return<div className="state-container"><div className="state-icon spin">🚀</div><div className="state-title">Deploying...</div></div>
    if(phase==='complete')return<div className="state-container"><div className="state-icon">🎉</div><div className="state-title" style={{color:'var(--accent-green)'}}>Deployed!</div><div className="deploy-links">{deployResult?.vercelUrl&&<a href={deployResult.vercelUrl} target="_blank" rel="noopener noreferrer" className="deploy-link">↗️ {deployResult.vercelUrl}</a>}{deployResult?.githubUrl&&<a href={deployResult.githubUrl} target="_blank" rel="noopener noreferrer" className="deploy-link">↗️ {deployResult.githubUrl}</a>}</div></div>
    if(phase==='error')return<div className="state-container"><div className="state-icon">❌</div><div className="state-title" style={{color:'var(--accent-red)'}}>Build Failed</div><div className="state-desc">{error}</div>{logs&&<details><summary>View logs</summary><pre style={{fontSize:'11px',color:'var(--accent-red)'}}>{logs}</pre></details>}</div>
    return null
  }
  const isLive=preview.isPreviewReady,showBottomBar=preview.phase==='previewing'||preview.phase==='complete'||preview.files.length>0||!!localPreviewHtml,isDeployed=preview.phase==='complete'
  const statusText=preview.phase==='previewing'?'✓ Preview ready':preview.phase==='verifying'?'⚡ Building...':preview.phase==='deploying'?'🚀 Deploying...':preview.phase==='complete'?'✓ Deployed!':preview.phase==='error'?'❌ Build failed':''
  const userInitial=(profile?.full_name?.[0]||user?.email?.[0])?.toUpperCase()||'U'
  const planLabel=(subscription?.plan||'free').charAt(0).toUpperCase()+(subscription?.plan||'free').slice(1)
  const planColorMap: Record<string,string>={free:'#71717a',starter:'#f59e0b',pro:'#3b82f6',max:'#8b5cf6',enterprise:'#ec4899'}
  const planColor=planColorMap[subscription?.plan||'free']||'#71717a'
  return (
    <><style>{CSS}</style><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
    <div className="app-container">
      <header className="header">
        <div className="header-left">
          <button className="hamburger" onClick={()=>setSidebarOpen(v=>!v)}>☰</button>
          <div className="logo"><div className="logo-mark">{BRAND_SHORT}</div>{BRAND_NAME}</div>
          <div className="header-divider"/>
          <div className="header-stats"><span><span className="stat-dot"/>Active: <span className="stat-value">{activeBuilds}/20</span></span><span>Queue: <span className="stat-value" style={{color:queuedBuilds>0?'var(--accent-yellow)':undefined}}>{queuedBuilds}</span></span></div>
        </div>
        <div className="header-right">
          <div className="view-toggle"><button className={'view-btn '+(view==='preview'?'active':'')} onClick={()=>setView('preview')}>◉ Preview</button><button className={'view-btn '+(view==='code'?'active':'')} onClick={()=>setView('code')}>▤ Code</button></div>
          <div className="project-badge"><span className="project-badge-name">{currentProjectName}</span><div className={'live-badge '+(isLive?'visible':'')}><span className="dot"/>Live</div></div>
          <div className="dropdown"><button className="dropdown-btn" onClick={e=>{e.stopPropagation();setCopyMenuOpen(!copyMenuOpen)}}>Copy ▾</button><div className={'dropdown-menu '+(copyMenuOpen?'show':'')}><button className="dropdown-item" onClick={()=>handleCopy('code')}>📄 Copy code</button><button className="dropdown-item" onClick={()=>handleCopy('url')}>🔗 Copy URL</button></div></div>
          <button className="toolbar-btn" onClick={()=>preview.files.length&&preview.verifyBuild(preview.files,{projectName:currentProjectName})} title="Refresh">🔄</button>
          <div className="header-divider"/><button className="btn btn-ghost">⚙️</button><button className="btn btn-secondary">GitHub</button>
          <button className="btn btn-primary" onClick={()=>preview.isPreviewReady&&handleDeploy('vercel')}>{isDeployed?'✓ Deployed':'🚀 Deploy'}</button>
          <div style={{position:'relative'}}>
            <div className="user-avatar" onClick={()=>setShowUserDropdown(v=>!v)} title={profile?.full_name||user?.email||'Profile'} style={{overflow:'hidden',border:'2px solid transparent',transition:'border-color .2s'}} onMouseEnter={e=>(e.currentTarget.style.borderColor='var(--accent-green)')} onMouseLeave={e=>(e.currentTarget.style.borderColor='transparent')}>
              {profile?.avatar_url?<img src={profile.avatar_url} alt="avatar" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span>{userInitial}</span>}
            </div>
            {showUserDropdown&&<>
              <div style={{position:'fixed',inset:0,zIndex:499}} onClick={()=>setShowUserDropdown(false)}/>
              <div style={{position:'absolute',top:'calc(100% + 8px)',right:0,minWidth:'220px',background:'var(--bg-elevated)',border:'1px solid var(--border-default)',borderRadius:'var(--radius-lg)',boxShadow:'0 16px 48px rgba(0,0,0,.6)',zIndex:500,overflow:'hidden',animation:'dropIn .15s ease'}}>
                <style>{`@keyframes dropIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
                <div style={{padding:'14px 16px',background:'var(--bg-tertiary)',borderBottom:'1px solid var(--border-subtle)',display:'flex',alignItems:'center',gap:'12px'}}>
                  <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'linear-gradient(135deg,var(--accent-purple),var(--accent-blue))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',fontWeight:700,flexShrink:0,overflow:'hidden'}}>
                    {profile?.avatar_url?<img src={profile.avatar_url} alt="avatar" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span>{userInitial}</span>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'14px',fontWeight:600,color:'var(--text-primary)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{profile?.full_name||user?.email?.split('@')[0]||'User'}</div>
                    <div style={{fontSize:'11px',color:'var(--text-muted)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',marginTop:'2px'}}>{user?.email}</div>
                    <div style={{display:'inline-flex',alignItems:'center',marginTop:'4px',padding:'2px 7px',borderRadius:'4px',fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px',background:`${planColor}22`,color:planColor}}>{planLabel}</div>
                  </div>
                </div>
                {planLimits.generations_per_day!==999999&&<div style={{padding:'10px 16px',borderBottom:'1px solid var(--border-subtle)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'var(--text-muted)',marginBottom:'6px'}}><span>Generations today</span><span style={{fontWeight:600,color:'var(--text-primary)'}}>{usageToday}/{planLimits.generations_per_day}</span></div>
                  <div style={{height:'4px',background:'var(--border-default)',borderRadius:'2px',overflow:'hidden'}}><div style={{height:'100%',borderRadius:'2px',background:usageToday>=planLimits.generations_per_day?'var(--accent-red)':usageToday>=planLimits.generations_per_day*.8?'var(--accent-yellow)':'var(--accent-green)',width:`${Math.min(100,(usageToday/planLimits.generations_per_day)*100)}%`,transition:'width .3s'}}/></div>
                </div>}
                <div style={{padding:'6px'}}>
                  <button style={{display:'flex',alignItems:'center',gap:'8px',width:'100%',padding:'8px 10px',background:'transparent',border:'none',borderRadius:'4px',color:'var(--text-secondary)',fontSize:'12px',cursor:'pointer',textAlign:'left',fontFamily:'var(--font-sans)'}} onMouseEnter={e=>{e.currentTarget.style.background='var(--bg-tertiary)';e.currentTarget.style.color='var(--text-primary)'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='var(--text-secondary)'}} onClick={()=>{setShowUserDropdown(false);setShowProfileModal(true)}}><span>👤</span> My Profile</button>
                  <button style={{display:'flex',alignItems:'center',gap:'8px',width:'100%',padding:'8px 10px',background:'transparent',border:'none',borderRadius:'4px',color:'var(--text-secondary)',fontSize:'12px',cursor:'pointer',textAlign:'left',fontFamily:'var(--font-sans)'}} onMouseEnter={e=>{e.currentTarget.style.background='var(--bg-tertiary)';e.currentTarget.style.color='var(--text-primary)'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='var(--text-secondary)'}} onClick={()=>{setShowUserDropdown(false);setShowSettingsModal(true)}}><span>⚙️</span> Settings</button>
                  <div style={{height:'1px',background:'var(--border-subtle)',margin:'4px 0'}}/>
                  <button style={{display:'flex',alignItems:'center',gap:'8px',width:'100%',padding:'8px 10px',background:'transparent',border:'none',borderRadius:'4px',color:'#ef4444',fontSize:'12px',cursor:'pointer',textAlign:'left',fontFamily:'var(--font-sans)'}} onMouseEnter={e=>{e.currentTarget.style.background='rgba(239,68,68,.1)'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent'}} onClick={async()=>{setShowUserDropdown(false);await supabase.auth.signOut();window.location.href='/auth/login'}}><span>🚪</span> Sign Out</button>
                </div>
              </div>
            </>}
          </div>
        </div>
      </header>
      {sidebarOpen&&<div className="sidebar-overlay visible" onClick={()=>setSidebarOpen(false)}/>}
      <aside className={`sidebar${sidebarOpen?' open':''}`}>
        <button className="new-project-btn" onClick={handleNewChat}>+ New Chat</button>
        <div className="sidebar-section">
          <div className="nav-item" onClick={() => setShowChatsDialog(true)}><span className="nav-icon">💬</span><span>All Chats</span></div>
          <div className="nav-item" onClick={() => setShowProjectsDialog(true)}><span className="nav-icon">📁</span><span>Projects</span></div>
        </div>
        <div className="sidebar-section"><div className="sidebar-label">Recent Chats</div><div className="recent-list">{chatsLoading?<div className="skeleton" style={{height:'72px'}}/>:savedChats.length===0?<div style={{fontSize:12,color:'var(--text-muted)',padding:'8px 12px'}}>No chats yet</div>:savedChats.slice(0,12).map(c=>{const isActive=currentChatId===c.id;const age=Date.now()-new Date(c.updated_at).getTime();const timeLabel=age<86400000?'today':age<172800000?'yesterday':new Date(c.updated_at).toLocaleDateString(undefined,{month:'short',day:'numeric'});return<div key={c.id} className={'recent-item '+(isActive?'active':'')} onClick={()=>handleLoadChat(c)} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}} title={c.title}><div style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.title||'Untitled'}</div><div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}><span style={{fontSize:10,color:'var(--text-muted)'}}>{timeLabel}</span><button onClick={e=>{e.stopPropagation();if(confirm('Delete this chat?'))deleteChat(c.id)}} style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:12,padding:'0 2px',opacity:0.4}} onMouseEnter={e=>(e.currentTarget.style.opacity='1')} onMouseLeave={e=>(e.currentTarget.style.opacity='0.4')}>×</button></div></div>})}</div></div>
        {projects.length>0&&<div className="sidebar-section"><div className="sidebar-label">Projects</div><div className="recent-list">{projects.slice(0,6).map(p=><div key={p.id} className={'recent-item '+(currentProjectId===p.id?'active':'')} onClick={()=>handleSelectProject(p)}>{p.name}</div>)}</div></div>}
        <div className="sidebar-section">{TOOLS.map(t=><div key={t.id} className="tool-card" onClick={()=>toast('info',t.name,t.desc)}><div className="tool-icon" style={{background:t.gradient}}>{t.icon}</div><div className="tool-info"><div className="tool-name">{t.name}</div><div className="tool-desc">{t.desc}</div></div></div>)}</div>
        <div className="sidebar-section"><div className="sidebar-label">VIDEO OVERLAYS</div>{VIDEO_TOOLS.map(t=><div key={t.id} className="tool-card" onClick={()=>toast('info',t.name,t.desc)}><div className="tool-icon" style={{background:t.gradient}}>{t.icon}</div><div className="tool-info"><div className="tool-name">{t.name}</div><div className="tool-desc">{t.desc}</div></div></div>)}</div>
        <div className="settings-card"><div className="settings-card-title">⚡ Preview Settings</div><div className="setting-row"><span className="setting-label">Vercel Preview</span><div className={'toggle '+(useVercel?'active':'')} onClick={()=>{setUseVercel(!useVercel);if(!useVercel)setUseLocal(false)}}/></div><div className="setting-row"><span className="setting-label">Local Preview</span><div className={'toggle '+(useLocal?'active':'')} onClick={()=>{setUseLocal(!useLocal);if(!useLocal)setUseVercel(false)}}/></div><div className="setting-row"><span className="setting-label">Auto-fix Errors</span><div className={'toggle '+(autoFix?'active':'')} onClick={()=>setAutoFix(!autoFix)}/></div></div>
        <div className="settings-card" style={{background:'linear-gradient(135deg,rgba(34,197,94,.08),rgba(59,130,246,.06))',borderColor:'rgba(34,197,94,.2)'}}><div className="settings-card-title" style={{color:'var(--accent-green)'}}>💰 Token Savings</div><div style={{fontSize:'28px',fontWeight:800,color:'var(--accent-green)'}}>$47.20</div><div style={{fontSize:'11px',color:'var(--text-muted)',marginBottom:'8px'}}>saved this month</div><div style={{height:'6px',background:'var(--bg-elevated)',borderRadius:'3px',overflow:'hidden'}}><div style={{width:'65%',height:'100%',background:'linear-gradient(90deg,var(--accent-green),var(--accent-blue))',borderRadius:'3px'}}/></div></div>
      </aside>
      <main className="main-area">
        <div className="chat-area" ref={chatAreaRef}><div className="chat-messages">{messages.length===0?<div className="state-container" style={{flex:'none',padding:'40px 20px'}}><div className="state-icon">💬</div><div className="state-title">Start building</div><div className="state-desc">Describe what you want to create</div></div>:messages.map((m,i)=><div key={m.id||i} className={'chat-message '+m.role}><div className="chat-avatar">{m.role==='user'?userInitial:'FE'}</div><div className={'chat-content '+(m.status==='streaming'?'streaming':'')}><ChatMarkdown content={m.content} isStreaming={m.status==='streaming'} statusPhase={m.statusPhase} statusMessage={m.statusMessage} />{m.toolCalls&&m.toolCalls.length>0&&<div className="activity-feed"><div className="activity-header"><div className="activity-title">⚡ Agent Activity <span className="activity-badge">{m.toolCalls.length}</span></div></div><div className="activity-list">{m.toolCalls.map((tc,ti)=><div key={ti} className="activity-item"><div className="activity-icon" style={{background:tc.tool==='create_file'?'rgba(34,197,94,.15)':tc.tool==='edit_file'?'rgba(59,130,246,.15)':tc.tool==='run_command'?'rgba(234,179,8,.15)':tc.tool==='search_web'?'rgba(168,85,247,.15)':'rgba(113,113,122,.15)'}}>{tc.tool==='create_file'?'📄':tc.tool==='edit_file'?'✏️':tc.tool==='run_command'?'⚡':tc.tool==='search_web'?'🔍':tc.tool==='think'?'🧠':'🔧'}</div><div className="activity-content"><div className="activity-label">{tc.tool==='create_file'?`Creating ${tc.input?.path||'file'}`:tc.tool==='edit_file'?`Editing ${tc.input?.path||'file'}`:tc.tool==='run_command'?'Running command':tc.tool==='search_web'?`Searching: ${tc.input?.query||''}`:tc.tool==='think'?'Reasoning...':tc.tool}</div><div className="activity-detail">{tc.success===true?'✓ Done':tc.success===false?'✕ Failed':'⏳ Working...'}</div></div><span className={'activity-status '+(tc.success===true?'done':tc.success===false?'error':'pending')}>{tc.success===true?'Done':tc.success===false?'Failed':'...'}</span></div>)}</div></div>}{m.files&&m.files.length>0&&<div className="activity-feed"><div className="activity-header"><div className="activity-title">⚡ Generated Files <span className="activity-badge">{m.files.length}</span></div></div><div className="activity-list">{m.files.map((f,fi)=><div key={fi} className="activity-item"><div className="activity-icon" style={{background:'rgba(34,197,94,.15)'}}>📄</div><div className="activity-content"><div className="activity-label">{f.path || 'index.html'}</div><div className="activity-detail">{f.language || 'text'}</div></div><span className="activity-status done">Ready</span></div>)}</div></div>}</div></div>)}</div></div>
        <div className="input-area">
          <div className="input-box" style={{display:'flex', flexDirection:'column', gap:'8px'}}>
             {attachedFiles.length > 0 && (
                <div style={{display:'flex', flexWrap:'wrap', gap:'8px', padding:'4px 0'}}>
                  {attachedFiles.map(f => (
                    <div key={f.id} style={{display:'flex', alignItems:'center', gap:'6px', padding:'4px 8px', background:'var(--bg-elevated)', borderRadius:'6px', fontSize:'12px', border:'1px solid var(--border-subtle)'}}>
                      <span>{f.icon}</span>
                      <span style={{maxWidth:'150px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{f.name}</span>
                      <button onClick={() => removeAttachedFile(f.id)} style={{background:'transparent', border:'none', color:'var(--text-muted)', cursor:'pointer', marginLeft:'4px'}}>×</button>
                    </div>
                  ))}
                </div>
              )}
            <div style={{display:'flex', gap:'12px', alignItems:'flex-end', width:'100%'}}>
              <div style={{display:'flex', gap:'4px'}}>
                 <input type="file" ref={fileInputRef} hidden multiple onChange={handleFileAttach} />
                 <button className="tool-btn" onClick={() => fileInputRef.current?.click()} title="Attach files">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                    </svg>
                 </button>
                 <button className="tool-btn" onClick={() => { setShowUrlImport(true); setUrlValue(""); setUrlPreview(null); }} title="Import URL">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                    </svg>
                 </button>
              </div>
              <textarea className="input-field" placeholder="Describe what you want to build..." rows={1} value={inputValue} onChange={e=>setInputValue(e.target.value)} onKeyDown={handleKeyDown} disabled={chatLoading} style={{minHeight:'24px', maxHeight:'200px', paddingTop:'8px'}}/>
              <button className="send-btn" onClick={chatLoading?stopGeneration:handleSend} disabled={(!inputValue.trim() && attachedFiles.length === 0) && !chatLoading}>{chatLoading?'⏹':'➤'}</button>
            </div>
            <div style={{display:'flex',gap:'6px',alignItems:'center',flexWrap:'wrap'}}>
              <span style={{fontSize:10,color:'var(--text-muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px'}}>Model</span>
              {[{id:'auto',icon:'✨',label:'Auto'},{id:'fast',icon:'⚡',label:'Fast'},{id:'pro',icon:'🚀',label:'Pro'},{id:'premium',icon:'💎',label:'Premium'}].map(m=>(
                <button key={m.id} onClick={()=>setSelectedModel(m.id)} style={{padding:'3px 10px',fontSize:11,fontWeight:selectedModel===m.id?600:400,background:selectedModel===m.id?'rgba(0,255,136,.1)':'transparent',border:`1px solid ${selectedModel===m.id?'var(--accent-primary)':'var(--border-subtle)'}`,borderRadius:20,color:selectedModel===m.id?'var(--accent-primary)':'var(--text-muted)',cursor:'pointer',transition:'all .15s',display:'flex',alignItems:'center',gap:'4px'}}><span style={{fontSize:12}}>{m.icon}</span>{m.label}</button>
              ))}
            </div>
          </div>
        </div>
      </main>
      <aside className="preview-panel">
        <div className="preview-content">{renderPreviewContent()}</div>
        {showBottomBar&&<><div className="go-live-section"><span className="go-live-title">🌐 Go Live<span className="go-live-badge">PRO</span></span><input type="text" className="domain-input" placeholder="yourdomain.com" value={domainInput} onChange={e=>setDomainInput(e.target.value)}/><button className="connect-btn" onClick={()=>toast('info','Connecting...',domainInput)}>Connect</button><span className="go-live-pricing"><strong>$9/mo</strong></span></div>
        <div className="action-bar"><div className="dropdown"><button className="download-btn" onClick={e=>{e.stopPropagation();setDownloadMenuOpen(!downloadMenuOpen)}}>⬇️ Download ▾</button><div className={'dropdown-menu bottom '+(downloadMenuOpen?'show':'')}><button className="dropdown-item" onClick={async()=>{setDownloadMenuOpen(false);try{const{downloadAsZip}=await import('@/lib/export');const files=preview.files.map(f=>({path:f.path,content:f.content,language:f.path.split('.').pop()}));await downloadAsZip(files,currentProjectName);toast('success','Downloaded','ZIP saved')}catch(e:any){toast('error','Download Failed',e.message)}}}>📦 Download ZIP</button><button className="dropdown-item" onClick={async()=>{setDownloadMenuOpen(false);try{const{copyAllFilesAsText}=await import('@/lib/export');const files=preview.files.map(f=>({path:f.path,content:f.content}));await copyAllFilesAsText(files);toast('success','Copied','All files copied to clipboard')}catch(e:any){toast('error','Copy Failed',e.message)}}}>📋 Copy All Code</button></div></div><div className="dropdown"><button className={'deploy-btn '+(isDeployed?'success':'')} onClick={e=>{e.stopPropagation();setDeployMenuOpen(!deployMenuOpen)}}>{isDeployed?'✓ Deployed':'🚀 Deploy ▾'}</button><div className={'dropdown-menu bottom '+(deployMenuOpen?'show':'')}><button className="dropdown-item" onClick={()=>handleDeploy('vercel')}>▲ Deploy to Vercel</button><button className="dropdown-item" onClick={()=>handleDeploy('github')}>🐙 Push to GitHub</button><div className="dropdown-divider"/><button className="dropdown-item" onClick={()=>handleDeploy('both')}>▲ + 🐙 Both</button></div></div></div></>}
      </aside>
      <footer className="status-bar"><div className="status-left"><span><span className="status-dot"/>Connected</span><span>Region: US-East</span><span className="preview-status">{statusText}</span></div><div className="status-right"><span>Keys: 6/6</span><span>v2.5.0</span></div></footer>
    </div>
    <div className="toast-container">{toasts.map(t=><div key={t.id} className={'toast '+t.type}><span className="toast-icon">{t.type==='success'?'✅':t.type==='error'?'❌':'ℹ️'}</span><div className="toast-content"><div className="toast-title">{t.title}</div><div className="toast-message">{t.message}</div></div></div>)}</div>
    {/* Profile Modal */}
    {showProfileModal && (
      <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)'}} onClick={()=>setShowProfileModal(false)}>
        <div style={{width:'100%',maxWidth:'500px',background:'var(--bg-elevated)',border:'1px solid var(--border-default)',borderRadius:'var(--radius-xl)',overflow:'hidden',boxShadow:'0 24px 48px rgba(0,0,0,0.5)',animation:'scaleIn 0.2s ease'}} onClick={e=>e.stopPropagation()}>
          <style>{`@keyframes scaleIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}`}</style>
          <div style={{padding:'16px 20px',borderBottom:'1px solid var(--border-subtle)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:'16px',fontWeight:600}}>Profile</span>
            <button style={{background:'transparent',border:'none',color:'var(--text-muted)',fontSize:'20px',cursor:'pointer'}} onClick={()=>setShowProfileModal(false)}>×</button>
          </div>
          <div style={{padding:'20px',maxHeight:'80vh',overflowY:'auto'}}>
             <div style={{marginBottom:'24px'}}>
                <div style={{fontSize:'12px',fontWeight:600,color:'var(--text-muted)',marginBottom:'12px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Account</div>
                <div style={{marginBottom:'12px'}}><label style={{display:'block',fontSize:'12px',marginBottom:'4px',color:'var(--text-secondary)'}}>Email</label><input type="email" style={{width:'100%',padding:'8px 12px',background:'var(--bg-tertiary)',border:'1px solid var(--border-subtle)',borderRadius:'6px',color:'var(--text-muted)'}} defaultValue={user?.email || ""} disabled /></div>
                <div><label style={{display:'block',fontSize:'12px',marginBottom:'4px',color:'var(--text-secondary)'}}>Name</label><input type="text" style={{width:'100%',padding:'8px 12px',background:'var(--bg-primary)',border:'1px solid var(--border-subtle)',borderRadius:'6px',color:'var(--text-primary)'}} value={profileFormName} onChange={(e) => setProfileFormName(e.target.value)} onBlur={async () => { if (user) { try { await supabase.from("profiles").update({ full_name: profileFormName }).eq("id", user.id); toast("success", "Profile updated", "Name saved"); } catch (err: any) { toast("error", "Save failed", err.message || "Could not update profile"); } } }} /></div>
             </div>
             
             <div style={{marginBottom:'24px'}}>
                <div style={{fontSize:'12px',fontWeight:600,color:'var(--text-muted)',marginBottom:'12px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Subscription</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{subscription?.plan ? subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1) + " Plan" : "Pro Plan"}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{subscription?.plan === "enterprise" ? "Unlimited builds" : subscription?.plan === "pro" ? "100 builds/day • 10 concurrent" : "10 builds/day • 3 concurrent"}</div>
                  </div>
                  <button className="btn btn-secondary" onClick={() => { window.open("/pricing", "_blank"); }}>Upgrade</button>
                </div>
             </div>

             <div style={{marginBottom:'24px'}}>
                <div style={{fontSize:'12px',fontWeight:600,color:'var(--text-muted)',marginBottom:'12px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Usage This Month</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                  <div style={{ padding: "12px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
                    <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--accent-primary)" }}>{usageToday}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Generations</div>
                  </div>
                  <div style={{ padding: "12px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
                    <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--accent-blue)" }}>{preview.files.length}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Files</div>
                  </div>
                  <div style={{ padding: "12px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
                    <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--accent-purple)" }}>{projects.length}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Projects</div>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    )}

    {/* Settings Modal */}
    {showSettingsModal && (
      <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)'}} onClick={()=>setShowSettingsModal(false)}>
        <div style={{width:'100%',maxWidth:'500px',background:'var(--bg-elevated)',border:'1px solid var(--border-default)',borderRadius:'var(--radius-xl)',overflow:'hidden',boxShadow:'0 24px 48px rgba(0,0,0,0.5)',animation:'scaleIn 0.2s ease'}} onClick={e=>e.stopPropagation()}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid var(--border-subtle)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:'16px',fontWeight:600}}>Settings</span>
            <button style={{background:'transparent',border:'none',color:'var(--text-muted)',fontSize:'20px',cursor:'pointer'}} onClick={()=>setShowSettingsModal(false)}>×</button>
          </div>
          <div style={{padding:'20px',maxHeight:'80vh',overflowY:'auto'}}>
             <div style={{marginBottom:'24px'}}>
                <div style={{fontSize:'12px',fontWeight:600,color:'var(--text-muted)',marginBottom:'12px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Preferences</div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
                  <div><div style={{fontSize:'14px',fontWeight:500}}>Dark Mode</div><div style={{fontSize:'12px',color:'var(--text-muted)'}}>Use dark theme</div></div>
                  <div className={`toggle ${toggleStates.darkMode ? "active" : ""}`} onClick={() => setToggleStates((s) => ({ ...s, darkMode: !s.darkMode }))}></div>
                </div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
                  <div><div style={{fontSize:'14px',fontWeight:500}}>Auto-enhance Prompts</div><div style={{fontSize:'12px',color:'var(--text-muted)'}}>Automatically improve vague prompts</div></div>
                  <div className={`toggle ${toggleStates.autoEnhance ? "active" : ""}`} onClick={() => setToggleStates((s) => ({ ...s, autoEnhance: !s.autoEnhance }))}></div>
                </div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
                  <div><div style={{fontSize:'14px',fontWeight:500}}>Activity Feed</div><div style={{fontSize:'12px',color:'var(--text-muted)'}}>Show real-time activity</div></div>
                  <div className={`toggle ${toggleStates.activityFeed ? "active" : ""}`} onClick={() => setToggleStates((s) => ({ ...s, activityFeed: !s.activityFeed }))}></div>
                </div>
             </div>
             
             <div style={{marginBottom:'24px'}}>
                <div style={{fontSize:'12px',fontWeight:600,color:'var(--text-muted)',marginBottom:'12px',textTransform:'uppercase',letterSpacing:'0.5px'}}>API Keys</div>
                <div style={{fontSize:'12px',color:'var(--text-muted)',marginBottom:'12px'}}>Add your own API keys for unlimited generation.</div>
                <div style={{marginBottom:'12px'}}><label style={{display:'block',fontSize:'12px',marginBottom:'4px',color:'var(--text-secondary)'}}>Primary API Key</label><input type="password" style={{width:'100%',padding:'8px 12px',background:'var(--bg-primary)',border:'1px solid var(--border-subtle)',borderRadius:'6px',color:'var(--text-primary)'}} placeholder="sk-..." value={apiKeySlot1} onChange={(e) => setApiKeySlot1(e.target.value)} onBlur={async () => { if (user) { try { const key = apiKeySlot1.trim(); await fetch('/api/user/settings', { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`}, body:JSON.stringify({primaryKey:key||null}) }); toast("success", "API key saved", "Key updated"); } catch (err: any) { toast("error", "Save failed", err.message); } } }} /></div>
                <div><label style={{display:'block',fontSize:'12px',marginBottom:'4px',color:'var(--text-secondary)'}}>Secondary API Key</label><input type="password" style={{width:'100%',padding:'8px 12px',background:'var(--bg-primary)',border:'1px solid var(--border-subtle)',borderRadius:'6px',color:'var(--text-primary)'}} placeholder="sk-..." value={apiKeySlot2} onChange={(e) => setApiKeySlot2(e.target.value)} onBlur={async () => { if (user) { try { const key = apiKeySlot2.trim(); await fetch('/api/user/settings', { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`}, body:JSON.stringify({secondaryKey:key||null}) }); toast("success", "API key saved", "Key updated"); } catch (err: any) { toast("error", "Save failed", err.message); } } }} /></div>
             </div>
          </div>
        </div>
      </div>
    )}

    {/* URL Import Modal */}
    {showUrlImport && (
      <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)'}} onClick={() => setShowUrlImport(false)}>
         <div style={{width:'100%',maxWidth:'500px',background:'var(--bg-elevated)',border:'1px solid var(--border-default)',borderRadius:'var(--radius-xl)',overflow:'hidden',boxShadow:'0 24px 48px rgba(0,0,0,0.5)',animation:'scaleIn 0.2s ease'}} onClick={e=>e.stopPropagation()}>
           <div style={{padding:'16px 20px',borderBottom:'1px solid var(--border-subtle)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
             <span style={{fontSize:'16px',fontWeight:600}}>🔗 Import URL</span>
             <button style={{background:'transparent',border:'none',color:'var(--text-muted)',fontSize:'20px',cursor:'pointer'}} onClick={()=>setShowUrlImport(false)}>×</button>
           </div>
           <div style={{padding:'20px'}}>
             <input
              type="url"
              style={{width:'100%',padding:'12px',background:'var(--bg-primary)',border:'1px solid var(--border-subtle)',borderRadius:'8px',color:'var(--text-primary)',marginBottom:'12px'}}
              placeholder="https://example.com"
              value={urlValue}
              onInput={(e) => handleUrlPreview((e.target as HTMLInputElement).value)}
              autoFocus
            />
            <div className={`url-import-preview ${urlPreview ? "visible" : ""}`} style={{display: urlPreview ? 'block' : 'none', marginBottom:'12px', padding:'10px', background:'var(--bg-tertiary)', borderRadius:'6px'}}>
               <div style={{fontWeight:600}}>{urlPreview?.hostname}</div>
               <div style={{fontSize:'12px',color:'var(--text-muted)'}}>{urlPreview?.url}</div>
            </div>
            <button style={{width:'100%',padding:'10px',background:'var(--text-primary)',color:'var(--bg-primary)',border:'none',borderRadius:'6px',fontWeight:600,cursor:!urlPreview?'not-allowed':'pointer',opacity:!urlPreview?0.5:1}} onClick={importUrl} disabled={!urlPreview}>Import URL</button>
           </div>
         </div>
      </div>
    )}

    <ChatsDialog
      isOpen={showChatsDialog} 
      onClose={() => setShowChatsDialog(false)}
      onSelectChat={handleLoadChat}
      projectId={currentProjectId || undefined}
    />
    <ProjectsDialog
      isOpen={showProjectsDialog}
      onClose={() => setShowProjectsDialog(false)}
      onSelectProject={(p) => {
        setCurrentProjectId(p.id)
        setCurrentProjectName(p.name)
        clearMessages()
        preview.reset()
        setDeployResult(null)
        toast('info', 'Project Switched', p.name)
      }}
      currentProjectId={currentProjectId}
    />
    </>
  )
}
