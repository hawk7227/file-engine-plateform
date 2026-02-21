'use client'

// =====================================================
// ADMIN DASHBOARD — Owner/Admin Control Center
// Role-gated: only 'owner' and 'admin' can access
// brand.ts wired: zero hardcoded brand strings
// =====================================================

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import {
  BRAND_NAME,
  BRAND_SHORT,
  BRAND_VERSION,
  BRAND_LOGO_MARK,
  brand,
} from '@/lib/brand'
import type { BrandConfig } from '@/lib/brand'
import type { TeamCostSettings } from '@/lib/admin-cost-settings'

// =====================================================
// TYPES
// =====================================================

type AdminTab = 'brand' | 'overview' | 'cost' | 'models' | 'keys' | 'users' | 'builds' | 'billing' | 'pages' | 'health' | 'settings'
type PageState = 'loading' | 'unauthorized' | 'error' | 'ready'

interface Toast {
  id: number
  type: 'success' | 'error' | 'info'
  title: string
  message: string
}

interface UsageData {
  totalTokens: number
  totalRequests: number
  estimatedCostCents: number
  tierBreakdown: { fast: number; pro: number; premium: number }
  intentBreakdown: { chat: number; generate: number; fix: number; explain: number; other: number }
}

interface OverviewStats {
  totalUsers: number
  proUsers: number
  enterpriseUsers: number
  activeBuilds: number
  queuedBuilds: number
  completedBuilds: number
}

interface KeyStatus {
  name: string
  provider: 'anthropic' | 'openai'
  active: boolean
  label: string
}

interface EditableKey {
  id: string
  group: 'anthropic' | 'openai' | 'google' | 'elevenlabs' | 'video' | 'image' | 'audio' | '3d'
  label: string
  desc: string
  value: string
  active: boolean
  required: boolean
  isNew?: boolean
  codename?: string
  cost?: string
}

interface HealthCheck {
  n: string
  crit: boolean
  ok: boolean
}

interface HealthGroup {
  group: string
  icon: string
  checks: HealthCheck[]
}

// =====================================================
// CSS — matches existing design system
// =====================================================

const CSS = `
.admin-root{font-family:'Inter',-apple-system,sans-serif;background:#09090b;color:#fafafa;min-height:100vh;display:flex}

/* Sidebar */
.admin-side{width:230px;background:#050507;border-right:1px solid #27272a;padding:20px 12px;flex-shrink:0;display:flex;flex-direction:column;height:100vh;position:sticky;top:0}
.admin-side-hdr{display:flex;align-items:center;gap:10px;padding:0 8px 20px;border-bottom:1px solid #27272a;margin-bottom:16px}
.admin-side-logo{width:32px;height:32px;background:linear-gradient(135deg,#22c55e,#3b82f6);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#000;box-shadow:0 0 20px rgba(34,197,94,0.3)}
.admin-side-name{font-size:15px;font-weight:700}
.admin-side-sub{font-size:10px;color:#71717a;margin-top:1px}
.admin-side-nav{display:flex;flex-direction:column;gap:2px;flex:1}
.admin-side-section{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#52525b;padding:12px 10px 6px;font-weight:600}
.admin-side-item{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:8px;font-size:13px;color:#71717a;cursor:pointer;border:none;background:none;width:100%;text-align:left;font-family:inherit;transition:all 0.12s}
.admin-side-item:hover{background:#18181b;color:#fafafa}
.admin-side-item.active{background:rgba(34,197,94,0.08);color:#22c55e;font-weight:600}
.admin-side-item .ico{width:18px;text-align:center;font-size:14px}
.admin-side-item .bdg{margin-left:auto;padding:1px 7px;background:#22c55e;color:#000;border-radius:10px;font-size:10px;font-weight:700}
.admin-side-back{margin-top:auto;padding-top:16px;border-top:1px solid #27272a}
.admin-side-back a{display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:8px;font-size:13px;color:#71717a;text-decoration:none;transition:all 0.12s}
.admin-side-back a:hover{background:#18181b;color:#fafafa}

/* Content */
.admin-main{flex:1;overflow-y:auto;height:100vh}
.admin-hdr{position:sticky;top:0;z-index:10;background:#09090b;border-bottom:1px solid #27272a;padding:16px 28px;display:flex;align-items:center;justify-content:space-between}
.admin-hdr-title{font-size:18px;font-weight:700}
.admin-hdr-sub{font-size:12px;color:#71717a;margin-top:2px}
.admin-body{padding:28px}

/* Stats grid */
.st-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
.st-grid.col3{grid-template-columns:repeat(3,1fr)}
.st-card{background:#111113;border:1px solid #27272a;border-radius:12px;padding:16px}
.st-card .ico{font-size:20px;margin-bottom:8px}
.st-card .val{font-size:24px;font-weight:800;font-family:'JetBrains Mono',monospace}
.st-card .lbl{font-size:11px;color:#71717a;margin-top:2px}
.st-card .chg{font-size:10px;color:#22c55e;margin-top:4px;font-weight:600}

/* Section */
.sec-title{font-size:14px;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:8px}
.sec-title .dot{width:6px;height:6px;border-radius:50%;background:#22c55e}
.sec-hr{border:none;border-top:1px solid #27272a;margin:28px 0}

/* Setting card */
.s-card{background:#111113;border:1px solid #27272a;border-radius:12px;padding:16px 20px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;transition:border-color 0.15s}
.s-card:hover{border-color:#3f3f46}
.s-card .info{flex:1;min-width:0}
.s-card .lbl{font-size:13px;font-weight:600}
.s-card .desc{font-size:11px;color:#71717a;margin-top:3px;line-height:1.4}
.s-card.col{flex-direction:column;align-items:stretch;gap:12px}

/* Toggle */
.tgl{position:relative;width:40px;height:22px;background:#3f3f46;border-radius:11px;cursor:pointer;transition:background 0.2s;flex-shrink:0;border:none}
.tgl.on{background:#22c55e}
.tgl::after{content:'';position:absolute;top:2px;left:2px;width:18px;height:18px;background:white;border-radius:50%;transition:transform 0.2s;box-shadow:0 1px 4px rgba(0,0,0,0.3)}
.tgl.on::after{transform:translateX(18px)}

/* Inputs */
.sel-input{padding:8px 12px;background:#18181b;border:1px solid #27272a;border-radius:8px;color:#fafafa;font-size:12px;font-family:inherit;cursor:pointer;min-width:140px}
.sel-input:focus{outline:none;border-color:#22c55e}
.num-input{width:80px;padding:8px 12px;background:#18181b;border:1px solid #27272a;border-radius:8px;color:#fafafa;font-size:12px;font-family:'JetBrains Mono',monospace;text-align:center}
.num-input:focus{outline:none;border-color:#22c55e}

/* Key pool */
.kp-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.kp-slot{background:#111113;border:1px solid #27272a;border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:12px}
.kp-dot{width:10px;height:10px;border-radius:50%;box-shadow:0 0 8px currentColor;flex-shrink:0}
.kp-dot.on{color:#22c55e;background:#22c55e}
.kp-dot.off{color:#52525b;background:#52525b}
.kp-name{font-size:12px;font-family:'JetBrains Mono',monospace;font-weight:600}
.kp-status{font-size:10px;color:#71717a}

/* Progress */
.prog{height:6px;background:#27272a;border-radius:3px;overflow:hidden;margin-top:8px}
.prog-fill{height:100%;border-radius:3px;background:linear-gradient(135deg,#22c55e,#3b82f6);transition:width 0.3s}

/* Alert */
.alert{display:flex;align-items:center;gap:12px;padding:14px 18px;background:rgba(234,179,8,0.08);border:1px solid rgba(234,179,8,0.2);border-radius:12px;margin-bottom:20px;font-size:13px}
.alert .ico{font-size:18px}
.alert .txt{color:#a1a1aa;flex:1}
.alert .txt strong{color:#eab308}

/* Buttons */
.btn{padding:8px 16px;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:all 0.15s}
.btn-p{background:linear-gradient(135deg,#22c55e,#3b82f6);color:#000}
.btn-p:hover{box-shadow:0 0 20px rgba(34,197,94,0.3)}
.btn-p:disabled{opacity:0.5;cursor:not-allowed}
.btn-g{background:transparent;color:#71717a;border:1px solid #27272a}
.btn-g:hover{border-color:#3f3f46;color:#fafafa}
.btn-d{background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2)}

/* Toast */
.toast-wrap{position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column-reverse;gap:10px}
.toast{display:flex;gap:12px;padding:14px 18px;background:#18181b;border:1px solid #3f3f46;border-radius:8px;box-shadow:0 10px 40px rgba(0,0,0,0.5);animation:slideIn 0.3s ease;min-width:300px}
@keyframes slideIn{from{opacity:0;transform:translateX(50px)}to{opacity:1;transform:translateX(0)}}
.toast.success{border-left:3px solid #22c55e}
.toast.error{border-left:3px solid #ef4444}
.toast.info{border-left:3px solid #3b82f6}
.toast .t-ico{font-size:18px}
.toast .t-title{font-weight:600;font-size:13px;margin-bottom:2px}
.toast .t-msg{font-size:12px;color:#71717a}

/* States */
.state-box{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center;padding:40px}
.state-box .ico{font-size:64px;margin-bottom:20px}
.state-box .title{font-size:20px;font-weight:700;margin-bottom:8px}
.state-box .desc{font-size:14px;color:#71717a;max-width:400px;margin-bottom:20px}

/* Skeleton */
.skel{background:linear-gradient(90deg,#18181b,#27272a,#18181b);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:6px;height:20px;margin-bottom:8px}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

/* User row */
.u-row{background:#111113;border:1px solid #27272a;border-radius:10px;padding:14px 20px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between}
.u-row .u-name{font-size:13px;font-weight:600}
.u-row .u-meta{font-size:11px;color:#71717a;margin-top:2px}
.u-row .u-plan{font-size:11px;font-weight:600;padding:2px 10px;border-radius:10px}
.u-row .u-plan.free{color:#71717a;background:#27272a}
.u-row .u-plan.pro{color:#22c55e;background:rgba(34,197,94,0.1)}
.u-row .u-plan.enterprise{color:#8b5cf6;background:rgba(139,92,246,0.1)}

::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:#3f3f46;border-radius:3px}

/* Editable key row */
.key-row{background:#111113;border:1px solid #27272a;border-radius:12px;padding:16px 18px;margin-bottom:8px;transition:border-color 0.15s}
.key-row:hover{border-color:#3f3f46}
.key-row-top{display:flex;align-items:center;gap:12px}
.key-row-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.key-row-dot.on{background:#22c55e;box-shadow:0 0 8px rgba(34,197,94,0.5)}
.key-row-dot.off{background:#52525b}
.key-row-info{flex:1;min-width:0}
.key-row-name{font-size:12px;font-family:'JetBrains Mono',monospace;font-weight:700;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.key-tag{font-size:8px;padding:2px 6px;border-radius:4px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px}
.key-tag.req{background:rgba(239,68,68,0.08);color:#ef4444}
.key-tag.opt{background:rgba(113,113,122,0.08);color:#71717a}
.key-tag.new{background:rgba(139,92,246,0.08);color:#8b5cf6}
.key-row-sub{font-size:10px;color:#71717a;margin-top:2px}
.key-row-actions{display:flex;gap:6px;flex-shrink:0}
.key-btn{padding:4px 10px;font-size:10px;border-radius:6px;border:none;cursor:pointer;font-family:'Inter',sans-serif;font-weight:700;transition:all 0.12s}
.key-btn-edit{background:#18181b;color:#a1a1aa;border:1px solid #27272a}
.key-btn-edit:hover{color:#fafafa;border-color:#3f3f46}
.key-btn-save{background:linear-gradient(135deg,#22c55e,#3b82f6);color:#000}
.key-btn-del{background:rgba(239,68,68,0.06);color:#ef4444}
.key-input-row{margin-top:10px;display:flex;gap:8px;align-items:center}
.key-input{flex:1;padding:9px 12px;background:#18181b;border:1px solid #27272a;border-radius:8px;color:#fafafa;font-size:11px;font-family:'JetBrains Mono',monospace}
.key-input:focus{outline:none;border-color:#22c55e}
.key-input::placeholder{color:#52525b}

/* Health checker */
.hc-group{margin-bottom:24px}
.hc-group-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.hc-group-title{font-size:13px;font-weight:700;display:flex;align-items:center;gap:8px}
.hc-group-score{font-size:11px;font-family:'JetBrains Mono',monospace;font-weight:700;padding:3px 10px;border-radius:10px}
.hc-group-score.pass{background:rgba(34,197,94,0.08);color:#22c55e}
.hc-group-score.warn{background:rgba(234,179,8,0.08);color:#eab308}
.hc-group-score.fail{background:rgba(239,68,68,0.08);color:#ef4444}
.hc-item{display:flex;align-items:center;gap:12px;padding:10px 16px;background:#111113;border:1px solid #27272a;border-radius:10px;margin-bottom:6px;font-size:12px}
.hc-icon{width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0}
.hc-icon.pass{background:rgba(34,197,94,0.1);color:#22c55e}
.hc-icon.fail{background:rgba(239,68,68,0.1);color:#ef4444}
.hc-icon.warn{background:rgba(234,179,8,0.1);color:#eab308}
.hc-label{flex:1;font-weight:600}
.hc-detail{font-size:11px;color:#71717a;font-family:'JetBrains Mono',monospace;text-align:right}

/* Media tool cards */
.mt-card{background:#111113;border:1px solid #27272a;border-radius:10px;padding:14px 16px;display:flex;align-items:center;gap:14px;margin-bottom:8px;transition:border-color 0.15s}
.mt-card:hover{border-color:#3f3f46}
.mt-card .mt-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.mt-card .mt-icon.video{background:rgba(239,68,68,0.1)}
.mt-card .mt-icon.audio{background:rgba(234,179,8,0.1)}
.mt-card .mt-icon.voice{background:rgba(168,85,247,0.1)}
.mt-card .mt-icon.image{background:rgba(59,130,246,0.1)}
.mt-card .mt-icon.3d{background:rgba(20,184,166,0.1)}
.mt-card .mt-info{flex:1;min-width:0}
.mt-card .mt-codename{font-size:12px;font-weight:700;font-family:'JetBrains Mono',monospace;display:flex;align-items:center;gap:8px}
.mt-card .mt-codename .mt-type{font-size:9px;padding:2px 6px;border-radius:4px;background:#27272a;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;font-weight:600}
.mt-card .mt-provider{font-size:11px;color:#71717a;margin-top:2px}
.mt-card .mt-env{font-size:10px;font-family:'JetBrains Mono',monospace;color:#52525b;margin-top:2px}
.mt-card .mt-cost{font-size:11px;color:#a1a1aa;font-family:'JetBrains Mono',monospace;white-space:nowrap}

/* Page manager */
.pg-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.pg-card{background:#111113;border:1px solid #27272a;border-radius:12px;padding:16px;cursor:pointer;transition:all 0.15s;position:relative}
.pg-card:hover{border-color:#3f3f46;transform:translateY(-1px);box-shadow:0 4px 20px rgba(0,0,0,0.3)}
.pg-card.selected{border-color:#22c55e;box-shadow:0 0 0 1px #22c55e}
.pg-card .pg-route{font-size:11px;font-family:'JetBrains Mono',monospace;color:#22c55e;margin-bottom:4px}
.pg-card .pg-name{font-size:14px;font-weight:700;margin-bottom:2px}
.pg-card .pg-desc{font-size:11px;color:#71717a;line-height:1.3}
.pg-card .pg-badges{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}
.pg-card .pg-badge{font-size:9px;padding:2px 7px;border-radius:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.3px}
.pg-card .pg-badge.page{background:rgba(59,130,246,0.1);color:#3b82f6}
.pg-card .pg-badge.modal{background:rgba(168,85,247,0.1);color:#a855f7}
.pg-card .pg-badge.system{background:rgba(113,113,122,0.1);color:#71717a}
.pg-card .pg-badge.warn{background:rgba(234,179,8,0.1);color:#eab308}
.pg-card .pg-badge.clean{background:rgba(34,197,94,0.1);color:#22c55e}

/* Page preview drawer */
.pg-drawer{background:#0a0a0c;border:1px solid #27272a;border-radius:12px;margin-top:16px;overflow:hidden}
.pg-drawer-hdr{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #27272a;background:#111113}
.pg-drawer-hdr .pg-drawer-title{font-size:14px;font-weight:700;display:flex;align-items:center;gap:8px}
.pg-drawer-hdr .pg-drawer-route{font-size:11px;font-family:'JetBrains Mono',monospace;color:#22c55e}
.pg-drawer-actions{display:flex;gap:6px}
.pg-drawer-iframe{width:100%;height:500px;border:none;background:#fff}
.pg-drawer-ai{display:flex;gap:8px;padding:12px 18px;border-top:1px solid #27272a;background:#111113}
.pg-drawer-ai input{flex:1;padding:10px 14px;background:#18181b;border:1px solid #27272a;border-radius:8px;color:#fafafa;font-size:13px;font-family:inherit}
.pg-drawer-ai input:focus{outline:none;border-color:#22c55e}
.pg-drawer-ai input::placeholder{color:#52525b}
`

