// =====================================================
// FILE ENGINE - WEB SEARCH
// Search the web for docs, packages, latest info
// =====================================================

// =====================================================
// TYPES
// =====================================================

export interface SearchResult {
  title: string
  url: string
  snippet: string
  source: string
  date?: string
  relevance: number
}

export interface PackageInfo {
  name: string
  version: string
  description: string
  homepage?: string
  repository?: string
  downloads: number
  lastPublish: string
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
  keywords: string[]
  license: string
}

export interface DocumentationResult {
  title: string
  url: string
  content: string
  codeExamples: { language: string; code: string }[]
  relatedLinks: { title: string; url: string }[]
}

export interface SearchOptions {
  maxResults?: number
  sources?: ('web' | 'npm' | 'github' | 'stackoverflow' | 'docs')[]
  dateRange?: 'day' | 'week' | 'month' | 'year' | 'all'
  language?: string
}

// =====================================================
// WEB SEARCH
// =====================================================

export async function webSearch(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const { maxResults = 10, dateRange = 'all' } = options

  try {
    const response = await fetch('/api/search/web', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, maxResults, dateRange })
    })

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`)
    }

    const data = await response.json()
    return data.results || []
  } catch (err: any) {
    console.error('Web search error:', err)
    return []
  }
}

// =====================================================
// NPM PACKAGE SEARCH
// =====================================================

export async function searchNpmPackages(
  query: string,
  options: { maxResults?: number } = {}
): Promise<PackageInfo[]> {
  const { maxResults = 10 } = options

  try {
    // Use npm registry API directly
    const response = await fetch(
      `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=${maxResults}`
    )

    if (!response.ok) {
      throw new Error(`NPM search failed: ${response.status}`)
    }

    const data = await response.json()

    return data.objects.map((obj: any) => ({
      name: obj.package.name,
      version: obj.package.version,
      description: obj.package.description || '',
      homepage: obj.package.links?.homepage,
      repository: obj.package.links?.repository,
      downloads: obj.downloads?.monthly || 0,
      lastPublish: obj.package.date,
      dependencies: {},
      devDependencies: {},
      keywords: obj.package.keywords || [],
      license: obj.package.license || 'Unknown'
    }))
  } catch (err: any) {
    console.error('NPM search error:', err)
    return []
  }
}

// Get detailed package info
export async function getPackageInfo(packageName: string): Promise<PackageInfo | null> {
  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}`)

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    const latest = data['dist-tags']?.latest
    const version = data.versions?.[latest] || {}

    return {
      name: data.name,
      version: latest,
      description: data.description || '',
      homepage: data.homepage,
      repository: typeof data.repository === 'string' ? data.repository : data.repository?.url,
      downloads: 0, // Would need separate API call
      lastPublish: data.time?.[latest] || '',
      dependencies: version.dependencies || {},
      devDependencies: version.devDependencies || {},
      keywords: data.keywords || [],
      license: data.license || 'Unknown'
    }
  } catch (err: any) {
    console.error('Package info error:', err)
    return null
  }
}

// =====================================================
// GITHUB SEARCH
// =====================================================

export async function searchGitHub(
  query: string,
  options: {
    type?: 'repositories' | 'code' | 'issues'
    language?: string
    maxResults?: number
  } = {}
): Promise<any[]> {
  const { type = 'repositories', language, maxResults = 10 } = options

  try {
    let searchQuery = query
    if (language) {
      searchQuery += ` language:${language}`
    }

    const response = await fetch('/api/search/github', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: searchQuery, type, maxResults })
    })

    if (!response.ok) {
      throw new Error(`GitHub search failed: ${response.status}`)
    }

    const data = await response.json()
    return data.items || []
  } catch (err: any) {
    console.error('GitHub search error:', err)
    return []
  }
}

// =====================================================
// STACK OVERFLOW SEARCH
// =====================================================

