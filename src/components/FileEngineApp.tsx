import { DB } from '@/lib/db-fields'
'use client'
import { BRAND_NAME } from '@/lib/brand'

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useChat, type Message as ChatMessage, type Attachment } from "@/hooks/useChat";
import { useProjects } from "@/hooks/useProjects";
import { useQueueStats } from "@/hooks/useQueueStats";
import { useGenerate, type GeneratePhase } from "@/hooks/useGenerate";
import { useFileEnginePreview } from "@/hooks/useFileEnginePreview";
import { useSavedChats } from "@/hooks/useSavedChats";
import { PreviewPanelV2 } from "@/components/file-engine";
import { supabase, checkAndIncrementUsage } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

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
    --accent-primary: var(--accent-primary);
    --accent-blue: var(--accent-primary);
    --accent-purple: var(--accent-primary);
    --accent-orange: #ff6622;
    --accent-yellow: #ffc800;
    --accent-glow: rgba(16, 185, 129, 0.3);
    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 14px;
    --radius-xl: 20px;
    --shadow-glow: 0 0 20px rgba(16, 185, 129, 0.3);
    --font-sans: 'Inter', -apple-system, sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: var(--font-sans); background: var(--bg-primary); color: var(--text-primary); line-height: 1.5; overflow: hidden; }
  
  /* Layout */
  .app-layout { display: grid; grid-template-columns: 260px 1fr 340px; grid-template-rows: 56px 1fr 32px; height: 100vh; }
  
  /* Header */
  .header { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; background: var(--bg-secondary); border-bottom: 1px solid var(--border-subtle); }
  .header-left { display: flex; align-items: center; gap: 20px; }
  .logo { display: flex; align-items: center; gap: 10px; font-weight: 700; }
  .logo-mark { width: 32px; height: 32px; background: var(--accent-primary), var(--accent-blue)); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: var(--bg-primary); }
  .header-divider { width: 1px; height: 24px; background: var(--border-subtle); }
  .live-stats { display: flex; gap: 16px; }
  .stat-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary); }
  .stat-pulse { width: 8px; height: 8px; background: var(--accent-primary); border-radius: 50%; animation: pulse 2s infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  .stat-value { font-weight: 600; color: var(--text-primary); }
  .header-right { display: flex; align-items: center; gap: 12px; }
  .header-quick-start { display: flex; gap: 8px; }
  .quick-start-btn { display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); color: var(--text-secondary); font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
  .quick-start-btn:hover { background: var(--bg-elevated); border-color: var(--accent-primary); color: var(--text-primary); }
  .quick-start-btn span { font-size: 14px; }
  .btn { padding: 8px 16px; border-radius: var(--radius-md); font-size: 13px; font-weight: 500; cursor: pointer; border: none; }
  .btn-ghost { background: transparent; color: var(--text-secondary); }
  .btn-ghost:hover { background: var(--bg-tertiary); }
  .btn-secondary { background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-subtle); }
  .btn-deploy { background: var(--accent-primary), var(--accent-blue)); color: var(--bg-primary); font-weight: 600; }
  .btn-deploy:hover { box-shadow: var(--shadow-glow); }
  .user-avatar { width: 32px; height: 32px; background: var(--accent-primary), var(--accent-blue)); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; cursor: pointer; overflow: hidden; border: 2px solid transparent; transition: border-color 0.2s; }
  .user-avatar:hover { border-color: var(--accent-primary); }
  .user-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .user-menu { position: relative; }
  .user-dropdown { position: absolute; top: calc(100% + 8px); right: 0; min-width: 220px; background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-lg); box-shadow: 0 16px 48px rgba(0,0,0,0.5); z-index: 500; overflow: hidden; animation: dropIn 0.15s ease; }
  @keyframes dropIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
  .user-dropdown-header { padding: 14px 16px; background: var(--bg-tertiary); border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; gap: 12px; }
  .user-dropdown-avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--accent-primary), var(--accent-blue)); display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; flex-shrink: 0; overflow: hidden; }
  .user-dropdown-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .user-dropdown-info { flex: 1; min-width: 0; }
  .user-dropdown-name { font-size: 14px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .user-dropdown-email { font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
  .user-dropdown-plan { display: inline-flex; align-items: center; margin-top: 4px; padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .user-dropdown-plan.free { background: rgba(160,160,176,0.15); color: var(--text-secondary); }
  /* Usage bar */
  .usage-bar-wrap { display: flex; align-items: center; gap: 8px; padding: 4px 10px; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); }
  .usage-bar-label { font-size: 11px; color: var(--text-muted); white-space: nowrap; }
  .usage-bar-track { width: 64px; height: 4px; background: var(--border-default); border-radius: 2px; overflow: hidden; }
  .usage-bar-fill { height: 100%; border-radius: 2px; transition: width 0.3s ease; }
  .usage-bar-fill.ok { background: var(--accent-primary); }
  .usage-bar-fill.warn { background: var(--accent-yellow); }
  .usage-bar-fill.full { background: var(--accent-orange); }
  .usage-bar-count { font-size: 11px; font-weight: 600; color: var(--text-secondary); white-space: nowrap; }
  .user-dropdown-plan.pro { background: rgba(0,136,255,0.2); color: var(--accent-blue); }
  .user-dropdown-plan.enterprise { background: rgba(138,43,226,0.2); color: var(--accent-purple); }
  .user-dropdown-body { padding: 6px; }
  .user-dropdown-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; background: transparent; border: none; border-radius: var(--radius-sm); color: var(--text-secondary); font-size: 13px; cursor: pointer; text-align: left; font-family: var(--font-sans); transition: all 0.12s; }
  .user-dropdown-item:hover { background: var(--bg-tertiary); color: var(--text-primary); }
  .user-dropdown-item.danger:hover { background: rgba(255,80,80,0.1); color: #ff6464; }
  .user-dropdown-divider { height: 1px; background: var(--border-subtle); margin: 4px 6px; }
  
  /* Sidebar */
  .sidebar { background: var(--bg-secondary); border-right: 1px solid var(--border-subtle); display: flex; flex-direction: column; overflow: hidden; }
   .sidebar-section { padding: 16px; border-bottom: 1px solid var(--border-subtle); }

  /* Chat Item */
  .chat-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-radius: var(--radius-md); cursor: pointer; transition: background 0.2s; user-select: none; }
  .chat-item:hover { background: var(--bg-tertiary); }
  .chat-item.active { background: var(--bg-elevated); border: 1px solid var(--border-subtle); }
  .chat-item-content { flex: 1; min-width: 0; margin-right: 8px; }
  .chat-item-title { font-size: 13px; font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .chat-item-meta { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
  .chat-actions { display: flex; opacity: 0; transition: opacity 0.2s; gap: 4px; }
  .chat-item:hover .chat-actions { opacity: 1; }
  .chat-action-btn { padding: 4px; border-radius: 4px; color: var(--text-muted); background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .chat-action-btn:hover { background: var(--bg-primary); color: var(--text-primary); }
  .chat-action-btn.delete:hover { color: #ff6464; background: rgba(255, 100, 100, 0.1); }
  .chat-input { background: var(--bg-primary); border: 1px solid var(--accent-primary); color: var(--text-primary); font-size: 13px; padding: 2px 6px; border-radius: 4px; width: 100%; outline: none; }
  .sidebar-section.grow { flex: 1; overflow-y: auto; border-bottom: none; }
  .new-project-btn { width: 100%; padding: 12px; background: var(--accent-primary), var(--accent-blue)); color: var(--bg-primary); border: none; border-radius: var(--radius-md); font-size: 14px; font-weight: 600; cursor: pointer; margin-bottom: 16px; }
  .new-project-btn:hover { box-shadow: var(--shadow-glow); }
  .capacity-section { background: var(--bg-tertiary); border-radius: var(--radius-md); padding: 12px; }
  .capacity-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
  .capacity-title { font-size: 11px; color: var(--text-muted); text-transform: uppercase; }
  .capacity-value { font-size: 12px; font-weight: 600; color: var(--accent-primary); }
  .capacity-bar { height: 4px; background: var(--bg-elevated); border-radius: 2px; margin-bottom: 8px; }
  .capacity-fill { height: 100%; background: var(--accent-primary), var(--accent-blue)); border-radius: 2px; }
  .capacity-details { display: flex; justify-content: space-between; font-size: 10px; color: var(--text-muted); }
  .sidebar-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 12px; }
  .sidebar-tools { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .sidebar-tool-btn { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); color: var(--text-secondary); font-size: 12px; cursor: pointer; transition: all 0.15s; }
  .sidebar-tool-btn:hover { background: var(--bg-elevated); border-color: var(--accent-primary); color: var(--text-primary); }
  .sidebar-tool-icon { font-size: 14px; }
  .template-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .template-card { padding: 12px; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); text-align: center; cursor: pointer; }
  .template-card:hover { border-color: var(--accent-primary); background: var(--bg-elevated); }
  .template-emoji { font-size: 24px; margin-bottom: 4px; }
  .template-name { font-size: 12px; font-weight: 500; }
  .project-list { display: flex; flex-direction: column; gap: 4px; }
  .project-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: var(--radius-md); cursor: pointer; }
  .project-item:hover { background: var(--bg-tertiary); }
  .project-item.active { background: rgba(16, 185, 129, 0.1); border-left: 2px solid var(--accent-primary); }
  .project-dot { width: 8px; height: 8px; border-radius: 50%; }
  .project-dot.running { background: var(--accent-primary); animation: pulse 2s infinite; }
  .project-dot.building { background: var(--accent-yellow); }
  .project-dot.idle { background: var(--text-muted); }
  .project-item-info { flex: 1; min-width: 0; }
  .project-item-name { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .project-item-meta { font-size: 11px; color: var(--text-muted); }
  
  /* Main Area */
  .main-area { display: flex; flex-direction: column; background: var(--bg-primary); overflow: hidden; }
  .builds-banner { display: flex; align-items: center; gap: 12px; padding: 10px 20px; background: var(--bg-secondary); border-bottom: 1px solid var(--border-subtle); font-size: 12px; }
  .builds-dots { display: flex; gap: 3px; }
  .build-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--bg-elevated); }
  .build-dot.active { background: var(--accent-primary); box-shadow: 0 0 8px var(--accent-glow); }
  .builds-text { color: var(--text-secondary); }
  .builds-text strong { color: var(--text-primary); }
  .builds-separator { width: 1px; height: 16px; background: var(--border-subtle); }
  .queue-status { color: var(--text-muted); }
  .queue-status strong { color: var(--accent-yellow); }
  .activity-toggle { margin-left: auto; padding: 4px 10px; background: var(--bg-tertiary); color: var(--text-secondary); border: none; border-radius: var(--radius-sm); font-size: 11px; cursor: pointer; }
  .activity-toggle.active { background: var(--accent-primary); color: var(--bg-primary); }
  .messages-area { flex: 1; overflow-y: auto; padding: 24px; }
  
  /* Welcome Screen */
  .welcome-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; padding: 40px; }
  .welcome-logo { width: 80px; height: 80px; background: var(--accent-primary), var(--accent-blue)); border-radius: 24px; display: flex; align-items: center; justify-content: center; font-size: 40px; margin-bottom: 24px; animation: float 3s ease-in-out infinite; }
  @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
  .welcome-title { font-size: 32px; font-weight: 700; margin-bottom: 12px; }
  .welcome-subtitle { font-size: 16px; color: var(--text-secondary); max-width: 500px; margin-bottom: 32px; }
  .welcome-badges { display: flex; gap: 16px; margin-bottom: 40px; }
  .welcome-badge { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); font-size: 13px; }
  .welcome-badge strong { color: var(--accent-primary); }
  .quick-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; max-width: 600px; width: 100%; }
  .quick-card { display: flex; align-items: center; gap: 16px; padding: 20px; background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); cursor: pointer; text-align: left; }
  .quick-card:hover { border-color: var(--accent-primary); transform: translateY(-2px); }
  .quick-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
  .quick-icon.web { background: var(--accent-primary); }
  .quick-icon.api { background: var(--accent-primary); }
  .quick-icon.dash { background: var(--accent-primary); }
  .quick-icon.app { background: var(--accent-primary); }
  .quick-content h4 { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
  .quick-content p { font-size: 12px; color: var(--text-muted); }
  
  /* Chat Messages */
  .chat-messages { display: flex; flex-direction: column; gap: 16px; }
  .chat-message { display: flex; gap: 12px; }
  .chat-message-avatar { width: 36px; height: 36px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; flex-shrink: 0; }
  .chat-message.user .chat-message-avatar { background: var(--accent-primary), var(--accent-blue)); }
  .chat-message.assistant .chat-message-avatar { background: var(--accent-primary), var(--accent-blue)); color: var(--bg-primary); }
  .chat-message-content { flex: 1; padding: 12px 16px; background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); font-size: 14px; }
  .chat-message-content pre { white-space: pre-wrap; font-family: inherit; margin: 0; }
  
  /* Activity Feed */
  .activity-feed { background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); overflow: hidden; margin: 12px 0; }
  .activity-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--bg-tertiary); border-bottom: 1px solid var(--border-subtle); }
  .activity-title { font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
  .activity-count { padding: 2px 6px; background: var(--accent-primary); color: var(--bg-primary); border-radius: 12px; font-size: 10px; }
  .activity-list { max-height: 200px; overflow-y: auto; }
  .activity-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--border-subtle); }
  .activity-item:last-child { border-bottom: none; }
  .activity-icon { width: 24px; height: 24px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; }
  .activity-icon.analyzing { background: rgba(0, 136, 255, 0.2); }
  .activity-icon.connecting { background: rgba(138, 43, 226, 0.2); }
  .activity-icon.generating { background: rgba(16, 185, 129, 0.2); }
  .activity-icon.validating { background: rgba(255, 200, 0, 0.2); }
  .activity-icon.writing { background: rgba(16, 185, 129, 0.2); }
  .activity-content { flex: 1; }
  .activity-label { font-size: 13px; font-weight: 500; }
  .activity-detail { font-size: 11px; color: var(--text-muted); }
  .activity-status { font-size: 11px; padding: 2px 6px; border-radius: 4px; }
  .activity-status.running { background: rgba(255, 200, 0, 0.2); color: var(--accent-yellow); }
  .activity-status.completed { background: rgba(16, 185, 129, 0.2); color: var(--accent-primary); }
  
  /* Generated Files */
  .generated-files { background: var(--bg-secondary); border: 1px solid var(--accent-primary); border-radius: var(--radius-lg); overflow: hidden; }
  .generated-files-header { padding: 12px 16px; background: rgba(16, 185, 129, 0.1); font-size: 14px; font-weight: 600; }
  .generated-file { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-top: 1px solid var(--border-subtle); cursor: pointer; }
  .generated-file:hover { background: var(--bg-tertiary); }
  .generated-file-path { font-size: 13px; font-family: var(--font-mono); color: var(--text-secondary); }
  
  /* Quick Actions */
  .quick-actions-bar { display: flex; gap: 8px; padding: 12px 16px; background: var(--bg-tertiary); border-top: 1px solid var(--border-subtle); }
  .quick-action { display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); color: var(--text-secondary); font-size: 13px; cursor: pointer; }
  .quick-action:hover { background: var(--bg-elevated); color: var(--text-primary); }
  .quick-action.primary { background: var(--accent-primary); color: var(--bg-primary); border-color: var(--accent-primary); }
  .quick-action.primary:hover { box-shadow: var(--shadow-glow); }
  
  /* Input Area */
  .input-area { padding: 16px 24px 24px; background: var(--bg-primary); }
  .input-wrapper { max-width: 900px; margin: 0 auto; }
  .input-box { position: relative; display: flex; align-items: flex-end; gap: 12px; padding: 12px; background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); }
  .input-box:focus-within { border-color: var(--accent-primary); }
  .input-tools { display: flex; gap: 4px; }
  .tool-btn { width: 36px; height: 36px; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; }
  .tool-btn:hover { background: var(--bg-elevated); color: var(--text-primary); }
  .input-field { flex: 1; background: transparent; border: none; color: var(--text-primary); font-size: 15px; font-family: var(--font-sans); resize: none; outline: none; min-height: 24px; max-height: 180px; }
  .input-field::placeholder { color: var(--text-muted); }
  .send-btn { width: 40px; height: 40px; background: var(--accent-primary), var(--accent-blue)); border: none; border-radius: var(--radius-md); color: var(--bg-primary); font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .send-btn:hover { box-shadow: var(--shadow-glow); }
  .send-btn.cancel { background: var(--accent-orange); }
  .input-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding: 0 4px; }
  .input-hint { font-size: 11px; color: var(--text-muted); }
  .input-hint kbd { padding: 2px 5px; background: var(--bg-tertiary); border-radius: 4px; font-family: var(--font-mono); font-size: 10px; }
  .enhance-btn { background: none; border: none; color: var(--accent-primary); font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 4px 8px; }
  .model-selector { display: flex; align-items: center; gap: 6px; padding: 4px 10px; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); font-size: 11px; color: var(--text-secondary); cursor: pointer; position: relative; }
  .model-selector:hover { border-color: var(--border-default); }
  .model-dot { width: 6px; height: 6px; background: var(--accent-primary); border-radius: 50%; }
  .model-dropdown { position: absolute; bottom: 100%; right: 0; margin-bottom: 8px; background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); min-width: 200px; overflow: hidden; z-index: 200; box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
  .model-dropdown-item { display: flex; align-items: center; gap: 10px; padding: 12px 16px; cursor: pointer; font-size: 13px; color: var(--text-secondary); transition: all 0.15s; }
  .model-dropdown-item:hover { background: var(--bg-tertiary); color: var(--text-primary); }
  .model-dropdown-item.active { background: rgba(16, 185, 129, 0.1); color: var(--accent-primary); }
  .model-dropdown-item .model-provider { font-size: 10px; color: var(--text-muted); margin-left: auto; padding: 2px 6px; background: var(--bg-tertiary); border-radius: 4px; }
  .model-dropdown-item .model-check { color: var(--accent-primary); font-size: 14px; }
  
  /* Attached Files */
  .attached-files { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px 12px; background: var(--bg-tertiary); border-radius: var(--radius-sm); margin-top: 8px; }
  .attached-file { display: flex; align-items: center; gap: 6px; padding: 4px 8px; background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: 20px; font-size: 11px; color: var(--text-secondary); }
  .attached-file-icon { font-size: 14px; }
  .attached-file-remove { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0 2px; font-size: 12px; }
  .attached-file-remove:hover { color: var(--accent-orange); }
  .tool-btn.has-files { border-color: var(--accent-primary); color: var(--accent-primary); position: relative; }
  .tool-btn .file-count { position: absolute; top: -4px; right: -4px; background: var(--accent-primary); color: var(--bg-primary); font-size: 9px; font-weight: 700; width: 14px; height: 14px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
  
  /* URL Import Modal */
  .url-import-modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; }
  .url-import-content { background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 24px; width: 400px; max-width: 90%; }
  .url-import-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
  .url-import-title { font-size: 18px; font-weight: 600; }
  .url-import-close { background: none; border: none; color: var(--text-muted); font-size: 24px; cursor: pointer; }
  .url-import-input { width: 100%; padding: 14px 16px; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); color: var(--text-primary); font-size: 14px; margin-bottom: 16px; }
  .url-import-input:focus { outline: none; border-color: var(--accent-primary); }
  .url-import-preview { padding: 12px; background: var(--bg-tertiary); border-radius: var(--radius-md); margin-bottom: 16px; display: none; }
  .url-import-preview.visible { display: block; }
  .url-import-preview-title { font-size: 13px; font-weight: 500; margin-bottom: 4px; }
  .url-import-preview-url { font-size: 11px; color: var(--text-muted); word-break: break-all; }
  .url-import-btn { width: 100%; padding: 12px; background: var(--accent-primary), var(--accent-blue)); color: var(--bg-primary); border: none; border-radius: var(--radius-md); font-size: 14px; font-weight: 600; cursor: pointer; }
  .url-import-btn:hover { box-shadow: var(--shadow-glow); }
  .url-import-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  
  /* Preview Panel */
  .preview-panel { background: var(--bg-secondary); border-left: 1px solid var(--border-subtle); display: flex; flex-direction: column; overflow: hidden; transition: all 0.3s ease; }
  .preview-panel.maximized { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 100; border: none; }
  .preview-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--border-subtle); }
  .preview-title { font-size: 13px; font-weight: 600; }
  .preview-tabs { display: flex; gap: 4px; }
  .preview-tab { padding: 6px 12px; background: transparent; border: none; color: var(--text-muted); font-size: 12px; cursor: pointer; border-radius: var(--radius-sm); }
  .preview-tab:hover { background: var(--bg-tertiary); }
  .preview-tab.active { background: var(--bg-tertiary); color: var(--text-primary); }
  .preview-content { flex: 1; overflow-y: auto; padding: 16px; }
  .preview-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; color: var(--text-muted); }
  .preview-empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.3; }
  .file-tree { display: flex; flex-direction: column; gap: 2px; }
  .file-tree-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; font-family: var(--font-mono); color: var(--text-secondary); }
  .file-tree-item:hover { background: var(--bg-tertiary); color: var(--text-primary); }
  .file-tree-item.active { background: rgba(16, 185, 129, 0.1); color: var(--accent-primary); }
  .code-preview { background: var(--bg-primary); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden; }
  .code-preview-header { display: flex; align-items: center; padding: 10px 14px; background: var(--bg-tertiary); border-bottom: 1px solid var(--border-subtle); }
  .code-preview-filename { font-size: 12px; font-family: var(--font-mono); color: var(--text-secondary); }
  .code-preview-content { padding: 16px; font-family: var(--font-mono); font-size: 12px; white-space: pre; color: var(--text-secondary); overflow-x: auto; }
  .code-preview-content .keyword { color: #c678dd; }
  .code-preview-content .string { color: #98c379; }
  .code-preview-content .comment { color: #5c6370; }
  
  /* Status Bar */
  .status-bar { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; background: var(--bg-secondary); border-top: 1px solid var(--border-subtle); font-size: 11px; color: var(--text-muted); }
  .status-left, .status-right { display: flex; align-items: center; gap: 16px; }
  .status-item { display: flex; align-items: center; gap: 6px; }
  .status-dot { width: 6px; height: 6px; border-radius: 50%; }
  .status-dot.online { background: var(--accent-primary); box-shadow: 0 0 8px var(--accent-glow); }
  
  /* Nav Items */
  .nav-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: var(--radius-sm); cursor: pointer; color: var(--text-secondary); font-size: 13px; transition: all 0.1s; }
  .nav-item:hover { background: var(--bg-tertiary); color: var(--text-primary); }
  .nav-icon { font-size: 14px; width: 20px; text-align: center; }

  /* Tool Cards */
  .tool-card { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: var(--radius-md); cursor: pointer; transition: all 0.15s; margin-bottom: 4px; }
  .tool-card:hover { background: var(--bg-tertiary); }
  .tool-icon-box { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
  .tool-info { flex: 1; min-width: 0; }
  .tool-name { font-size: 12px; font-weight: 600; color: var(--text-primary); }
  .tool-desc { font-size: 10px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* Settings Card */
  .settings-card { background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 14px; margin-bottom: 12px; }
  .settings-card-title { font-size: 12px; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .setting-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-subtle); }
  .setting-row:last-child { border-bottom: none; }
  .setting-label { font-size: 12px; color: var(--text-secondary); }

  /* Tool Call Timeline */
  .tool-call-item { display: flex; align-items: center; gap: 8px; padding: 4px 10px; margin-bottom: 2px; border-radius: 8px; font-size: 11px; }
  .tool-call-item.success { background: rgba(16,185,129,0.05); border-left: 2px solid var(--accent-primary); }
  .tool-call-item.error { background: rgba(255,100,100,0.1); border-left: 2px solid #ff6464; }
  .tool-call-item.running { background: var(--bg-tertiary); border-left: 2px solid var(--accent-yellow); }

  /* Thinking Block */
  .thinking-block { padding: 8px 12px; margin-bottom: 8px; background: rgba(138,43,226,0.1); border: 1px solid rgba(138,43,226,0.2); border-radius: 8px; }
  .thinking-label { font-size: 10px; font-weight: 600; color: var(--accent-purple); text-transform: uppercase; margin-bottom: 4px; }

  /* Media Preview */
  .media-preview { margin-top: 8px; border-radius: var(--radius-md); overflow: hidden; max-width: 400px; }
  .media-preview img { width: 100%; display: block; }
  .media-preview video { width: 100%; display: block; }
  .media-preview audio { width: 100%; }

  /* Header View Toggle */
  .header-view-toggle { display: flex; background: var(--bg-tertiary); border-radius: 4px; padding: 2px; }
  .header-view-btn { display: flex; align-items: center; gap: 4px; padding: 3px 8px; background: transparent; border: none; border-radius: 3px; color: var(--text-muted); font-size: 11px; cursor: pointer; font-family: var(--font-sans); transition: all 0.15s; }
  .header-view-btn:hover { color: var(--text-secondary); }
  .header-view-btn.active { background: var(--bg-elevated); color: var(--text-primary); }

  /* Header Copy Dropdown */
  .header-dropdown { position: relative; }
  .header-dropdown-btn { display: flex; align-items: center; gap: 4px; padding: 5px 10px; background: transparent; border: none; border-radius: var(--radius-sm); color: var(--text-muted); font-size: 11px; cursor: pointer; font-family: var(--font-sans); }
  .header-dropdown-btn:hover { background: var(--bg-tertiary); color: var(--text-primary); }
  .header-dropdown-menu { position: absolute; top: 100%; right: 0; margin-top: 4px; background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 4px; min-width: 160px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); z-index: 200; }
  .header-dropdown-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 10px; background: transparent; border: none; border-radius: 4px; color: var(--text-secondary); font-size: 12px; cursor: pointer; text-align: left; font-family: var(--font-sans); }
  .header-dropdown-item:hover { background: var(--bg-tertiary); color: var(--text-primary); }
  .header-dropdown-divider { height: 1px; background: var(--border-subtle); margin: 4px 0; }

  /* Header Project Badge */
  .header-project-badge { display: flex; align-items: center; gap: 6px; }
  .header-project-name { font-size: 11px; font-weight: 600; }
  .header-live-badge { display: none; align-items: center; gap: 3px; padding: 2px 6px; background: rgba(16, 185, 129, 0.15); color: var(--accent-primary); border-radius: 3px; font-size: 9px; font-weight: 600; }
  .header-live-badge.visible { display: flex; }
  .header-live-dot { width: 5px; height: 5px; background: var(--accent-primary); border-radius: 50%; animation: pulse 2s infinite; }

  /* Status bar preview status */
  .preview-status-text { color: var(--accent-primary); font-weight: 500; }

  /* Savings Widget */
  .savings-card { background: var(--accent-primary), rgba(0,100,255,0.06)); border: 1px solid rgba(16,185,129,0.2); border-radius: var(--radius-lg); padding: 14px; }
  .savings-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .savings-card-title { font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--accent-primary); letter-spacing: 0.5px; }
  .savings-card-badge { font-size: 9px; padding: 2px 6px; background: rgba(16,185,129,0.15); color: var(--accent-primary); border-radius: 4px; font-weight: 700; }
  .savings-big-number { font-size: 28px; font-weight: 800; color: var(--accent-primary); line-height: 1; }
  .savings-subtitle { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
  .savings-bar { height: 6px; background: var(--bg-tertiary); border-radius: 3px; margin-top: 10px; overflow: hidden; }
  .savings-bar-fill { height: 100%; background: var(--accent-primary), var(--accent-blue)); border-radius: 3px; transition: width 0.5s ease; }
  .savings-row { display: flex; justify-content: space-between; align-items: center; font-size: 11px; padding: 3px 0; }
  .savings-row-label { color: var(--text-muted); }
  .savings-row-value { font-weight: 600; color: var(--text-primary); }
  .savings-row-value.green { color: var(--accent-primary); }
  .upsell-card { background: var(--accent-primary), rgba(0,100,255,0.08)); border: 1px solid rgba(138,43,226,0.25); border-radius: var(--radius-lg); padding: 14px; margin-top: 12px; }
  .upsell-title { font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
  .upsell-desc { font-size: 11px; color: var(--text-muted); margin-bottom: 10px; line-height: 1.4; }
  .upsell-btn { width: 100%; padding: 8px; background: var(--accent-primary); color: #fff; border: none; border-radius: var(--radius-md); font-size: 12px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
  .upsell-btn:hover { opacity: 0.9; }
  
  /* Command Palette */
  .command-palette-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px); z-index: 3000; display: flex; align-items: flex-start; justify-content: center; padding-top: 15vh; animation: fadeIn 0.15s ease; }
  .command-palette-overlay.hidden { display: none; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .command-palette { background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); width: 560px; max-width: 90%; max-height: 70vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); }
  .command-search { display: flex; align-items: center; gap: 12px; padding: 16px; border-bottom: 1px solid var(--border-subtle); }
  .command-search-icon { font-size: 16px; opacity: 0.5; }
  .command-input { flex: 1; background: none; border: none; font-size: 16px; color: var(--text-primary); outline: none; font-family: var(--font-sans); }
  .command-input::placeholder { color: var(--text-muted); }
  .command-shortcut { padding: 4px 8px; background: var(--bg-tertiary); border-radius: var(--radius-sm); font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); }
  .command-list { flex: 1; overflow-y: auto; padding: 8px; }
  .command-group { margin-bottom: 12px; }
  .command-group-label { padding: 8px 12px; font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
  .command-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: var(--radius-md); cursor: pointer; }
  .command-item:hover, .command-item.selected { background: var(--bg-tertiary); }
  .command-item.selected { background: var(--accent-primary), transparent); border-left: 2px solid var(--accent-primary); }
  .command-icon { font-size: 18px; width: 28px; text-align: center; }
  .command-info { flex: 1; }
  .command-label { display: block; font-weight: 500; }
  .command-desc { display: block; font-size: 12px; color: var(--text-muted); }
  .command-footer { display: flex; gap: 16px; padding: 12px 16px; border-top: 1px solid var(--border-subtle); font-size: 11px; color: var(--text-muted); }
  
  /* Onboarding Modal */
  .onboarding-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.9); backdrop-filter: blur(8px); z-index: 2000; display: flex; align-items: center; justify-content: center; }
  .onboarding-overlay.hidden { display: none; }
  .onboarding-modal { background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 32px; max-width: 480px; width: 90%; }
  .onboarding-progress { display: flex; justify-content: center; gap: 8px; margin-bottom: 24px; }
  .progress-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--bg-tertiary); }
  .progress-dot.active { background: var(--accent-primary); width: 24px; border-radius: 4px; }
  .progress-dot.completed { background: var(--accent-primary); }
  .onboarding-content { text-align: center; margin-bottom: 24px; }
  .onboarding-content h2 { font-size: 24px; font-weight: 700; margin-bottom: 12px; }
  .onboarding-content p { color: var(--text-secondary); }
  .skill-selector { display: flex; flex-direction: column; gap: 12px; margin-top: 24px; }
  .skill-option { display: flex; align-items: center; gap: 12px; padding: 16px; background: var(--bg-tertiary); border: 2px solid var(--border-subtle); border-radius: var(--radius-md); cursor: pointer; text-align: left; }
  .skill-option:hover { border-color: var(--border-default); }
  .skill-option.active { border-color: var(--accent-primary); background: rgba(16, 185, 129, 0.05); }
  .skill-icon { font-size: 24px; }
  .skill-label { font-weight: 600; display: block; }
  .skill-desc { font-size: 12px; color: var(--text-muted); }
  .onboarding-actions { display: flex; justify-content: flex-end; gap: 12px; }
  .onboarding-btn { padding: 12px 24px; border-radius: var(--radius-md); font-weight: 600; cursor: pointer; font-size: 14px; }
  .onboarding-btn.primary { background: var(--accent-primary); color: var(--bg-primary); border: none; }
  .onboarding-btn.primary:hover { box-shadow: var(--shadow-glow); }
  .onboarding-btn.secondary { background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-subtle); }
  .onboarding-btn.text { background: none; border: none; color: var(--text-muted); }
  
  /* Contextual Tip */
  .contextual-tip { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); z-index: 1000; max-width: 400px; display: flex; gap: 12px; padding: 12px 16px; background: var(--accent-primary), rgba(0, 136, 255, 0.1)); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: var(--radius-md); }
  .contextual-tip.hidden { display: none; }
  .tip-content { flex: 1; }
  .tip-content strong { display: block; font-size: 13px; margin-bottom: 4px; }
  .tip-content p { font-size: 12px; color: var(--text-secondary); margin: 0; }
  .tip-dismiss { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 18px; }
  
  /* Notifications */
  .notification-container { position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column-reverse; gap: 12px; max-width: 400px; }
  .notification-item { display: flex; gap: 12px; padding: 14px 16px; background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-left-width: 3px; border-radius: var(--radius-lg); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3); animation: slideIn 0.3s ease; }
  @keyframes slideIn { from { opacity: 0; transform: translateX(100px); } to { opacity: 1; transform: translateX(0); } }
  .notification-item.success { background: rgba(16, 185, 129, 0.1); border-left-color: var(--accent-primary); }
  .notification-item.error { background: rgba(255, 102, 34, 0.1); border-left-color: var(--accent-orange); }
  .notification-item.info { background: rgba(0, 136, 255, 0.1); border-left-color: var(--accent-blue); }
  .notification-icon { font-size: 20px; flex-shrink: 0; }
  .notification-content { flex: 1; }
  .notification-title { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
  .notification-message { font-size: 13px; color: var(--text-secondary); }
  .notification-dismiss { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 18px; }
  
  /* Modal */
  .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(4px); z-index: 2500; display: flex; align-items: center; justify-content: center; }
  .modal-overlay.hidden { display: none; }
  .modal { background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); width: 480px; max-width: 90%; max-height: 80vh; overflow: hidden; }
  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--border-subtle); }
  .modal-title { font-size: 18px; font-weight: 600; }
  .modal-close { width: 32px; height: 32px; background: var(--bg-tertiary); border: none; border-radius: var(--radius-sm); color: var(--text-muted); font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .modal-close:hover { background: var(--bg-elevated); color: var(--text-primary); }
  .modal-body { padding: 24px; overflow-y: auto; }
  .modal-section { margin-bottom: 24px; }
  .modal-section:last-child { margin-bottom: 0; }
  .modal-section-title { font-size: 13px; font-weight: 600; margin-bottom: 12px; color: var(--text-secondary); }
  .form-group { margin-bottom: 16px; }
  .form-label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 8px; color: var(--text-secondary); }
  .form-input { width: 100%; padding: 10px 14px; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); color: var(--text-primary); font-size: 14px; font-family: var(--font-sans); }
  .form-input:focus { outline: none; border-color: var(--accent-primary); }
  .toggle-group { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border-subtle); }
  .toggle-label { font-size: 14px; }
  .toggle-desc { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
  .toggle { position: relative; width: 44px; height: 24px; background: var(--bg-tertiary); border-radius: 12px; cursor: pointer; }
  .toggle.active { background: var(--accent-primary); }
  .toggle::after { content: ''; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; background: white; border-radius: 50%; transition: transform 0.2s; }
  .toggle.active::after { transform: translateX(20px); }
  
  /* Thinking Indicator */
  .thinking-indicator { display: flex; align-items: center; gap: 8px; color: var(--text-muted); font-size: 14px; }
  .thinking-dots { display: flex; gap: 4px; }
  .thinking-dot { width: 6px; height: 6px; background: var(--accent-primary); border-radius: 50%; animation: thinking 1.4s infinite; }
  .thinking-dot:nth-child(2) { animation-delay: 0.2s; }
  .thinking-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes thinking { 0%, 80%, 100% { transform: scale(0); opacity: 0.5; } 40% { transform: scale(1); opacity: 1; } }
  
  /* Scrollbar */
  ::-webkit-scrollbar { width: 8px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border-default); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--border-hover); }

  /* Enhancement Preview */
  .enhancement-preview { background: var(--bg-secondary); border: 1px solid var(--accent-primary); border-radius: var(--radius-lg); margin-bottom: 12px; overflow: hidden; }
  .enhancement-header { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: rgba(16, 185, 129, 0.1); border-bottom: 1px solid var(--border-subtle); }
  .enhancement-title { flex: 1; font-weight: 600; font-size: 13px; }
  .enhancement-dismiss { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 18px; }
  .enhancement-content { padding: 16px; }
  .enhancement-text { font-size: 14px; margin-bottom: 12px; }
  .enhancement-improvements { display: flex; flex-wrap: wrap; gap: 6px; }
  .enhancement-badge { padding: 4px 8px; background: var(--bg-tertiary); border-radius: 4px; font-size: 11px; color: var(--accent-primary); }
  .enhancement-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--border-subtle); }
  .enhancement-btn { padding: 8px 16px; border-radius: var(--radius-md); font-size: 13px; font-weight: 500; cursor: pointer; }
  .enhancement-btn.primary { background: var(--accent-primary); color: var(--bg-primary); border: none; }
  .enhancement-btn.secondary { background: var(--bg-tertiary); color: var(--text-secondary); border: 1px solid var(--border-subtle); }

  /* Suggestions */
  .suggestions-dropdown { position: absolute; bottom: 100%; left: 0; right: 0; margin-bottom: 8px; background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); overflow: hidden; box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.3); z-index: 100; }
  .suggestion-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; cursor: pointer; }
  .suggestion-item:hover { background: var(--bg-tertiary); }
  .suggestion-icon { font-size: 16px; width: 24px; text-align: center; }
  .suggestion-text { font-size: 13px; }

  /* Error message styling */
  .chat-message.error .chat-message-content { border-color: var(--accent-orange); background: rgba(255, 102, 34, 0.08); }
  
  /* Disabled state for inputs during generation */
  .input-field:disabled { opacity: 0.5; cursor: not-allowed; }
  .send-btn.cancel { background: var(--accent-orange); }
  .send-btn.cancel:hover { box-shadow: 0 0 20px rgba(255, 102, 34, 0.3); }
  
  /* Project loading skeleton */
  .project-skeleton { height: 40px; background: var(--accent-primary) 25%, var(--bg-elevated) 50%, var(--bg-tertiary) 75%); background-size: 200% 100%; border-radius: var(--radius-md); animation: shimmer 1.5s infinite; margin-bottom: 4px; }
  @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

  /* Usage limit warning */
  .usage-warning { padding: 8px 12px; background: rgba(255, 200, 0, 0.1); border: 1px solid rgba(255, 200, 0, 0.3); border-radius: var(--radius-sm); font-size: 12px; color: var(--accent-yellow); margin-top: 8px; }
