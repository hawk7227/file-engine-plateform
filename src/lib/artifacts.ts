// =====================================================
// FILE ENGINE - ARTIFACTS SYSTEM
// Interactive previews and renderable content
// Like Claude's artifacts but for File Engine
// =====================================================

// =====================================================
// TYPES
// =====================================================

export interface Artifact {
  id: string
  type: ArtifactType
  title: string
  content: string
  language?: string
  metadata?: ArtifactMetadata
  createdAt: string
  updatedAt: string
}

export type ArtifactType = 
  | 'react'      // React component (renders in iframe)
  | 'html'       // HTML page (renders in iframe)
  | 'markdown'   // Markdown (renders as formatted text)
  | 'mermaid'    // Mermaid diagram (renders as SVG)
  | 'svg'        // SVG image (renders directly)
  | 'code'       // Code snippet (syntax highlighted)
  | 'json'       // JSON data (formatted view)
  | 'chart'      // Chart data (renders with Chart.js)
  | 'table'      // Table data (renders as interactive table)

export interface ArtifactMetadata {
  width?: number
  height?: number
  dependencies?: string[]
  theme?: 'light' | 'dark'
  interactive?: boolean
}

export interface ArtifactStorage {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
  list(prefix?: string): Promise<string[]>
}

// =====================================================
// ARTIFACT TEMPLATES
// Pre-built templates for common artifact types
// =====================================================

export const ARTIFACT_TEMPLATES = {
  react: `
import React, { useState } from 'react';
import { BRAND_NAME } from '@/lib/brand'

export default function App() {
  const [count, setCount] = useState(0);
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Hello ${BRAND_NAME}!</h1>
      <button 
        onClick={() => setCount(c => c + 1)}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Count: {count}
      </button>
    </div>
  );
}
`,

  html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${BRAND_NAME} Artifact</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="p-4">
  <h1 class="text-2xl font-bold">Hello ${BRAND_NAME}!</h1>
  <p class="mt-2 text-gray-600">This is an HTML artifact.</p>
</body>
</html>
`,

  mermaid: `
flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
`,

  svg: `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" fill="#3B82F6" />
  <text x="50" y="55" text-anchor="middle" fill="white" font-size="14">FE</text>
</svg>
`,

  chart: `
{
  "type": "bar",
  "data": {
    "labels": ["Jan", "Feb", "Mar", "Apr", "May"],
    "datasets": [{
      "label": "Sales",
      "data": [12, 19, 3, 5, 2],
      "backgroundColor": "#3B82F6"
    }]
  }
}
`
}

// =====================================================
// ARTIFACT DETECTION
// Automatically detect artifact type from content
// =====================================================

export function detectArtifactType(content: string): ArtifactType {
  const trimmed = content.trim()
  
  // Check for React
  if (trimmed.includes('import React') || 
      trimmed.includes('from "react"') || 
      trimmed.includes("from 'react'") ||
      trimmed.includes('useState') ||
      trimmed.includes('export default function')) {
    return 'react'
  }
  
  // Check for HTML
  if (trimmed.startsWith('<!DOCTYPE') || 
      trimmed.startsWith('<html') ||
      (trimmed.startsWith('<') && trimmed.includes('</') && !trimmed.startsWith('<svg'))) {
    return 'html'
  }
  
  // Check for SVG
  if (trimmed.startsWith('<svg') || trimmed.includes('xmlns="http://www.w3.org/2000/svg"')) {
    return 'svg'
  }
  
  // Check for Mermaid
  if (trimmed.startsWith('flowchart') || 
      trimmed.startsWith('sequenceDiagram') ||
      trimmed.startsWith('classDiagram') ||
      trimmed.startsWith('stateDiagram') ||
      trimmed.startsWith('erDiagram') ||
      trimmed.startsWith('gantt') ||
      trimmed.startsWith('pie') ||
      trimmed.startsWith('graph')) {
    return 'mermaid'
  }
  
  // Check for JSON
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const parsed = JSON.parse(trimmed)
      // Check if it's chart data
      if (parsed.type && parsed.data && parsed.data.datasets) {
        return 'chart'
      }
      // Check if it's table data
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
        return 'table'
      }
      return 'json'
    } catch {
      // Not valid JSON
    }
  }
  
  // Check for Markdown
  if (trimmed.startsWith('#') || 
      trimmed.includes('\n##') ||
      trimmed.includes('\n- ') ||
      trimmed.includes('\n* ') ||
      trimmed.includes('```')) {
    return 'markdown'
  }
  
  // Default to code
  return 'code'
}

