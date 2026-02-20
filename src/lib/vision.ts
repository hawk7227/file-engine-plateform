// =====================================================
// FILE ENGINE - VISION API
// Mockup-to-Code AND Code-to-Mockup capabilities
// Uses OpenAI Vision or Anthropic Claude Vision (white-labeled)
// =====================================================

import { getAIConfig } from './ai-config'

// =====================================================
// TYPES
// =====================================================

export interface ImageAnalysisResult {
  description: string
  components: UIComponent[]
  layout: LayoutInfo
  colors: ColorPalette
  suggestedCode: string
  framework: 'react' | 'html' | 'vue' | 'svelte'
}

export interface UIComponent {
  type: 'button' | 'input' | 'card' | 'nav' | 'header' | 'footer' | 'sidebar' | 'modal' | 'form' | 'list' | 'table' | 'image' | 'text' | 'icon' | 'container'
  name: string
  properties: Record<string, any>
  children?: UIComponent[]
  position: { x: number; y: number; width: number; height: number }
}

export interface LayoutInfo {
  type: 'grid' | 'flex' | 'absolute' | 'stack'
  direction?: 'row' | 'column'
  gap?: number
  padding?: number
  responsive: boolean
}

export interface ColorPalette {
  primary: string
  secondary: string
  background: string
  text: string
  accent: string
  additional: string[]
}

export interface CodeToImageResult {
  imageUrl: string
  imageBase64: string
  width: number
  height: number
  format: 'png' | 'svg'
}

// =====================================================
// IMAGE TO CODE (Mockup → Code)
// =====================================================

export async function analyzeImage(
  imageData: string | File,
  options: {
    framework?: 'react' | 'html' | 'vue' | 'svelte'
    includeStyles?: boolean
    responsive?: boolean
    detailLevel?: 'basic' | 'detailed' | 'production'
  } = {}
): Promise<ImageAnalysisResult> {
  const { framework = 'react', includeStyles = true, responsive = true, detailLevel = 'detailed' } = options
  const config = getAIConfig()
  
  // Convert File to base64 if needed
  let base64Image: string
  if (imageData instanceof File) {
    base64Image = await fileToBase64(imageData)
  } else if (imageData.startsWith('data:')) {
    base64Image = imageData.split(',')[1]
  } else {
    base64Image = imageData
  }
  
  const systemPrompt = `You are an expert UI/UX developer. Analyze the provided mockup/screenshot and generate production-ready code.

OUTPUT FORMAT (JSON):
{
  "description": "Brief description of the UI",
  "components": [
    {
      "type": "component_type",
      "name": "ComponentName",
      "properties": { ... },
      "children": [ ... ],
      "position": { "x": 0, "y": 0, "width": 100, "height": 50 }
    }
  ],
  "layout": {
    "type": "flex|grid|stack",
    "direction": "row|column",
    "gap": 16,
    "responsive": true
  },
  "colors": {
    "primary": "#hex",
    "secondary": "#hex",
    "background": "#hex",
    "text": "#hex",
    "accent": "#hex",
    "additional": ["#hex"]
  },
  "suggestedCode": "// Full component code here"
}

REQUIREMENTS:
- Framework: ${framework}
- Include styles: ${includeStyles}
- Responsive design: ${responsive}
- Detail level: ${detailLevel}
- Use Tailwind CSS for styling
- Generate clean, production-ready code
- Match the design as closely as possible
- Include all visible components
- Preserve spacing and alignment`

  try {
    const response = await fetch('/api/ai/vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64Image,
        prompt: systemPrompt,
        maxTokens: 4096
      })
    })
    
    if (!response.ok) {
      throw new Error(`Vision API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Parse the JSON response
    try {
      const result = JSON.parse(extractJSON(data.content))
      return {
        ...result,
        framework
      }
    } catch (parseError) {
      // If JSON parsing fails, return basic result with the raw code
      return {
        description: 'Generated UI component',
        components: [],
        layout: { type: 'flex', responsive: true },
        colors: {
          primary: '#3b82f6',
          secondary: '#6b7280',
          background: '#ffffff',
          text: '#1f2937',
          accent: '#8b5cf6',
          additional: []
        },
        suggestedCode: data.content,
        framework
      }
    }
  } catch (err: any) {
    throw new Error(`Image analysis failed: ${err.message}`)
  }
}

// Generate code from mockup with full component structure
export async function mockupToCode(
  imageData: string | File,
  options: {
    framework?: 'react' | 'html' | 'vue' | 'svelte'
    componentName?: string
    includeTypes?: boolean
    styling?: 'tailwind' | 'css' | 'styled-components'
  } = {}
): Promise<{ code: string; files: { path: string; content: string }[] }> {
  const {
    framework = 'react',
    componentName = 'GeneratedComponent',
    includeTypes = true,
    styling = 'tailwind'
  } = options
  
  const analysis = await analyzeImage(imageData, { framework, detailLevel: 'production' })
  
  // Generate file structure based on framework
  const files: { path: string; content: string }[] = []
  
  if (framework === 'react') {
    const ext = includeTypes ? 'tsx' : 'jsx'
    files.push({
      path: `src/components/${componentName}.${ext}`,
      content: analysis.suggestedCode
    })
    
    if (styling === 'css') {
      files.push({
        path: `src/components/${componentName}.css`,
        content: generateCSSFromColors(analysis.colors, componentName.toLowerCase())
      })
    }
  } else if (framework === 'html') {
    files.push({
      path: 'index.html',
      content: wrapInHTML(analysis.suggestedCode, analysis.colors)
    })
  }
  
  return {
    code: analysis.suggestedCode,
    files
  }
}

// =====================================================
// CODE TO IMAGE (Code → Mockup/Screenshot)
// =====================================================

export async function codeToImage(
  code: string,
  options: {
    width?: number
    height?: number
    theme?: 'light' | 'dark'
    format?: 'png' | 'svg'
    scale?: number
  } = {}
): Promise<CodeToImageResult> {
  const { width = 1200, height = 800, theme = 'light', format = 'png', scale = 2 } = options
  
  try {
    const response = await fetch('/api/screenshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        width,
        height,
        theme,
        format,
        scale
      })
    })
    
    if (!response.ok) {
      throw new Error(`Screenshot API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    return {
      imageUrl: data.url,
      imageBase64: data.base64,
      width: width * scale,
      height: height * scale,
      format
    }
  } catch (err: any) {
    throw new Error(`Code to image failed: ${err.message}`)
  }
}

