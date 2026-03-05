// GET /api/github/tree?owner=X&repo=Y&branch=Z
import { NextRequest, NextResponse } from 'next/server'
import { getRepoTree } from '@/lib/file-engine/github-api'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const owner = searchParams.get('owner')
  const repo  = searchParams.get('repo')
  const branch = searchParams.get('branch') || 'main'

  if (!owner || !repo) {
    return NextResponse.json({ error: 'owner and repo required' }, { status: 400 })
  }

  try {
    const token = process.env.GITHUB_TOKEN || undefined
    const result = await getRepoTree(owner, repo, branch, { token })
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