// =====================================================
// ARTIFACT RENDERER CONFIGS
// Configuration for rendering each artifact type
// =====================================================

export const ARTIFACT_RENDERERS: Record<ArtifactType, {
  sandbox: boolean
  script?: string
  styles?: string
}> = {
  react: {
    sandbox: true,
    script: `
      <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
      <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
      <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      <script src="https://cdn.tailwindcss.com"></script>
    `,
    styles: `
      body { margin: 0; font-family: system-ui, sans-serif; }
      #root { min-height: 100vh; }
    `
  },
  html: {
    sandbox: true
  },
  markdown: {
    sandbox: false,
    script: `
      <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    `
  },
  mermaid: {
    sandbox: false,
    script: `
      <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    `
  },
  svg: {
    sandbox: false
  },
  code: {
    sandbox: false,
    script: `
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
    `
  },
  json: {
    sandbox: false
  },
  chart: {
    sandbox: false,
    script: `
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    `
  },
  table: {
    sandbox: false
  }
}

// =====================================================
// ARTIFACT MANAGER
// =====================================================

export class ArtifactManager {
  private artifacts: Map<string, Artifact> = new Map()
  private storage?: ArtifactStorage
  
  constructor(storage?: ArtifactStorage) {
    this.storage = storage
  }
  
  create(type: ArtifactType, content: string, title?: string): Artifact {
    const id = `artifact_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const now = new Date().toISOString()
    
    const artifact: Artifact = {
      id,
      type,
      title: title || `Artifact ${this.artifacts.size + 1}`,
      content,
      createdAt: now,
      updatedAt: now
    }
    
    this.artifacts.set(id, artifact)
    return artifact
  }
  
  createFromContent(content: string, title?: string): Artifact {
    const type = detectArtifactType(content)
    return this.create(type, content, title)
  }
  
  get(id: string): Artifact | undefined {
    return this.artifacts.get(id)
  }
  
  update(id: string, content: string): Artifact | null {
    const artifact = this.artifacts.get(id)
    if (!artifact) return null
    
    artifact.content = content
    artifact.updatedAt = new Date().toISOString()
    return artifact
  }
  
  delete(id: string): boolean {
    return this.artifacts.delete(id)
  }
  
  list(): Artifact[] {
    return Array.from(this.artifacts.values())
  }
  
  // Generate HTML for rendering
  generateRenderHTML(artifact: Artifact): string {
    const renderer = ARTIFACT_RENDERERS[artifact.type]
    
    switch (artifact.type) {
      case 'react':
        return this.generateReactHTML(artifact.content)
      case 'html':
        return artifact.content
      case 'svg':
        return `<!DOCTYPE html><html><body>${artifact.content}</body></html>`
      case 'mermaid':
        return this.generateMermaidHTML(artifact.content)
      case 'markdown':
        return this.generateMarkdownHTML(artifact.content)
      case 'chart':
        return this.generateChartHTML(artifact.content)
      case 'code':
        return this.generateCodeHTML(artifact.content, artifact.language)
      case 'json':
        return this.generateJSONHTML(artifact.content)
      case 'table':
        return this.generateTableHTML(artifact.content)
      default:
        return `<pre>${artifact.content}</pre>`
    }
  }
  
  private generateReactHTML(content: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${ARTIFACT_RENDERERS.react.script}
  <style>${ARTIFACT_RENDERERS.react.styles}</style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${content}
    
    // Render the default export or App component
    const Component = typeof App !== 'undefined' ? App : 
                      typeof module !== 'undefined' && module.exports ? module.exports.default : 
                      () => <div>No component found</div>;
    
    ReactDOM.createRoot(document.getElementById('root')).render(<Component />);
  </script>
</body>
</html>`
  }
  
