// =====================================================
// FILE ENGINE - VISION API
// Image analysis and mockup-to-code generation
// White-labeled - uses Anthropic/OpenAI Vision APIs internally
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { BRAND_NAME } from '@/lib/brand'
import { 

  FILE_ENGINE_VISION_PROMPT, 
  sanitizeResponse, 
  selectProvider,
  getActualModelId 
} from '@/lib/ai-config'
import { parseBody, parseAIVisionRequest, validationErrorResponse } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseBody(request, parseAIVisionRequest)
    if (!parsed.success) return validationErrorResponse(parsed.error)
    const { image, prompt, maxTokens = 4096 } = parsed.data
    
    if (!image) {
      return NextResponse.json(
        { error: 'Missing image data' },
        { status: 400 }
      )
    }
    
    const provider = selectProvider()
    
    let content: string
    
    if (provider === 'anthropic') {
      content = await analyzeWithAnthropic(image, prompt || FILE_ENGINE_VISION_PROMPT, maxTokens)
    } else {
      content = await analyzeWithOpenAI(image, prompt || FILE_ENGINE_VISION_PROMPT, maxTokens)
    }
    
    // Sanitize response to remove any AI branding
    content = sanitizeResponse(content)
    
    return NextResponse.json({ content })
  } catch (err: any) {
    console.error('[Vision API Error]', err)
    return NextResponse.json(
      { error: `${BRAND_NAME} vision analysis failed` },
      { status: 500 }
    )
  }
}

async function analyzeWithAnthropic(
  imageBase64: string, 
  prompt: string, 
  maxTokens: number
): Promise<string> {
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
      max_tokens: maxTokens,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: imageBase64
              }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        }
      ]
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Vision API request failed')
  }
  
  const data = await response.json()
  return data.content[0].text
}

async function analyzeWithOpenAI(
  imageBase64: string, 
  prompt: string, 
  maxTokens: number
): Promise<string> {
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
      model: 'gpt-4o',
      max_tokens: maxTokens,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${imageBase64}`
              }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        }
      ]
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Vision API request failed')
  }
  
  const data = await response.json()
  return data.choices[0].message.content
}