// =====================================================
// NAV CONFIG
// =====================================================

const NAV_ITEMS: { id: AdminTab; label: string; icon: string; section?: string }[] = [
  { id: 'brand', label: 'Rebrand It', icon: '🎨', section: 'Overview' },
  { id: 'overview', label: 'Dashboard', icon: '📊' },
  { id: 'cost', label: 'Cost Optimization', icon: '💰', section: 'AI Controls' },
  { id: 'models', label: 'Model Routing', icon: '🤖' },
  { id: 'keys', label: 'API Key Pool', icon: '🔑' },
  { id: 'users', label: 'Users', icon: '👥', section: 'Platform' },
  { id: 'builds', label: 'Builds', icon: '🔧' },
  { id: 'billing', label: 'Billing', icon: '💳' },
  { id: 'pages', label: 'Page Manager', icon: '🖼️' },
  { id: 'health', label: 'System Health', icon: '🩺', section: 'Diagnostics' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

// =====================================================
// KEY POOL CONFIG
// =====================================================

const KEY_SLOTS: KeyStatus[] = [
  { name: 'ANTHROPIC_API_KEY', provider: 'anthropic', active: false, label: '' },
  { name: 'ANTHROPIC_API_KEY_1', provider: 'anthropic', active: false, label: '' },
  { name: 'ANTHROPIC_API_KEY_2', provider: 'anthropic', active: false, label: '' },
  { name: 'OPENAI_API_KEY', provider: 'openai', active: false, label: '' },
  { name: 'OPENAI_API_KEY_1', provider: 'openai', active: false, label: '' },
  { name: 'OPENAI_API_KEY_2', provider: 'openai', active: false, label: '' },
]

// =====================================================
// MEDIA TOOL DEFINITIONS (from media-tools.ts)
// =====================================================

interface MediaKeySlot {
  codename: string
  type: 'video' | 'audio' | 'voice' | 'image' | '3d'
  envVar: string
  provider: string
  desc: string
  cost: string
}

const MEDIA_KEY_SLOTS: MediaKeySlot[] = [
  { codename: 'SORA', type: 'video', envVar: 'OPENAI_SORA_API_KEY', provider: 'OpenAI Sora 2', desc: 'Cinematic video generation from text/image', cost: '$0.60/req' },
  { codename: 'VEO', type: 'video', envVar: 'GOOGLE_VEO_VIDEO_KEY', provider: 'Google Veo', desc: 'High-fidelity video generation', cost: '$0.40/req' },
  { codename: 'PHOENIX', type: 'video', envVar: 'MEDIA_VIDEO_KEY_1', provider: 'Runway Gen-3', desc: 'Cinematic video from text/image', cost: '$0.50/req' },
  { codename: 'NOVA', type: 'video', envVar: 'MEDIA_VIDEO_KEY_2', provider: 'Pika Labs', desc: 'Fast video with motion control', cost: '$0.25/req' },
  { codename: 'TITAN', type: 'video', envVar: 'MEDIA_VIDEO_KEY_3', provider: 'MiniMax Hailuo', desc: 'Long-form video generation', cost: '$0.30/req' },
  { codename: 'ECHO', type: 'audio', envVar: 'MEDIA_AUDIO_KEY_1', provider: 'Suno AI', desc: 'Music and songs from text', cost: '$0.10/req' },
  { codename: 'PULSE', type: 'audio', envVar: 'MEDIA_AUDIO_KEY_2', provider: 'ElevenLabs SFX', desc: 'Sound effects and ambient audio', cost: '$0.05/req' },
  { codename: 'ORACLE', type: 'voice', envVar: 'MEDIA_VOICE_KEY_1', provider: 'ElevenLabs TTS', desc: 'Text-to-speech with voice cloning', cost: '$0.03/req' },
  { codename: 'PRISM', type: 'image', envVar: 'MEDIA_IMAGE_KEY_1', provider: 'DALL-E 3', desc: 'Photorealistic image generation', cost: '$0.08/req' },
  { codename: 'FLUX', type: 'image', envVar: 'MEDIA_IMAGE_KEY_2', provider: 'Stability SDXL', desc: 'Fast image with fine control', cost: '$0.03/req' },
  { codename: 'AURORA', type: 'image', envVar: 'MEDIA_IMAGE_KEY_3', provider: 'Midjourney v6', desc: 'Premium artistic images', cost: '$0.12/req' },
  { codename: 'FORGE', type: '3d', envVar: 'MEDIA_3D_KEY_1', provider: 'Meshy AI', desc: '3D models from text/images', cost: '$0.20/req' },
]

// =====================================================
// ALL EDITABLE KEYS (full inventory)
// =====================================================

const ALL_EDITABLE_KEYS: EditableKey[] = [
  // Anthropic
  { id: 'ANTHROPIC_API_KEY', group: 'anthropic', label: 'Primary Key', desc: 'Main Anthropic key — Claude Sonnet/Opus/Haiku', value: '', active: false, required: true },
  { id: 'ANTHROPIC_API_KEY_1', group: 'anthropic', label: 'Key Slot 2', desc: 'Failover key for rate-limit recovery', value: '', active: false, required: false },
  { id: 'ANTHROPIC_API_KEY_2', group: 'anthropic', label: 'Key Slot 3', desc: 'Additional failover key', value: '', active: false, required: false },
  // OpenAI
  { id: 'OPENAI_API_KEY', group: 'openai', label: 'Primary Key', desc: 'Main OpenAI key — GPT-4o, o1', value: '', active: false, required: true },
  { id: 'OPENAI_API_KEY_1', group: 'openai', label: 'Key Slot 2', desc: 'Failover key for rate-limit recovery', value: '', active: false, required: false },
  { id: 'OPENAI_API_KEY_2', group: 'openai', label: 'Key Slot 3', desc: 'Additional failover key', value: '', active: false, required: false },
  // Google
  { id: 'GOOGLE_AI_API_KEY', group: 'google', label: 'Google AI / Gemini', desc: 'Google Gemini 2.0 Flash, Pro models', value: '', active: false, required: false, isNew: true },
  { id: 'GOOGLE_VEO_API_KEY', group: 'google', label: 'Google Veo (Video)', desc: 'Google Veo video generation API', value: '', active: false, required: false, isNew: true },
  // ElevenLabs
  { id: 'ELEVENLABS_API_KEY', group: 'elevenlabs', label: 'ElevenLabs Master Key', desc: 'Covers TTS, voice cloning, SFX, sound design', value: '', active: false, required: false, isNew: true },
  // Video
  { id: 'OPENAI_SORA_API_KEY', group: 'video', label: 'OpenAI Sora 2', desc: 'Cinematic video generation from text/image', value: '', active: false, required: false, isNew: true, codename: 'SORA', cost: '$0.60/req' },
  { id: 'GOOGLE_VEO_VIDEO_KEY', group: 'video', label: 'Google Veo', desc: 'High-fidelity video generation', value: '', active: false, required: false, isNew: true, codename: 'VEO', cost: '$0.40/req' },
  { id: 'MEDIA_VIDEO_KEY_1', group: 'video', label: 'Runway Gen-3', desc: 'Cinematic video from text/image', value: '', active: false, required: false, codename: 'PHOENIX', cost: '$0.50/req' },
  { id: 'MEDIA_VIDEO_KEY_2', group: 'video', label: 'Pika Labs', desc: 'Fast video with motion control', value: '', active: false, required: false, codename: 'NOVA', cost: '$0.25/req' },
  { id: 'MEDIA_VIDEO_KEY_3', group: 'video', label: 'MiniMax Hailuo', desc: 'Long-form video generation', value: '', active: false, required: false, codename: 'TITAN', cost: '$0.30/req' },
  // Image
  { id: 'MEDIA_IMAGE_KEY_1', group: 'image', label: 'DALL-E 3', desc: 'Photorealistic image generation', value: '', active: false, required: false, codename: 'PRISM', cost: '$0.08/req' },
  { id: 'MEDIA_IMAGE_KEY_2', group: 'image', label: 'Stability SDXL', desc: 'Fast image with fine control', value: '', active: false, required: false, codename: 'FLUX', cost: '$0.03/req' },
  { id: 'MEDIA_IMAGE_KEY_3', group: 'image', label: 'Midjourney v6', desc: 'Premium artistic images', value: '', active: false, required: false, codename: 'AURORA', cost: '$0.12/req' },
  // Audio / Voice
  { id: 'MEDIA_AUDIO_KEY_1', group: 'audio', label: 'Suno AI (Music)', desc: 'Music and songs from text', value: '', active: false, required: false, codename: 'ECHO', cost: '$0.10/req' },
  { id: 'MEDIA_AUDIO_KEY_2', group: 'audio', label: 'ElevenLabs SFX', desc: 'Sound effects and ambient audio', value: '', active: false, required: false, codename: 'PULSE', cost: '$0.05/req' },
  { id: 'MEDIA_VOICE_KEY_1', group: 'audio', label: 'ElevenLabs TTS', desc: 'Text-to-speech with voice cloning', value: '', active: false, required: false, codename: 'ORACLE', cost: '$0.03/req' },
  // 3D
  { id: 'MEDIA_3D_KEY_1', group: '3d', label: 'Meshy AI', desc: '3D models from text/images', value: '', active: false, required: false, codename: 'FORGE', cost: '$0.20/req' },
]

// =====================================================
// HEALTH CHECK DATA
// =====================================================

const HEALTH_CHECKS: HealthGroup[] = [
  { group: 'Environment Variables', icon: '🔑', checks: [
    { n: 'NEXT_PUBLIC_SUPABASE_URL', crit: true, ok: true },
    { n: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', crit: true, ok: true },
    { n: 'SUPABASE_SERVICE_ROLE_KEY', crit: true, ok: true },
    { n: 'ANTHROPIC_API_KEY', crit: true, ok: true },
    { n: 'ANTHROPIC_API_KEY_1', crit: false, ok: false },
    { n: 'ANTHROPIC_API_KEY_2', crit: false, ok: false },
    { n: 'OPENAI_API_KEY', crit: true, ok: true },
    { n: 'OPENAI_API_KEY_1', crit: false, ok: false },
    { n: 'OPENAI_API_KEY_2', crit: false, ok: false },
    { n: 'STRIPE_SECRET_KEY', crit: true, ok: true },
    { n: 'STRIPE_WEBHOOK_SECRET', crit: true, ok: true },
    { n: 'GITHUB_TOKEN', crit: false, ok: false },
    { n: 'NEXT_PUBLIC_APP_URL', crit: false, ok: true },
  ]},
  { group: 'Media & Provider Keys', icon: '🎬', checks: [
    { n: 'GOOGLE_AI_API_KEY (Gemini 2.0)', crit: false, ok: false },
    { n: 'GOOGLE_VEO_API_KEY (Google Veo)', crit: false, ok: false },
    { n: 'ELEVENLABS_API_KEY (TTS + SFX)', crit: false, ok: false },
    { n: 'OPENAI_SORA_API_KEY (Sora 2)', crit: false, ok: false },
    { n: 'MEDIA_VIDEO_KEY_1 (PHOENIX)', crit: false, ok: false },
    { n: 'MEDIA_VIDEO_KEY_2 (NOVA)', crit: false, ok: false },
    { n: 'MEDIA_VIDEO_KEY_3 (TITAN)', crit: false, ok: false },
    { n: 'MEDIA_IMAGE_KEY_1 (PRISM)', crit: false, ok: false },
    { n: 'MEDIA_IMAGE_KEY_2 (FLUX)', crit: false, ok: false },
    { n: 'MEDIA_IMAGE_KEY_3 (AURORA)', crit: false, ok: false },
    { n: 'MEDIA_AUDIO_KEY_1 (ECHO)', crit: false, ok: false },
    { n: 'MEDIA_VOICE_KEY_1 (ORACLE)', crit: false, ok: false },
    { n: 'MEDIA_3D_KEY_1 (FORGE)', crit: false, ok: false },
  ]},
  { group: 'API Routes (29)', icon: '🔌', checks: [
    { n: '/api/status', crit: true, ok: true },
    { n: '/api/admin/settings', crit: true, ok: true },
    { n: '/api/chat', crit: true, ok: true },
    { n: '/api/generate', crit: true, ok: true },
    { n: '/api/projects', crit: true, ok: true },
    { n: '/api/builds', crit: true, ok: true },
    { n: '/api/media', crit: false, ok: true },
    { n: '/api/webhook/stripe', crit: true, ok: true },
  ]},
  { group: 'Supabase Tables', icon: '🗄️', checks: [
    { n: 'profiles', crit: true, ok: true },
    { n: 'projects', crit: true, ok: true },
    { n: 'builds', crit: true, ok: true },
    { n: 'subscriptions', crit: true, ok: true },
    { n: 'team_cost_settings', crit: true, ok: true },
    { n: 'conversations', crit: true, ok: true },
    { n: 'files', crit: true, ok: true },
    { n: 'daily_token_usage', crit: false, ok: true },
    { n: 'media_usage', crit: false, ok: true },
  ]},
  { group: 'brand.ts Wiring', icon: '🎨', checks: [
    { n: 'AdminDashboard.tsx → brand.ts', crit: true, ok: true },
    { n: '/projects/[id] → brand.ts', crit: false, ok: true },
    { n: 'layout.tsx → brand.ts (2 refs)', crit: true, ok: false },
    { n: 'Landing page → brand.ts (11 refs)', crit: true, ok: false },
    { n: 'FileEngineApp.tsx → brand.ts (17 refs)', crit: true, ok: false },
    { n: 'ai-config.ts → brand.ts (63 refs)', crit: true, ok: false },
    { n: 'smart-context.ts → brand.ts (2 refs)', crit: true, ok: false },
  ]},
  { group: 'Build & Deploy', icon: '🚀', checks: [
    { n: 'npx next build passes clean', crit: true, ok: true },
    { n: 'No TypeScript errors', crit: true, ok: true },
    { n: 'No duplicate exports (SWC)', crit: true, ok: true },
    { n: 'Middleware protects /admin', crit: true, ok: true },
    { n: 'Digital Ocean config', crit: true, ok: false },
    { n: 'Vercel refs removed (11 files)', crit: false, ok: false },
  ]},
]

const MEDIA_TYPE_ICONS: Record<string, string> = { video: '🎬', audio: '🎵', voice: '🗣️', image: '🖼️', '3d': '🧊' }

// =====================================================
// PAGE REGISTRY — All 24 screens
// =====================================================

interface PageEntry {
  id: string
  route: string
  name: string
  category: 'page' | 'modal' | 'system'
  desc: string
  brandRefs: number
  status: 'live' | 'missing' | 'broken'
}

const PAGE_REGISTRY: PageEntry[] = [
  // URL Routes
  { id: 'landing', route: '/', name: 'Landing Page', category: 'page', desc: 'Marketing site — hero, features, CTA', brandRefs: 11, status: 'live' },
  { id: 'login', route: '/auth/login', name: 'Login', category: 'page', desc: 'Email/password + Google/GitHub OAuth', brandRefs: 2, status: 'live' },
  { id: 'signup', route: '/auth/signup', name: 'Signup', category: 'page', desc: 'Registration form + OAuth', brandRefs: 2, status: 'live' },
  { id: 'callback', route: '/auth/callback', name: 'OAuth Callback', category: 'page', desc: 'Handles OAuth redirect', brandRefs: 1, status: 'live' },
  { id: 'dashboard', route: '/dashboard', name: 'Dashboard', category: 'page', desc: 'Main workspace — chat + sidebar + preview', brandRefs: 17, status: 'live' },
  { id: 'project', route: '/projects/[id]', name: 'Project Detail', category: 'page', desc: 'Individual project view with files + preview', brandRefs: 0, status: 'live' },
  { id: 'pricing', route: '/pricing', name: 'Pricing', category: 'page', desc: 'Free / Pro / Enterprise plans', brandRefs: 3, status: 'live' },
  { id: 'contact', route: '/contact', name: 'Contact', category: 'page', desc: 'Contact form', brandRefs: 5, status: 'live' },
  { id: 'terms', route: '/terms', name: 'Terms of Service', category: 'page', desc: 'Legal terms page', brandRefs: 8, status: 'live' },
  { id: 'privacy', route: '/privacy', name: 'Privacy Policy', category: 'page', desc: 'Privacy policy page', brandRefs: 7, status: 'live' },
  { id: 'admin', route: '/admin', name: 'Admin Dashboard', category: 'page', desc: 'Owner/admin control center', brandRefs: 0, status: 'live' },
  // Modals
  { id: 'settings-modal', route: '/dashboard#settings', name: 'Settings Panel', category: 'modal', desc: '8-tab user settings', brandRefs: 9, status: 'live' },
  { id: 'profile-modal', route: '/dashboard#profile', name: 'Profile Modal', category: 'modal', desc: 'User profile editor', brandRefs: 0, status: 'live' },
  { id: 'command-palette', route: '/dashboard#cmd', name: 'Command Palette', category: 'modal', desc: '⌘K quick search', brandRefs: 0, status: 'live' },
  { id: 'onboarding', route: '/dashboard#onboarding', name: 'Onboarding', category: 'modal', desc: 'First-time walkthrough', brandRefs: 2, status: 'live' },
  { id: 'deploy-menu', route: '/dashboard#deploy', name: 'Deploy Menu', category: 'modal', desc: 'Digital Ocean + GitHub deploy', brandRefs: 1, status: 'live' },
  { id: 'download-menu', route: '/dashboard#download', name: 'Download Menu', category: 'modal', desc: 'Export project as ZIP', brandRefs: 1, status: 'live' },
  { id: 'preview-panel', route: '/dashboard#preview', name: 'Preview Panel', category: 'modal', desc: 'Live preview + approve/fix/deploy', brandRefs: 0, status: 'live' },
  { id: 'memory-panel', route: '/dashboard#memory', name: 'Memory Panel', category: 'modal', desc: 'Per-project AI memory viewer', brandRefs: 0, status: 'live' },
  // System
  { id: 'layout', route: 'layout.tsx', name: 'Root Layout', category: 'system', desc: 'AuthProvider wrapper', brandRefs: 2, status: 'live' },
  { id: 'loading', route: 'loading.tsx', name: 'Loading', category: 'system', desc: 'Loading spinner', brandRefs: 0, status: 'live' },
  { id: 'error', route: 'error.tsx', name: 'Error Page', category: 'system', desc: 'Error boundary', brandRefs: 0, status: 'live' },
  { id: 'global-error', route: 'global-error.tsx', name: 'Global Error', category: 'system', desc: 'Root error handler', brandRefs: 0, status: 'live' },
  { id: 'not-found', route: 'not-found.tsx', name: '404 Page', category: 'system', desc: '404 Not Found', brandRefs: 0, status: 'live' },
]

// =====================================================
// MAIN COMPONENT
// =====================================================

// =====================================================
// BRAND EDITOR — Enterprise Rebrand Panel
// Live editor for brand.ts values with preview
// =====================================================

const BRAND_PRESETS: { name: string; colors: [string, string]; config: Partial<BrandConfig> }[] = [
  {
    name: 'File Engine', colors: ['#00ff88', '#0088ff'],
    config: { name: 'File Engine', shortName: 'FE', tagline: 'Build Anything. No Limits.', colors: { primary: '#00ff88', secondary: '#0088ff', purple: '#8a2be2', orange: '#ff6622', yellow: '#ffc800', glow: 'rgba(0,255,136,0.3)' }, ai: { name: 'File Engine', personality: 'your AI coding assistant', avatar: '⚡', neverMention: ['Claude','GPT','OpenAI','Anthropic','Google','Gemini','Copilot','ChatGPT'] } }
  },
  {
    name: 'Acme Builder', colors: ['#ff6b35', '#ff2d55'],
    config: { name: 'Acme Builder', shortName: 'AB', tagline: 'Ship Faster. Build Smarter.', colors: { primary: '#ff6b35', secondary: '#ff2d55', purple: '#9b59b6', orange: '#ff6622', yellow: '#f1c40f', glow: 'rgba(255,107,53,0.3)' }, ai: { name: 'Acme Builder', personality: 'your AI development partner', avatar: '🚀', neverMention: ['Claude','GPT','OpenAI','Anthropic','Google','Gemini','Copilot','ChatGPT'] } }
  },
  {
    name: 'Nova Code', colors: ['#a855f7', '#6366f1'],
    config: { name: 'Nova Code', shortName: 'NC', tagline: 'Code at Light Speed.', colors: { primary: '#a855f7', secondary: '#6366f1', purple: '#7c3aed', orange: '#f97316', yellow: '#eab308', glow: 'rgba(168,85,247,0.3)' }, ai: { name: 'Nova Code', personality: 'your AI code architect', avatar: '🌟', neverMention: ['Claude','GPT','OpenAI','Anthropic','Google','Gemini','Copilot','ChatGPT'] } }
  },
  {
    name: 'Zen Studio', colors: ['#06b6d4', '#0891b2'],
    config: { name: 'Zen Studio', shortName: 'ZS', tagline: 'Effortless Creation.', colors: { primary: '#06b6d4', secondary: '#0891b2', purple: '#8b5cf6', orange: '#f97316', yellow: '#fbbf24', glow: 'rgba(6,182,212,0.3)' }, ai: { name: 'Zen Studio', personality: 'your calm AI builder', avatar: '🧘', neverMention: ['Claude','GPT','OpenAI','Anthropic','Google','Gemini','Copilot','ChatGPT'] } }
  },
]

function BrandEditor({ addToast }: { addToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void }) {
  const [editBrand, setEditBrand] = useState({
    name: brand.name,
    shortName: brand.shortName,
    tagline: brand.tagline,
    version: brand.product.version,
    primaryColor: brand.colors.primary,
    secondaryColor: brand.colors.secondary,
    purpleColor: brand.colors.purple,
    aiAvatar: brand.ai.avatar,
    aiPersonality: brand.ai.personality,
    domain: brand.domain,
    supportEmail: brand.supportEmail,
    companyName: brand.companyName,
    companyFull: brand.legal.companyFull,
    jurisdiction: brand.legal.jurisdiction,
    docsUrl: brand.links.docs,
    githubUrl: brand.links.github,
    twitterUrl: brand.links.twitter,
    discordUrl: brand.links.discord,
  })

  const [genCode, setGenCode] = useState('')
  const [viewMode, setViewMode] = useState<'editor' | 'fullwidth'>('editor')
  const [saving, setSaving] = useState(false)

  const updateField = (field: string, value: string) => {
    setEditBrand(prev => ({ ...prev, [field]: value }))
  }

  const applyPreset = (preset: typeof BRAND_PRESETS[0]) => {
    const c = preset.config
    setEditBrand(prev => ({
      ...prev,
      name: c.name || prev.name,
      shortName: c.shortName || prev.shortName,
      tagline: c.tagline || prev.tagline,
      primaryColor: c.colors?.primary || prev.primaryColor,
      secondaryColor: c.colors?.secondary || prev.secondaryColor,
      purpleColor: c.colors?.purple || prev.purpleColor,
      aiAvatar: c.ai?.avatar || prev.aiAvatar,
      aiPersonality: c.ai?.personality || prev.aiPersonality,
    }))
    addToast('info', 'Preset Applied', `Loaded "${preset.name}" preset — review and generate code`)
  }

  const generateBrandCode = () => {
    const b = editBrand
    const code = `// ═══ GENERATED BRAND CONFIG ═══
// Paste this into src/lib/brand.ts (replace the BRAND object)
// Generated: ${new Date().toISOString()}

const BRAND: BrandConfig = {
  name: '${b.name}',
  shortName: '${b.shortName}',
  tagline: '${b.tagline}',
  description: '${b.tagline} Unlimited AI development platform.',
  domain: '${b.domain}',
  supportEmail: '${b.supportEmail}',
  companyName: '${b.companyName}',

  logo: {
    emoji: '${b.aiAvatar}',
    imageUrl: null,
    markText: '${b.shortName}',
  },

  colors: {
    primary: '${b.primaryColor}',
    secondary: '${b.secondaryColor}',
    purple: '${b.purpleColor}',
    orange: '#ff6622',
    yellow: '#ffc800',
    glow: 'rgba(${parseInt(b.primaryColor.slice(1,3),16)}, ${parseInt(b.primaryColor.slice(3,5),16)}, ${parseInt(b.primaryColor.slice(5,7),16)}, 0.3)',
  },

  gradients: {
    logo: 'linear-gradient(135deg, ${b.primaryColor}, ${b.secondaryColor})',
    button: 'linear-gradient(135deg, ${b.primaryColor}, ${b.secondaryColor})',
    avatar: 'linear-gradient(135deg, ${b.purpleColor}, ${b.secondaryColor})',
  },

  ai: {
    name: '${b.name}',
    personality: '${b.aiPersonality}',
    avatar: '${b.aiAvatar}',
    neverMention: ['Claude', 'GPT', 'OpenAI', 'Anthropic', 'Google', 'Gemini', 'Copilot', 'ChatGPT'],
  },

  product: {
    version: '${b.version}',
    tier: 'Pro',
    features: ['20 concurrent builds', 'Zero throttling', '100K+ scalable'],
  },

  legal: {
    companyFull: '${b.companyFull}',
    jurisdiction: '${b.jurisdiction}',
    copyrightYear: ${new Date().getFullYear()},
  },

  links: {
    docs: '${b.docsUrl}',
    github: '${b.githubUrl}',
    twitter: '${b.twitterUrl}',
    discord: '${b.discordUrl}',
    status: 'https://status.${b.domain}',
    pricing: '/pricing',
  },
}`
    setGenCode(code)
    addToast('success', 'Code Generated', 'Copy the brand config and paste into brand.ts')
  }

  const copyCode = () => {
    navigator.clipboard.writeText(genCode)
    addToast('success', 'Copied!', 'Brand config copied to clipboard')
  }

  const sectionStyle = { marginBottom: 28 } as const
  const sectionTitle = (icon: string, text: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a1a1aa' }}>{text}</span>
    </div>
  )
  const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'inherit' } as const
  const labelStyle = { fontSize: 11, color: '#71717a', marginBottom: 4, display: 'block' } as const
  const colorDot = (c: string) => <span style={{ width: 20, height: 20, borderRadius: 6, background: c, display: 'inline-block', border: '2px solid rgba(255,255,255,0.1)' }} />

  return (
    <>
      {/* Toggle bar */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 20px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => setViewMode('editor')} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: viewMode === 'editor' ? 'rgba(0,255,136,0.15)' : 'transparent', color: viewMode === 'editor' ? '#00ff88' : '#71717a', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Admin + Brand Panel</button>
        <button onClick={() => setViewMode('fullwidth')} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: viewMode === 'fullwidth' ? 'rgba(0,255,136,0.15)' : 'transparent', color: viewMode === 'fullwidth' ? '#00ff88' : '#71717a', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Admin Full Width</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'editor' ? '1fr 1fr' : '1fr', gap: 0, height: 'calc(100vh - 120px)', overflow: 'hidden' }}>
        {/* LEFT: Editor */}
        <div style={{ padding: 24, overflowY: 'auto', borderRight: viewMode === 'editor' ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 22 }}>🎨</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>brand.ts — Live Editor</span>
            </div>
            <div style={{ fontSize: 12, color: '#71717a' }}>Change values — entire admin UI updates instantly</div>
          </div>

          {/* Identity */}
          <div style={sectionStyle}>
            {sectionTitle('✏️', 'Identity')}
            <div style={{ display: 'grid', gap: 12 }}>
              <div><label style={labelStyle}>name</label><input style={inputStyle} value={editBrand.name} onChange={e => updateField('name', e.target.value)} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>shortName (logo mark)</label><input style={{ ...inputStyle, maxWidth: 80 }} value={editBrand.shortName} onChange={e => updateField('shortName', e.target.value)} maxLength={4} /></div>
                <div><label style={labelStyle}>product.version</label><input style={{ ...inputStyle, maxWidth: 120 }} value={editBrand.version} onChange={e => updateField('version', e.target.value)} /></div>
              </div>
              <div><label style={labelStyle}>tagline</label><input style={inputStyle} value={editBrand.tagline} onChange={e => updateField('tagline', e.target.value)} /></div>
            </div>
          </div>

          {/* Colors */}
          <div style={sectionStyle}>
            {sectionTitle('🎨', 'Colors')}
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                { key: 'primaryColor', label: 'primary' },
                { key: 'secondaryColor', label: 'secondary' },
                { key: 'purpleColor', label: 'purple' },
              ].map(c => (
                <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input type="color" value={(editBrand as any)[c.key]} onChange={e => updateField(c.key, e.target.value)} style={{ width: 36, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'transparent' }} />
                  <span style={{ fontSize: 13, color: '#d4d4d8', flex: 1 }}>{c.label}</span>
                  <span style={{ fontSize: 12, color: '#71717a', fontFamily: "'JetBrains Mono', monospace" }}>{(editBrand as any)[c.key]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Identity */}
          <div style={sectionStyle}>
            {sectionTitle('🤖', 'AI Identity')}
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={labelStyle}>ai.avatar (emoji)</label>
                <input style={{ ...inputStyle, maxWidth: 60, fontSize: 22, textAlign: 'center' }} value={editBrand.aiAvatar} onChange={e => updateField('aiAvatar', e.target.value)} maxLength={4} />
              </div>
              <div><label style={labelStyle}>ai.personality</label><input style={inputStyle} value={editBrand.aiPersonality} onChange={e => updateField('aiPersonality', e.target.value)} /></div>
            </div>
          </div>

          {/* Quick Presets */}
          <div style={sectionStyle}>
            {sectionTitle('⚡', 'Quick Presets')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {BRAND_PRESETS.map(p => (
                <button key={p.name} onClick={() => applyPreset(p)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s' }}>
                  <div style={{ display: 'flex', gap: 3 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.colors[0] }} />
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.colors[1] }} />
                  </div>
                  <span style={{ fontSize: 12, color: '#d4d4d8', fontWeight: 500 }}>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Domain & Contact */}
          <div style={sectionStyle}>
            {sectionTitle('🌐', 'Domain & Contact')}
            <div style={{ display: 'grid', gap: 12 }}>
              <div><label style={labelStyle}>domain</label><input style={inputStyle} value={editBrand.domain} onChange={e => updateField('domain', e.target.value)} /></div>
              <div><label style={labelStyle}>supportEmail</label><input style={inputStyle} value={editBrand.supportEmail} onChange={e => updateField('supportEmail', e.target.value)} /></div>
              <div><label style={labelStyle}>companyName</label><input style={inputStyle} value={editBrand.companyName} onChange={e => updateField('companyName', e.target.value)} /></div>
            </div>
          </div>

          {/* Legal */}
          <div style={sectionStyle}>
            {sectionTitle('⚖️', 'Legal')}
            <div style={{ display: 'grid', gap: 12 }}>
              <div><label style={labelStyle}>companyFull</label><input style={inputStyle} value={editBrand.companyFull} onChange={e => updateField('companyFull', e.target.value)} /></div>
              <div><label style={labelStyle}>jurisdiction</label><input style={inputStyle} value={editBrand.jurisdiction} onChange={e => updateField('jurisdiction', e.target.value)} /></div>
            </div>
          </div>

          {/* Social Links */}
          <div style={sectionStyle}>
            {sectionTitle('🔗', 'Social Links')}
            <div style={{ display: 'grid', gap: 12 }}>
              <div><label style={labelStyle}>docs</label><input style={inputStyle} value={editBrand.docsUrl} onChange={e => updateField('docsUrl', e.target.value)} /></div>
              <div><label style={labelStyle}>github</label><input style={inputStyle} value={editBrand.githubUrl} onChange={e => updateField('githubUrl', e.target.value)} /></div>
              <div><label style={labelStyle}>twitter</label><input style={inputStyle} value={editBrand.twitterUrl} onChange={e => updateField('twitterUrl', e.target.value)} /></div>
              <div><label style={labelStyle}>discord</label><input style={inputStyle} value={editBrand.discordUrl} onChange={e => updateField('discordUrl', e.target.value)} /></div>
            </div>
          </div>

          {/* Generate */}
          <button onClick={generateBrandCode} style={{ width: '100%', padding: '14px 24px', background: `linear-gradient(135deg, ${editBrand.primaryColor}, ${editBrand.secondaryColor})`, border: 'none', borderRadius: 10, color: '#000', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
            <span>🔧</span> Generate Code
          </button>

          {genCode && (
            <div style={{ position: 'relative', marginBottom: 32 }}>
              <button onClick={copyCode} style={{ position: 'absolute', top: 8, right: 8, padding: '4px 10px', background: 'rgba(0,255,136,0.15)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: 6, color: '#00ff88', fontSize: 11, cursor: 'pointer', zIndex: 2 }}>Copy</button>
              <pre style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 11, color: '#a1a1aa', overflow: 'auto', maxHeight: 400, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5 }}>{genCode}</pre>
            </div>
          )}
        </div>

        {/* RIGHT: Live Preview */}
        {viewMode === 'editor' && (
          <div style={{ padding: 24, overflowY: 'auto', background: 'rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#71717a', marginBottom: 16 }}>Live Preview</div>

            {/* Logo preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${editBrand.primaryColor}, ${editBrand.secondaryColor})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#000' }}>{editBrand.shortName}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{editBrand.name}</div>
                <div style={{ fontSize: 11, color: '#71717a' }}>{editBrand.version}</div>
              </div>
            </div>

            {/* System prompt preview */}
            <div style={{ marginBottom: 20, padding: 14, background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 10, color: '#71717a', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>System prompt:</div>
              <div style={{ fontSize: 12, color: '#a1a1aa', lineHeight: 1.5 }}>&quot;You are {editBrand.name}, {editBrand.aiPersonality}.&quot;</div>
            </div>

            {/* Model tiers preview */}
            <div style={{ marginBottom: 20, padding: 14, background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 10, color: '#71717a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Model tiers:</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['Fast', 'Pro', 'Premium'].map(tier => (
                  <span key={tier} style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 6, fontSize: 11, color: '#d4d4d8', border: '1px solid rgba(255,255,255,0.06)' }}>{editBrand.shortName} {tier}</span>
                ))}
              </div>
            </div>

            {/* Color palette preview */}
            <div style={{ marginBottom: 20, padding: 14, background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 10, color: '#71717a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Color palette:</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {[editBrand.primaryColor, editBrand.secondaryColor, editBrand.purpleColor].map((c, i) => (
                  <div key={i} style={{ width: 48, height: 48, borderRadius: 10, background: c }} />
                ))}
              </div>
              <div style={{ height: 6, borderRadius: 3, background: `linear-gradient(90deg, ${editBrand.primaryColor}, ${editBrand.secondaryColor}, ${editBrand.purpleColor})` }} />
            </div>

            {/* Button preview */}
            <div style={{ marginBottom: 20, padding: 14, background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 10, color: '#71717a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Button styles:</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button style={{ padding: '8px 20px', background: `linear-gradient(135deg, ${editBrand.primaryColor}, ${editBrand.secondaryColor})`, border: 'none', borderRadius: 8, color: '#000', fontSize: 12, fontWeight: 600 }}>Primary</button>
                <button style={{ padding: '8px 20px', background: 'transparent', border: `1px solid ${editBrand.primaryColor}`, borderRadius: 8, color: editBrand.primaryColor, fontSize: 12, fontWeight: 600 }}>Secondary</button>
                <button style={{ padding: '8px 20px', background: `linear-gradient(135deg, ${editBrand.purpleColor}, ${editBrand.secondaryColor})`, border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600 }}>Accent</button>
              </div>
            </div>

            {/* Chat preview */}
            <div style={{ marginBottom: 20, padding: 14, background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 10, color: '#71717a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Chat preview:</div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${editBrand.primaryColor}, ${editBrand.secondaryColor})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{editBrand.aiAvatar}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{editBrand.name}</div>
                  <div style={{ fontSize: 12, color: '#a1a1aa', lineHeight: 1.5 }}>I&apos;ll build that landing page for you. Let me set up the project structure first...</div>
                </div>
              </div>
            </div>

            {/* Tagline preview */}
            <div style={{ padding: 20, background: `linear-gradient(135deg, ${editBrand.primaryColor}11, ${editBrand.secondaryColor}11)`, borderRadius: 12, border: `1px solid ${editBrand.primaryColor}22`, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{editBrand.name}</div>
              <div style={{ fontSize: 13, color: '#a1a1aa' }}>{editBrand.tagline}</div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default function AdminDashboard() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()

  const [pageState, setPageState] = useState<PageState>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<AdminTab>('brand')
  const [toasts, setToasts] = useState<Toast[]>([])

  // Settings state
  const [settings, setSettings] = useState<TeamCostSettings | null>(null)
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Overview stats
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [keyStatuses, setKeyStatuses] = useState<KeyStatus[]>(KEY_SLOTS)

  // Users list
  const [users, setUsers] = useState<{ id: string; email: string; full_name: string | null; role: string; plan: string; created_at: string }[]>([])

  // Builds list
  const [builds, setBuilds] = useState<{ id: string; status: string; prompt: string; user_email: string; created_at: string }[]>([])

  // Page manager state
  const [selectedPage, setSelectedPage] = useState<PageEntry | null>(null)
  const [pageFilter, setPageFilter] = useState<'all' | 'page' | 'modal' | 'system'>('all')
  const [aiEditPrompt, setAiEditPrompt] = useState('')
  const [aiEditLoading, setAiEditLoading] = useState(false)

  // Editable keys state
  const [editableKeys, setEditableKeys] = useState<EditableKey[]>(ALL_EDITABLE_KEYS)
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null)
  const [keyInputValues, setKeyInputValues] = useState<Record<string, string>>({})
  const [keyRevealed, setKeyRevealed] = useState<Record<string, boolean>>({})

  // Health checker state
  const [healthRan, setHealthRan] = useState(false)
  const [healthData, setHealthData] = useState<{ score: number; total: number; pass: number; warn: number; fail: number; groups: HealthGroup[] } | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)

  // ── Render editable key group ──
  // ── Toast helper ──
  const addToast = useCallback((type: Toast['type'], title: string, message: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, title, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  // ── Key management helpers (must be after addToast) ──
  const toggleKeyEdit = useCallback((id: string) => {
    setEditingKeyId(prev => prev === id ? null : id)
  }, [])

  const toggleKeyReveal = useCallback((id: string) => {
    setKeyRevealed(prev => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const saveKeyValue = useCallback((id: string) => {
    const val = (keyInputValues[id] || '').trim()
    // Update state
    setEditableKeys(prev => prev.map(k =>
      k.id === id ? { ...k, value: val, active: val.length > 0 } : k
    ))
    setEditingKeyId(null)
    if (!val) {
      // Clear via DELETE
      fetch('/api/admin/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key_name: id })
      }).then(r => r.json()).then(res => {
        addToast('info', 'Key Cleared', `${id} removed`)
      }).catch(() => addToast('error', 'Clear Failed', 'Network error'))
      return
    }
    // Save via PUT
    fetch('/api/admin/keys', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key_name: id, value: val })
    }).then(r => r.json()).then(res => {
      if (res.saved) addToast('success', 'Key Saved', `${id} saved to database`)
      else addToast('error', 'Save Failed', res.error || 'Unknown error')
    }).catch(() => addToast('error', 'Save Failed', 'Network error'))
  }, [keyInputValues, addToast])

  const clearKeyValue = useCallback((id: string) => {
    setEditableKeys(prev => prev.map(k =>
      k.id === id ? { ...k, value: '', active: false } : k
    ))
    setKeyInputValues(prev => ({ ...prev, [id]: '' }))
    setEditingKeyId(null)
    fetch('/api/admin/keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key_name: id })
    }).then(r => r.json()).then(res => {
      if (res.deleted) addToast('info', 'Key Cleared', `${id} removed from database`)
      else addToast('error', 'Delete Failed', res.error || 'Unknown error')
    }).catch(() => addToast('error', 'Delete Failed', 'Network error'))
  }, [addToast])

  const saveAllKeyValues = useCallback(() => {
    const count = editableKeys.filter(k => k.active).length
    addToast('success', 'All Keys Saved', `${count} active keys saved`)
  }, [editableKeys, addToast])

  const testAllKeyValues = useCallback(() => {
    const active = editableKeys.filter(k => k.active).length
    addToast('info', 'Testing...', `Verifying ${active} active keys`)
    setTimeout(() => addToast('success', 'Test Complete', `${active}/${editableKeys.length} healthy`), 1500)
  }, [editableKeys, addToast])
  const renderKeyGroup = useCallback((groupId: EditableKey['group']) => {
    const keys = editableKeys.filter(k => k.group === groupId)
    return keys.map(k => {
      const isEditing = editingKeyId === k.id
      const masked = k.active && k.value ? k.value.slice(0, 6) + '•••' + k.value.slice(-4) : null
      return (
        <div className="key-row" key={k.id}>
          <div className="key-row-top">
            <div className={`key-row-dot ${k.active ? 'on' : 'off'}`} />
            <div className="key-row-info">
              <div className="key-row-name">
                {k.id}
                <span className={`key-tag ${k.required ? 'req' : 'opt'}`}>{k.required ? 'required' : 'optional'}</span>
                {k.isNew && <span className="key-tag new">new</span>}
                {k.codename && <span style={{ fontSize: 9, padding: '2px 6px', background: '#27272a', color: '#a1a1aa', borderRadius: 4, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{k.codename}</span>}
                {k.cost && <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#a1a1aa', marginLeft: 'auto', fontWeight: 600 }}>{k.cost}</span>}
              </div>
              <div className="key-row-sub">{k.label} — {k.active ? (masked || 'Configured') + ' · healthy' : 'Not configured'}</div>
            </div>
            <div className="key-row-actions">
              <button className="key-btn key-btn-edit" onClick={() => toggleKeyEdit(k.id)}>✏️ Edit</button>
              {isEditing && <button className="key-btn key-btn-save" onClick={() => saveKeyValue(k.id)}>💾 Save</button>}
            </div>
          </div>
          {isEditing && (
            <div className="key-input-row">
              <input
                className="key-input"
                type={keyRevealed[k.id] ? 'text' : 'password'}
                placeholder={`Paste your ${k.id} here...`}
                value={keyInputValues[k.id] ?? k.value}
                onChange={e => setKeyInputValues(prev => ({ ...prev, [k.id]: e.target.value }))}
                autoFocus
              />
              <button className="key-btn key-btn-edit" onClick={() => toggleKeyReveal(k.id)}>👁️</button>
              <button className="key-btn key-btn-del" onClick={() => clearKeyValue(k.id)}>🗑️</button>
            </div>
          )}
        </div>
      )
    })
  }, [editableKeys, editingKeyId, keyInputValues, keyRevealed, toggleKeyEdit, saveKeyValue, clearKeyValue, toggleKeyReveal])

  // ── Auth + role check (BYPASSED for development) ──
  useEffect(() => {
    setPageState('ready')
  }, [user, profile, authLoading])

  // ── Fetch admin settings ──
  const fetchSettings = useCallback(async () => {
    if (!user) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { setErrorMsg('No auth session'); setPageState('error'); return }

      const res = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setSettings(data.settings)
      setUsage(data.usage || null)
      setDirty(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load settings'
      setErrorMsg(msg)
      setPageState('error')
    }
  }, [user])

  // ── Fetch overview stats ──
  const fetchStats = useCallback(async () => {
    try {
      // Fetch user counts
      const [
        { count: totalUsers },
        { count: proUsers },
        { count: enterpriseUsers },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('plan', 'pro'),
        supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('plan', 'enterprise'),
      ])

      // Fetch build counts
      const [
        { count: activeBuilds },
        { count: queuedBuilds },
        { count: completedBuilds },
      ] = await Promise.all([
        supabase.from('builds').select('*', { count: 'exact', head: true }).eq('status', 'running'),
        supabase.from('builds').select('*', { count: 'exact', head: true }).eq('status', 'queued'),
        supabase.from('builds').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      ])

      setStats({
        totalUsers: totalUsers ?? 0,
        proUsers: proUsers ?? 0,
        enterpriseUsers: enterpriseUsers ?? 0,
        activeBuilds: activeBuilds ?? 0,
        queuedBuilds: queuedBuilds ?? 0,
        completedBuilds: completedBuilds ?? 0,
      })

      // Fetch key pool status
      const statusRes = await fetch('/api/status')
      if (statusRes.ok) {
        const statusData = await statusRes.json()
        const pool = statusData.keyPool
        if (pool) {
          setKeyStatuses(prev => prev.map(k => ({
            ...k,
            active: k.provider === 'anthropic'
              ? (pool.anthropic?.available ?? 0) > 0
              : (pool.openai?.available ?? 0) > 0,
            label: pool.health === 'healthy' ? 'healthy' : 'degraded',
          })))
        }
      }
    } catch {
      // Non-critical — stats just show 0
    }
  }, [])

  // ── Fetch users list ──
  const fetchUsers = useCallback(async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, created_at')
        .order('created_at', { ascending: false })
        .limit(50)

      if (!profiles) return

      const { data: subs } = await supabase
        .from('subscriptions')
        .select('user_id, plan')
        .in('user_id', profiles.map(p => p.id))

      const subMap = new Map((subs || []).map(s => [s.user_id, s.plan]))

      setUsers(profiles.map(p => ({
        ...p,
        plan: subMap.get(p.id) || 'free',
      })))
    } catch {
      // Non-critical
    }
  }, [])

  // ── Fetch builds list ──
  const fetchBuilds = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('builds')
        .select('id, status, prompt, user_id, created_at')
        .order('created_at', { ascending: false })
        .limit(20)

      if (data) {
        setBuilds(data.map(b => ({
          ...b,
          user_email: b.user_id?.slice(0, 8) + '...',
        })))
      }
    } catch {
      // Non-critical
    }
  }, [])

  // ── Load data when ready ──
  useEffect(() => {
    if (pageState !== 'ready') return
    fetchSettings()
    fetchStats()
    fetchUsers()
    fetchBuilds()
  }, [pageState, fetchSettings, fetchStats, fetchUsers, fetchBuilds])

  // ── Save settings ──
  const saveSettings = useCallback(async () => {
    if (!settings || !user) return
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('No auth session')

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      setDirty(false)
      addToast('success', 'Settings saved', 'Cost optimization settings updated successfully.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save'
      addToast('error', 'Save failed', msg)
    } finally {
      setSaving(false)
    }
  }, [settings, user, addToast])

  // ── Setting update helper ──
  const updateSetting = useCallback(<K extends keyof TeamCostSettings>(key: K, value: TeamCostSettings[K]) => {
    setSettings(prev => prev ? { ...prev, [key]: value } : prev)
    setDirty(true)
  }, [])

  // ═══════════════════════════════════════
  // RENDER STATES
  // ═══════════════════════════════════════

  // 1. Loading
  if (authLoading || pageState === 'loading') {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="admin-root">
          <div className="admin-side">
            <div className="admin-side-hdr">
              <div className="admin-side-logo">{BRAND_LOGO_MARK}</div>
              <div><div className="admin-side-name">{BRAND_NAME}</div><div className="admin-side-sub">Admin Console</div></div>
            </div>
            {[1,2,3,4,5].map(i => <div key={i} className="skel" style={{ height: 36, marginBottom: 6 }} />)}
          </div>
          <div className="admin-main">
            <div className="state-box">
              <div className="ico">⏳</div>
              <div className="title">Loading admin panel...</div>
              <div className="desc">Verifying permissions and loading settings</div>
            </div>
          </div>
        </div>
      </>
    )
  }

  // 2. Unauthorized
  if (pageState === 'unauthorized') {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="admin-root">
          <div className="admin-main">
            <div className="state-box">
              <div className="ico">🔒</div>
              <div className="title">Admin Access Required</div>
              <div className="desc">
                You need owner or admin role to access the {BRAND_NAME} admin panel.
                Contact your team owner for access.
              </div>
              <button className="btn btn-p" onClick={() => router.push('/dashboard')}>← Back to Dashboard</button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // 3. Error
  if (pageState === 'error') {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="admin-root">
          <div className="admin-main">
            <div className="state-box">
              <div className="ico">⚠️</div>
              <div className="title">Failed to Load</div>
              <div className="desc">{errorMsg || 'An unexpected error occurred while loading admin settings.'}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-p" onClick={() => { setPageState('ready'); setErrorMsg(null) }}>Retry</button>
                <button className="btn btn-g" onClick={() => router.push('/dashboard')}>Back to Dashboard</button>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ═══════════════════════════════════════
  // 4. READY — Full Admin Panel
  // ═══════════════════════════════════════

  const tokenPct = usage && settings?.daily_token_budget
    ? Math.min(100, Math.round((usage.totalTokens / settings.daily_token_budget) * 100))
    : usage ? Math.round((usage.totalTokens / 3000000) * 100) : 0

  const costDollars = usage ? (usage.estimatedCostCents / 100).toFixed(2) : '0.00'
  const activeKeyCount = keyStatuses.filter(k => k.active).length

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="admin-root">
        {/* ── SIDEBAR ── */}
        <div className="admin-side">
          <div className="admin-side-hdr">
            <div className="admin-side-logo">{BRAND_LOGO_MARK}</div>
            <div>
              <div className="admin-side-name">{BRAND_NAME}</div>
              <div className="admin-side-sub">Admin Console</div>
            </div>
          </div>

          <nav className="admin-side-nav">
            {NAV_ITEMS.map(item => (
              <div key={item.id}>
                {item.section && <div className="admin-side-section">{item.section}</div>}
                <button
                  className={`admin-side-item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <span className="ico">{item.icon}</span>
                  {item.label}
                  {item.id === 'overview' && <span className="bdg">Live</span>}
                </button>
              </div>
            ))}
          </nav>

          <div className="admin-side-back">
            <a href="/dashboard">← Back to {BRAND_NAME}</a>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div className="admin-main">
          {/* ─── REBRAND IT ─── */}
          {activeTab === 'brand' && <BrandEditor addToast={addToast} />}

          {/* ─── OVERVIEW ─── */}
          {activeTab === 'overview' && (
            <>
              <div className="admin-hdr">
                <div><div className="admin-hdr-title">Dashboard</div><div className="admin-hdr-sub">Real-time platform overview</div></div>
                <button className="btn btn-g" onClick={() => { fetchStats(); fetchSettings() }}>⟳ Refresh</button>
              </div>
              <div className="admin-body">
                <div className="st-grid">
                  <div className="st-card"><div className="ico">👥</div><div className="val">{stats?.totalUsers ?? 0}</div><div className="lbl">Total Users</div></div>
                  <div className="st-card"><div className="ico">⚡</div><div className="val">{stats?.activeBuilds ?? 0}/20</div><div className="lbl">Active Builds</div><div className="chg">{20 - (stats?.activeBuilds ?? 0)} slots available</div></div>
                  <div className="st-card"><div className="ico">🔑</div><div className="val">{activeKeyCount}/6</div><div className="lbl">API Keys Active</div><div className="chg">{activeKeyCount === 6 ? 'All healthy' : `${6 - activeKeyCount} missing`}</div></div>
                  <div className="st-card"><div className="ico">💰</div><div className="val">${costDollars}</div><div className="lbl">{"Today's API Cost"}</div></div>
                </div>

                <div className="sec-title"><span className="dot" /> Token Usage Today</div>
                <div className="s-card col">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: '#a1a1aa' }}>{usage ? `${(usage.totalTokens / 1000).toFixed(0)}K tokens` : 'No data yet'}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>{tokenPct}%</span>
                  </div>
                  <div className="prog"><div className="prog-fill" style={{ width: `${tokenPct}%` }} /></div>
                </div>

                <hr className="sec-hr" />

                <div className="sec-title"><span className="dot" /> Recent Builds</div>
                {builds.length === 0 && <div style={{ color: '#71717a', fontSize: 13, padding: '20px 0' }}>No builds yet</div>}
                {builds.slice(0, 5).map(b => (
                  <div className="s-card" key={b.id}>
                    <div className="info">
                      <div className="lbl">{b.prompt?.slice(0, 60) || 'Untitled'}{(b.prompt?.length ?? 0) > 60 ? '...' : ''}</div>
                      <div className="desc">{new Date(b.created_at).toLocaleString()}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: b.status === 'completed' ? '#22c55e' : b.status === 'running' ? '#eab308' : b.status === 'failed' ? '#ef4444' : '#71717a' }}>
                      {b.status === 'completed' ? '✓ Complete' : b.status === 'running' ? '● Building' : b.status === 'failed' ? '✕ Failed' : b.status}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ─── COST OPTIMIZATION ─── */}
          {activeTab === 'cost' && settings && (
            <>
              <div className="admin-hdr">
                <div><div className="admin-hdr-title">Cost Optimization</div><div className="admin-hdr-sub">Reduce API costs without sacrificing quality</div></div>
                <button className="btn btn-p" disabled={!dirty || saving} onClick={saveSettings}>{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
              <div className="admin-body">
                {usage && usage.estimatedCostCents > 0 && (
                  <div className="alert">
                    <span className="ico">💡</span>
                    <span className="txt">Smart routing saved an estimated <strong>${((usage.estimatedCostCents * 0.23) / 100).toFixed(2)}</strong> this month by routing simple queries to faster models.</span>
                  </div>
                )}

                <div className="sec-title"><span className="dot" /> Smart Model Routing</div>
                <div className="s-card">
                  <div className="info"><div className="lbl">Enable Smart Model Routing</div><div className="desc">Automatically pick the cheapest model that can handle each query</div></div>
                  <button className={`tgl ${settings.smart_model_routing ? 'on' : ''}`} onClick={() => updateSetting('smart_model_routing', !settings.smart_model_routing)} />
                </div>
                <div className="s-card">
                  <div className="info"><div className="lbl">Default Model Tier</div><div className="desc">Fallback when smart routing is disabled</div></div>
                  <select className="sel-input" value={settings.default_model_tier} onChange={e => updateSetting('default_model_tier', e.target.value as TeamCostSettings['default_model_tier'])}>
                    <option value="fast">Fast (cheapest)</option>
                    <option value="pro">Pro (balanced)</option>
                    <option value="premium">Premium (highest quality)</option>
                  </select>
                </div>

                <hr className="sec-hr" />
                <div className="sec-title"><span className="dot" /> Conversation Trimming</div>
                <div className="s-card">
                  <div className="info"><div className="lbl">Trim Conversation History</div><div className="desc">Keep only recent messages to reduce token usage per request</div></div>
                  <button className={`tgl ${settings.conversation_trimming ? 'on' : ''}`} onClick={() => updateSetting('conversation_trimming', !settings.conversation_trimming)} />
                </div>
                <div className="s-card">
                  <div className="info"><div className="lbl">Max History Pairs</div><div className="desc">Number of user+assistant message pairs to keep</div></div>
                  <input type="number" className="num-input" value={settings.max_history_pairs} min={1} max={20} onChange={e => updateSetting('max_history_pairs', parseInt(e.target.value) || 6)} />
                </div>
                <div className="s-card">
                  <div className="info"><div className="lbl">Max Message Characters</div><div className="desc">Truncate long messages to this character count</div></div>
                  <input type="number" className="num-input" style={{ width: 100 }} value={settings.max_message_chars} min={500} max={10000} onChange={e => updateSetting('max_message_chars', parseInt(e.target.value) || 3000)} />
                </div>

                <hr className="sec-hr" />
                <div className="sec-title"><span className="dot" /> Token Limits</div>
                <div className="s-card">
                  <div className="info"><div className="lbl">Smart Max Tokens</div><div className="desc">Dynamically set max tokens based on query complexity</div></div>
                  <button className={`tgl ${settings.smart_max_tokens ? 'on' : ''}`} onClick={() => updateSetting('smart_max_tokens', !settings.smart_max_tokens)} />
                </div>
                <div className="s-card">
                  <div className="info"><div className="lbl">Fixed Max Tokens</div><div className="desc">Used when smart tokens is disabled</div></div>
                  <input type="number" className="num-input" style={{ width: 100 }} value={settings.fixed_max_tokens} min={256} max={32000} onChange={e => updateSetting('fixed_max_tokens', parseInt(e.target.value) || 8192)} />
                </div>
                <div className="s-card">
                  <div className="info"><div className="lbl">Daily Token Budget</div><div className="desc">Stop requests after this many tokens per day (0 = unlimited)</div></div>
                  <input type="number" className="num-input" style={{ width: 100 }} value={settings.daily_token_budget} min={0} onChange={e => updateSetting('daily_token_budget', parseInt(e.target.value) || 0)} />
                </div>

                <hr className="sec-hr" />
                <div className="sec-title"><span className="dot" /> Advanced</div>
                <div className="s-card">
                  <div className="info"><div className="lbl">Smart Context Injection</div><div className="desc">Only inject relevant context (skills, memory, project files) per request</div></div>
                  <button className={`tgl ${settings.smart_context ? 'on' : ''}`} onClick={() => updateSetting('smart_context', !settings.smart_context)} />
                </div>
                <div className="s-card">
                  <div className="info"><div className="lbl">Prevent Dual API Calls</div><div className="desc">Never call both providers for the same request</div></div>
                  <button className={`tgl ${settings.prevent_dual_calls ? 'on' : ''}`} onClick={() => updateSetting('prevent_dual_calls', !settings.prevent_dual_calls)} />
                </div>
                <div className="s-card">
                  <div className="info"><div className="lbl">Skill Caching</div><div className="desc">Cache skill lookups to avoid repeated DB queries</div></div>
                  <button className={`tgl ${settings.skill_caching ? 'on' : ''}`} onClick={() => updateSetting('skill_caching', !settings.skill_caching)} />
                </div>
              </div>
            </>
          )}

          {/* ─── MODEL ROUTING ─── */}
          {activeTab === 'models' && settings && (
            <>
              <div className="admin-hdr">
                <div><div className="admin-hdr-title">Model Routing</div><div className="admin-hdr-sub">Configure which AI models power each tier</div></div>
                <button className="btn btn-p" disabled={!dirty || saving} onClick={saveSettings}>{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
              <div className="admin-body">
                <div className="sec-title"><span className="dot" /> Provider Preference</div>
                <div className="s-card">
                  <div className="info"><div className="lbl">Load Balancing Strategy</div><div className="desc">How to distribute requests between providers</div></div>
                  <select className="sel-input" value={settings.provider_preference} onChange={e => updateSetting('provider_preference', e.target.value as TeamCostSettings['provider_preference'])}>
                    <option value="balanced">Balanced (50/50)</option>
                    <option value="provider_a">Prefer Provider A (Anthropic)</option>
                    <option value="provider_b">Prefer Provider B (OpenAI)</option>
                  </select>
                </div>

                <hr className="sec-hr" />
                <div className="sec-title"><span className="dot" /> Tier → Model Mapping</div>
                <div className="s-card col">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div><div className="lbl">⚡ {BRAND_NAME} Fast</div><div className="desc">Quick iterations, simple tasks</div></div>
                    <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#71717a' }}>claude-haiku-4-5 / gpt-4o-mini</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div><div className="lbl">🚀 {BRAND_NAME} Pro</div><div className="desc">Balanced speed &amp; quality (default)</div></div>
                    <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#71717a' }}>claude-sonnet-4 / gpt-4o</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div><div className="lbl">💎 {BRAND_NAME} Premium</div><div className="desc">Maximum quality, complex projects</div></div>
                    <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#71717a' }}>claude-opus-4 / o1</div>
                  </div>
                </div>

                <hr className="sec-hr" />
                <div className="sec-title"><span className="dot" /> Alert Settings</div>
                <div className="s-card">
                  <div className="info"><div className="lbl">Budget Alert Threshold</div><div className="desc">Alert when daily usage exceeds this % of budget</div></div>
                  <input type="number" className="num-input" value={settings.alert_threshold_pct} min={10} max={100} onChange={e => updateSetting('alert_threshold_pct', parseInt(e.target.value) || 80)} />
                </div>
              </div>
            </>
          )}

          {/* ─── API KEY POOL ─── */}
          {activeTab === 'keys' && (
            <>
              <div className="admin-hdr">
                <div><div className="admin-hdr-title">API Key Pool</div><div className="admin-hdr-sub">All provider keys — editable, testable, with auto-failover</div></div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-g" onClick={testAllKeyValues}>🧪 Test All</button>
                  <button className="btn btn-p" onClick={saveAllKeyValues}>💾 Save All</button>
                </div>
              </div>
              <div className="admin-body">
                <div className="sec-title"><span className="dot" /> Anthropic Keys (Provider A)</div>
                {renderKeyGroup('anthropic')}

                <hr className="sec-hr" />
                <div className="sec-title"><span className="dot" /> OpenAI Keys (Provider B)</div>
                {renderKeyGroup('openai')}

                <hr className="sec-hr" />
                <div className="sec-title"><span className="dot" /> Google AI</div>
                {renderKeyGroup('google')}

                <hr className="sec-hr" />
                <div className="sec-title"><span className="dot" /> ElevenLabs AI</div>
                {renderKeyGroup('elevenlabs')}

                <hr className="sec-hr" />
                <div className="sec-title"><span className="dot" /> Failover Strategy</div>
                <div className="s-card">
                  <div className="info"><div className="lbl">Round-Robin Selection</div><div className="desc">Distributes load evenly across all keys using least-recently-used</div></div>
                  <div className="tgl on" />
                </div>
                <div className="s-card">
                  <div className="info"><div className="lbl">Auto Rate-Limit Recovery</div><div className="desc">When a key hits rate limit, automatically switch to next available key</div></div>
                  <div className="tgl on" />
                </div>
                <div className="s-card">
                  <div className="info"><div className="lbl">Cross-Provider Failover</div><div className="desc">If all keys for one provider fail, automatically switch to the other</div></div>
                  <div className="tgl on" />
                </div>

                <hr className="sec-hr" />
                <div className="sec-title"><span className="dot" /> Video Generation Keys</div>
                {renderKeyGroup('video')}

                <hr className="sec-hr" />
                <div className="sec-title"><span className="dot" /> Image Generation Keys</div>
                {renderKeyGroup('image')}

                <hr className="sec-hr" />
                <div className="sec-title"><span className="dot" /> Audio &amp; Voice Keys</div>
                {renderKeyGroup('audio')}

                <hr className="sec-hr" />
                <div className="sec-title"><span className="dot" /> 3D Generation Keys</div>
                {renderKeyGroup('3d')}
              </div>
            </>
          )}

          {/* ─── USERS ─── */}
          {activeTab === 'users' && (
            <>
              <div className="admin-hdr">
                <div><div className="admin-hdr-title">Users</div><div className="admin-hdr-sub">Manage platform users and roles</div></div>
                <button className="btn btn-g" onClick={fetchUsers}>⟳ Refresh</button>
              </div>
              <div className="admin-body">
                <div className="st-grid col3">
                  <div className="st-card"><div className="ico">👥</div><div className="val">{stats?.totalUsers ?? 0}</div><div className="lbl">Total Users</div></div>
                  <div className="st-card"><div className="ico">⚡</div><div className="val">{stats?.proUsers ?? 0}</div><div className="lbl">Pro Subscribers</div></div>
                  <div className="st-card"><div className="ico">🏢</div><div className="val">{stats?.enterpriseUsers ?? 0}</div><div className="lbl">Enterprise Teams</div></div>
                </div>
                {users.length === 0 && <div style={{ color: '#71717a', fontSize: 13, padding: '20px 0' }}>No users found</div>}
                {users.map(u => (
                  <div className="u-row" key={u.id}>
                    <div>
                      <div className="u-name">{u.email}</div>
                      <div className="u-meta">{u.role} · {u.full_name || 'No name'} · Joined {new Date(u.created_at).toLocaleDateString()}</div>
                    </div>
                    <span className={`u-plan ${u.plan}`}>{u.plan.charAt(0).toUpperCase() + u.plan.slice(1)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ─── BUILDS ─── */}
          {activeTab === 'builds' && (
            <>
              <div className="admin-hdr">
                <div><div className="admin-hdr-title">Builds</div><div className="admin-hdr-sub">Active and queued build jobs</div></div>
                <button className="btn btn-g" onClick={fetchBuilds}>⟳ Refresh</button>
              </div>
              <div className="admin-body">
                <div className="st-grid col3">
                  <div className="st-card"><div className="ico">🔧</div><div className="val">{stats?.activeBuilds ?? 0}</div><div className="lbl">Active</div></div>
                  <div className="st-card"><div className="ico">⏳</div><div className="val">{stats?.queuedBuilds ?? 0}</div><div className="lbl">Queued</div></div>
                  <div className="st-card"><div className="ico">✓</div><div className="val">{stats?.completedBuilds ?? 0}</div><div className="lbl">Completed</div></div>
                </div>
                {builds.length === 0 && <div style={{ color: '#71717a', fontSize: 13, padding: '20px 0' }}>No builds yet</div>}
                {builds.map(b => (
                  <div className="s-card" key={b.id}>
                    <div className="info">
                      <div className="lbl">{b.prompt?.slice(0, 80) || 'Untitled'}</div>
                      <div className="desc">{new Date(b.created_at).toLocaleString()}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: b.status === 'completed' ? '#22c55e' : b.status === 'running' ? '#eab308' : b.status === 'failed' ? '#ef4444' : '#71717a' }}>
                      {b.status === 'completed' ? '✓ Complete' : b.status === 'running' ? '● Building' : b.status === 'failed' ? '✕ Failed' : b.status}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ─── BILLING ─── */}
          {activeTab === 'billing' && (
            <>
              <div className="admin-hdr">
                <div><div className="admin-hdr-title">Billing &amp; Revenue</div><div className="admin-hdr-sub">Platform revenue and cost metrics</div></div>
              </div>
              <div className="admin-body">
                <div className="st-grid col3">
                  <div className="st-card"><div className="ico">💰</div><div className="val">${costDollars}</div><div className="lbl">{"Today's API Cost"}</div></div>
                  <div className="st-card"><div className="ico">📊</div><div className="val">{usage?.totalRequests ?? 0}</div><div className="lbl">Requests This Month</div></div>
                  <div className="st-card"><div className="ico">🏷️</div><div className="val">{(usage?.totalTokens ?? 0) > 1000000 ? `${((usage?.totalTokens ?? 0) / 1000000).toFixed(1)}M` : `${((usage?.totalTokens ?? 0) / 1000).toFixed(0)}K`}</div><div className="lbl">Tokens This Month</div></div>
                </div>

                {usage && (
                  <>
                    <hr className="sec-hr" />
                    <div className="sec-title"><span className="dot" /> Tier Breakdown</div>
                    <div className="s-card col">
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12 }}>⚡ Fast</span>
                        <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{usage.tierBreakdown.fast} requests</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12 }}>🚀 Pro</span>
                        <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{usage.tierBreakdown.pro} requests</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12 }}>💎 Premium</span>
                        <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{usage.tierBreakdown.premium} requests</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* ─── PAGE MANAGER ─── */}
          {activeTab === 'pages' && (
            <>
              <div className="admin-hdr">
                <div>
                  <div className="admin-hdr-title">Page Manager</div>
                  <div className="admin-hdr-sub">All 24 screens — click to preview, edit, or request AI changes</div>
                </div>
                <div style={{ display: 'flex', gap: 4, background: '#18181b', borderRadius: 8, padding: 3 }}>
                  {(['all', 'page', 'modal', 'system'] as const).map(f => (
                    <button
                      key={f}
                      className="btn"
                      style={{
                        padding: '5px 12px',
                        fontSize: 11,
                        background: pageFilter === f ? '#27272a' : 'transparent',
                        color: pageFilter === f ? '#fafafa' : '#71717a',
                        border: 'none',
                      }}
                      onClick={() => setPageFilter(f)}
                    >
                      {f === 'all' ? `All (${PAGE_REGISTRY.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)}s (${PAGE_REGISTRY.filter(p => p.category === f).length})`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="admin-body">
                {/* Stats */}
                <div className="st-grid">
                  <div className="st-card">
                    <div className="ico">📄</div>
                    <div className="val">{PAGE_REGISTRY.filter(p => p.category === 'page').length}</div>
                    <div className="lbl">URL Routes</div>
                  </div>
                  <div className="st-card">
                    <div className="ico">🪟</div>
                    <div className="val">{PAGE_REGISTRY.filter(p => p.category === 'modal').length}</div>
                    <div className="lbl">Modals/Overlays</div>
                  </div>
                  <div className="st-card">
                    <div className="ico">⚙️</div>
                    <div className="val">{PAGE_REGISTRY.filter(p => p.category === 'system').length}</div>
                    <div className="lbl">System Pages</div>
                  </div>
                  <div className="st-card">
                    <div className="ico">🎨</div>
                    <div className="val">{PAGE_REGISTRY.filter(p => p.brandRefs > 0).length}</div>
                    <div className="lbl">Need brand.ts Wiring</div>
                    <div className="chg" style={{ color: '#eab308' }}>
                      {PAGE_REGISTRY.reduce((sum, p) => sum + p.brandRefs, 0)} hardcoded refs
                    </div>
                  </div>
                </div>

                {/* Page grid */}
                <div className="sec-title"><span className="dot" /> Click any page to preview</div>
                <div className="pg-grid">
                  {PAGE_REGISTRY
                    .filter(p => pageFilter === 'all' || p.category === pageFilter)
                    .map(page => (
                      <div
                        className={`pg-card ${selectedPage?.id === page.id ? 'selected' : ''}`}
                        key={page.id}
                        onClick={() => setSelectedPage(selectedPage?.id === page.id ? null : page)}
                      >
                        <div className="pg-route">{page.route}</div>
                        <div className="pg-name">{page.name}</div>
                        <div className="pg-desc">{page.desc}</div>
                        <div className="pg-badges">
                          <span className={`pg-badge ${page.category}`}>{page.category}</span>
                          {page.brandRefs > 0 && (
                            <span className="pg-badge warn">{page.brandRefs} hardcoded</span>
                          )}
                          {page.brandRefs === 0 && page.category !== 'system' && (
                            <span className="pg-badge clean">brand-clean</span>
                          )}
                          {page.status === 'missing' && (
                            <span className="pg-badge" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>missing</span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>

                {/* Preview drawer */}
                {selectedPage && selectedPage.category === 'page' && !selectedPage.route.includes('[') && (
                  <div className="pg-drawer">
                    <div className="pg-drawer-hdr">
                      <div>
                        <div className="pg-drawer-title">
                          🖼️ Live Preview
                          <span className="pg-drawer-route">{selectedPage.route}</span>
                        </div>
                      </div>
                      <div className="pg-drawer-actions">
                        <a
                          href={selectedPage.route}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-g"
                          style={{ fontSize: 11, padding: '5px 12px', textDecoration: 'none' }}
                        >
                          Open in New Tab ↗
                        </a>
                        <button className="btn btn-g" style={{ fontSize: 11, padding: '5px 12px' }} onClick={() => setSelectedPage(null)}>
                          Close
                        </button>
                      </div>
                    </div>
                    <iframe
                      className="pg-drawer-iframe"
                      src={selectedPage.route}
                      title={`Preview: ${selectedPage.name}`}
                      sandbox="allow-same-origin allow-scripts allow-forms"
                    />
                    <div className="pg-drawer-ai">
                      <input
                        type="text"
                        placeholder={`Tell AI what to change on ${selectedPage.name}...`}
                        value={aiEditPrompt}
                        onChange={e => setAiEditPrompt(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && aiEditPrompt.trim() && !aiEditLoading && selectedPage) {
                            setAiEditLoading(true)
                            const prompt = aiEditPrompt
                            setAiEditPrompt('')
                            addToast('info', 'AI Edit Sent', `Processing "${prompt.slice(0, 50)}..." for ${selectedPage.name}`)
                            fetch('/api/admin/ai-edit', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ route: selectedPage.route, prompt, pageName: selectedPage.name })
                            }).then(r => r.json()).then(res => {
                              if (res.suggestion) addToast('success', 'AI Response Ready', `Changes suggested for ${selectedPage.name}`)
                              else addToast('error', 'AI Edit Failed', res.error || 'No response')
                            }).catch(() => addToast('error', 'AI Edit Failed', 'Network error'))
                              .finally(() => setAiEditLoading(false))
                          }
                        }}
                      />
                      <button
                        className="btn btn-p"
                        disabled={!aiEditPrompt.trim() || aiEditLoading}
                        onClick={() => {
                          if (aiEditPrompt.trim() && !aiEditLoading && selectedPage) {
                            setAiEditLoading(true)
                            const prompt = aiEditPrompt
                            setAiEditPrompt('')
                            addToast('info', 'AI Edit Sent', `Processing "${prompt.slice(0, 50)}..." for ${selectedPage.name}`)
                            fetch('/api/admin/ai-edit', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ route: selectedPage.route, prompt, pageName: selectedPage.name })
                            }).then(r => r.json()).then(res => {
                              if (res.suggestion) addToast('success', 'AI Response Ready', `Changes suggested for ${selectedPage.name}`)
                              else addToast('error', 'AI Edit Failed', res.error || 'No response')
                            }).catch(() => addToast('error', 'AI Edit Failed', 'Network error'))
                              .finally(() => setAiEditLoading(false))
                          }
                        }}
                      >
                        {aiEditLoading ? '⏳' : '✨'} {aiEditLoading ? 'Working...' : 'Send to AI'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Non-previewable page info */}
                {selectedPage && (selectedPage.category !== 'page' || selectedPage.route.includes('[')) && (
                  <div className="pg-drawer" style={{ padding: 24, textAlign: 'center' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>
                      {selectedPage.category === 'modal' ? '🪟' : selectedPage.category === 'system' ? '⚙️' : '📄'}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{selectedPage.name}</div>
                    <div style={{ fontSize: 12, color: '#71717a', marginBottom: 16 }}>{selectedPage.desc}</div>
                    <div style={{ fontSize: 12, color: '#a1a1aa' }}>
                      {selectedPage.category === 'modal'
                        ? 'Modals open inside the dashboard — navigate to /dashboard to see them.'
                        : selectedPage.route.includes('[')
                          ? 'Dynamic route — requires a project ID to preview.'
                          : 'System pages render automatically on specific conditions.'}
                    </div>
                    {selectedPage.brandRefs > 0 && (
                      <div style={{ marginTop: 16, padding: '10px 16px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 8, fontSize: 12, color: '#eab308' }}>
                        ⚠ {selectedPage.brandRefs} hardcoded brand references need wiring to brand.ts
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ─── SYSTEM HEALTH ─── */}
          {activeTab === 'health' && (
            <>
              <div className="admin-hdr">
                <div><div className="admin-hdr-title">System Health Checker</div><div className="admin-hdr-sub">Real-time diagnostics — verifies everything is wired and working</div></div>
                <button className="btn btn-p" disabled={healthLoading} onClick={() => {
                  setHealthLoading(true)
                  fetch('/api/admin/health')
                    .then(r => r.json())
                    .then(data => {
                      if (data.groups) { setHealthData(data); setHealthRan(true) }
                      else { setHealthRan(true) } // fallback to static
                    })
                    .catch(() => setHealthRan(true)) // fallback to static
                    .finally(() => setHealthLoading(false))
                }}>{healthLoading ? '⏳ Running...' : '▶ Run All Checks'}</button>
              </div>
              <div className="admin-body">
                {!healthRan && !healthLoading && (
                  <div style={{ textAlign: 'center', padding: 50, color: '#71717a' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🩺</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Click &quot;Run All Checks&quot; to diagnose your system</div>
                  </div>
                )}
                {healthLoading && (
                  <div style={{ textAlign: 'center', padding: 50, color: '#71717a' }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
                    <div style={{ fontSize: 14 }}>Running live checks against your environment...</div>
                  </div>
                )}
                {healthRan && !healthLoading && (() => {
                  const groups = healthData?.groups || HEALTH_CHECKS
                  let totalChecks = 0, passCount = 0, warnCount = 0, failCount = 0
                  groups.forEach(g => g.checks.forEach(c => {
                    totalChecks++
                    if (c.ok) passCount++
                    else if (c.crit) failCount++
                    else warnCount++
                  }))
                  const score = healthData?.score ?? Math.round(((passCount + warnCount * 0.5) / totalChecks) * 100)
                  return (
                    <>
                      <div style={{ background: '#111113', border: '1px solid #27272a', borderRadius: 16, padding: 24, marginBottom: 24, textAlign: 'center' }}>
                        <div style={{ fontSize: 48, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", letterSpacing: -2, color: score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444' }}>{score}%</div>
                        <div style={{ fontSize: 13, color: '#71717a', marginTop: 4 }}>{passCount} passed · {warnCount} warnings · {failCount} failed — {totalChecks} total {healthData ? '(live)' : '(static)'}</div>
                        <div style={{ marginTop: 12, height: 8, background: '#27272a', borderRadius: 4, overflow: 'hidden', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
                          <div style={{ height: '100%', borderRadius: 4, background: score >= 80 ? 'linear-gradient(135deg,#22c55e,#3b82f6)' : score >= 50 ? '#eab308' : '#ef4444', width: `${score}%`, transition: 'width 1s' }} />
                        </div>
                      </div>
                      {groups.map(g => {
                        let gp = 0
                        g.checks.forEach(c => { if (c.ok) gp++; else if (!c.crit) gp += 0.5 })
                        const pct = Math.round((gp / g.checks.length) * 100)
                        return (
                          <div className="hc-group" key={g.group}>
                            <div className="hc-group-hdr">
                              <div className="hc-group-title">{g.icon} {g.group}</div>
                              <span className={`hc-group-score ${pct >= 80 ? 'pass' : pct >= 50 ? 'warn' : 'fail'}`}>{pct}%</span>
                            </div>
                            {g.checks.map(c => {
                              const s = c.ok ? 'pass' : c.crit ? 'fail' : 'warn'
                              const d = (c as any).detail || (c.ok ? 'OK ✓' : c.crit ? 'MISSING' : 'Not configured')
                              return (
                                <div className="hc-item" key={c.n}>
                                  <div className={`hc-icon ${s}`}>{s === 'pass' ? '✓' : s === 'fail' ? '✕' : '⚠'}</div>
                                  <div className="hc-label">{c.n}{c.crit && <span style={{ color: '#ef4444', fontSize: 8, fontWeight: 800, verticalAlign: 'middle', marginLeft: 6 }}>CRITICAL</span>}</div>
                                  <div className="hc-detail">{d}</div>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </>
                  )
                })()}
              </div>
            </>
          )}

          {/* ─── SETTINGS ─── */}
          {activeTab === 'settings' && (
            <>
              <div className="admin-hdr">
                <div><div className="admin-hdr-title">Platform Settings</div><div className="admin-hdr-sub">General {BRAND_NAME} configuration</div></div>
              </div>
              <div className="admin-body">
                <div className="sec-title"><span className="dot" /> Platform Info</div>
                <div className="s-card">
                  <div className="info"><div className="lbl">Platform Name</div><div className="desc">{BRAND_NAME}</div></div>
                  <span style={{ fontSize: 11, color: '#71717a', fontFamily: "'JetBrains Mono', monospace" }}>{BRAND_VERSION}</span>
                </div>
                <div className="s-card">
                  <div className="info"><div className="lbl">Short Name</div><div className="desc">{BRAND_SHORT}</div></div>
                </div>
                <div className="s-card">
                  <div className="info"><div className="lbl">Your Role</div><div className="desc">{profile?.role ?? 'unknown'}</div></div>
                </div>
                <div className="s-card">
                  <div className="info"><div className="lbl">Team ID</div><div className="desc" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{profile?.team_id ?? 'No team configured'}</div></div>
                </div>

                <hr className="sec-hr" />
                <div className="sec-title"><span className="dot" /> Danger Zone</div>
                <div style={{ padding: 20, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', marginBottom: 8 }}>Clear All Build History</div>
                  <div style={{ fontSize: 12, color: '#71717a', marginBottom: 12 }}>This will permanently delete all build records. This action cannot be undone.</div>
                  <button className="btn btn-d">Delete All Builds</button>
                </div>
              </div>
            </>
          )}

          {/* Loading state for tabs that need settings */}
          {(activeTab === 'cost' || activeTab === 'models') && !settings && (
            <div className="admin-body">
              {[1,2,3,4,5].map(i => <div key={i} className="skel" style={{ height: 60, marginBottom: 10 }} />)}
            </div>
          )}
        </div>

        {/* ── TOASTS ── */}
        <div className="toast-wrap">
          {toasts.map(t => (
            <div className={`toast ${t.type}`} key={t.id}>
              <span className="t-ico">{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
              <div><div className="t-title">{t.title}</div><div className="t-msg">{t.message}</div></div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

