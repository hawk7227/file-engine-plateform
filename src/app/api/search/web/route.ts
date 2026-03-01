// =====================================================
// FILE ENGINE - WEB SEARCH API
// Search the web for documentation, packages, solutions
// =====================================================

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { query, maxResults = 10, dateRange = 'all' } = await request.json()
    
    if (!query) {
      return NextResponse.json(
        { error: 'Missing search query' },
        { status: 400 }
      )
    }
    
    // Use multiple search sources
    const results = await searchWeb(query, maxResults)
    
    return NextResponse.json({ results })
  } catch (err: any) {
    console.error('[Search API Error]', err)
    return NextResponse.json(
      { error: 'Search failed: ' + err.message, results: [] },
      { status: 500 }
    )
  }
}

async function searchWeb(query: string, maxResults: number): Promise<any[]> {
  const results: any[] = []
  
  // Try Serper API (Google Search)
  const serperKey = process.env.SERPER_API_KEY
  if (serperKey) {
    try {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': serperKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: query,
          num: maxResults
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        for (const item of data.organic || []) {
          results.push({
            title: item.title,
            url: item.link,
            snippet: item.snippet,
            source: new URL(item.link).hostname,
            relevance: 1.0
          })
        }
        return results
      }
    } catch (e) {
      console.error('Serper search failed:', e)
    }
  }
  
  // Try Brave Search API
  const braveKey = process.env.BRAVE_SEARCH_API_KEY
  if (braveKey) {
    try {
      const response = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${maxResults}`,
        {
          headers: {
            'X-Subscription-Token': braveKey
          }
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        for (const item of data.web?.results || []) {
          results.push({
            title: item.title,
            url: item.url,
            snippet: item.description,
            source: new URL(item.url).hostname,
            relevance: 1.0
          })
        }
        return results
      }
    } catch (e) {
      console.error('Brave search failed:', e)
    }
  }
  
  // Fallback: Search DuckDuckGo (no API key needed)
  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`
    )
    
    if (response.ok) {
      const data = await response.json()
      
      // Related topics
      for (const item of data.RelatedTopics?.slice(0, maxResults) || []) {
        if (item.FirstURL) {
          results.push({
            title: item.Text?.split(' - ')[0] || 'Result',
            url: item.FirstURL,
            snippet: item.Text || '',
            source: 'duckduckgo',
            relevance: 0.8
          })
        }
      }
      
      // Instant answer
      if (data.AbstractURL) {
        results.unshift({
          title: data.Heading || query,
          url: data.AbstractURL,
          snippet: data.Abstract || '',
          source: data.AbstractSource || 'duckduckgo',
          relevance: 1.0
        })
      }
    }
  } catch (e) {
    console.error('DuckDuckGo search failed:', e)
  }
  
  // Also search programming-specific sources
  const programmingResults = await searchProgrammingSources(query)
  results.push(...programmingResults)
  
  // Deduplicate by URL
  const seen = new Set()
  return results.filter(r => {
    if (seen.has(r.url)) return false
    seen.add(r.url)
    return true
  }).slice(0, maxResults)
}

async function searchProgrammingSources(query: string): Promise<any[]> {
  const results: any[] = []
  
  // Search MDN Web Docs
  try {
    const mdnResponse = await fetch(
      `https://developer.mozilla.org/api/v1/search?q=${encodeURIComponent(query)}&locale=en-US`
    )
    if (mdnResponse.ok) {
      const mdnData = await mdnResponse.json()
      for (const doc of mdnData.documents?.slice(0, 3) || []) {
        results.push({
          title: doc.title,
          url: `https://developer.mozilla.org${doc.mdn_url}`,
          snippet: doc.summary || '',
          source: 'MDN',
          relevance: 0.9
        })
      }
    }
  } catch (e) {
    // MDN search failed, continue
  }
  
  // Search DevDocs
  try {
    const devdocsUrl = `https://devdocs.io/search?q=${encodeURIComponent(query)}`
    results.push({
      title: `DevDocs: ${query}`,
      url: devdocsUrl,
      snippet: 'Search DevDocs for comprehensive API documentation',
      source: 'DevDocs',
      relevance: 0.7
    })
  } catch (e) {
    // Continue
  }
  
  return results
}
