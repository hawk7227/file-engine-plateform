'use client'

// =====================================================
// FILE ENGINE - TOAST NOTIFICATIONS
// =====================================================

import { useEffect } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

interface ToastProps {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  onDismiss: (id: string) => void
}

export function Toast({ id, message, type, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id)
    }, 3000)
    
    return () => clearTimeout(timer)
  }, [id, onDismiss])
  
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />
  }
  
  const colors = {
    success: 'bg-green-500/20 border-green-500/30',
    error: 'bg-red-500/20 border-red-500/30',
    info: 'bg-blue-500/20 border-blue-500/30'
  }
  
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${colors[type]} backdrop-blur-sm animate-slide-up`}
    >
      {icons[type]}
      <span className="text-white text-sm">{message}</span>
      <button
        onClick={() => onDismiss(id)}
        className="ml-2 p-1 hover:bg-white/10 rounded transition-colors"
      >
        <X className="w-4 h-4 text-zinc-400" />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: { id: string; message: string; type: 'success' | 'error' | 'info' }[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null
  
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  )
}

export default Toast

// ToastProvider — pass-through wrapper for context compatibility
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
