'use client'

import FileEngineApp from '@/components/FileEngineAppV2'
import ErrorBoundary from '@/components/ErrorBoundary'

export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <FileEngineApp />
    </ErrorBoundary>
  )
}