export async function searchStackOverflow(
  query: string,
  options: {
    tagged?: string[]
    maxResults?: number
    sort?: 'relevance' | 'votes' | 'creation'
  } = {}
): Promise<any[]> {
  const { tagged = [], maxResults = 10, sort = 'relevance' } = options

  try {
    let url = `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=${sort}&q=${encodeURIComponent(query)}&site=stackoverflow&pagesize=${maxResults}`

    if (tagged.length > 0) {
      url += `&tagged=${tagged.join(';')}`
    }

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Stack Overflow search failed: ${response.status}`)
    }

    const data = await response.json()
    return data.items || []
  } catch (err: any) {
    console.error('Stack Overflow search error:', err)
    return []
  }
}

// =====================================================
// DOCUMENTATION FETCH
// =====================================================

export async function fetchDocumentation(
  packageName: string,
  options: {
    section?: string
    includeExamples?: boolean
  } = {}
): Promise<DocumentationResult | null> {
  const { section, includeExamples = true } = options

  try {
    const response = await fetch('/api/search/docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ package: packageName, section, includeExamples })
    })

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch (err: any) {
    console.error('Documentation fetch error:', err)
    return null
  }
}

// =====================================================
// SMART SEARCH (Combines all sources)
// =====================================================

export interface SmartSearchResult {
  web: SearchResult[]
  packages: PackageInfo[]
  github: any[]
  stackoverflow: any[]
  documentation: DocumentationResult | null
  summary: string
}

export async function smartSearch(
  query: string,
  context: {
    currentCode?: string
    framework?: string
    errorMessage?: string
  } = {}
): Promise<SmartSearchResult> {
  const { currentCode, framework, errorMessage } = context

  // Determine what to search based on context
  const isErrorSearch = !!errorMessage
  const isPackageSearch = /(?:npm|package|install|dependency)/i.test(query)
  const isCodeSearch = /(?:how to|example|tutorial|implement)/i.test(query)

  // Run searches in parallel
  const [webResults, packageResults, stackResults] = await Promise.all([
    webSearch(query, { maxResults: 5 }),
    isPackageSearch ? searchNpmPackages(query, { maxResults: 5 }) : Promise.resolve([]),
    isErrorSearch || isCodeSearch
      ? searchStackOverflow(query, {
        tagged: framework ? [framework.toLowerCase()] : [],
        maxResults: 5
      })
      : Promise.resolve([])
  ])

  // Get documentation if it looks like a package name
  const packageMatch = query.match(/^@?[\w-]+(?:\/[\w-]+)?$/)
  const docs = packageMatch
    ? await fetchDocumentation(packageMatch[0])
    : null

  // Generate summary using AI
  const summaryResponse = await fetch('/api/ai/summarize-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      webResults,
      packageResults,
      stackResults,
      context
    })
  })

  let summary = ''
  if (summaryResponse.ok) {
    const summaryData = await summaryResponse.json()
    summary = summaryData.summary || ''
  }

  return {
    web: webResults,
    packages: packageResults,
    github: [],
    stackoverflow: stackResults,
    documentation: docs,
    summary
  }
}

// =====================================================
// SEARCH FOR ERROR SOLUTIONS
// =====================================================

export async function searchErrorSolution(
  errorMessage: string,
  context: {
    framework?: string
    file?: string
    code?: string
  } = {}
): Promise<{
  solutions: { source: string; solution: string; votes?: number }[]
  relatedDocs: DocumentationResult[]
  suggestedFix?: string
}> {
  const { framework, file, code } = context

  // Clean error message for search
  const cleanError = errorMessage
    .replace(/at\s+.+:\d+:\d+/g, '') // Remove stack traces
    .replace(/['"`].+?['"`]/g, 'X') // Replace specific values
    .trim()

  // Search for solutions
  const [stackResults, webResults] = await Promise.all([
    searchStackOverflow(cleanError, {
      tagged: framework ? [framework.toLowerCase()] : [],
      sort: 'votes',
      maxResults: 5
    }),
    webSearch(`${cleanError} fix solution`, { maxResults: 5 })
  ])

  // Format solutions
  const solutions = [
    ...stackResults.map((r: any) => ({
      source: 'Stack Overflow',
      solution: r.title,
      votes: r.score,
      url: r.link
    })),
    ...webResults.map(r => ({
      source: r.source,
      solution: r.snippet,
      url: r.url
    }))
  ]

  // Get AI-suggested fix
  const fixResponse = await fetch('/api/ai/suggest-fix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      error: errorMessage,
      solutions,
      context: { framework, file, code }
    })
  })

  let suggestedFix: string | undefined
  if (fixResponse.ok) {
    const fixData = await fixResponse.json()
    suggestedFix = fixData.fix
  }

  return {
    solutions,
    relatedDocs: [],
    suggestedFix
  }
}

// =====================================================
// EXPORTS
// =====================================================