  private generateMermaidHTML(content: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  ${ARTIFACT_RENDERERS.mermaid.script}
</head>
<body>
  <div class="mermaid">
    ${content}
  </div>
  <script>
    mermaid.initialize({ startOnLoad: true, theme: 'default' });
  </script>
</body>
</html>`
  }
  
  private generateMarkdownHTML(content: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  ${ARTIFACT_RENDERERS.markdown.script}
  <style>
    body { font-family: system-ui; padding: 20px; max-width: 800px; margin: 0 auto; }
    pre { background: #f5f5f5; padding: 10px; border-radius: 4px; }
    code { background: #f5f5f5; padding: 2px 4px; border-radius: 2px; }
  </style>
</head>
<body>
  <div id="content"></div>
  <script>
    document.getElementById('content').innerHTML = marked.parse(\`${content.replace(/`/g, '\\`')}\`);
  </script>
</body>
</html>`
  }
  
  private generateChartHTML(content: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  ${ARTIFACT_RENDERERS.chart.script}
</head>
<body>
  <canvas id="chart"></canvas>
  <script>
    const config = ${content};
    new Chart(document.getElementById('chart'), config);
  </script>
</body>
</html>`
  }
  
  private generateCodeHTML(content: string, language?: string): string {
    const lang = language || 'javascript'
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  ${ARTIFACT_RENDERERS.code.script}
  <style>
    body { margin: 0; }
    pre { margin: 0; border-radius: 4px; }
  </style>
</head>
<body>
  <pre><code class="language-${lang}">${this.escapeHTML(content)}</code></pre>
  <script>Prism.highlightAll();</script>
</body>
</html>`
  }
  
  private generateJSONHTML(content: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: monospace; padding: 20px; }
    .key { color: #881391; }
    .string { color: #1a1aa6; }
    .number { color: #1c6b48; }
    .boolean { color: #994500; }
    .null { color: #999; }
  </style>
</head>
<body>
  <pre id="json"></pre>
  <script>
    const data = ${content};
    document.getElementById('json').innerHTML = JSON.stringify(data, null, 2)
      .replace(/"([^"]+)":/g, '<span class="key">"$1"</span>:')
      .replace(/: "([^"]+)"/g, ': <span class="string">"$1"</span>')
      .replace(/: (\\d+)/g, ': <span class="number">$1</span>')
      .replace(/: (true|false)/g, ': <span class="boolean">$1</span>')
      .replace(/: null/g, ': <span class="null">null</span>');
  </script>
</body>
</html>`
  }
  
  private generateTableHTML(content: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: system-ui; padding: 20px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    tr:hover { background: #f9f9f9; }
  </style>
</head>
<body>
  <table id="table"></table>
  <script>
    const data = ${content};
    const table = document.getElementById('table');
    
    if (data.length > 0) {
      // Header
      const headerRow = document.createElement('tr');
      Object.keys(data[0]).forEach(key => {
        const th = document.createElement('th');
        th.textContent = key;
        headerRow.appendChild(th);
      });
      table.appendChild(headerRow);
      
      // Rows
      data.forEach(row => {
        const tr = document.createElement('tr');
        Object.values(row).forEach(value => {
          const td = document.createElement('td');
          td.textContent = value;
          tr.appendChild(td);
        });
        table.appendChild(tr);
      });
    }
  </script>
</body>
</html>`
  }
  
  private escapeHTML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}

// =====================================================
// PERSISTENT STORAGE
// Like Claude's window.storage but for File Engine
// =====================================================

export class BrowserArtifactStorage implements ArtifactStorage {
  private prefix: string
  
  constructor(prefix: string = 'file_engine_') {
    this.prefix = prefix
  }
  
  async get(key: string): Promise<string | null> {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(this.prefix + key)
  }
  
  async set(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') return
    localStorage.setItem(this.prefix + key, value)
  }
  
  async delete(key: string): Promise<void> {
    if (typeof window === 'undefined') return
    localStorage.removeItem(this.prefix + key)
  }
  
  async list(prefix?: string): Promise<string[]> {
    if (typeof window === 'undefined') return []
    
    const keys: string[] = []
    const fullPrefix = this.prefix + (prefix || '')
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(fullPrefix)) {
        keys.push(key.slice(this.prefix.length))
      }
    }
    
    return keys
  }
}

// =====================================================
// EXPORTS
// =====================================================

export function createArtifactManager(storage?: ArtifactStorage): ArtifactManager {
  return new ArtifactManager(storage)
}

export function createBrowserStorage(prefix?: string): BrowserArtifactStorage {
  return new BrowserArtifactStorage(prefix)
}
