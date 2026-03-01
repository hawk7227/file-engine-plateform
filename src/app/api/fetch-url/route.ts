import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'File-Engine-Bot/1.0',
        'Accept': 'text/html,application/xhtml+xml',
      }
    })
    clearTimeout(timeout)

    const html = await res.text()
    
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : parsedUrl.hostname
    
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
    const description = descMatch ? descMatch[1].trim() : ''
    
    let content = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[\s\S]*?<\/aside>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    
    if (content.length > 3000) {
      content = content.slice(0, 3000) + '...'
    }
    
    const frameworks: string[] = []
    if (html.includes('tailwind')) frameworks.push('Tailwind CSS')
    if (html.includes('bootstrap')) frameworks.push('Bootstrap')
    if (html.includes('material-ui') || html.includes('MuiBox')) frameworks.push('Material UI')
    if (html.includes('__next')) frameworks.push('Next.js')
    if (html.includes('__nuxt')) frameworks.push('Nuxt.js')
    
    return NextResponse.json({ 
      title, 
      description,
      content: content || description || title,
      frameworks,
      hostname: parsedUrl.hostname,
      statusCode: res.status
    })
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json({ title: '', description: '', content: '', error: 'Request timed out' }, { status: 408 })
    }
    return NextResponse.json({ title: '', description: '', content: '', error: error.message })
  }
}
