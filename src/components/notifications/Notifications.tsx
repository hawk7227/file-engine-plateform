'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

/**
 * NOTIFICATION / TOAST SYSTEM
 * 
 * Provides user feedback for:
 * - Success messages
 * - Error alerts
 * - Progress updates
 * - Confirmations
 * 
 * Better because:
 * - Non-blocking
 * - Actionable (undo, retry)
 * - Progress tracking
 * - Grouped notifications
 */

// ============================================
// TYPES
// ============================================

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'progress'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message?: string
  duration?: number // ms, 0 = persistent
  progress?: number // 0-100
  actions?: NotificationAction[]
  dismissable?: boolean
  icon?: string
}

export interface NotificationAction {
  label: string
  onClick: () => void
  variant?: 'default' | 'primary' | 'danger'
}

interface NotificationContextValue {
  notifications: Notification[]
  toast: (notification: Omit<Notification, 'id'>) => string
  success: (title: string, message?: string) => string
  error: (title: string, message?: string) => string
  warning: (title: string, message?: string) => string
  info: (title: string, message?: string) => string
  progress: (title: string, progressValue: number, message?: string) => string
  update: (id: string, updates: Partial<Notification>) => void
  dismiss: (id: string) => void
  dismissAll: () => void
}

// ============================================
// CONTEXT
// ============================================

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}

// ============================================
// PROVIDER
// ============================================

interface NotificationProviderProps {
  children: ReactNode
  maxNotifications?: number
  defaultDuration?: number
}

export function NotificationProvider({ 
  children, 
  maxNotifications = 5,
  defaultDuration = 5000 
}: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const toast = useCallback((notification: Omit<Notification, 'id'>): string => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? defaultDuration,
      dismissable: notification.dismissable ?? true
    }

    setNotifications((prev: Notification[]) => {
      const updated = [newNotification, ...prev]
      return updated.slice(0, maxNotifications)
    })

    // Auto-dismiss
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        dismiss(id)
      }, newNotification.duration)
    }

    return id
  }, [defaultDuration, maxNotifications])

  const success = useCallback((title: string, message?: string) => {
    return toast({ type: 'success', title, message, icon: '' })
  }, [toast])

  const error = useCallback((title: string, message?: string) => {
    return toast({ type: 'error', title, message, icon: '', duration: 0 })
  }, [toast])

  const warning = useCallback((title: string, message?: string) => {
    return toast({ type: 'warning', title, message, icon: '' })
  }, [toast])

  const info = useCallback((title: string, message?: string) => {
    return toast({ type: 'info', title, message, icon: 'ℹ' })
  }, [toast])

  const progress = useCallback((title: string, progressValue: number, message?: string) => {
    return toast({ type: 'progress', title, message, progress: progressValue, duration: 0, icon: '⏳' })
  }, [toast])

  const update = useCallback((id: string, updates: Partial<Notification>) => {
    setNotifications((prev: Notification[]) => prev.map((n: Notification) => 
      n.id === id ? { ...n, ...updates } : n
    ))
  }, [])

  const dismiss = useCallback((id: string) => {
    setNotifications((prev: Notification[]) => prev.filter((n: Notification) => n.id !== id))
  }, [])

  const dismissAll = useCallback(() => {
    setNotifications([])
  }, [])

  return (
    <NotificationContext.Provider value={{
      notifications,
      toast,
      success,
      error,
      warning,
      info,
      progress,
      update,
      dismiss,
      dismissAll
    }}>
      {children}
      <NotificationContainer notifications={notifications} onDismiss={dismiss} />
    </NotificationContext.Provider>
  )
}

// ============================================
// CONTAINER COMPONENT
// ============================================

interface NotificationContainerProps {
  notifications: Notification[]
  onDismiss: (id: string) => void
}

function NotificationContainer({ notifications, onDismiss }: NotificationContainerProps) {
  if (notifications.length === 0) return null

  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={() => onDismiss(notification.id)}
        />
      ))}

      <style jsx>{`
        .notification-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          display: flex;
          flex-direction: column-reverse;
          gap: 12px;
          max-width: 400px;
          width: 100%;
        }

        @media (max-width: 480px) {
          .notification-container {
            left: 16px;
            right: 16px;
            bottom: 16px;
          }
        }
      `}</style>
    </div>
  )
}

