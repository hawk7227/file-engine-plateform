import Anthropic from '@anthropic-ai/sdk'
import { BRAND_AI_NAME } from '@/lib/brand'
import OpenAI from 'openai'

// AI Provider Types
export type AIProvider = 'claude' | 'openai'
export type AIModel = 'claude-sonnet-4' | 'claude-opus-4' | 'claude-3-5-haiku' | 'gpt-4o' | 'gpt-4o-mini' | 'o1'

// Model mapping to actual API model strings
export const MODEL_MAP: Record<AIModel, string> = {
  'claude-sonnet-4': 'claude-sonnet-4-20250514',
  'claude-opus-4': 'claude-opus-4-0-20250115',
  'claude-3-5-haiku': 'claude-3-5-haiku-20241022',
  'gpt-4o': 'gpt-4o',
  'gpt-4o-mini': 'gpt-4o-mini',
  'o1': 'o1'
}

// Get provider from model
export function getProviderFromModel(model: AIModel): AIProvider {
  return model.startsWith('claude') ? 'claude' : 'openai'
}

// Create Anthropic client
export function createAnthropicClient(apiKey?: string) {
  return new Anthropic({
    apiKey: apiKey || process.env.ANTHROPIC_API_KEY!
  })
}

// Create OpenAI client
export function createOpenAIClient(apiKey?: string) {
  return new OpenAI({
    apiKey: apiKey || process.env.OPENAI_API_KEY!
  })
}

// System prompt for code generation
export const CODE_GENERATION_SYSTEM_PROMPT = `You are ${BRAND_AI_NAME}, an expert AI developer that generates complete, production-ready code.

## Your Capabilities
- Generate full project structures with multiple files
- Write clean, modern, well-documented code
- Follow best practices for the specific technology stack
- Include proper error handling and edge cases
- Add helpful comments explaining complex logic

## Output Format
When generating code, ALWAYS use this exact format for each file:

\`\`\`[language]:[filepath]
[file contents]
\`\`\`

Examples:
\`\`\`typescript:src/index.ts
console.log("Hello World");
\`\`\`

\`\`\`json:package.json
{
  "name": "my-app",
  "version": "1.0.0"
}
\`\`\`

## Rules
1. ALWAYS include the filepath after the language, separated by a colon
2. Generate complete, working files - never use placeholders like "// TODO" or "..."
3. Include ALL necessary files (package.json, configs, etc.)
4. Use modern syntax and best practices
5. Add proper TypeScript types when applicable
6. Include error handling
7. Make code production-ready

## Project Types
- Landing Page: HTML/CSS/JS or React with Tailwind
- API: Node.js/Express with proper routing, middleware, error handling
- Dashboard: React with charts, tables, and data visualization
- Full Stack: Complete frontend + backend + database setup

Begin generating code based on the user's request.`

// Parse code blocks from AI response
export interface ParsedFile {
  language: string
  filepath: string
  content: string
}

export function parseCodeBlocks(response: string): ParsedFile[] {
  const files: ParsedFile[] = []
  
  // Match code blocks with format: ```language:filepath\ncontent\n```
  const codeBlockRegex = /```(\w+):([^\n]+)\n([\s\S]*?)```/g
  let match
  
  while ((match = codeBlockRegex.exec(response)) !== null) {
    const [, language, filepath, content] = match
    files.push({
      language: language.trim(),
      filepath: filepath.trim(),
      content: content.trim()
    })
  }
  
  // Also try to match standard code blocks and infer filepath
  if (files.length === 0) {
    const standardBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
    let blockIndex = 0
    
    while ((match = standardBlockRegex.exec(response)) !== null) {
      const [, language = 'text', content] = match
      const ext = getExtensionForLanguage(language)
      files.push({
        language: language.trim(),
        filepath: `file_${blockIndex}.${ext}`,
        content: content.trim()
      })
      blockIndex++
    }
  }
  
  return files
}

function getExtensionForLanguage(language: string): string {
  const map: Record<string, string> = {
    typescript: 'ts',
    javascript: 'js',
    tsx: 'tsx',
    jsx: 'jsx',
    python: 'py',
    html: 'html',
    css: 'css',
    json: 'json',
    yaml: 'yml',
    markdown: 'md',
    sql: 'sql',
    bash: 'sh',
    shell: 'sh'
  }
  return map[language.toLowerCase()] || 'txt'
}

// Generate with Claude (streaming)
export async function* generateWithClaude(
  prompt: string,
  model: AIModel = 'claude-sonnet-4',
  apiKey?: string,
  context?: string
): AsyncGenerator<string, void, unknown> {
  const client = createAnthropicClient(apiKey)
  
  const messages: Anthropic.MessageParam[] = []
  
  if (context) {
    messages.push({ role: 'user', content: context })
    messages.push({ role: 'assistant', content: 'I understand the context. What would you like me to build?' })
  }
  
  messages.push({ role: 'user', content: prompt })
  
  const stream = client.messages.stream({
    model: MODEL_MAP[model],
    max_tokens: 16000,
    system: CODE_GENERATION_SYSTEM_PROMPT,
    messages
  })
  
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text
    }
  }
}

// Generate with OpenAI (streaming)
export async function* generateWithOpenAI(
  prompt: string,
  model: AIModel = 'gpt-4o',
  apiKey?: string,
  context?: string
): AsyncGenerator<string, void, unknown> {
  const client = createOpenAIClient(apiKey)
  
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: CODE_GENERATION_SYSTEM_PROMPT }
  ]
  
  if (context) {
    messages.push({ role: 'user', content: context })
    messages.push({ role: 'assistant', content: 'I understand the context. What would you like me to build?' })
  }
  
  messages.push({ role: 'user', content: prompt })
  
  const stream = await client.chat.completions.create({
    model: MODEL_MAP[model],
    messages,
    max_tokens: 16000,
    stream: true
  })
  
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content
    if (content) {
      yield content
    }
  }
}

// Unified generate function
export async function* generate(
  prompt: string,
  model: AIModel = 'claude-sonnet-4',
  apiKey?: string,
  context?: string
): AsyncGenerator<string, void, unknown> {
  const provider = getProviderFromModel(model)
  
  if (provider === 'claude') {
    yield* generateWithClaude(prompt, model, apiKey, context)
  } else {
    yield* generateWithOpenAI(prompt, model, apiKey, context)
  }
}

