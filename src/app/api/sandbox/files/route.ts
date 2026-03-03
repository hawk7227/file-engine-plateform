import { NextRequest, NextResponse } from 'next/server'
import { getSandboxProvider } from '@/lib/sandbox/index'

export const dynamic = 'force-dynamic'

// POST = write files
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>
    const sandboxId = body.sandboxId as string
    const files = body.files as { path: string; content: string }[]

    if (!sandboxId || !files?.length) {
      return NextResponse.json({ error: 'Missing sandboxId or files' }, { status: 400 })
    }

    const provider = await getSandboxProvider()
    await provider.writeFiles(sandboxId, files)
    return NextResponse.json({ written: files.length })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

// GET = read file or list directory
export async function GET(request: NextRequest) {
  const sandboxId = request.nextUrl.searchParams.get('id')
  const path = request.nextUrl.searchParams.get('path')

  if (!sandboxId) {
    return NextResponse.json({ error: 'Missing sandbox id' }, { status: 400 })
  }

  try {
    const provider = await getSandboxProvider()

    if (path) {
      const content = await provider.readFile(sandboxId, path)
      if (content === null) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }
      return NextResponse.json({ path, content })
    }

    // List files
    const dir = request.nextUrl.searchParams.get('dir') || undefined
    const files = await provider.listFiles(sandboxId, dir)
    return NextResponse.json({ files })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
