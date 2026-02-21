// =====================================================
// FILE ENGINE - AI FIX ERRORS API
// Takes errors and code, returns fixed code
// White-labeled - user sees "File Engine" fixing errors
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { BRAND_NAME } from '@/lib/brand'
import { 
  FILE_ENGINE_FIX_PROMPT, 
  sanitizeResponse, 
  selectProvider 
} from '@/lib/ai-config'

export async function POST(request: NextRequest) {
  try {
    const { files, errors, iteration = 1 } = await request.json()
    
    if (!files || !errors) {
      return NextResponse.json(
        { error: 'Missing files or errors' },
        { status: 400 }
      )
    }
    
    // Build the fix prompt
    const errorList = errors.map((e: any) => 
      `- ${e.type}: ${e.message}${e.file ? ` in ${e.file}` : ''}${e.line ? ` at line ${e.line}` : ''}`
    ).join('\n')
    
    const fileContents = files.map((f: any) => 
      `=== ${f.path} ===\n${f.content}`
    ).join('\n\n')
    
    const prompt = `${FILE_ENGINE_FIX_PROMPT}

ITERATION: ${iteration}

ERRORS TO FIX:
${errorList}

CURRENT CODE:
${fileContents}

Fix all the errors above. Return the complete fixed files in this JSON format:
{
  "fixes": ["description of each fix applied"],
  "fixedFiles": [
    { "path": "file/path.tsx", "content": "complete fixed content" }
  ]
}

Return ONLY valid JSON, no markdown code blocks.`

    const provider = selectProvider()
    let response: string
    
    if (provider === 'anthropic') {
      response = await fixWithAnthropic(prompt)
    } else {
      response = await fixWithOpenAI(prompt)
    }
    
    // Parse the response
    try {
      // Remove markdown code blocks if present
      response = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      
      const result = JSON.parse(response)
      
      return NextResponse.json({
        fixes: result.fixes || [],
        fixedFiles: result.fixedFiles || []
      })
    } catch (parseError) {
      console.error('[Fix API] Failed to parse AI response:', response)
      return NextResponse.json({
        fixes: [],
        fixedFiles: [],
        error: 'Failed to parse fix response'
      })
    }
  } catch (err: any) {
    console.error('[Fix API Error]', err)
    return NextResponse.json(
      { error: `${BRAND_NAME} fix failed: ` + + err.message, fixes: [], fixedFiles: [] },
      { status: 500 }
    )
  }
}

async function fixWithAnthropic(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(`${BRAND_NAME} API key not configured`)
  }
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }]
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Fix API request failed')
  }
  
  const data = await response.json()
  return sanitizeResponse(data.content[0].text)
}

async function fixWithOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error(`${BRAND_NAME} API key not configured`)
  }
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Fix API request failed')
  }
  
  const data = await response.json()
  return sanitizeResponse(data.choices[0].message.content)
}
