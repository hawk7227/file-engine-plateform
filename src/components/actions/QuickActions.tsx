'use client'
import { useState } from 'react'

/**
 * QUICK ACTIONS BAR
 * 
 * Contextual action buttons that appear based on state
 * 
 * States:
 * - Empty: Quick start templates
 * - Generating: Cancel, pause
 * - Generated: Export, Deploy, Share, Edit
 * - Error: Retry, Report
 */

// ============================================
// TYPES
// ============================================

export interface QuickAction {
  id: string
  label: string
  icon: string
  onClick: () => void
  variant?: 'default' | 'primary' | 'danger'
  disabled?: boolean
  tooltip?: string
}

export type ProjectState = 'empty' | 'generating' | 'completed' | 'error' | 'deployed'

// ============================================
// QUICK ACTIONS BAR COMPONENT
// ============================================

interface QuickActionsBarProps {
  state: ProjectState
  actions: QuickAction[]
  compact?: boolean
}

export function QuickActionsBar({ state, actions, compact = false }: QuickActionsBarProps) {
  return (
    <div className={`quick-actions-bar ${compact ? 'compact' : ''}`}>
      {actions.map(action => (
        <button
          key={action.id}
          className={`quick-action ${action.variant || 'default'}`}
          onClick={action.onClick}
          disabled={action.disabled}
          title={action.tooltip}
        >
          <span className="quick-action-icon">{action.icon}</span>
          {!compact && <span className="quick-action-label">{action.label}</span>}
        </button>
      ))}

      <style jsx>{`
        .quick-actions-bar {
          display: flex;
          gap: 8px;
          padding: 8px;
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
        }

        .quick-actions-bar.compact {
          padding: 4px;
          gap: 4px;
        }

        .quick-action {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .compact .quick-action {
          padding: 6px 8px;
          font-size: 12px;
        }

        .quick-action:hover:not(:disabled) {
          background: var(--bg-elevated);
          border-color: var(--border-default);
          color: var(--text-primary);
        }

        .quick-action:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .quick-action.primary {
          background: var(--accent-primary);
          color: var(--bg-primary);
          border-color: var(--accent-primary);
        }

        .quick-action.primary:hover:not(:disabled) {
          box-shadow: var(--shadow-glow);
        }

        .quick-action.danger {
          color: var(--accent-orange);
          border-color: var(--accent-orange);
        }

        .quick-action.danger:hover:not(:disabled) {
          background: rgba(255, 102, 34, 0.1);
        }

        .quick-action-icon {
          font-size: 14px;
        }
      `}</style>
    </div>
  )
}

// ============================================
// GET ACTIONS BY STATE
// ============================================

export function getActionsForState(
  state: ProjectState,
  handlers: {
    onNewProject?: () => void
    onCancel?: () => void
    onRetry?: () => void
    onExport?: () => void
    onDeploy?: () => void
    onShare?: () => void
    onCopy?: () => void
    onEdit?: () => void
    onViewLive?: () => void
  }
): QuickAction[] {
  switch (state) {
    case 'empty':
      return [
        { id: 'new', label: 'New Project', icon: '', onClick: handlers.onNewProject || (() => {}), variant: 'primary' }
      ]

    case 'generating':
      return [
        { id: 'cancel', label: 'Cancel', icon: '⏹', onClick: handlers.onCancel || (() => {}), variant: 'danger' }
      ]

    case 'completed':
      return [
        { id: 'export', label: 'Export', icon: '', onClick: handlers.onExport || (() => {}) },
        { id: 'deploy', label: 'Deploy', icon: '', onClick: handlers.onDeploy || (() => {}), variant: 'primary' },
        { id: 'share', label: 'Share', icon: '', onClick: handlers.onShare || (() => {}) },
        { id: 'copy', label: 'Copy', icon: '', onClick: handlers.onCopy || (() => {}) }
      ]

    case 'error':
      return [
        { id: 'retry', label: 'Retry', icon: '', onClick: handlers.onRetry || (() => {}), variant: 'primary' }
      ]

    case 'deployed':
      return [
        { id: 'view', label: 'View Live', icon: '', onClick: handlers.onViewLive || (() => {}), variant: 'primary' },
        { id: 'export', label: 'Export', icon: '', onClick: handlers.onExport || (() => {}) },
        { id: 'share', label: 'Share', icon: '', onClick: handlers.onShare || (() => {}) }
      ]

    default:
      return []
  }
}

