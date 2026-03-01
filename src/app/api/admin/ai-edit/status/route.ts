import { NextRequest, NextResponse } from 'next/server'
import { getBuildStatus } from '@/lib/queue'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get('jobId')
  if (!jobId) {
    return NextResponse.json({ error: 'Missing jobId parameter' }, { status: 400 })
  }

  const status = await getBuildStatus(jobId)
  if (!status) {
    return NextResponse.json({ error: 'Job not found', jobId }, { status: 404 })
  }

  return NextResponse.json({
    jobId: status.id,
    state: status.state,
    progress: status.progress,
    result: status.result,
    failedReason: status.failedReason,
  })
}
