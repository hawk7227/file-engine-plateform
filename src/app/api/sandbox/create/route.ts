import { NextRequest, NextResponse } from 'next/server'
import { getSandboxProvider } from '@/lib/sandbox/index'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>
    const projectId = body.projectId as string
    const userId = body.userId as string
    const template = (body.template as string) || 'node'

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
    }

    const provider = await getSandboxProvider()
    const result = await provider.create({
      projectId,
      userId: userId || 'anonymous',
      template: template as 'react' | 'nextjs' | 'node' | 'python' | 'static',
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    console.error('[Sandbox Create Error]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
