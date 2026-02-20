// =====================================================
// FILE ENGINE - Providers
// Wraps the app with all necessary context providers
// =====================================================

'use client'

import { ReactNode } from 'react'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthProvider } from '@/hooks/useAuth'

// =====================================================
// TYPES
// =====================================================

interface ProvidersProps {
  children: ReactNode
}

// =====================================================
// COMPONENT
// =====================================================

export default function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </AuthProvider>
  )
}
