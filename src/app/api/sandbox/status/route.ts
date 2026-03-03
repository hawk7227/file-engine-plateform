import { NextRequest, NextResponse } from 'next/server'
import { getSandboxProvider } from '@/lib/sandbox/index'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const sandboxId = request.nextUrl.searchParams.get('id')
  if (!sandboxId) {
    return NextResponse.json({ error: 'Missing sandbox id' }, { status: 400 })
  }

  try {
    const provider = await getSandboxProvider()
    const info = await provider.getInfo(sandboxId)
    if (!info) {
      return NextResponse.json({ error: 'Sandbox not found' }, { status: 404 })
    }
    return NextResponse.json(info)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

// DELETE = destroy sandbox
export async function DELETE(request: NextRequest) {
  const sandboxId = request.nextUrl.searchParams.get('id')
  if (!sandboxId) {
    return NextResponse.json({ error: 'Missing sandbox id' }, { status: 400 })
  }

  try {
    const provider = await getSandboxProvider()
    await provider.destroy(sandboxId)
    return NextResponse.json({ destroyed: true })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
