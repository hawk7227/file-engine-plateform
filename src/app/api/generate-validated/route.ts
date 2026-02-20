import { NextRequest } from 'next/server'
import { getUser, getProfile, supabase } from '@/lib/supabase'
import { generate, parseCodeBlocks, AIModel } from '@/lib/ai'
import { validateAndFix, ValidationResult } from '@/lib/validation'
import { fixWithAI, FixResult } from '@/lib/ai-fixer'
import { getKeyWithFailover, markRateLimited } from '@/lib/key-pool'
import { checkUsageAndRateLimit, recordUsage } from '@/lib/usage-limits'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120 // 2 minutes for complex validations

/**
 * GENERATE WITH VALIDATION
 * 
 * This is the core differentiation from Cursor/Claude:
 * 1. Generate code
 * 2. Validate thoroughly
 * 3. Auto-fix what we can
 * 4. AI-fix complex errors
 * 5. Re-validate until clean
 * 6. Only deliver error-free code
 */

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

    // Check usage limits and rate limiting
    const usageCheck = await checkUsageAndRateLimit(user.id)
    if (!usageCheck.allowed) {
      return new Response(JSON.stringify({ 
        error: usageCheck.error,
        upgradeRequired: usageCheck.statusCode === 403
      }), { 
        status: usageCheck.statusCode || 429,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const { 
      prompt, 
      projectId, 
      buildId, 
      model = 'claude-sonnet-4',
      strictMode = false,
      maxFixIterations = 3
    } = await req.json()

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get user's API keys OR use from pool
    const profile = await getProfile(user.id)
    let apiKey = model.startsWith('claude') 
      ? profile?.claude_api_key 
      : profile?.openai_api_key
    
    // If user doesn't have custom key, get from pool
    let provider: 'anthropic' | 'openai' = model.startsWith('claude') ? 'anthropic' : 'openai'
    if (!apiKey) {
      const keyResult = getKeyWithFailover(provider)
      if (keyResult) {
        apiKey = keyResult.key
        provider = keyResult.provider
      }
    }

    // Get project context
    let context = ''
    if (projectId) {
      const { data: files } = await supabase
        .from('files')
        .select('name, path, content')
        .eq('project_id', projectId)
        .eq('type', 'generated')
        .limit(10)

      if (files && files.length > 0) {
        context = `Existing project files:\n${files.map((f: any) => 
          `File: ${f.path}\n\`\`\`\n${f.content?.substring(0, 500)}\n\`\`\``
        ).join('\n\n')}`
      }
    }

    // Update build status
    if (buildId) {
      await supabase
        .from('builds')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', buildId)
    }

    // Create SSE stream
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // === PHASE 1: GENERATE ===
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'phase', 
            phase: 'generating',
            message: 'Generating code...'
          })}\n\n`))

          let fullResponse = ''
          for await (const chunk of generate(prompt, model as AIModel, apiKey, context)) {
            fullResponse += chunk
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'chunk', 
              content: chunk 
            })}\n\n`))
          }

          // Parse files
          let parsedFiles = parseCodeBlocks(fullResponse)
          
          if (parsedFiles.length === 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'warning', 
              message: 'No code blocks found in response'
            })}\n\n`))
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'phase', 
            phase: 'generated',
            message: `Generated ${parsedFiles.length} files`,
            filesCount: parsedFiles.length
          })}\n\n`))

          // === PHASE 2: VALIDATE ===
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'phase', 
            phase: 'validating',
            message: 'Validating code...'
          })}\n\n`))

          let validationResult = await validateAndFix(parsedFiles, { 
            autoFix: true, 
            strictMode,
            maxIterations: 3 
          })

          // Report validation results
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'validation', 
            stats: validationResult.stats,
            errors: validationResult.errors.length,
            warnings: validationResult.warnings.length,
            autoFixed: validationResult.stats.errorsFixed
          })}\n\n`))

          // If auto-fix worked, update files
          if (validationResult.fixedFiles) {
            parsedFiles = validationResult.fixedFiles
          }

          // === PHASE 3: AI FIX (if needed) ===
          if (validationResult.errors.length > 0 && maxFixIterations > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'phase', 
              phase: 'ai_fixing',
              message: `AI fixing ${validationResult.errors.length} errors...`
            })}\n\n`))

            const fixResult = await fixWithAI(
              parsedFiles,
              validationResult.errors,
              { 
                model: model as AIModel, 
                apiKey,
                maxIterations: maxFixIterations,
                explainFixes: true
              }
            )

            // Report fix results
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'ai_fix_result', 
              success: fixResult.success,
              iterations: fixResult.iterations,
              changes: fixResult.changes.length,
              explanation: fixResult.explanation
            })}\n\n`))

            if (fixResult.success || fixResult.fixedFiles.length > 0) {
              parsedFiles = fixResult.fixedFiles
              validationResult = fixResult.validationResult
            }
          }

          // === PHASE 4: FINAL VALIDATION ===
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'phase', 
            phase: 'final_validation',
            message: 'Final validation...'
          })}\n\n`))

          const finalValidation = await validateAndFix(parsedFiles, { 
            autoFix: false, 
            strictMode 
          })

          // === PHASE 5: DELIVER ===
          const isClean = finalValidation.errors.length === 0

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'phase', 
            phase: 'complete',
            message: isClean ? 'Code validated successfully!' : `Delivered with ${finalValidation.errors.length} remaining issues`,
            isClean
          })}\n\n`))

          // Save files to database
          if (projectId && parsedFiles.length > 0) {
            // Delete old files
            await supabase
              .from('files')
              .delete()
              .eq('project_id', projectId)
              .eq('type', 'generated')

            // Insert new files
            const filesToInsert = parsedFiles.map(file => ({
              project_id: projectId,
              user_id: user.id,
              name: file.filepath.split('/').pop() || file.filepath,
              path: file.filepath,
              content: file.content,
              type: 'generated',
              mime_type: getMimeType(file.language)
            }))

            await supabase.from('files').insert(filesToInsert)
          }

          // Update build status
          if (buildId) {
            await supabase
              .from('builds')
              .update({ 
                status: isClean ? 'completed' : 'completed_with_warnings',
                completed_at: new Date().toISOString(),
                metadata: {
                  validation: {
                    errors: finalValidation.errors.length,
                    warnings: finalValidation.warnings.length,
                    isClean
                  }
                }
              })
              .eq('id', buildId)
          }

          // Send final result
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'complete',
            files: parsedFiles,
            validation: {
              isClean,
              errors: finalValidation.errors,
              warnings: finalValidation.warnings,
              suggestions: finalValidation.suggestions
            },
            buildId
          })}\n\n`))

          controller.close()

        } catch (error) {
          console.error('Generation error:', error)
          
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
    console.error('API error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

function getMimeType(language: string): string {
  const map: Record<string, string> = {
    typescript: 'text/typescript',
    ts: 'text/typescript',
    javascript: 'text/javascript',
    js: 'text/javascript',
    tsx: 'text/typescript-jsx',
    jsx: 'text/javascript-jsx',
    html: 'text/html',
    css: 'text/css',
    json: 'application/json',
    sql: 'text/x-sql',
    python: 'text/x-python',
    py: 'text/x-python'
  }
  return map[language.toLowerCase()] || 'text/plain'
}
