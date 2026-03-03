/* eslint-disable no-restricted-syntax */
'use client'

import dynamic from 'next/dynamic'

const WorkplaceLayout = dynamic(() => import('@/components/workplace/WorkplaceLayout'), { ssr: false })

export default function AdminWorkplacePage() {
  const mockUser = { id: 'temp-admin', email: 'admin@fileengine.dev' } as any
  const mockProfile = { id: 'temp-admin', email: 'admin@fileengine.dev', role: 'owner', plan: 'enterprise', name: 'Admin' } as any

  return (
    <>
      <WorkplaceLayout user={mockUser} profile={mockProfile} />
    </>
  )
}
