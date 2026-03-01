import { NextRequest } from 'next/server'
import { getUser, getProfile, supabase } from '@/lib/supabase'
import { generate, parseCodeBlocks, AIModel } from '@/lib/ai'

export const runtime = 'nodejs'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const user = await getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const { prompt, projectId, buildId, model = 'claude-sonnet-4' } = await req.json()

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get user's API keys if they have custom ones
    const profile = await getProfile(user.id)
    const useClaudeKey = model.startsWith('claude') ? profile?.claude_api_key : null
    const useOpenAIKey = model.startsWith('gpt') || model === 'o1' ? profile?.openai_api_key : null
    const apiKey = useClaudeKey || useOpenAIKey || undefined

    // Get project context if projectId provided
    let context = ''
    if (projectId) {
      const { data: files } = await supabase
        .from('files')
        .select('name, path, content')
        .eq('project_id', projectId)
        .eq('type', 'generated')
        .limit(10)

      if (files && files.length > 0) {
        context = `Here are the existing files in this project:\n\n${files.map((f: any) => 
          `File: ${f.path}\n\`\`\`\n${f.content?.substring(0, 1000)}${(f.content?.length || 0) > 1000 ? '\n...(truncated)' : ''}\n\`\`\``
        ).join('\n\n')}`
      }
    }

    // Update build status to running if buildId provided
    if (buildId) {
      await supabase
        .from('builds')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', buildId)
    }

    // Create readable stream for SSE
    const encoder = new TextEncoder()
    let fullResponse = ''

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start', buildId })}\n\n`))

          // Stream AI response
          for await (const chunk of generate(prompt, model as AIModel, apiKey, context)) {
            fullResponse += chunk
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`))
          }

          // Parse files from response
          const parsedFiles = parseCodeBlocks(fullResponse)

          // Save files to database if projectId provided
          if (projectId && parsedFiles.length > 0) {
            const filesToInsert = parsedFiles.map(file => ({
              project_id: projectId,
              user_id: user.id,
              name: file.filepath.split('/').pop() || file.filepath,
              path: file.filepath,
              content: file.content,
              type: 'generated',
              mime_type: getMimeType(file.language)
            }))

            // Delete old generated files first
            await supabase
              .from('files')
              .delete()
              .eq('project_id', projectId)
              .eq('type', 'generated')

            // Insert new files
            await supabase.from('files').insert(filesToInsert)
          }

          // Update build status to completed
          if (buildId) {
            await supabase
              .from('builds')
              .update({ 
                status: 'completed', 
                completed_at: new Date().toISOString() 
              })
              .eq('id', buildId)
          }

          // Send completion event with parsed files
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'complete', 
            files: parsedFiles,
            buildId 
          })}\n\n`))

          controller.close()
        } catch (error) {
          console.error('Stream error:', error)
          
          // Update build status to failed
          if (buildId) {
            await supabase
              .from('builds')
              .update({ 
                status: 'failed', 
                error: error instanceof Error ? error.message : 'Unknown error',
                completed_at: new Date().toISOString()
              })
              .eq('id', buildId)
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            error: error instanceof Error ? error.message : 'Generation failed' 
          })}\n\n`))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  } catch (error) {
    console.error('Generate error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

function getMimeType(language: string): string {
  const map: Record<string, string> = {
    typescript: 'text/typescript',
    javascript: 'text/javascript',
    tsx: 'text/typescript-jsx',
    jsx: 'text/javascript-jsx',
    python: 'text/x-python',
    html: 'text/html',
    css: 'text/css',
    json: 'application/json',
    yaml: 'text/yaml',
    markdown: 'text/markdown',
    sql: 'text/x-sql'
  }
  return map[language.toLowerCase()] || 'text/plain'
}