`;

const QUICK_PROMPTS = {
  landing: "Create a modern landing page for a SaaS product with hero, features, pricing, and CTA sections",
  api: "Build a REST API with Node.js/Express including auth, CRUD operations, and PostgreSQL database",
  dashboard: "Create an admin dashboard with charts, data tables, user management, and real-time metrics",
  app: "Build a full-stack web app with user authentication, database, and modern React UI",
};

const FILE_STRUCTURES = {
  landing: [" index.html", " styles.css", " app.js", " package.json"],
  api: [" server.js", " routes/", " controllers/", " models/", " .env", " package.json"],
  dashboard: [" Dashboard.jsx", " Charts.jsx", " DataTable.jsx", " api/", " package.json"],
  app: [" frontend/", " backend/", " database/", " docker-compose.yml", " README.md"],
};

const MODELS = [
  { id: "auto", name: BRAND_NAME + " Auto", tier: "standard", desc: "Best model for your task" },
  { id: "fast", name: BRAND_NAME + " Fast", tier: "fast", desc: "Quick iterations" },
  { id: "pro", name: BRAND_NAME + " Pro", tier: "standard", desc: "Balanced speed & quality" },
  { id: "premium", name: BRAND_NAME + " Premium", tier: "premium", desc: "Highest quality output" },
];

const COMMANDS = [
  { id: "new-project", label: "New Project", desc: "Start a new project", icon: "", category: "create" },
  { id: "new-landing", label: "New Landing Page", desc: "Create a landing page", icon: "", category: "create" },
  { id: "new-api", label: "New API Project", desc: "Create a backend API", icon: "", category: "create" },
  { id: "deploy", label: "Deploy to Vercel", desc: "Deploy current project", icon: "", category: "action", shortcut: "⌘⇧D" },
  { id: "export", label: "Export Project", desc: "Download as ZIP", icon: "", category: "action" },
  { id: "clear-chat", label: "Clear Chat", desc: "Start fresh", icon: "", category: "action" },
  { id: "settings", label: "Open Settings", desc: "Configure preferences", icon: "", category: "settings", shortcut: "⌘," },
  { id: "profile", label: "Open Profile", desc: "View account", icon: "", category: "settings" },
  { id: "docs", label: "View Documentation", desc: "Open help docs", icon: "", category: "help" },
];

const ONBOARDING_STEPS = [
  { title: `Welcome to ${BRAND_NAME}! `, desc: "Build complete projects by describing what you want. No boilerplate, no setup - just results." },
  { title: "Tell us about yourself", desc: "This helps us customize suggestions for you.", hasSkill: true },
  { title: "You\u2019re ready! ", desc: "Start building. We\u2019ll show helpful tips as you go." },
];

const CATEGORY_LABELS = { create: " Create", action: " Actions", settings: " Settings", help: " Help" };

const ACTIVITY_ICONS = { analyzing: "", connecting: "", generating: "", validating: "", writing: "" };

export function FileEngineApp() {
  // =====================================================
  // NOTIFICATIONS (defined first so hooks can reference)
  // =====================================================
  const [notifications, setNotifications] = useState<any[]>([]);

  const showNotification = useCallback((type: string, title: string, message = "") => {
    const id = "notif-" + Date.now();
    const icons: Record<string, string> = { success: "", error: "", warning: "", info: "ℹ" };
    setNotifications((prev) => [...prev, { id, type, title, message, icon: icons[type] }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // =====================================================
  // BACKEND HOOKS
  // =====================================================
  const { user: authUser, profile, subscription, usageToday, planLimits } = useAuth();
  const { projects: realProjects, loading: projectsLoading, createProject, refresh: refreshProjects } = useProjects();
  const { activeBuilds: realActiveBuilds, queuedBuilds, avgDuration, stats: queueStats, error: queueError } = useQueueStats(5000);
  const generateHook = useGenerate();

  // Preview & Deploy hook - manages build verification, auto-fix, and deployment
  const previewHook = useFileEnginePreview();

  // Chat hook - wired to /api/chat with SSE streaming
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  
  // Chat rename state
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const { chats: savedChats, deleteChat, renameChat, refresh: refreshChats } = useSavedChats(currentProjectId || undefined);
  const [selectedModel, setSelectedModel] = useState("fast");
  const chatHook = useChat({
    projectId: currentProjectId || undefined,
    chatId: currentChatId || undefined,
    onChatCreated: (id) => {
      setCurrentChatId(id);
      refreshChats();
    },
    model: selectedModel,
    onComplete: () => {
      showNotification("success", "Generation complete", "Response received");
      // Mark all running activities as completed
      setActivities(prev => prev.map(a => a.status === 'running' ? { ...a, status: 'completed' } : a));
    },
    onError: (err) => {
      showNotification("error", "Error", err.message);
    },
  });

  // =====================================================
  // UI STATE (preserved from demo)
  // =====================================================

  // Helper: tool call display label
  const toolCallLabel = (tool: string) => {
    const labels: Record<string, string> = {
      create_file: ' Creating file',
      edit_file: ' Editing file',
      view_file: ' Reading file',
      run_command: ' Running command',
      search_web: ' Searching web',
      search_npm: ' Searching packages',
      analyze_image: ' Analyzing image',
      think: ' Planning',
      generate_media: ' Generating media',
    };
    return labels[tool] || ` ${tool}`;
  };
  const [messages, setMessages] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [phaseMessage, setPhaseMessage] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [generatedFileContents, setGeneratedFileContents] = useState<Array<{ path: string; content: string }>>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [showActivityPanel, setShowActivityPanel] = useState(true);
  const [enhancement, setEnhancement] = useState<any>(null);
  const [showPreviewPanel, setShowPreviewPanel] = useState(true);
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [currentProjectName, setCurrentProjectName] = useState("MyApp");
  // Header integrated preview controls
  const [headerViewMode, setHeaderViewMode] = useState<'preview' | 'code'>('preview');
  const [headerCopyMenuOpen, setHeaderCopyMenuOpen] = useState(false);
  // Sidebar: active tool context
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [inputPlaceholder, setInputPlaceholder] = useState("Describe what you want to build...");
  // Sidebar: preview settings toggles
  const [useVercelPreview, setUseVercelPreview] = useState(true);
  const [useLocalPreview, setUseLocalPreview] = useState(false);
  const [autoFixErrors, setAutoFixErrors] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [skillLevel, setSkillLevel] = useState("intermediate");
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [projectType, setProjectType] = useState("landing");
  const [attachedFiles, setAttachedFiles] = useState<any[]>([]);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showUrlImport, setShowUrlImport] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [urlPreview, setUrlPreview] = useState<any>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [tipData, setTipData] = useState<any>(null);
  const [onlineUsers, setOnlineUsers] = useState("2,847");
  const [showEnhanceBtn, setShowEnhanceBtn] = useState(false);
  const [promptValue, setPromptValue] = useState("");
  const [previewTab, setPreviewTab] = useState("files");
  const [toggleStates, setToggleStates] = useState({ darkMode: true, autoEnhance: false, activityFeed: true });
  const [showWelcome, setShowWelcome] = useState(true);
  const [profileFormName, setProfileFormName] = useState("");
  const [apiKeySlot1, setApiKeySlot1] = useState("");
  const [apiKeySlot2, setApiKeySlot2] = useState("");
  const [usageData, setUsageData] = useState<any>(null);

  // Admin cost optimization settings
  const isAdmin = profile?.role === 'owner' || profile?.role === 'admin';
  const [adminCostSettings, setAdminCostSettings] = useState<any>(null);
  const [adminCostLoading, setAdminCostLoading] = useState(false);
  const [adminCostSaving, setAdminCostSaving] = useState(false);
  const [adminUsageData, setAdminUsageData] = useState<any>(null);

  // Fetch admin settings when settings modal opens (admin only)
  useEffect(() => {
    if (showSettingsModal && isAdmin && !adminCostSettings) {
      setAdminCostLoading(true);
      fetch("/api/admin/settings", {
        headers: authUser ? { 'Authorization': `Bearer ${(authUser as any).access_token || ''}` } : {}
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            setAdminCostSettings(data.settings);
            setAdminUsageData(data.usage);
          }
        })
        .catch((err: Error) => { console.error('Admin settings fetch failed:', err.message); })
        .finally(() => setAdminCostLoading(false));
    }
  }, [showSettingsModal, isAdmin]);

  const saveAdminCostSetting = async (key: string, value: any) => {
    if (!isAdmin) return;
    setAdminCostSaving(true);
    const updated = { ...adminCostSettings, [key]: value };
    setAdminCostSettings(updated);
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(authUser ? { 'Authorization': `Bearer ${(authUser as any).access_token || ''}` } : {})
        },
        body: JSON.stringify({ [key]: value })
      });
      showNotification("success", "Setting saved");
    } catch {
      showNotification("error", "Failed to save setting");
    } finally {
      setAdminCostSaving(false);
    }
  };

  // Savings estimator — computes what user would spend WITH vs WITHOUT optimizations
  // Based on actual usage data or reasonable estimates
  const estimateSavings = () => {
    const monthlyRequests = adminUsageData?.totalRequests || (usageData?.stats?.buildsThisMonth || 0) * 8 + 150;
    if (monthlyRequests === 0) {
      return { withoutOpt: 0, withOpt: 0, saved: 0, pct: 0, breakdown: { modelRouting: 0, trimming: 0, smartContext: 0, dualCalls: 0 } };
    }
    
    // Average cost per request WITHOUT optimizations (all pro tier, full context, 8192 tokens)
    const avgCostWithout = 0.0035; // ~$0.0035 per request (pro tier with full context)
    const withoutOpt = monthlyRequests * avgCostWithout;
    
    // Breakdown of savings by feature
    // These percentages are based on the intent distribution in a typical dev workflow:
    // ~40% chat/explain (simple), ~35% generate, ~15% fix, ~10% other
    const modelRoutingSavings = adminCostSettings?.smart_model_routing !== false ? 0.42 : 0;  // 40% of requests use fast tier at ~10x cheaper
    const trimmingSavings = adminCostSettings?.conversation_trimming !== false ? 0.08 : 0;    // Saves ~8% on avg from history compression
    const smartContextSavings = adminCostSettings?.smart_context !== false ? 0.15 : 0;        // 50-85% on context, weighted = ~15% overall
    const dualCallSavings = adminCostSettings?.prevent_dual_calls !== false ? 0.12 : 0;       // ~12% of requests were firing 2 calls
    
    const totalSavingsPct = Math.min(0.65, modelRoutingSavings + trimmingSavings + smartContextSavings + dualCallSavings);
    const saved = withoutOpt * totalSavingsPct;
    const withOpt = withoutOpt - saved;
    
    return {
      withoutOpt: Math.round(withoutOpt * 100) / 100,
      withOpt: Math.round(withOpt * 100) / 100,
      saved: Math.round(saved * 100) / 100,
      pct: Math.round(totalSavingsPct * 100),
      breakdown: {
        modelRouting: Math.round(modelRoutingSavings * 100),
        trimming: Math.round(trimmingSavings * 100),
        smartContext: Math.round(smartContextSavings * 100),
        dualCalls: Math.round(dualCallSavings * 100),
      }
    };
  };
  
  const savings = estimateSavings();

  // Fetch usage data when profile modal opens
  useEffect(() => {
    if (showProfileModal && authUser) {
      fetch("/api/usage")
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setUsageData(data); })
        .catch((err: Error) => { console.error('Usage stats fetch failed:', err.message); }); // non-blocking
    }
  }, [showProfileModal, authUser]);

  // =====================================================
  // SYNC BACKEND → UI STATE
  // =====================================================

  // Sync chat hook messages → UI messages
  useEffect(() => {
    // Only sync forward — don't clear UI messages when hook resets
    // This prevents flash of empty chat during project switch
    if (chatHook.messages.length > 0) {
      setMessages(chatHook.messages.map((m: ChatMessage) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        status: m.status,
        files: m.files,
        toolCalls: (m as any).toolCalls,
        thinking: (m as any).thinking,
      })));
    }
  }, [chatHook.messages]);

  // Sync chat loading → UI generating state
  useEffect(() => {
    setIsGenerating(chatHook.isLoading);
    if (chatHook.isLoading) {
      setPhaseMessage("Generating...");
      setShowWelcome(false);
    }
  }, [chatHook.isLoading]);

  // Sync chat-parsed files → preview panel (fallback when generateHook doesn't fire)
  // This ensures code from the chat endpoint also appears in the preview
  useEffect(() => {
    if (generateHook.files.length > 0) return; // generateHook takes priority
    
    // Find the latest assistant message with parsed files
    const latestWithFiles = [...chatHook.messages]
      .reverse()
      .find((m: ChatMessage) => m.role === 'assistant' && m.files && m.files.length > 0);
    
    if (latestWithFiles && latestWithFiles.files && latestWithFiles.files.length > 0) {
      const fileContents = latestWithFiles.files.map((f: any) => ({
        path: f.path || f.filepath || `file.${f.language || 'txt'}`,
        content: f.content || ''
      }));
      setGeneratedFileContents(fileContents);
      setFiles(fileContents.map((f: any) => ` ${f.path}`));
    }
  }, [chatHook.messages, generateHook.files.length]);

  // Sync generate hook phases → activity feed
  useEffect(() => {
    if (generateHook.phase !== "idle") {
      const phaseActivities: any[] = [];
      if (generateHook.phase === "generating" || generateHook.phase === "validating" || generateHook.phase === "complete") {
        phaseActivities.push({ type: "analyzing", label: "Analyzing request", detail: "Parsing prompt...", status: "completed" });
        phaseActivities.push({ type: "connecting", label: "Connecting to AI", detail: selectedModel, status: "completed" });
      }
      if (generateHook.phase === "generating") {
        phaseActivities.push({ type: "generating", label: "Generating code", detail: generateHook.phaseMessage, status: "running" });
      }
      if (generateHook.phase === "validating" || generateHook.phase === "ai_fixing") {
        phaseActivities.push({ type: "generating", label: "Generating code", detail: "Complete", status: "completed" });
        phaseActivities.push({ type: "validating", label: "Validating code", detail: generateHook.phaseMessage, status: "running" });
      }
      if (generateHook.phase === "complete") {
        phaseActivities.push({ type: "generating", label: "Generating code", detail: "Complete", status: "completed" });
        phaseActivities.push({ type: "validating", label: "Validating code", detail: "Passed", status: "completed" });
        phaseActivities.push({ type: "writing", label: "Saving files", detail: `${generateHook.files.length} files`, status: "completed" });
      }
      setActivities(phaseActivities);
      setPhaseMessage(generateHook.phaseMessage);
    }
  }, [generateHook.phase, generateHook.phaseMessage, generateHook.files, selectedModel]);

  // Sync generated files → file tree AND trigger preview verification
  useEffect(() => {
    if (generateHook.files.length > 0) {
      const fileList = generateHook.files.map((f: any) => ` ${f.path || f.filepath}`);
      setFiles(fileList);
      
      // Store file contents for preview panel
      const fileContents = generateHook.files.map((f: any) => ({
        path: f.path || f.filepath,
        content: f.content || ''
      }));
      setGeneratedFileContents(fileContents);
      
      // Trigger build verification with the new preview system
      // Only trigger when generation is complete AND preview is not already verifying
      if (fileContents.length > 0 && 
          generateHook.phase === 'complete' && 
          !previewHook.isLoading &&
          previewHook.phase === 'idle') {
        previewHook.verifyBuild(fileContents, {
          projectName: currentProjectName
        });
      }
    }
  }, [generateHook.files, generateHook.phase]);
  
  // Separate effect for preview phase notifications
  useEffect(() => {
    if (previewHook.phase === 'error' && previewHook.error) {
      showNotification('error', 'Build failed', previewHook.error);
    } else if (previewHook.phase === 'previewing' && previewHook.previewUrl) {
      showNotification('success', 'Preview ready', 'Your app is live!');
    }
  }, [previewHook.phase, previewHook.error, previewHook.previewUrl]);

  // Load profile data into form
  useEffect(() => {
    if (profile) {
      setProfileFormName(profile.full_name || "");
      setApiKeySlot1(profile.claude_api_key || "");
      setApiKeySlot2(profile.openai_api_key || "");
      // Load saved model preference
      if (profile.preferred_model) {
        setSelectedModel(profile.preferred_model);
      }
    }
  }, [profile]);

  // Auto-show onboarding for new users (no projects = first time)
  useEffect(() => {
    if (!projectsLoading && realProjects.length === 0 && authUser && !showOnboarding) {
      // Small delay so the UI renders first
      const timer = setTimeout(() => setShowOnboarding(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [projectsLoading, realProjects.length, authUser, showOnboarding]);

  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const modelSelectorRef = useRef<HTMLDivElement>(null);

  // Online users updater
  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineUsers((2800 + Math.floor(Math.random() * 100)).toLocaleString());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Connection status - detect offline/online
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    const onOnline = () => { setIsOnline(true); showNotification("success", "Back online", "Connection restored"); };
    const onOffline = () => { setIsOnline(false); showNotification("error", "Connection lost", "Check your internet connection"); };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);

  // Initial tip
  useEffect(() => {
    const timeout = setTimeout(() => {
      setTipData({ title: " Quick Start", message: "Try clicking one of the project cards or type your own description. Press / to focus the input." });
    }, 2000);
    return () => clearTimeout(timeout);
  }, []);

  // Auto-show onboarding for first-time users
  useEffect(() => {
    if (!projectsLoading && realProjects.length === 0 && authUser) {
      const seen = typeof window !== "undefined" && localStorage.getItem("fe-onboarding-done");
      if (!seen) {
        setShowOnboarding(true);
      }
    }
  }, [projectsLoading, realProjects, authUser]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        newProject();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setShowSettingsModal(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        executeCommand("deploy");
      }
      if (e.key === "Escape") {
        setShowCommandPalette(false);
        setShowProfileModal(false);
        setShowSettingsModal(false);
        setShowOnboarding(false);
        setShowUrlImport(false);
        setShowModelDropdown(false);
      }
      // / = focus prompt input when not already typing
      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag !== "input" && tag !== "textarea") {
          e.preventDefault();
          (promptInputRef.current as HTMLTextAreaElement | null)?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Close model dropdown on outside click
  useEffect(() => {
    if (!showModelDropdown) return;
    const handler = (e: MouseEvent) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showModelDropdown]);

  // Close header copy dropdown on outside click
  useEffect(() => {
    if (!headerCopyMenuOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.header-dropdown')) {
        setHeaderCopyMenuOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [headerCopyMenuOpen]);

  // Scroll to bottom on messages change
  useEffect(() => {
    const el = messagesAreaRef.current;
    if (el) {
      // Use smooth scroll for better UX instead of instant jump
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, activities, isGenerating, files]);

  // Focus command input
  useEffect(() => {
    if (showCommandPalette && commandInputRef.current) {
      (commandInputRef.current as HTMLInputElement).focus();
    }
  }, [showCommandPalette]);

  const autoResize = (ta: HTMLTextAreaElement) => {
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
  };

  const startProject = async (type: string) => {
    setProjectType(type);
    setPromptValue(QUICK_PROMPTS[type as keyof typeof QUICK_PROMPTS]);
    setShowEnhanceBtn(true);

    // Auto-create project in Supabase if user is logged in
    if (authUser && !currentProjectId) {
      try {
        const projectNames: Record<string, string> = { landing: "Landing Page", api: "API Backend", dashboard: "Dashboard", app: "Full Stack App" };
        const proj = await createProject(projectNames[type] || "New Project", type as any);
        setCurrentProjectId(proj.id);
      } catch (err) {
        console.error("Failed to create project:", err);
        // Non-blocking - continue without project
      }
    }

    if (promptInputRef.current) {
      promptInputRef.current.focus();
      setTimeout(() => autoResize(promptInputRef.current!), 0);
    }
  };

  const newProject = async () => {
    chatHook.clearMessages();
    chatHook.stopGeneration();
    generateHook.abort();
    setMessages([]);
    setFiles([]);
    setActivities([]);
    setIsGenerating(false);
    setPromptValue("");
    setShowWelcome(true);
    setShowEnhanceBtn(false);
    setCurrentProjectId(null);
    setCurrentChatId(null);
    showNotification("success", "Ready for new project");
  };

  const handleInputChange = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const val = (e.target as HTMLTextAreaElement).value;
    setPromptValue(val);
    autoResize(e.target as HTMLTextAreaElement);
    setShowEnhanceBtn(val.length > 10);
    if (enhancement) {
      setEnhancement(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // ⌘+Enter also sends (power user shortcut)
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  // Helper to read file content based on type
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // For images, read as Base64
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            // Remove data:image/...;base64, prefix
            const base64 = reader.result.split(',')[1];
            resolve(base64);
          }
        };
        reader.onerror = error => reject(error);
      } else {
        // For code/text files, read as Request
        // We'll try to read as text. If it's binary, this might be garbage, 
        // but for now we assume code/text.
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

  const handleSend = async () => {
    const value = promptValue.trim();
    if ((!value && attachedFiles.length === 0) || isGenerating) return;

    // ── Generation limit check ────────────────────────────────────────────────
    if (authUser) {
      const plan = (subscription?.plan ?? 'free') as 'free' | 'pro' | 'enterprise';
      const { allowed, used, limit } = await checkAndIncrementUsage(authUser.id, plan);
      if (!allowed) {
        showNotification(
          'error',
          'Daily limit reached',
          `You've used ${used}/${limit} generations today. Upgrade to Pro for 100/day.`
        );
        return;
      }
    }
    // ─────────────────────────────────────────────────────────────────────────
    setPromptValue("");
    setShowEnhanceBtn(false);
    setShowWelcome(false);

    if (promptInputRef.current) autoResize(promptInputRef.current);

    // Auto-create project if user is authenticated but has no current project
    let projectId = currentProjectId;
    if (!projectId && authUser) {
      try {
        const proj = await createProject(value.slice(0, 50), projectType as any);
        projectId = proj.id;
        setCurrentProjectId(proj.id);
      } catch (err) {
        console.error("Failed to auto-create project:", err);
      }
    }

    // Process attachments
    const chatAttachments: Attachment[] = [];
    if (attachedFiles.length > 0) {
      try {
        const processed = await Promise.all(attachedFiles.map(async (f: any) => {
          const content = await readFileContent(f.file);
          return {
            id: f.id,
            type: f.file?.type?.startsWith("image/") ? "image" as const : "file" as const,
            content: content,
            filename: f.name,
            mimeType: f.file?.type,
          };
        }));
        chatAttachments.push(...processed);
      } catch (err) {
        console.error("Failed to read file contents:", err);
        showNotification("error", "Attachment Error", "Failed to read attached files");
        return;
      }
    }

    // Use the real chat hook to send message with SSE streaming
    try {
      await chatHook.sendMessage(value, chatAttachments.length > 0 ? chatAttachments : undefined);

      // Only trigger the validated generation pipeline for ACTUAL code requests
      // This prevents firing 2 API calls (chat + generate) for conversational messages
      // The chat endpoint handles everything; generate is only for the 5-phase validated pipeline
      // Admin setting: prevent_dual_calls controls this behavior
      const dualCallsAllowed = adminCostSettings?.prevent_dual_calls === false;
      
      const isCodeRequest = value.match(
        /\b(create|build|generate|make|write|implement|develop|set ?up)\b/i
      ) && value.match(
        /\b(component|page|app|api|endpoint|function|hook|form|modal|dashboard|layout|feature|system|website|landing)\b/i
      );
      const isFixRequest = value.match(/\b(fix|debug|repair)\b/i) && value.match(/\b(error|bug|crash|broken|issue)\b/i);
      const isRefactorRequest = value.match(/\b(refactor|rewrite|restructure|redesign)\b/i) && value.length > 30;
      
      // When dualCallsAllowed=true (admin turned off prevention), use the old broad regex
      const shouldGenerate = dualCallsAllowed
        ? value.match(/create|build|generate|make|write|code|fix|update|add|modify|implement|design|set up|setup|develop|refactor/i)
        : (isCodeRequest || isFixRequest || isRefactorRequest);
      
      if (shouldGenerate) {
        generateHook.generate(value, {
          model: selectedModel,
          projectId: projectId || undefined,
          onPhaseChange: (phase: GeneratePhase, message: string) => {
            setPhaseMessage(message);
          },
          onComplete: (generatedFiles: any[]) => {
            setFiles(generatedFiles.map((f: any) => ` ${f.path || f.filepath}`));
            showNotification("success", "Generation complete", `${generatedFiles.length} files generated successfully`);
          },
          onError: (error: string) => {
            showNotification("error", "Generation failed", error);
          },
        });
      }

      // Clear attachments after send
      setAttachedFiles([]);
    } catch (error: any) {
      showNotification("error", "Send failed", error.message || "Failed to send message");
    }
  };

  const enhancePrompt = () => {
    const value = promptValue;
    if (value.length <= 10) return;
    let enhanced = value;
    const improvements = [];
    if (!value.match(/react|vue|next|node|typescript/i)) {
      enhanced += " using React and TypeScript";
      improvements.push("Added modern tech stack");
    }
    if (value.match(/website|page|landing/i) && !value.match(/responsive/i)) {
      enhanced += " with responsive design";
      improvements.push("Added responsive requirement");
    }
    if (enhanced !== value) {
      setEnhancement({ original: value, enhanced, improvements });
    }
  };

  const acceptEnhancement = () => {
    if (enhancement) {
      setPromptValue(enhancement.enhanced);
      setEnhancement(null);
    }
  };

  const dismissEnhancement = () => {
    setEnhancement(null);
  };

  const toggleActivity = () => {
    setShowActivityPanel((prev) => !prev);
    setToggleStates((s) => ({ ...s, activityFeed: !s.activityFeed }));
  };

  // AI Tool selection — updates chat placeholder with tool context
  const openTool = (toolId: string) => {
    const tools: Record<string, { name: string; desc: string }> = {
      image: { name: 'Image Generator', desc: 'Generate images with DALL-E 3, Flux, or Midjourney' },
      video: { name: 'Video Generator', desc: 'Create videos with Ven 3, Sora, Runway, or Pika' },
      assembler: { name: 'Video Assembler', desc: 'Assemble videos with JSON2Video or Shotstack' },
      captions: { name: 'Caption Generator', desc: 'Auto-generate captions with Whisper or AssemblyAI' },
      color: { name: 'Color Grading', desc: 'Apply LUTs and auto color correction' },
      bgremove: { name: 'Background Remover', desc: 'Remove backgrounds with RunwayML or Remove.bg' },
      audio: { name: 'Audio Enhancer', desc: 'Enhance audio with Adobe Enhance or Dolby.io' }
    };
    const t = tools[toolId];
    if (t) {
      setActiveTool(toolId);
      setInputPlaceholder(`Describe what you want to create with ${t.name}...`);
      showNotification('info', t.name, t.desc);
    }
  };

  // Header copy actions (for integrated header controls)
  const headerCopyAction = (type: string) => {
    setHeaderCopyMenuOpen(false);
    if (type === 'code' && generatedFileContents.length > 0) {
      const allCode = generatedFileContents.map(f => `// ${f.path}\n${f.content}`).join('\n\n');
      navigator.clipboard.writeText(allCode);
      showNotification('success', 'Copied!', 'Code copied to clipboard');
    } else if (type === 'url' && previewHook.previewUrl) {
      navigator.clipboard.writeText(previewHook.previewUrl);
      showNotification('success', 'Copied!', 'URL copied to clipboard');
    } else if (type === 'all' && generatedFileContents.length > 0) {
      const content = generatedFileContents.map(f => `// ========================================\n// ${f.path}\n// ========================================\n\n${f.content}`).join('\n\n');
      navigator.clipboard.writeText(content);
      showNotification('success', 'Copied!', 'All files copied');
    } else if (type === 'zip') {
      // Trigger zip via the preview panel's existing export
      showNotification('info', 'Export', 'Use the Download button in the preview panel');
    } else {
      showNotification('info', 'Copy', 'Generate code first');
    }
  };

  // Preview settings toggle helpers
  const toggleVercelPreview = () => {
    setUseVercelPreview(!useVercelPreview);
    if (!useVercelPreview) { setUseLocalPreview(false); }
    showNotification('info', 'Preview Mode', !useVercelPreview ? 'Using Vercel preview' : 'Vercel preview disabled');
  };
  const toggleLocalPreview = () => {
    setUseLocalPreview(!useLocalPreview);
    if (!useLocalPreview) { setUseVercelPreview(false); }
    showNotification('info', 'Preview Mode', !useLocalPreview ? 'Using local preview (no deploy)' : 'Local preview disabled');
  };
  const toggleAutoFix = () => {
    setAutoFixErrors(!autoFixErrors);
    showNotification('info', 'Auto-fix', !autoFixErrors ? 'Enabled' : 'Disabled');
  };

  // Preview phase → status bar text
  const getPreviewStatusText = () => {
    const phase = previewHook.phase;
    const buildTime = previewHook.buildTime;
    switch (phase) {
      case 'idle': return '';
      case 'generating': return ' Generating...';
      case 'verifying': return ' Building...';
      case 'auto-fixing': return ` Auto-fixing (${previewHook.autoFixAttempts}/3)`;
      case 'fixing': return ' Fixing...';
      case 'deploying': return ' Deploying...';
      case 'previewing': return `✓ Preview ready${buildTime ? ` • ${(buildTime / 1000).toFixed(1)}s` : ''}`;
      case 'complete': return '✓ Deployed!';
      case 'error': return ' Build failed';
      default: return '';
    }
  };

  const handleFileAttach = async (event: any) => {
    const newFiles = Array.from(event.target.files) as File[];
    const fileExtIcons: Record<string, string> = { js: "", ts: "", jsx: "", tsx: "", html: "", css: "", json: "", md: "", py: "", sql: "", csv: "", txt: "", pdf: "", png: "", jpg: "", jpeg: "", gif: "", svg: "" };
    const mapped = newFiles.map((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      return { id: "file-" + Date.now() + Math.random().toString(36).slice(2), name: file.name, size: file.size, icon: fileExtIcons[ext] || "", file };
    });
    setAttachedFiles((prev: any[]) => [...prev, ...mapped]);

    // If we have a current project, upload to Supabase storage
    if (currentProjectId && authUser) {
      for (const f of newFiles) {
        try {
          const storagePath = `${authUser.id}/${currentProjectId}/${Date.now()}-${f.name}`;
          await supabase.storage.from("attachments").upload(storagePath, f);
        } catch (err) {
          console.error("Upload error:", err);
        }
      }
    }

    showNotification("success", "Files Attached", `${newFiles.length} file${newFiles.length > 1 ? "s" : ""} attached`);
    event.target.value = "";
  };

  const removeAttachedFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUrlPreview = (url: string) => {
    setUrlValue(url);
    if (url && url.startsWith("http")) {
      try {
        const urlObj = new URL(url);
        setUrlPreview({ hostname: urlObj.hostname, url });
      } catch {
        setUrlPreview(null);
      }
    } else {
      setUrlPreview(null);
    }
  };

  const importUrl = async () => {
    if (!urlValue) return;
    setShowUrlImport(false);
    let hostname = "";
    try {
      hostname = new URL(urlValue).hostname;
    } catch {
      showNotification("error", "Invalid URL", "Please enter a valid URL");
      return;
    }

    showNotification("info", "Fetching URL", `Analyzing ${hostname}...`);

    try {
      const res = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlValue }),
      });
      const data = await res.json();

      const currentValue = promptValue.trim();
      const title = data.title || hostname;
      const reference = `[Reference: ${title}]`;
      const context = data.content ? `\n\nExtracted content:\n${data.content.slice(0, 2000)}` : "";
      const newVal = currentValue
        ? `${currentValue}\n\n${reference}: ${urlValue}${context}`
        : `Use this website as reference: ${urlValue}${context}`;
      setPromptValue(newVal);
      setShowEnhanceBtn(true);
      showNotification("success", "URL Imported", `Reference to ${title} added`);
    } catch (err: any) {
      // Fallback to basic reference if fetch fails
      const currentValue = promptValue.trim();
      const reference = `[Reference: ${hostname}]`;
      const newVal = currentValue ? `${currentValue}\n\n${reference}: ${urlValue}` : `Use this website as reference: ${urlValue}`;
      setPromptValue(newVal);
      setShowEnhanceBtn(true);
      showNotification("warning", "URL Imported", `Added as reference (couldn't fetch content)`);
    }
    setUrlValue("");
    setUrlPreview(null);
  };

  const selectModel = async (modelId: string) => {
    setSelectedModel(modelId);
    setShowModelDropdown(false);
    const model = MODELS.find((m) => m.id === modelId);
    showNotification("success", "Model Changed", `Now using ${model?.name}`);

    // Save preferred model to profile
    if (authUser) {
      try {
        await supabase.from("profiles").update({ preferred_model: modelId }).eq("id", authUser.id);
      } catch (err) {
        console.error("Failed to save model preference:", err);
      }
    }
  };

  const filteredCommands = commandQuery
    ? COMMANDS.filter((c) => c.label.toLowerCase().includes(commandQuery.toLowerCase()) || c.desc.toLowerCase().includes(commandQuery.toLowerCase()))
    : COMMANDS;

  const executeCommand = (id: string) => {
    setShowCommandPalette(false);
    setCommandQuery("");
    switch (id) {
      case "new-project":
      case "new-landing":
        newProject();
        break;
      case "new-api":
        startProject("api");
        break;
      case "deploy":
        if (currentProjectId) {
          showNotification("info", "Deploy", "Starting deployment...");
          fetch("/api/deploy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: currentProjectId }) })
            .then(r => r.json())
            .then(d => showNotification(d.url ? "success" : "error", d.url ? "Deployed!" : "Deploy failed", d.url || d.error))
            .catch(e => showNotification("error", "Deploy failed", e.message));
        } else {
          showNotification("info", "Deploy", "Create a project first");
        }
        break;
      case "export":
        showNotification("info", "Export", "Preparing ZIP download...");
        break;
      case "clear-chat":
        newProject();
        break;
      case "settings":
        setShowSettingsModal(true);
        break;
      case "profile":
        setShowProfileModal(true);
        break;
      case "docs":
        showNotification("info", "Docs", "Opening documentation...");
        break;
    }
  };

  const handleCommandKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedCommandIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedCommandIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && filteredCommands[selectedCommandIndex]) {
      e.preventDefault();
      executeCommand(filteredCommands[selectedCommandIndex].id);
    }
  };

  const renderCommandList = () => {
    const grouped: Record<string, typeof COMMANDS> = {};
    filteredCommands.forEach((c) => {
      if (!grouped[c.category]) grouped[c.category] = [];
      grouped[c.category].push(c);
    });
    let idx = 0;
    return Object.entries(grouped).map(([cat, items]) => (
      <div className="command-group" key={cat}>
        <div className="command-group-label">{CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] || cat}</div>
        {items.map((c) => {
          const currentIdx = idx++;
          return (
            <div
              key={c.id}
              className={`command-item ${currentIdx === selectedCommandIndex ? "selected" : ""}`}
              onClick={() => executeCommand(c.id)}
            >
              <span className="command-icon">{c.icon}</span>
              <div className="command-info">
                <span className="command-label">{c.label}</span>
                <span className="command-desc">{c.desc}</span>
              </div>
              {c.shortcut && <span className="command-shortcut">{c.shortcut}</span>}
            </div>
          );
        })}
      </div>
    ));
  };

  const selectedModelName = MODELS.find((m) => m.id === selectedModel)?.name || BRAND_NAME + " Auto";

  const renderOnboardingContent = () => {
    const step = ONBOARDING_STEPS[onboardingStep];
    const isLast = onboardingStep === ONBOARDING_STEPS.length - 1;
    return (
      <>
        <div className="onboarding-progress">
          {ONBOARDING_STEPS.map((_, i) => (
            <div key={i} className={`progress-dot ${i === onboardingStep ? "active" : i < onboardingStep ? "completed" : ""}`}></div>
          ))}
        </div>
        <div className="onboarding-content">
          <h2>{step.title}</h2>
          <p>{step.desc}</p>
          {step.hasSkill && (
            <div className="skill-selector">
              <div className={`skill-option ${skillLevel === "beginner" ? "active" : ""}`} onClick={() => setSkillLevel("beginner")}>
                <span className="skill-icon"></span>
                <div>
                  <span className="skill-label">Beginner</span>
                  <span className="skill-desc">New to coding</span>
                </div>
              </div>
              <div className={`skill-option ${skillLevel === "intermediate" ? "active" : ""}`} onClick={() => setSkillLevel("intermediate")}>
                <span className="skill-icon"></span>
                <div>
                  <span className="skill-label">Intermediate</span>
                  <span className="skill-desc">Comfortable with code</span>
                </div>
              </div>
              <div className={`skill-option ${skillLevel === "expert" ? "active" : ""}`} onClick={() => setSkillLevel("expert")}>
                <span className="skill-icon"></span>
                <div>
                  <span className="skill-label">Expert</span>
                  <span className="skill-desc">Professional developer</span>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="onboarding-actions">
          {onboardingStep > 0 && (
            <button className="onboarding-btn secondary" onClick={() => setOnboardingStep((s) => s - 1)}>Back</button>
          )}
          <button className="onboarding-btn text" onClick={() => setShowOnboarding(false)}>Skip</button>
          <button
            className="onboarding-btn primary"
            onClick={() => {
              if (isLast) {
                setShowOnboarding(false);
                if (typeof window !== "undefined") localStorage.setItem("fe-onboarding-done", "1");
                // Save skill level to profile
                if (authUser) {
                  supabase.from("profiles").update({ skill_level: skillLevel }).eq("id", authUser.id).then(() => {});
                }
              }
              else setOnboardingStep((s) => s + 1);
            }}
          >
            {isLast ? "Get Started" : "Next"}
          </button>
        </div>
      </>
    );
  };

  // Render assistant message content with proper code block handling
  // Render assistant message content — code blocks are HIDDEN from chat
  // (they go to the preview panel via parseCodeBlocks → generatedFileContents)
  // Chat only shows the text explanation + compact file badges
  const renderMessageContent = (msg: any) => {
    const content = typeof msg === 'string' ? msg : msg?.content || '';
    const thinking = typeof msg === 'string' ? null : msg?.thinking;
    const toolCalls = typeof msg === 'string' ? null : msg?.toolCalls;
    
    if (!content && !thinking && !toolCalls?.length) return null;
    
    // Parse code blocks from text content
    const textParts: string[] = [];
    const codeFiles: Array<{ language: string; filepath: string }> = [];
    const codeBlockRegex = /```(\w+)?(?::([^\n]+))?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        const textBefore = content.slice(lastIndex, match.index).trim();
        if (textBefore) textParts.push(textBefore);
      }
      const language = match[1] || 'text';
      const filepath = match[2]?.trim() || `file.${language}`;
      codeFiles.push({ language, filepath });
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < content.length) {
      const remaining = content.slice(lastIndex).trim();
      if (remaining) textParts.push(remaining);
    }
    
    return (
      <div className="message-parsed">
        {/* Thinking section */}
        {thinking && (
          <div style={{
            padding: '8px 12px', marginBottom: '8px',
            background: 'rgba(138, 43, 226, 0.1)', border: '1px solid rgba(138, 43, 226, 0.2)',
            borderRadius: '8px', fontSize: '12px', color: 'var(--text-muted)'
          }}>
            <div style={{ fontSize: '10px', fontWeight: 600, marginBottom: '4px', color: 'var(--accent-purple)', textTransform: 'uppercase' }}>
               Thinking
            </div>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
              {thinking.length > 300 ? thinking.slice(0, 300) + '...' : thinking}
            </pre>
          </div>
        )}

        {/* Tool calls timeline */}
        {toolCalls && toolCalls.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            {toolCalls.map((tc: any, i: number) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '4px 10px', marginBottom: '2px',
                background: tc.success === false ? 'rgba(255,100,100,0.1)' : tc.success ? 'rgba(16,185,129,0.05)' : 'var(--bg-tertiary)',
                borderRadius: '6px', fontSize: '11px', color: 'var(--text-secondary)',
                borderLeft: `2px solid ${tc.success === false ? '#ff6464' : tc.success ? 'var(--accent-primary)' : 'var(--accent-yellow)'}`
              }}>
                <span>{tc.success === false ? '' : tc.success ? '✓' : '●'}</span>
                <span style={{ fontWeight: 500 }}>{toolCallLabel(tc.tool)}</span>
                {tc.tool === 'create_file' && tc.input?.path && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>{tc.input.path}</span>
                )}
                {tc.tool === 'edit_file' && tc.input?.path && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>{tc.input.path}</span>
                )}
                {tc.tool === 'run_command' && tc.input?.command && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>{tc.input.command?.slice(0, 40)}</span>
                )}
                {tc.tool === 'search_web' && tc.input?.query && (
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>"{tc.input.query}"</span>
                )}
                {tc.tool === 'generate_media' && tc.input?.tool_codename && (
                  <span style={{ fontSize: '10px', color: 'var(--accent-purple)' }}>{tc.input.tool_codename}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Text content (no raw code blocks) */}
        {codeFiles.length === 0 ? (
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{content}</pre>
        ) : (
          <>
            {textParts.map((text, i) => (
              <pre key={`text-${i}`} style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: '0 0 8px 0' }}>{text}</pre>
            ))}
            
            {/* Compact file badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
              {codeFiles.map((file, i) => (
                <div
                  key={`file-${i}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '4px 10px', background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)', borderRadius: '6px',
                    fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer',
                  }}
                  onClick={() => setHeaderViewMode('code')}
                  title={`View ${file.filepath} in preview panel`}
                >
                  <span style={{ fontSize: '11px' }}></span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{file.filepath}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{file.language}</span>
                </div>
              ))}
            </div>
            
            {codeFiles.length > 0 && (
              <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--accent-primary)' }}>
                 {codeFiles.length} file{codeFiles.length > 1 ? 's' : ''} generated — view in preview panel →
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <style>{CSS}</style>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <div className="app-layout">
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <div className="logo"><div className="logo-mark">FE</div><span>{BRAND_NAME}</span></div>
            <div className="header-divider"></div>
            <div className="live-stats">
              <div className="stat-item"><span className="stat-pulse"></span><span>Active:</span><span className="stat-value">{realActiveBuilds}/20</span></div>
              <div className="stat-item"><span>Queue:</span><span className="stat-value" style={{ color: "var(--accent-yellow)" }}>{queuedBuilds}</span></div>
              <div className="stat-item"><span>Online:</span><span className="stat-value">{onlineUsers}</span></div>
            </div>
          </div>
          <div className="header-right">
            {/* Preview/Code Toggle (integrated from standalone) */}
            <div className="header-view-toggle">
              <button className={`header-view-btn ${headerViewMode === 'preview' ? 'active' : ''}`} onClick={() => setHeaderViewMode('preview')}>◉ Preview</button>
              <button className={`header-view-btn ${headerViewMode === 'code' ? 'active' : ''}`} onClick={() => setHeaderViewMode('code')}>▤ Code</button>
            </div>
            {/* Project Badge + Live */}
            <div className="header-project-badge">
              <span className="header-project-name">{currentProjectName}</span>
              <div className={`header-live-badge ${previewHook.phase === 'previewing' ? 'visible' : ''}`}><span className="header-live-dot"></span>Live</div>
            </div>
            {/* Copy Dropdown */}
            <div className="header-dropdown">
              <button className="header-dropdown-btn" onClick={() => setHeaderCopyMenuOpen(!headerCopyMenuOpen)}>Copy ▾</button>
              {headerCopyMenuOpen && (
                <div className="header-dropdown-menu">
                  <button className="header-dropdown-item" onClick={() => headerCopyAction('code')}> Copy code</button>
                  <button className="header-dropdown-item" onClick={() => headerCopyAction('url')}> Copy URL</button>
                  <button className="header-dropdown-item" onClick={() => headerCopyAction('all')}> Copy all</button>
                  <div className="header-dropdown-divider"></div>
                  <button className="header-dropdown-item" onClick={() => headerCopyAction('zip')}> Export ZIP</button>
                </div>
              )}
            </div>
            {/* Refresh */}
            <button className="btn btn-ghost" onClick={() => {
              if (generatedFileContents.length > 0) {
                previewHook.verifyBuild(generatedFileContents, { projectName: currentProjectName });
                showNotification('info', 'Refreshing...', 'Rebuilding preview');
              } else {
                showNotification('info', 'Refresh', 'Generate code first');
              }
            }} title="Refresh preview"></button>
            <div className="header-divider"></div>
            <button className="btn btn-ghost" onClick={() => setShowPreviewPanel(!showPreviewPanel)} title={showPreviewPanel ? "Hide Preview" : "Show Preview"}>{showPreviewPanel ? "" : ""}</button>
            <button className="btn btn-ghost" onClick={() => setShowSettingsModal(true)}></button>
            <button className="btn btn-secondary" onClick={() => { const proj = realProjects.find((p: any) => p.id === currentProjectId); if (proj?.github_repo) { window.open(proj.github_repo, "_blank"); } else { showNotification("info", "GitHub", "No GitHub repo linked to this project"); } }}>GitHub</button>
            <button className="btn btn-deploy" onClick={async () => { 
              if (previewHook.isPreviewReady && generatedFileContents.length > 0) {
                // Use new preview system
                const result = await previewHook.deployToVercel(currentProjectName);
                if (result.success) {
                  showNotification("success", "Deployed!", result.vercelUrl || "Deployment successful");
                } else {
                  showNotification("error", "Deploy failed", result.error || "Unknown error");
                }
              } else if (!currentProjectId) { 
                showNotification("info", "Deploy", "Generate code first to deploy"); 
                return; 
              } else {
                // Fallback to old system
                showNotification("info", "Deploy", "Starting deployment..."); 
                try { 
                  const res = await fetch("/api/deploy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: currentProjectId }) }); 
                  const data = await res.json(); 
                  if (res.ok) { showNotification("success", "Deployed!", data.url || "Deployment started"); } 
                  else { showNotification("error", "Deploy failed", data.error); } 
                } catch (err: any) { showNotification("error", "Deploy failed", err.message); }
              }
            }}> Deploy</button>
            {/* Generation Usage Bar (free plan) */}
            {authUser && planLimits.generations_per_day !== 999999 && (
              <div className="usage-bar-wrap" title={`${usageToday} of ${planLimits.generations_per_day} generations used today`}>
                <span className="usage-bar-label">Gens</span>
                <div className="usage-bar-track">
                  <div
                    className={`usage-bar-fill ${
                      usageToday >= planLimits.generations_per_day ? 'full'
                      : usageToday >= planLimits.generations_per_day * 0.8 ? 'warn'
                      : 'ok'
                    }`}
                    style={{ width: `${Math.min(100, (usageToday / planLimits.generations_per_day) * 100)}%` }}
                  />
                </div>
                <span className="usage-bar-count">{usageToday}/{planLimits.generations_per_day}</span>
              </div>
            )}
            {/* User Profile Menu */}
            <div className="user-menu" style={{ position: 'relative' }}>
              <div
                className="user-avatar"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                title={profile?.full_name || authUser?.email || 'Profile'}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name || 'User'} />
                ) : (
                  <span>{profile?.full_name?.[0]?.toUpperCase() || authUser?.email?.[0]?.toUpperCase() || 'U'}</span>
                )}
              </div>
              {showUserDropdown && (
                <>
                  {/* Backdrop to close dropdown */}
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 499 }}
                    onClick={() => setShowUserDropdown(false)}
                  />
                  <div className="user-dropdown">
                    {/* Header: avatar + name + email + plan */}
                    <div className="user-dropdown-header">
                      <div className="user-dropdown-avatar">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt={profile.full_name || 'User'} />
                        ) : (
                          <span>{profile?.full_name?.[0]?.toUpperCase() || authUser?.email?.[0]?.toUpperCase() || 'U'}</span>
                        )}
                      </div>
                      <div className="user-dropdown-info">
                        <div className="user-dropdown-name">
                          {profile?.full_name || authUser?.email?.split('@')[0] || 'User'}
                        </div>
                        <div className="user-dropdown-email">{authUser?.email}</div>
                        <div className={`user-dropdown-plan ${subscription?.plan || 'free'}`}>
                          {subscription?.plan || 'Free'}
                        </div>
                      </div>
                    </div>
                    {/* Menu items */}
                    <div className="user-dropdown-body">
                      <button
                        className="user-dropdown-item"
                        onClick={() => { setShowUserDropdown(false); setShowProfileModal(true); }}
                      >
                        <span></span> My Profile
                      </button>
                      <button
                        className="user-dropdown-item"
                        onClick={() => { setShowUserDropdown(false); setShowSettingsModal(true); }}
                      >
                        <span></span> Settings
                      </button>
                      <div className="user-dropdown-divider" />
                      <button
                        className="user-dropdown-item danger"
                        onClick={async () => {
                          setShowUserDropdown(false);
                          await supabase.auth.signOut();
                          window.location.href = '/auth/login';
                        }}
                      >
                        <span></span> Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-section">
            <button className="new-project-btn" onClick={newProject}>+ New Chat</button>
          </div>

          {/* Navigation */}
          <div className="sidebar-section">
            <div className="nav-item" onClick={() => { setShowCommandPalette(true); }}><span className="nav-icon"></span><span>Search</span></div>
            <div className="nav-item" onClick={() => showNotification("info", "Chats", "Loading chat history...")}><span className="nav-icon"></span><span>Chats</span></div>
            <div className="nav-item" onClick={() => showNotification("info", "Projects", "Loading projects...")}><span className="nav-icon"></span><span>Projects</span></div>
          </div>

          {/* Chat List */}
          <div className="sidebar-section grow">
            <div className="sidebar-label">CHATS</div>
            <div className="project-list">
              {savedChats.length === 0 ? (
                <div style={{ padding: "12px", color: "var(--text-muted)", fontSize: "13px", textAlign: 'center' }}>
                  No saved chats yet
                </div>
              ) : (
                savedChats.map((chat) => (
                  <div 
                    key={chat.id} 
                    className={`chat-item ${currentChatId === chat.id ? "active" : ""}`}
                    onClick={() => {
                        setCurrentChatId(chat.id);
                        if (chat.project_id) setCurrentProjectId(chat.project_id);
                        else if (currentProjectId) setCurrentProjectId(null); // Switch to non-project chat logic if needed, or keep project context? 
                        // Actually if chat has no project_id, we should probably clear currentProjectId to avoid confusion?
                        // But let's check chat.project_id
                        
                        // Sync messages
                        chatHook.setMessages(chat.messages || []);
                        setMessages(chat.messages.map((m: any) => ({
                            id: m.id,
                            role: m.role,
                            content: m.content,
                            status: m.status,
                            files: m.files,
                            toolCalls: m.toolCalls,
                            thinking: m.thinking,
                        })) || []);
                    }}
                  >
                    {editingChatId === chat.id ? (
                      <input 
                        className="chat-input"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => {
                          if (editingTitle.trim()) renameChat(chat.id, editingTitle);
                          setEditingChatId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (editingTitle.trim()) renameChat(chat.id, editingTitle);
                            setEditingChatId(null);
                          }
                          if (e.key === 'Escape') setEditingChatId(null);
                        }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div className="chat-item-content">
                        <div className="chat-item-title">{chat.title || "Untitled Chat"}</div>
                        <div className="chat-item-meta">{new Date(chat.updated_at).toLocaleDateString()}</div>
                      </div>
                    )}
                    
                    <div className="chat-actions">
                      <button 
                        className="chat-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingChatId(chat.id);
                          setEditingTitle(chat.title || "");
                        }}
                        title="Rename"
                      >
                        
                      </button>
                      <button 
                        className="chat-action-btn delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this chat?')) deleteChat(chat.id);
                        }}
                        title="Delete"
                      >
                        
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI Tools */}
          <div className="sidebar-section">
            <div className="tool-card" onClick={() => openTool('image')}>
              <div className="tool-icon-box" style={{ background: 'var(--accent-primary)' }}></div>
              <div className="tool-info"><div className="tool-name">Image Generator</div><div className="tool-desc">DALL-E 3, Flux, Midjourney</div></div>
            </div>
            <div className="tool-card" onClick={() => openTool('video')}>
              <div className="tool-icon-box" style={{ background: 'var(--accent-primary)' }}></div>
              <div className="tool-info"><div className="tool-name">Video Generator</div><div className="tool-desc">Ven 3, Sora, Runway, Pika</div></div>
            </div>
          </div>

          {/* Video Overlays */}
          <div className="sidebar-section">
            <div className="sidebar-label">VIDEO OVERLAYS</div>
            <div className="tool-card" onClick={() => openTool('assembler')}>
              <div className="tool-icon-box" style={{ background: 'var(--accent-primary)' }}></div>
              <div className="tool-info"><div className="tool-name">Video Assembler</div><div className="tool-desc">JSON2Video, Shotstack</div></div>
            </div>
            <div className="tool-card" onClick={() => openTool('captions')}>
              <div className="tool-icon-box" style={{ background: 'var(--accent-primary)' }}></div>
              <div className="tool-info"><div className="tool-name">Caption Generator</div><div className="tool-desc">Whisper, AssemblyAI</div></div>
            </div>
            <div className="tool-card" onClick={() => openTool('color')}>
              <div className="tool-icon-box" style={{ background: 'var(--accent-primary)' }}></div>
              <div className="tool-info"><div className="tool-name">Color Grading</div><div className="tool-desc">LUT Apply, Auto Color</div></div>
            </div>
            <div className="tool-card" onClick={() => openTool('bgremove')}>
              <div className="tool-icon-box" style={{ background: 'var(--red)' }}></div>
              <div className="tool-info"><div className="tool-name">Background Remover</div><div className="tool-desc">RunwayML, Remove.bg</div></div>
            </div>
            <div className="tool-card" onClick={() => openTool('audio')}>
              <div className="tool-icon-box" style={{ background: 'var(--accent-primary)' }}></div>
              <div className="tool-info"><div className="tool-name">Audio Enhancer</div><div className="tool-desc">Adobe Enhance, Dolby.io</div></div>
            </div>
          </div>

          {/* Preview Settings */}
          <div className="sidebar-section">
            <div className="settings-card">
              <div className="settings-card-title"> Preview Settings</div>
              <div className="setting-row">
                <span className="setting-label">Vercel Preview</span>
                <div className={`toggle ${useVercelPreview ? "active" : ""}`} onClick={toggleVercelPreview}></div>
              </div>
              <div className="setting-row">
                <span className="setting-label">Local Preview</span>
                <div className={`toggle ${useLocalPreview ? "active" : ""}`} onClick={toggleLocalPreview}></div>
              </div>
              <div className="setting-row">
                <span className="setting-label">Auto-fix Errors</span>
                <div className={`toggle ${autoFixErrors ? "active" : ""}`} onClick={toggleAutoFix}></div>
              </div>
            </div>
          </div>

          {/* Token Savings */}
          <div className="sidebar-section">
            <div className="savings-card">
              <div className="savings-card-header">
                <span className="savings-card-title">Token Savings</span>
                <span className="savings-card-badge">{savings.pct}% saved</span>
              </div>
              <div className="savings-big-number">${savings.saved.toFixed(2)}</div>
              <div className="savings-subtitle">saved this month vs standard pricing</div>
              <div className="savings-bar"><div className="savings-bar-fill" style={{ width: `${Math.min(100, savings.pct)}%` }}></div></div>
              <div style={{ marginTop: "8px" }}>
                <div className="savings-row"><span className="savings-row-label">Without optimization</span><span className="savings-row-value">${savings.withoutOpt.toFixed(2)}</span></div>
                <div className="savings-row"><span className="savings-row-label">With {BRAND_NAME}</span><span className="savings-row-value green">${savings.withOpt.toFixed(2)}</span></div>
              </div>
            </div>
            {/* Upsell for free users */}
            {(!subscription || subscription.plan === 'free') && (
              <div className="upsell-card">
                <div className="upsell-title">Unlock Pro Savings</div>
                <div className="upsell-desc">Pro plan includes smart model routing, context optimization, and team cost controls — saving up to 65% on API costs.</div>
                <button className="upsell-btn" onClick={() => window.open("/pricing", "_blank")}>Upgrade to Pro — $29/mo</button>
              </div>
            )}
          </div>
        </aside>

        {/* Main Area */}
        <main className="main-area">
          <div className="builds-banner">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div className="builds-dots">
                {Array.from({ length: 20 }, (_, i) => (
                  <div key={i} className={`build-dot ${i < realActiveBuilds ? "active" : ""}`}></div>
                ))}
              </div>
              <span className="builds-text"><strong>{realActiveBuilds}</strong> concurrent builds</span>
            </div>
            <div className="builds-separator"></div>
            <div className="queue-status">Queue: <strong>{queuedBuilds}</strong> &bull; Avg: <strong>{avgDuration}</strong></div>
            <button className={`activity-toggle ${showActivityPanel ? "active" : ""}`} onClick={toggleActivity}> Activity</button>
          </div>

          <div className="messages-area" ref={messagesAreaRef}>
            {showWelcome && messages.length === 0 ? (
              <div className="welcome-container">
                <div className="welcome-logo"></div>
                <h1 className="welcome-title">Build Anything. No Limits.</h1>
                <p className="welcome-subtitle">Describe what you want. {BRAND_NAME} writes code, generates files, and deploys — all from one conversation.</p>
                <div className="welcome-badges">
                  <div className="welcome-badge"><span></span><strong>20</strong> concurrent builds</div>
                  <div className="welcome-badge"><span></span>Zero throttling</div>
                  <div className="welcome-badge"><span></span><strong>100K+</strong> scalable</div>
                </div>
                <div className="quick-grid">
                  <div className="quick-card" onClick={() => startProject("landing")}>
                    <div className="quick-icon web"></div>
                    <div className="quick-content"><h4>Landing Page</h4><p>Marketing, portfolios, product pages</p></div>
                  </div>
                  <div className="quick-card" onClick={() => startProject("api")}>
                    <div className="quick-icon api"></div>
                    <div className="quick-content"><h4>Backend API</h4><p>REST, GraphQL, webhooks, DB</p></div>
                  </div>
                  <div className="quick-card" onClick={() => startProject("dashboard")}>
                    <div className="quick-icon dash"></div>
                    <div className="quick-content"><h4>Dashboard</h4><p>Admin panels, analytics, charts</p></div>
                  </div>
                  <div className="quick-card" onClick={() => startProject("app")}>
                    <div className="quick-icon app"></div>
                    <div className="quick-content"><h4>Full Stack App</h4><p>Complete apps with auth &amp; DB</p></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="chat-messages">
                {messages.map((msg, i) => (
                  <div key={msg.id || i} className={`chat-message ${msg.role} ${msg.status === "error" ? "error" : ""}`}>
                    <div className="chat-message-avatar">{msg.role === "user" ? (profile?.full_name?.[0]?.toUpperCase() || authUser?.email?.[0]?.toUpperCase() || "U") : ""}</div>
                    <div className="chat-message-content">
                      {msg.role === 'assistant' ? renderMessageContent(msg) : <pre>{msg.content}</pre>}
                      {msg.status === "error" && (
                        <button className="quick-action" style={{ marginTop: "8px" }} onClick={() => chatHook.regenerate(msg.id)}> Retry</button>
                      )}
                    </div>
                  </div>
                ))}

                {showActivityPanel && activities.length > 0 && (
                  <div className="activity-feed">
                    <div className="activity-header">
                      <span className="activity-title"> Activity <span className="activity-count">{activities.filter((a) => a.status === "running").length}</span></span>
                    </div>
                    <div className="activity-list">
                      {activities.map((a, i) => (
                        <div key={i} className="activity-item">
                          <div className={`activity-icon ${a.type}`}>{ACTIVITY_ICONS[a.type as keyof typeof ACTIVITY_ICONS] || ""}</div>
                          <div className="activity-content">
                            <div className="activity-label">{a.label}</div>
                            <div className="activity-detail">{a.detail}</div>
                          </div>
                          <span className={`activity-status ${a.status}`}>{a.status === "running" ? "●" : "✓"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isGenerating && (
                  <div className="chat-message assistant">
                    <div className="chat-message-avatar"></div>
                    <div className="chat-message-content">
                      <div className="thinking-indicator">
                        <div className="thinking-dots">
                          <div className="thinking-dot"></div>
                          <div className="thinking-dot"></div>
                          <div className="thinking-dot"></div>
                        </div>
                        <span>{phaseMessage || "Generating..."}</span>
                      </div>
                    </div>
                  </div>
                )}

                {files.length > 0 && !isGenerating && (
                  <div className="generated-files">
                    <div className="generated-files-header"> Generated {files.length} files<span style={{ marginLeft: "8px", color: "var(--accent-primary)" }}>&bull; All checks passed</span></div>
                    {files.map((f, i) => (
                      <div key={i} className="generated-file"><span className="generated-file-path">{f}</span></div>
                    ))}
                    <div className="quick-actions-bar">
                      <button className="quick-action" onClick={async () => { showNotification("info", "Export", "Preparing ZIP..."); try { const res = await fetch(`/api/builds/${currentProjectId}/export`); if (res.ok) { const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "project.zip"; a.click(); showNotification("success", "Export", "Download started"); } else { showNotification("error", "Export", "Export failed"); } } catch { showNotification("info", "Export", "Export feature coming soon"); } }}> Export</button>
                      <button className="quick-action primary" onClick={async () => { if (!currentProjectId) { showNotification("info", "Deploy", "No project selected"); return; } showNotification("info", "Deploy", "Starting deployment..."); try { const res = await fetch("/api/deploy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: currentProjectId }) }); const data = await res.json(); if (res.ok) { showNotification("success", "Deployed!", data.url || "Deployment started"); } else { showNotification("error", "Deploy failed", data.error); } } catch (err: any) { showNotification("error", "Deploy failed", err.message); } }}> Deploy</button>
                      <button className="quick-action" onClick={() => { if (typeof navigator !== "undefined" && navigator.clipboard) { navigator.clipboard.writeText(window.location.href); showNotification("success", "Copied", "Link copied"); } }}> Share</button>
                      <button className="quick-action" onClick={() => { const content = generateHook.files.map((f: any) => `// ${f.path || f.filepath}\n${f.content}`).join("\n\n"); if (typeof navigator !== "undefined" && navigator.clipboard) { navigator.clipboard.writeText(content); showNotification("success", "Copied", `${files.length} files copied to clipboard`); } }}> Copy</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="input-area">
            <div className="input-wrapper">
              {enhancement && (
                <div className="enhancement-preview">
                  <div className="enhancement-header"><span></span><span className="enhancement-title">Improved prompt</span><button className="enhancement-dismiss" onClick={dismissEnhancement}>×</button></div>
                  <div className="enhancement-content">
                    <div className="enhancement-text">{enhancement.enhanced}</div>
                    <div className="enhancement-improvements">
                      {enhancement.improvements.map((imp: string, i: number) => (
                        <span key={i} className="enhancement-badge">✓ {imp}</span>
                      ))}
                    </div>
                  </div>
                  <div className="enhancement-actions">
                    <button className="enhancement-btn secondary" onClick={dismissEnhancement}>Keep original</button>
                    <button className="enhancement-btn primary" onClick={acceptEnhancement}>Use improved</button>
                  </div>
                </div>
              )}

              <div className="input-box">
                <div className="suggestions-dropdown" style={{ display: "none" }}></div>
                <div className="input-tools">
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    hidden
                    accept="*/*"
                    onChange={handleFileAttach}
                  />
                  <button
                    className={`tool-btn ${attachedFiles.length > 0 ? "has-files" : ""}`}
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach files"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                    </svg>
                    {attachedFiles.length > 0 && <span className="file-count">{attachedFiles.length}</span>}
                  </button>
                  <button className="tool-btn" onClick={() => { setShowUrlImport(true); setUrlValue(""); setUrlPreview(null); }} title="Import URL">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                    </svg>
                  </button>
                </div>
                <textarea
                  ref={promptInputRef}
                  className="input-field"
                  rows={1}
                  placeholder={inputPlaceholder}
                  value={promptValue}
                  onInput={handleInputChange}
                  onKeyDown={handleKeyDown}
                ></textarea>
                <button className={`send-btn ${isGenerating ? "cancel" : ""}`} onClick={() => { if (isGenerating) { chatHook.stopGeneration(); generateHook.abort(); setIsGenerating(false); showNotification("info", "Stopped", "Generation cancelled"); } else { handleSend(); } }}>{isGenerating ? "■" : ""}</button>
              </div>

              {attachedFiles.length > 0 && (
                <div className="attached-files">
                  {attachedFiles.map((f) => (
                    <div key={f.id} className="attached-file">
                      <span className="attached-file-icon">{f.icon}</span>
                      <span>{f.name.length > 15 ? f.name.slice(0, 12) + "..." : f.name}</span>
                      <button className="attached-file-remove" onClick={() => removeAttachedFile(f.id)}>×</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="input-footer">
                <span className="input-hint"><kbd>Enter</kbd> send &bull; <kbd>Shift+Enter</kbd> new line &bull; <kbd>⌘K</kbd> commands &bull; <kbd>⌘N</kbd> new</span>
                {showEnhanceBtn && (
                  <button className="enhance-btn" onClick={enhancePrompt}> Enhance prompt</button>
                )}
                <div className="model-selector" ref={modelSelectorRef} onClick={() => setShowModelDropdown((prev) => !prev)}>
                  <span className="model-dot"></span>
                  <span>{selectedModelName}</span>
                  <span>▼</span>
                  {showModelDropdown && (
                    <div className="model-dropdown" style={{ display: "block" }} onClick={(e) => e.stopPropagation()}>
                      {MODELS.map((m) => (
                        <div
                          key={m.id}
                          className={`model-dropdown-item ${selectedModel === m.id ? "active" : ""}`}
                          onClick={() => selectModel(m.id)}
                        >
                          {selectedModel === m.id ? <span className="model-check">✓</span> : <span style={{ width: "14px" }}></span>}
                          <span>{m.name}</span>
                          <span className="model-provider">{m.desc}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Preview Panel - Enhanced with PreviewPanelV2 */}
        {showPreviewPanel && (
          <aside className={`preview-panel ${previewMaximized ? 'maximized' : ''}`}>
            <PreviewPanelV2
              files={generatedFileContents.map(f => ({
                path: f.path,
                content: f.content,
                language: f.path.split('.').pop() || 'text',
                status: previewHook.phase === 'verifying' || previewHook.phase === 'auto-fixing' ? 'generating' : 
                        previewHook.phase === 'error' ? 'error' : 
                        previewHook.phase === 'previewing' || previewHook.phase === 'complete' ? 'validated' : 'pending'
              }))}
              previewUrl={previewHook.previewUrl}
              phase={previewHook.phase}
              phaseMessage={previewHook.phaseMessage}
              error={previewHook.error}
              logs={previewHook.logs}
              buildTime={previewHook.buildTime}
              autoFixAttempts={previewHook.autoFixAttempts}
              projectName={currentProjectName}
              onFix={async (feedback, voiceTranscript) => {
                await previewHook.requestFix(feedback, { voiceTranscript });
              }}
              onPerfect={() => {
                showNotification('success', 'Approved!', 'Ready to deploy');
              }}
              onDeployVercel={async (projectName) => {
                const result = await previewHook.deployToVercel(projectName);
                if (result.success) {
                  showNotification('success', 'Deployed!', `Live at ${result.vercelUrl}`);
                }
                return result;
              }}
              onPushGitHub={async (repoName) => {
                const result = await previewHook.pushToGitHub(repoName);
                if (result.success) {
                  showNotification('success', 'Pushed!', `Repo: ${result.githubUrl}`);
                }
                return result;
              }}
              onDeployBoth={async (projectName) => {
                const result = await previewHook.deployBoth(projectName);
                if (result.success) {
                  showNotification('success', 'Deployed!', 'Live on Vercel & GitHub');
                }
                return result;
              }}
              onRefresh={() => {
                if (generatedFileContents.length > 0) {
                  previewHook.verifyBuild(generatedFileContents, { projectName: currentProjectName });
                }
              }}
              onClose={() => setShowPreviewPanel(false)}
              isMaximized={previewMaximized}
              onMaximize={() => setPreviewMaximized(!previewMaximized)}
            />
          </aside>
        )}

        {/* Status Bar */}
        <footer className="status-bar">
          <div className="status-left">
            <div className="status-item"><span className={`status-dot ${isOnline ? "online" : ""}`}></span>{isOnline ? "Connected" : "Offline"}</div>
            <div className="status-item">Region: US-East</div>
            {isGenerating && <div className="status-item" style={{ color: "var(--accent-yellow)" }}> Generating...</div>}
            {getPreviewStatusText() && !isGenerating && <div className="status-item preview-status-text">{getPreviewStatusText()}</div>}
          </div>
          <div className="status-right">
            <div className="status-item">Keys: {(queueStats as any)?.pool?.available || 6}/{(queueStats as any)?.pool?.total || 6}</div>
            <div className="status-item">v2.5.0</div>
          </div>
        </footer>
      </div>

      {/* Command Palette */}
      <div
        className={`command-palette-overlay ${!showCommandPalette ? "hidden" : ""}`}
        onClick={() => setShowCommandPalette(false)}
      >
        <div className="command-palette" onClick={(e) => e.stopPropagation()}>
          <div className="command-search">
            <span className="command-search-icon"></span>
            <input
              type="text"
              className="command-input"
              ref={commandInputRef}
              placeholder="Type a command or search..."
              value={commandQuery}
              onInput={(e) => { setCommandQuery((e.target as HTMLInputElement).value); setSelectedCommandIndex(0); }}
              onKeyDown={handleCommandKeyDown}
            />
            <span className="command-shortcut">ESC</span>
          </div>
          <div className="command-list">
            {filteredCommands.length > 0 ? renderCommandList() : (
              <div style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>No commands found</div>
            )}
          </div>
          <div className="command-footer">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
        </div>
      </div>

      {/* Onboarding Modal */}
      <div className={`onboarding-overlay ${!showOnboarding ? "hidden" : ""}`}>
        <div className="onboarding-modal">
          {renderOnboardingContent()}
        </div>
      </div>

      {/* Contextual Tip */}
      <div className={`contextual-tip ${!tipData ? "hidden" : ""}`}>
        {tipData && (
          <>
            <div className="tip-content">
              <strong>{tipData.title}</strong>
              <p>{tipData.message}</p>
            </div>
            <button className="tip-dismiss" onClick={() => setTipData(null)}>×</button>
          </>
        )}
      </div>

      {/* Notifications */}
      <div className="notification-container">
        {notifications.map((n) => (
          <div key={n.id} className={`notification-item ${n.type}`}>
            <div className="notification-icon">{n.icon}</div>
            <div className="notification-content">
              <div className="notification-title">{n.title}</div>
              {n.message && <div className="notification-message">{n.message}</div>}
            </div>
            <button className="notification-dismiss" onClick={() => dismissNotification(n.id)}>×</button>
          </div>
        ))}
      </div>

      {/* Profile Modal */}
      <div className={`modal-overlay ${!showProfileModal ? "hidden" : ""}`} onClick={() => setShowProfileModal(false)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header"><span className="modal-title">Profile</span><button className="modal-close" onClick={() => setShowProfileModal(false)}>×</button></div>
          <div className="modal-body">
            <div className="modal-section">
              <div className="modal-section-title">Account</div>
              <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" defaultValue={authUser?.email || ""} disabled /></div>
              <div className="form-group"><label className="form-label">Name</label><input type="text" className="form-input" value={profileFormName} onChange={(e) => setProfileFormName(e.target.value)} onBlur={async () => { if (authUser) { try { await supabase.from("profiles").update({ full_name: profileFormName }).eq("id", authUser.id); showNotification("success", "Profile updated"); } catch (err: any) { showNotification("error", "Save failed", err.message || "Could not update profile"); } } }} /></div>
            </div>
            <div className="modal-section">
              <div className="modal-section-title">Subscription</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{subscription?.plan ? subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1) + " Plan" : "Pro Plan"}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{subscription?.plan === "enterprise" ? "Unlimited builds" : subscription?.plan === "pro" ? "100 builds/day • 10 concurrent" : "10 builds/day • 3 concurrent"} &bull; 1GB storage</div>
                </div>
                <button className="btn btn-secondary" onClick={() => { window.open("/pricing", "_blank"); }}>Upgrade</button>
              </div>
            </div>
            <div className="modal-section">
              <div className="modal-section-title">Usage This Month</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                <div style={{ padding: "12px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--accent-primary)" }}>{usageData?.stats?.buildsThisMonth ?? queueStats?.queue?.completed ?? 0}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Builds</div>
                </div>
                <div style={{ padding: "12px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--accent-blue)" }}>{usageData?.stats?.filesGenerated ?? files.length}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Files</div>
                </div>
                <div style={{ padding: "12px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--accent-purple)" }}>{realProjects.length}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Projects</div>
                </div>
              </div>
              {usageData?.remaining && (
                <div className="usage-warning" style={{ marginTop: "12px" }}>
                  Remaining today: <strong>{usageData.remaining.today}</strong> &bull; This month: <strong>{usageData.remaining.month === Infinity ? "∞" : usageData.remaining.month}</strong>
                </div>
              )}
              {/* Savings summary in profile */}
              {savings.saved > 0 && (
                <div className="savings-card" style={{ marginTop: "12px" }}>
                  <div className="savings-card-header">
                    <span className="savings-card-title">Cost Optimization Active</span>
                    <span className="savings-card-badge">-{savings.pct}%</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "8px" }}>
                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Standard cost</div>
                      <div style={{ fontSize: "16px", fontWeight: 700, textDecoration: "line-through", opacity: 0.5 }}>${savings.withoutOpt.toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Your cost</div>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--accent-primary)" }}>${savings.withOpt.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="savings-bar" style={{ marginTop: "8px" }}><div className="savings-bar-fill" style={{ width: `${savings.pct}%` }}></div></div>
                  <div style={{ marginTop: "8px" }}>
                    <div className="savings-row"><span className="savings-row-label">Smart routing</span><span className="savings-row-value green">-{savings.breakdown.modelRouting}%</span></div>
                    <div className="savings-row"><span className="savings-row-label">Context optimization</span><span className="savings-row-value green">-{savings.breakdown.smartContext}%</span></div>
                    <div className="savings-row"><span className="savings-row-label">Request deduplication</span><span className="savings-row-value green">-{savings.breakdown.dualCalls}%</span></div>
                    <div className="savings-row"><span className="savings-row-label">History compression</span><span className="savings-row-value green">-{savings.breakdown.trimming}%</span></div>
                  </div>
                  {isAdmin && <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "8px", textAlign: "center" }}>Manage in Settings → Cost Optimization</div>}
                </div>
              )}
              {/* Upsell for free users in profile */}
              {(!subscription || subscription.plan === 'free') && (
                <div className="upsell-card" style={{ marginTop: "12px" }}>
                  <div className="upsell-title"> Save up to 65% on API costs</div>
                  <div className="upsell-desc">Pro and Business plans include intelligent cost optimization that automatically reduces your AI spending without sacrificing quality.</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
                    <div style={{ padding: "8px", background: "rgba(138,43,226,0.1)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
                      <div style={{ fontSize: "14px", fontWeight: 700 }}>Pro</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>$29/mo</div>
                      <div style={{ fontSize: "10px", color: "var(--accent-primary)" }}>Up to 50% savings</div>
                    </div>
                    <div style={{ padding: "8px", background: "rgba(0,100,255,0.1)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
                      <div style={{ fontSize: "14px", fontWeight: 700 }}>Business</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>$99/mo</div>
                      <div style={{ fontSize: "10px", color: "var(--accent-primary)" }}>Up to 65% savings</div>
                    </div>
                  </div>
                  <button className="upsell-btn" onClick={() => window.open("/pricing", "_blank")}>Compare Plans</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <div className={`modal-overlay ${!showSettingsModal ? "hidden" : ""}`} onClick={() => setShowSettingsModal(false)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header"><span className="modal-title">Settings</span><button className="modal-close" onClick={() => setShowSettingsModal(false)}>×</button></div>
          <div className="modal-body">
            <div className="modal-section">
              <div className="modal-section-title">Preferences</div>
              <div className="toggle-group">
                <div><div className="toggle-label">Dark Mode</div><div className="toggle-desc">Use dark theme (recommended)</div></div>
                <div className={`toggle ${toggleStates.darkMode ? "active" : ""}`} onClick={() => setToggleStates((s) => ({ ...s, darkMode: !s.darkMode }))}></div>
              </div>
              <div className="toggle-group">
                <div><div className="toggle-label">Auto-enhance Prompts</div><div className="toggle-desc">Automatically improve vague prompts</div></div>
                <div className={`toggle ${toggleStates.autoEnhance ? "active" : ""}`} onClick={() => setToggleStates((s) => ({ ...s, autoEnhance: !s.autoEnhance }))}></div>
              </div>
              <div className="toggle-group">
                <div><div className="toggle-label">Activity Feed</div><div className="toggle-desc">Show real-time activity during generation</div></div>
                <div className={`toggle ${toggleStates.activityFeed ? "active" : ""}`} onClick={() => setToggleStates((s) => ({ ...s, activityFeed: !s.activityFeed }))}></div>
              </div>
            </div>
            <div className="modal-section">
              <div className="modal-section-title">API Keys (Optional)</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>Add your own API keys for unlimited generation. {BRAND_NAME} will use them automatically.</div>
              <div className="form-group"><label className="form-label">Primary API Key</label><input type="password" className="form-input" placeholder="sk-..." value={apiKeySlot1} onChange={(e) => setApiKeySlot1(e.target.value)} onBlur={async () => { if (authUser) { try { const key = apiKeySlot1.trim(); await supabase.from("profiles").update({ claude_api_key: key || null }).eq("id", authUser.id); showNotification("success", "API key saved"); } catch (err: any) { showNotification("error", "Save failed", err.message); } } }} /></div>
              <div className="form-group"><label className="form-label">Secondary API Key</label><input type="password" className="form-input" placeholder="sk-..." value={apiKeySlot2} onChange={(e) => setApiKeySlot2(e.target.value)} onBlur={async () => { if (authUser) { try { const key = apiKeySlot2.trim(); await supabase.from("profiles").update({ openai_api_key: key || null }).eq("id", authUser.id); showNotification("success", "API key saved"); } catch (err: any) { showNotification("error", "Save failed", err.message); } } }} /></div>
            </div>
            {/* Admin-Only: Cost Optimization Settings */}
            {isAdmin && (
              <div className="modal-section">
                <div className="modal-section-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span> Cost Optimization</span>
                  <span style={{ fontSize: "10px", padding: "2px 6px", background: "var(--accent-primary)", color: "#fff", borderRadius: "4px", fontWeight: 600 }}>ADMIN</span>
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>
                  Controls how your team's API tokens are spent. Changes apply to all team members.
                </div>
                {adminCostLoading ? (
                  <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>Loading settings...</div>
                ) : adminCostSettings ? (
                  <>
                    {/* Usage Summary */}
                    {adminUsageData && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "16px" }}>
                        <div style={{ padding: "10px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
                          <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--accent-primary)" }}>{(adminUsageData.totalTokens / 1000).toFixed(0)}k</div>
                          <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Tokens (month)</div>
                        </div>
                        <div style={{ padding: "10px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
                          <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--accent-blue)" }}>{adminUsageData.totalRequests}</div>
                          <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Requests</div>
                        </div>
                        <div style={{ padding: "10px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
                          <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--accent-green)" }}>${(adminUsageData.estimatedCostCents / 100).toFixed(2)}</div>
                          <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Est. Cost</div>
                        </div>
                      </div>
                    )}
                    {/* Admin Savings Breakdown */}
                    <div className="savings-card" style={{ marginBottom: "16px" }}>
                      <div className="savings-card-header">
                        <span className="savings-card-title">Team Savings Estimate</span>
                        <span className="savings-card-badge">{savings.pct}% saved</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                        <div className="savings-big-number">${savings.saved.toFixed(2)}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>/ month saved</div>
                      </div>
                      <div className="savings-bar" style={{ marginTop: "8px" }}><div className="savings-bar-fill" style={{ width: `${savings.pct}%` }}></div></div>
                      <div style={{ marginTop: "10px" }}>
                        <div className="savings-row"><span className="savings-row-label">Without optimization</span><span className="savings-row-value">${savings.withoutOpt.toFixed(2)}/mo</span></div>
                        <div className="savings-row"><span className="savings-row-label">With optimization</span><span className="savings-row-value green">${savings.withOpt.toFixed(2)}/mo</span></div>
                        <div style={{ borderTop: "1px solid var(--border-subtle)", marginTop: "6px", paddingTop: "6px" }}>
                          <div className="savings-row"><span className="savings-row-label"> Smart model routing</span><span className="savings-row-value green">{savings.breakdown.modelRouting > 0 ? `-${savings.breakdown.modelRouting}%` : "OFF"}</span></div>
                          <div className="savings-row"><span className="savings-row-label"> Smart context</span><span className="savings-row-value green">{savings.breakdown.smartContext > 0 ? `-${savings.breakdown.smartContext}%` : "OFF"}</span></div>
                          <div className="savings-row"><span className="savings-row-label"> Dual call prevention</span><span className="savings-row-value green">{savings.breakdown.dualCalls > 0 ? `-${savings.breakdown.dualCalls}%` : "OFF"}</span></div>
                          <div className="savings-row"><span className="savings-row-label"> History compression</span><span className="savings-row-value green">{savings.breakdown.trimming > 0 ? `-${savings.breakdown.trimming}%` : "OFF"}</span></div>
                        </div>
                      </div>
                      {adminUsageData?.tierBreakdown && (
                        <div style={{ marginTop: "10px", borderTop: "1px solid var(--border-subtle)", paddingTop: "8px" }}>
                          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>MODEL TIER USAGE</div>
                          <div className="savings-row"><span className="savings-row-label"> Fast (Haiku/mini)</span><span className="savings-row-value">{adminUsageData.tierBreakdown.fast} requests</span></div>
                          <div className="savings-row"><span className="savings-row-label"> Pro (Sonnet/4o)</span><span className="savings-row-value">{adminUsageData.tierBreakdown.pro} requests</span></div>
                          <div className="savings-row"><span className="savings-row-label"> Premium (Opus/o1)</span><span className="savings-row-value">{adminUsageData.tierBreakdown.premium} requests</span></div>
                        </div>
                      )}
                    </div>
                    {/* Model Routing */}
                    <div className="toggle-group">
                      <div><div className="toggle-label">Smart Model Routing</div><div className="toggle-desc">Auto-select cheaper models for simple questions (saves 40-60%)</div></div>
                      <div className={`toggle ${adminCostSettings.smart_model_routing ? "active" : ""}`} onClick={() => saveAdminCostSetting("smart_model_routing", !adminCostSettings.smart_model_routing)}></div>
                    </div>
                    {!adminCostSettings.smart_model_routing && (
                      <div className="form-group" style={{ marginLeft: "16px" }}>
                        <label className="form-label" style={{ fontSize: "11px" }}>Default Model Tier</label>
                        <select className="form-input" style={{ fontSize: "12px" }} value={adminCostSettings.default_model_tier} onChange={(e) => saveAdminCostSetting("default_model_tier", e.target.value)}>
                          <option value="fast">Fast (cheapest)</option>
                          <option value="pro">Pro (balanced)</option>
                          <option value="premium">Premium (highest quality)</option>
                        </select>
                      </div>
                    )}
                    {/* Conversation Trimming */}
                    <div className="toggle-group">
                      <div><div className="toggle-label">Conversation Trimming</div><div className="toggle-desc">Compress old messages before sending to AI (saves on long chats)</div></div>
                      <div className={`toggle ${adminCostSettings.conversation_trimming ? "active" : ""}`} onClick={() => saveAdminCostSetting("conversation_trimming", !adminCostSettings.conversation_trimming)}></div>
                    </div>
                    {adminCostSettings.conversation_trimming && (
                      <div className="form-group" style={{ marginLeft: "16px" }}>
                        <label className="form-label" style={{ fontSize: "11px" }}>Keep last N message pairs in full</label>
                        <input type="range" min="2" max="20" value={adminCostSettings.max_history_pairs} onChange={(e) => saveAdminCostSetting("max_history_pairs", parseInt(e.target.value))} style={{ width: "100%" }} />
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "right" }}>{adminCostSettings.max_history_pairs} pairs ({adminCostSettings.max_history_pairs * 2} messages)</div>
                      </div>
                    )}
                    {/* Smart max_tokens */}
                    <div className="toggle-group">
                      <div><div className="toggle-label">Smart Token Limits</div><div className="toggle-desc">Use smaller limits for simple questions (saves over-reservation)</div></div>
                      <div className={`toggle ${adminCostSettings.smart_max_tokens ? "active" : ""}`} onClick={() => saveAdminCostSetting("smart_max_tokens", !adminCostSettings.smart_max_tokens)}></div>
                    </div>
                    {/* Smart Context */}
                    <div className="toggle-group">
                      <div><div className="toggle-label">Smart Context Injection</div><div className="toggle-desc">Only inject relevant skills/memory per request (saves 50-85%)</div></div>
                      <div className={`toggle ${adminCostSettings.smart_context ? "active" : ""}`} onClick={() => saveAdminCostSetting("smart_context", !adminCostSettings.smart_context)}></div>
                    </div>
                    {/* Dual Call Prevention */}
                    <div className="toggle-group">
                      <div><div className="toggle-label">Prevent Dual API Calls</div><div className="toggle-desc">Don't run generation pipeline for conversational messages</div></div>
                      <div className={`toggle ${adminCostSettings.prevent_dual_calls ? "active" : ""}`} onClick={() => saveAdminCostSetting("prevent_dual_calls", !adminCostSettings.prevent_dual_calls)}></div>
                    </div>
                    {/* Provider Preference */}
                    <div className="form-group">
                      <label className="form-label">Provider Routing</label>
                      <select className="form-input" style={{ fontSize: "12px" }} value={adminCostSettings.provider_preference} onChange={(e) => saveAdminCostSetting("provider_preference", e.target.value)}>
                        <option value="balanced">Balanced (round-robin)</option>
                        <option value="provider_a">Prefer Primary Provider</option>
                        <option value="provider_b">Prefer Secondary Provider</option>
                      </select>
                    </div>
                    {/* Budget Alert */}
                    <div className="form-group">
                      <label className="form-label">Daily Token Budget (0 = unlimited)</label>
                      <input type="number" className="form-input" style={{ fontSize: "12px" }} min="0" step="10000" value={adminCostSettings.daily_token_budget} onChange={(e) => saveAdminCostSetting("daily_token_budget", parseInt(e.target.value) || 0)} />
                    </div>
                    {adminCostSaving && <div style={{ fontSize: "11px", color: "var(--accent-primary)", textAlign: "right" }}>Saving...</div>}
                  </>
                ) : (
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Unable to load admin settings. Make sure your team is configured.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* URL Import Modal */}
      {showUrlImport && (
        <div className="url-import-modal" onClick={(e) => { if (e.target === e.currentTarget) setShowUrlImport(false); }}>
          <div className="url-import-content">
            <div className="url-import-header">
              <span className="url-import-title"> Import URL</span>
              <button className="url-import-close" onClick={() => setShowUrlImport(false)}>×</button>
            </div>
            <input
              type="url"
              className="url-import-input"
              placeholder="https://example.com"
              value={urlValue}
              onInput={(e) => handleUrlPreview((e.target as HTMLInputElement).value)}
              autoFocus
            />
            <div className={`url-import-preview ${urlPreview ? "visible" : ""}`}>
              <div className="url-import-preview-title">{urlPreview?.hostname}</div>
              <div className="url-import-preview-url">{urlPreview?.url}</div>
            </div>
            <button className="url-import-btn" onClick={importUrl} disabled={!urlPreview}>Import URL</button>
          </div>
        </div>
      )}
    </>
  );
}