// ============================================
// FLOATING ACTION BUTTON
// ============================================

interface FloatingActionButtonProps {
  icon: string
  label: string
  onClick: () => void
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center'
  pulse?: boolean
}

export function FloatingActionButton({ 
  icon, 
  label, 
  onClick, 
  position = 'bottom-right',
  pulse = false 
}: FloatingActionButtonProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <button
      className={`fab ${position} ${pulse ? 'pulse' : ''} ${expanded ? 'expanded' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <span className="fab-icon">{icon}</span>
      {expanded && <span className="fab-label">{label}</span>}

      <style jsx>{`
        .fab {
          position: fixed;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 16px;
          background: var(--accent-primary), var(--accent-blue));
          color: var(--bg-primary);
          border: none;
          border-radius: 50px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 20px var(--accent-glow);
          transition: all 0.2s;
          z-index: 100;
        }

        .fab.bottom-right {
          bottom: 24px;
          right: 24px;
        }

        .fab.bottom-left {
          bottom: 24px;
          left: 24px;
        }

        .fab.bottom-center {
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
        }

        .fab:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 30px var(--accent-glow);
        }

        .fab.bottom-center:hover {
          transform: translateX(-50%) scale(1.05);
        }

        .fab.pulse {
          animation: fabPulse 2s infinite;
        }

        @keyframes fabPulse {
          0%, 100% { box-shadow: 0 4px 20px var(--accent-glow); }
          50% { box-shadow: 0 8px 40px var(--accent-glow); }
        }

        .fab.expanded {
          border-radius: 25px;
          padding: 16px 24px;
        }

        .fab-icon {
          font-size: 20px;
        }

        .fab-label {
          white-space: nowrap;
        }
      `}</style>
    </button>
  )
}

// ============================================
// INLINE ACTIONS (for messages/files)
// ============================================

interface InlineActionsProps {
  actions: Array<{
    icon: string
    label: string
    onClick: () => void
  }>
}

export function InlineActions({ actions }: InlineActionsProps) {
  return (
    <div className="inline-actions">
      {actions.map((action, i) => (
        <button
          key={i}
          className="inline-action"
          onClick={action.onClick}
          title={action.label}
        >
          {action.icon}
        </button>
      ))}

      <style jsx>{`
        .inline-actions {
          display: flex;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.15s;
        }

        *:hover > .inline-actions {
          opacity: 1;
        }

        .inline-action {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.1s;
        }

        .inline-action:hover {
          background: var(--bg-elevated);
          color: var(--text-primary);
          border-color: var(--border-default);
        }
      `}</style>
    </div>
  )
}

// ============================================
// BREADCRUMB ACTIONS
// ============================================

interface BreadcrumbAction {
  label: string
  onClick?: () => void
  icon?: string
  active?: boolean
}

interface BreadcrumbActionsProps {
  items: BreadcrumbAction[]
}

export function BreadcrumbActions({ items }: BreadcrumbActionsProps) {
  return (
    <div className="breadcrumb-actions">
      {items.map((item, i) => (
        <div key={i} className="breadcrumb-item">
          {i > 0 && <span className="breadcrumb-separator">/</span>}
          <button
            className={`breadcrumb-btn ${item.active ? 'active' : ''}`}
            onClick={item.onClick}
            disabled={!item.onClick}
          >
            {item.icon && <span className="breadcrumb-icon">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        </div>
      ))}

      <style jsx>{`
        .breadcrumb-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
        }

        .breadcrumb-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .breadcrumb-separator {
          color: var(--text-muted);
        }

        .breadcrumb-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: all 0.1s;
        }

        .breadcrumb-btn:hover:not(:disabled) {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .breadcrumb-btn:disabled {
          cursor: default;
        }

        .breadcrumb-btn.active {
          color: var(--text-primary);
          font-weight: 500;
        }

        .breadcrumb-icon {
          font-size: 12px;
        }
      `}</style>
    </div>
  )
}
