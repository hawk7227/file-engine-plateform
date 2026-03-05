/**
 * DEPENDENCY RESOLVER
 *
 * Given a root file (TSX/JSX/TS/JS) and a GitHub repo,
 * walks the import graph and fetches every local dependency.
 *
 * Only resolves LOCAL imports (starting with ./ ../ @/).
 * External npm packages (react, stripe, lucide-react etc.) are
 * handled by the preview assembler's CDN/stub layer — NOT stripped.
 *
 * Returns a flat map of { path → content } for every file in the graph.
 */

export interface ResolvedFiles {
  [path: string]: string
}

interface FetchOpts {
  owner: string
  repo: string
  branch: string
}

// ── Extract all local imports from a file ──────────────────────────────────
export function extractLocalImports(source: string, currentPath: string): string[] {
  const imports: string[] = []

  // Match: import ... from '...'  |  import('...')  |  require('...')
  const re = /(?:import\s+(?:[\s\S]*?from\s+)?|import\s*\(|require\s*\()['"](\.\.?\/[^'"]+|@\/[^'"]+)['"]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source)) !== null) {
    imports.push(m[1])
  }

  return imports
}

// ── Resolve a relative import path to an absolute repo path ───────────────
function resolveImportPath(importPath: string, fromFile: string, repoRoot = ''): string[] {
  const dir = fromFile.includes('/') ? fromFile.split('/').slice(0, -1).join('/') : ''

  let resolved: string

  if (importPath.startsWith('@/')) {
    // @/ alias → src/ root
    resolved = 'src/' + importPath.slice(2)
  } else {
    // Relative path
    const parts = (dir ? dir + '/' + importPath : importPath).split('/')
    const clean: string[] = []
    for (const p of parts) {
      if (p === '..') clean.pop()
      else if (p !== '.') clean.push(p)
    }
    resolved = clean.join('/')
  }

  // Generate candidate paths with extensions
  const candidates: string[] = []
  const hasExt = /\.(tsx?|jsx?|json|css)$/.test(resolved)

  if (hasExt) {
    candidates.push(resolved)
  } else {
    // Try common extensions
    for (const ext of ['tsx', 'ts', 'jsx', 'js']) {
      candidates.push(`${resolved}.${ext}`)
    }
    // Try index file
    for (const ext of ['tsx', 'ts', 'jsx', 'js']) {
      candidates.push(`${resolved}/index.${ext}`)
    }
  }

  return candidates
}

// ── Fetch a single file from GitHub API ───────────────────────────────────
async function fetchFileFromGitHub(
  path: string,
  opts: FetchOpts,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    const url = `/api/github/file?owner=${encodeURIComponent(opts.owner)}&repo=${encodeURIComponent(opts.repo)}&path=${encodeURIComponent(path)}&branch=${encodeURIComponent(opts.branch)}`
    const res = await fetch(url, { signal })
    if (!res.ok) return null
    const data = await res.json()
    return data.content || null
  } catch {
    return null
  }
}

// ── Try each candidate path until one resolves ────────────────────────────
async function resolveCandidate(
  candidates: string[],
  opts: FetchOpts,
  signal?: AbortSignal
): Promise<{ path: string; content: string } | null> {
  for (const candidate of candidates) {
    const content = await fetchFileFromGitHub(candidate, opts, signal)
    if (content !== null) {
      return { path: candidate, content }
    }
  }
  return null
}

// ── Main: resolve full dependency graph from a root file ──────────────────
export async function resolveDependencies(
  rootPath: string,
  rootContent: string,
  opts: FetchOpts,
  signal?: AbortSignal,
  maxDepth = 4
): Promise<ResolvedFiles> {
  const resolved: ResolvedFiles = {}
  const queue: Array<{ path: string; content: string; depth: number }> = [
    { path: rootPath, content: rootContent, depth: 0 }
  ]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const item = queue.shift()
    if (!item) continue
    if (visited.has(item.path)) continue
    visited.add(item.path)
    resolved[item.path] = item.content

    if (item.depth >= maxDepth) continue

    // Extract local imports from this file
    const localImports = extractLocalImports(item.content, item.path)

    // Resolve each import in parallel (max 6 concurrent)
    const batches: string[][] = []
    for (let i = 0; i < localImports.length; i += 6) {
      batches.push(localImports.slice(i, i + 6))
    }

    for (const batch of batches) {
      if (signal?.aborted) break
      await Promise.all(batch.map(async (imp) => {
        const candidates = resolveImportPath(imp, item.path)
        const found = await resolveCandidate(candidates, opts, signal)
        if (found && !visited.has(found.path)) {
          queue.push({ path: found.path, content: found.content, depth: item.depth + 1 })
        }
      }))
    }
  }

  return resolved
}