// Generate preview image from React/HTML code
export async function generatePreviewImage(
  files: { path: string; content: string }[],
  options: {
    entryPoint?: string
    viewport?: { width: number; height: number }
    waitForSelector?: string
    fullPage?: boolean
  } = {}
): Promise<CodeToImageResult> {
  const { 
    entryPoint = 'index.html',
    viewport = { width: 1200, height: 800 },
    waitForSelector,
    fullPage = false
  } = options
  
  try {
    const response = await fetch('/api/preview/screenshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files,
        entryPoint,
        viewport,
        waitForSelector,
        fullPage
      })
    })
    
    if (!response.ok) {
      throw new Error(`Preview screenshot failed: ${response.status}`)
    }
    
    const data = await response.json()
    
    return {
      imageUrl: data.url,
      imageBase64: data.base64,
      width: viewport.width,
      height: viewport.height,
      format: 'png'
    }
  } catch (err: any) {
    throw new Error(`Preview generation failed: ${err.message}`)
  }
}

// =====================================================
// PDF UNDERSTANDING
// =====================================================

export interface PDFAnalysisResult {
  text: string
  pages: number
  tables: { page: number; data: string[][] }[]
  images: { page: number; description: string }[]
  structure: {
    title?: string
    sections: { heading: string; content: string }[]
  }
}

export async function analyzePDF(
  pdfData: string | File,
  options: {
    extractTables?: boolean
    extractImages?: boolean
    summarize?: boolean
  } = {}
): Promise<PDFAnalysisResult> {
  const { extractTables = true, extractImages = false, summarize = false } = options
  
  // Convert File to base64 if needed
  let base64PDF: string
  if (pdfData instanceof File) {
    base64PDF = await fileToBase64(pdfData)
  } else if (pdfData.startsWith('data:')) {
    base64PDF = pdfData.split(',')[1]
  } else {
    base64PDF = pdfData
  }
  
  try {
    const response = await fetch('/api/ai/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pdf: base64PDF,
        extractTables,
        extractImages,
        summarize
      })
    })
    
    if (!response.ok) {
      throw new Error(`PDF analysis failed: ${response.status}`)
    }
    
    return await response.json()
  } catch (err: any) {
    throw new Error(`PDF analysis failed: ${err.message}`)
  }
}

// Generate code from PDF specification/wireframe
export async function pdfToCode(
  pdfData: string | File,
  options: {
    framework?: 'react' | 'html'
    pageNumbers?: number[]
  } = {}
): Promise<{ code: string; files: { path: string; content: string }[] }> {
  const { framework = 'react', pageNumbers } = options
  
  const analysis = await analyzePDF(pdfData, { extractImages: true })
  
  // Send to AI for code generation
  const response = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: `Convert this PDF content to ${framework} code:\n\n${analysis.text}`,
      framework,
      context: {
        structure: analysis.structure,
        images: analysis.images
      }
    })
  })
  
  if (!response.ok) {
    throw new Error('Failed to generate code from PDF')
  }
  
  const data = await response.json()
  
  return {
    code: data.code,
    files: data.files || []
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function extractJSON(text: string): string {
  // Try to extract JSON from markdown code blocks
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    return jsonMatch[1].trim()
  }
  
  // Try to find raw JSON
  const jsonStart = text.indexOf('{')
  const jsonEnd = text.lastIndexOf('}')
  if (jsonStart !== -1 && jsonEnd !== -1) {
    return text.slice(jsonStart, jsonEnd + 1)
  }
  
  return text
}

function generateCSSFromColors(colors: ColorPalette, prefix: string): string {
  return `:root {
  --${prefix}-primary: ${colors.primary};
  --${prefix}-secondary: ${colors.secondary};
  --${prefix}-background: ${colors.background};
  --${prefix}-text: ${colors.text};
  --${prefix}-accent: ${colors.accent};
}

.${prefix} {
  background-color: var(--${prefix}-background);
  color: var(--${prefix}-text);
}

.${prefix}-btn-primary {
  background-color: var(--${prefix}-primary);
  color: white;
}

.${prefix}-btn-secondary {
  background-color: var(--${prefix}-secondary);
  color: white;
}
`
}

function wrapInHTML(code: string, colors: ColorPalette): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated UI</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root {
      --color-primary: ${colors.primary};
      --color-secondary: ${colors.secondary};
      --color-background: ${colors.background};
      --color-text: ${colors.text};
      --color-accent: ${colors.accent};
    }
  </style>
</head>
<body class="bg-gray-50">
  ${code}
</body>
</html>`
}

// =====================================================
// EXPORTS
// =====================================================

// All functions exported at declaration above
