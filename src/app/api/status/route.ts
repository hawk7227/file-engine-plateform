// =====================================================
// FILE ENGINE - STATUS API
// Monitor key pool and system capacity
// =====================================================

import { NextRequest } from 'next/server'
import { getPoolStatus, estimateConcurrentCapacity } from '@/lib/key-pool'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const poolStatus = getPoolStatus()
  const capacity = estimateConcurrentCapacity()
  
  return new Response(JSON.stringify({
    status: 'ok',
    keyPool: poolStatus,
    estimatedCapacity: {
      requestsPerMinute: capacity,
      concurrentUsers: Math.floor(capacity / 2), // Assume 2 requests per user per minute
    },
    health: poolStatus.availableCapacity > 0 ? 'healthy' : 'degraded'
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
