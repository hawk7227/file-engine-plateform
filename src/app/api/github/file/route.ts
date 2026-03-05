// GET  /api/github/file?owner=X&repo=Y&path=Z
// PUT  /api/github/file  { owner, repo, path, content, sha, message, branch }
import { NextRequest, NextResponse } from 'next/server'
import { getFileContent, saveFileContent } from '@/lib/file-engine/github-api'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const owner = searchParams.get('owner')
  const repo  = searchParams.get('repo')
  const path  = searchParams.get('path')

  if (!owner || !repo || !path) {
    return NextResponse.json({ error: 'owner, repo, path required' }, { status: 400 })
  }

  try {
    const token = process.env.GITHUB_TOKEN || undefined
    const file = await getFileContent(owner, repo, path, { token })
    return NextResponse.json(file)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json() as {
      owner: string; repo: string; path: string
      content: string; sha: string; message?: string; branch?: string
    }
    const { owner, repo, path, content, sha, message, branch } = body

    if (!owner || !repo || !path || !content || !sha) {
      return NextResponse.json({ error: 'owner, repo, path, content, sha required' }, { status: 400 })
    }

    const token = process.env.GITHUB_TOKEN || undefined
    const result = await saveFileContent(
      owner, repo, path, content, sha,
      message || `Edit ${path} via File Engine`,
      branch || 'main',
      { token }
    )
    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