// ============================================
// NOTIFICATION ITEM
// ============================================

interface NotificationItemProps {
  notification: Notification
  onDismiss: () => void
}

function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
  const { type, title, message, icon, progress, actions, dismissable } = notification

  const typeStyles = {
    success: { bg: 'rgba(16, 185, 129, 0.1)', border: 'var(--accent-primary)', color: 'var(--accent-primary)' },
    error: { bg: 'rgba(255, 102, 34, 0.1)', border: 'var(--accent-orange)', color: 'var(--accent-orange)' },
    warning: { bg: 'rgba(255, 200, 0, 0.1)', border: '#ffc800', color: '#ffc800' },
    info: { bg: 'rgba(0, 136, 255, 0.1)', border: 'var(--accent-blue)', color: 'var(--accent-blue)' },
    progress: { bg: 'rgba(138, 43, 226, 0.1)', border: 'var(--accent-purple)', color: 'var(--accent-purple)' }
  }

  const style = typeStyles[type]

  return (
    <div 
      className="notification-item"
      style={{
        background: style.bg,
        borderColor: style.border
      }}
    >
      <div className="notification-icon" style={{ color: style.color }}>
        {icon || ''}
      </div>
      <div className="notification-content">
        <div className="notification-title">{title}</div>
        {message && <div className="notification-message">{message}</div>}
        
        {type === 'progress' && progress !== undefined && (
          <div className="notification-progress">
            <div 
              className="notification-progress-bar" 
              style={{ width: `${progress}%`, background: style.border }}
            />
          </div>
        )}

        {actions && actions.length > 0 && (
          <div className="notification-actions">
            {actions.map((action, i) => (
              <button
                key={i}
                className={`notification-action ${action.variant || 'default'}`}
                onClick={action.onClick}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {dismissable && (
        <button className="notification-dismiss" onClick={onDismiss}>
          ×
        </button>
      )}

      <style jsx>{`
        .notification-item {
          display: flex;
          gap: 12px;
          padding: 14px 16px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-left-width: 3px;
          border-radius: var(--radius-lg);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .notification-icon {
          font-size: 20px;
          flex-shrink: 0;
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-title {
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 4px;
        }

        .notification-message {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .notification-progress {
          height: 4px;
          background: var(--bg-tertiary);
          border-radius: 2px;
          margin-top: 10px;
          overflow: hidden;
        }

        .notification-progress-bar {
          height: 100%;
          transition: width 0.3s ease;
        }

        .notification-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        .notification-action {
          padding: 6px 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.1s;
        }

        .notification-action:hover {
          background: var(--bg-elevated);
        }

        .notification-action.primary {
          background: var(--accent-primary);
          color: var(--bg-primary);
          border-color: var(--accent-primary);
        }

        .notification-action.danger {
          color: var(--accent-orange);
          border-color: var(--accent-orange);
        }

        .notification-dismiss {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 18px;
          padding: 0;
          line-height: 1;
          flex-shrink: 0;
        }

        .notification-dismiss:hover {
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  )
}

// ============================================
// CONFIRMATION DIALOG
// ============================================

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: 'primary' | 'danger'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div className="confirm-header">
          <h3>{title}</h3>
        </div>
        <div className="confirm-body">
          <p>{message}</p>
        </div>
        <div className="confirm-actions">
          <button className="confirm-btn secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={`confirm-btn ${confirmVariant}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>

      <style jsx>{`
        .confirm-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .confirm-dialog {
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          width: 400px;
          max-width: 90%;
          animation: scaleIn 0.2s ease;
        }

        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .confirm-header {
          padding: 20px 24px 0;
        }

        .confirm-header h3 {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }

        .confirm-body {
          padding: 16px 24px;
        }

        .confirm-body p {
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.5;
        }

        .confirm-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid var(--border-subtle);
        }

        .confirm-btn {
          padding: 10px 20px;
          border-radius: var(--radius-md);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .confirm-btn.secondary {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          border: 1px solid var(--border-subtle);
        }

        .confirm-btn.primary {
          background: var(--accent-primary);
          color: var(--bg-primary);
          border: none;
        }

        .confirm-btn.danger {
          background: var(--accent-orange);
          color: white;
          border: none;
        }

        .confirm-btn:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  )
}
