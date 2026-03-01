// =====================================================
// FILE ENGINE - PROJECT AUDIT SYSTEM
// Comprehensive checking like Claude does when it audits
// codebases for completeness
// =====================================================

// =====================================================
// TYPES
// =====================================================

export interface AuditResult {
  status: 'complete' | 'incomplete' | 'error'
  score: number // 0-100
  categories: AuditCategory[]
  missingFiles: MissingFile[]
  issues: AuditIssue[]
  recommendations: string[]
  summary: string
}

export interface AuditCategory {
  name: string
  status: 'pass' | 'warn' | 'fail'
  score: number
  items: AuditItem[]
}

export interface AuditItem {
  name: string
  path: string
  exists: boolean
  valid: boolean
  issues: string[]
}

export interface MissingFile {
  path: string
  priority: 'critical' | 'important' | 'nice-to-have'
  description: string
  template?: string // Suggested content
}

export interface AuditIssue {
  severity: 'error' | 'warning' | 'info'
  category: string
  message: string
  file?: string
  line?: number
  suggestion?: string
}

export interface ProjectConfig {
  type: 'nextjs' | 'react' | 'vue' | 'node' | 'generic'
  typescript: boolean
  features: string[]
}

// =====================================================
// FILE TEMPLATES FOR MISSING FILES
// =====================================================

const fileTemplates: Record<string, string> = {
  '.gitignore': `# Dependencies
node_modules/
.pnp
.pnp.js

# Build outputs
.next/
out/
build/
dist/

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Debug logs
npm-debug.log*
yarn-debug.log*

# IDE
.idea/
.vscode/
*.swp

# OS
.DS_Store
Thumbs.db

# TypeScript
*.tsbuildinfo
next-env.d.ts

# Vercel
.vercel
`,

  'postcss.config.js': `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`,

  '.env.example': `# Database
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# AI Providers
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Deployment
GITHUB_TOKEN=
VERCEL_TOKEN=

# Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
`,

  'README.md': `# Project Name

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Environment Variables

Copy \`.env.example\` to \`.env.local\` and fill in your values.

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Supabase

## License

MIT
`,
}

// =====================================================
// REQUIRED FILES BY PROJECT TYPE
// =====================================================

interface RequiredFile {
  path: string
  priority: 'critical' | 'important' | 'nice-to-have'
  description: string
  validator?: (content: string) => { valid: boolean; issues: string[] }
}

const nextjsRequiredFiles: RequiredFile[] = [
  // Critical Config
  { path: 'package.json', priority: 'critical', description: 'Project configuration and dependencies' },
  { path: 'tsconfig.json', priority: 'critical', description: 'TypeScript configuration' },
  { path: 'next.config.js', priority: 'critical', description: 'Next.js configuration' },
  { path: 'tailwind.config.js', priority: 'critical', description: 'Tailwind CSS configuration' },
  { path: 'postcss.config.js', priority: 'critical', description: 'PostCSS configuration for Tailwind' },
  
  // App Structure
  { path: 'src/app/layout.tsx', priority: 'critical', description: 'Root layout component' },
  { path: 'src/app/page.tsx', priority: 'critical', description: 'Home page' },
  { path: 'src/styles/globals.css', priority: 'critical', description: 'Global styles with Tailwind' },
  
  // Important Files
  { path: '.gitignore', priority: 'important', description: 'Git ignore patterns' },
  { path: '.env.example', priority: 'important', description: 'Environment variable template' },
  { path: 'src/middleware.ts', priority: 'important', description: 'Next.js middleware for auth' },
  
  // Nice to Have
  { path: 'README.md', priority: 'nice-to-have', description: 'Project documentation' },
  { path: 'src/app/error.tsx', priority: 'nice-to-have', description: 'Error boundary' },
  { path: 'src/app/loading.tsx', priority: 'nice-to-have', description: 'Loading state' },
  { path: 'src/app/not-found.tsx', priority: 'nice-to-have', description: '404 page' },
]

const componentRequirements: RequiredFile[] = [
  // UI Components
  { path: 'src/components/ui/Button.tsx', priority: 'important', description: 'Reusable button component' },
  { path: 'src/components/ui/Input.tsx', priority: 'important', description: 'Reusable input component' },
  { path: 'src/components/ui/Spinner.tsx', priority: 'important', description: 'Loading spinner' },
  { path: 'src/components/ui/Toast.tsx', priority: 'important', description: 'Toast notifications' },
  { path: 'src/components/ui/Modal.tsx', priority: 'nice-to-have', description: 'Modal dialog' },
  
  // Layout Components
  { path: 'src/components/layout/Header.tsx', priority: 'important', description: 'Header/navbar' },
  { path: 'src/components/sidebar/Sidebar.tsx', priority: 'nice-to-have', description: 'Sidebar navigation' },
]

const utilRequirements: RequiredFile[] = [
  { path: 'src/lib/utils.ts', priority: 'important', description: 'Utility functions (cn, formatDate, etc.)' },
  { path: 'src/lib/types.ts', priority: 'important', description: 'TypeScript type definitions' },
  { path: 'src/lib/supabase.ts', priority: 'important', description: 'Supabase client configuration' },
]

// =====================================================
// VALIDATORS
// =====================================================

function validatePackageJson(content: string): { valid: boolean; issues: string[] } {
  const issues: string[] = []
  
  try {
    const pkg = JSON.parse(content)
    
    if (!pkg.name) issues.push('Missing "name" field')
    if (!pkg.scripts?.dev) issues.push('Missing "dev" script')
    if (!pkg.scripts?.build) issues.push('Missing "build" script')
    if (!pkg.dependencies?.react) issues.push('Missing React dependency')
    if (!pkg.dependencies?.next && !pkg.dependencies?.['next']) issues.push('Missing Next.js dependency')
    
    return { valid: issues.length === 0, issues }
  } catch {
    return { valid: false, issues: ['Invalid JSON'] }
  }
}

function validateTsConfig(content: string): { valid: boolean; issues: string[] } {
  const issues: string[] = []
  
  try {
    const config = JSON.parse(content)
    
    if (!config.compilerOptions) issues.push('Missing "compilerOptions"')
    if (!config.compilerOptions?.strict) issues.push('Recommend enabling "strict" mode')
    if (!config.include) issues.push('Missing "include" patterns')
    
    return { valid: issues.length === 0, issues }
  } catch {
    return { valid: false, issues: ['Invalid JSON'] }
  }
}

function validateTailwindConfig(content: string): { valid: boolean; issues: string[] } {
  const issues: string[] = []
  
  if (!content.includes('content:')) issues.push('Missing "content" configuration')
  if (!content.includes('./src/')) issues.push('Content paths may not include src directory')
  if (!content.includes('darkMode')) issues.push('Consider adding darkMode support')
  
  return { valid: issues.length === 0, issues }
}

function validateMiddleware(content: string): { valid: boolean; issues: string[] } {
  const issues: string[] = []
  
  if (!content.includes('NextResponse')) issues.push('Missing NextResponse import')
  if (!content.includes('export async function middleware')) issues.push('Missing middleware function export')
  if (!content.includes('config')) issues.push('Missing matcher config')
  
  return { valid: issues.length === 0, issues }
}

// =====================================================
// SYNTAX VALIDATORS
// =====================================================

function checkBracketBalance(content: string): { balanced: boolean; details: string } {
  const stack: string[] = []
  const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' }
  const opening = new Set(Object.keys(pairs))
  const closing = new Set(Object.values(pairs))
  
  // Remove strings and comments to avoid false positives
  const codeOnly = content
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/`(?:[^`\\]|\\.)*`/g, '``')
  
  for (const char of codeOnly) {
    if (opening.has(char)) {
      stack.push(pairs[char])
    } else if (closing.has(char)) {
      if (stack.length === 0 || stack.pop() !== char) {
        return { balanced: false, details: `Unmatched closing '${char}'` }
      }
    }
  }
  
  if (stack.length > 0) {
    return { balanced: false, details: `Missing closing '${stack[stack.length - 1]}'` }
  }
  
  return { balanced: true, details: 'All brackets balanced' }
}

function checkImports(content: string): { valid: boolean; issues: string[] } {
  const issues: string[] = []
  
  // Check for common import issues
  const importRegex = /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g
  let match
  
  while ((match = importRegex.exec(content)) !== null) {
    const imports = match[1]
    const source = match[2]
    
    // Check for trailing commas that might cause issues
    if (imports.trim().endsWith(',')) {
      issues.push(`Trailing comma in import from '${source}'`)
    }
  }
  
  // Check for duplicate imports
  const importSources = new Set<string>()
  const sourceRegex = /from\s+['"]([^'"]+)['"]/g
  
  while ((match = sourceRegex.exec(content)) !== null) {
    const source = match[1]
    if (importSources.has(source)) {
      issues.push(`Duplicate import from '${source}'`)
    }
    importSources.add(source)
  }
  
  return { valid: issues.length === 0, issues }
}

function checkReactComponent(content: string): { valid: boolean; issues: string[] } {
  const issues: string[] = []
  
  // Check for 'use client' if using hooks
  const usesHooks = /use(State|Effect|Callback|Memo|Ref|Context)\s*\(/.test(content)
  const hasUseClient = content.includes("'use client'") || content.includes('"use client"')
  
  if (usesHooks && !hasUseClient) {
    issues.push('Component uses hooks but missing "use client" directive')
  }
  
  // Check for default export
  if (!content.includes('export default')) {
    issues.push('Missing default export')
  }
  
  // Check for missing key prop in .map()
  if (content.includes('.map(') && !content.includes('key=')) {
    issues.push('Possible missing key prop in .map() rendering')
  }
  
  return { valid: issues.length === 0, issues }
}

// =====================================================
// MAIN AUDIT FUNCTION
// =====================================================

export async function auditProject(
  files: Map<string, string>,
  config?: Partial<ProjectConfig>
): Promise<AuditResult> {
  const projectConfig: ProjectConfig = {
    type: config?.type || detectProjectType(files),
    typescript: config?.typescript ?? files.has('tsconfig.json'),
    features: config?.features || detectFeatures(files)
  }
  
  const categories: AuditCategory[] = []
  const missingFiles: MissingFile[] = []
  const issues: AuditIssue[] = []
  const recommendations: string[] = []
  
  // 1. Check config files
  const configCategory = auditConfigFiles(files, projectConfig)
  categories.push(configCategory)
  
  // 2. Check app structure
  const structureCategory = auditAppStructure(files, projectConfig)
  categories.push(structureCategory)
  
  // 3. Check components
  const componentsCategory = auditComponents(files)
  categories.push(componentsCategory)
  
  // 4. Check utilities
  const utilsCategory = auditUtilities(files)
  categories.push(utilsCategory)
  
  // 5. Check API routes
  const apiCategory = auditApiRoutes(files)
  categories.push(apiCategory)
  
  // 6. Syntax validation
  const syntaxCategory = auditSyntax(files)
  categories.push(syntaxCategory)
  
  // Collect missing files from all categories
  for (const cat of categories) {
    for (const item of cat.items) {
      if (!item.exists) {
        missingFiles.push({
          path: item.path,
          priority: determinePriority(item.path),
          description: item.name,
          template: fileTemplates[item.path.split('/').pop() || '']
        })
      }
      
      if (item.issues.length > 0) {
        for (const issue of item.issues) {
          issues.push({
            severity: 'warning',
            category: cat.name,
            message: issue,
            file: item.path
          })
        }
      }
    }
  }
  
  // Generate recommendations
  if (missingFiles.some(f => f.priority === 'critical')) {
    recommendations.push('Create critical missing files before deploying')
  }
  
  if (issues.some(i => i.severity === 'error')) {
    recommendations.push('Fix syntax errors before building')
  }
  
  if (!files.has('.env.example')) {
    recommendations.push('Add .env.example to document required environment variables')
  }
  
  // Calculate overall score
  const totalScore = categories.reduce((sum, cat) => sum + cat.score, 0)
  const avgScore = Math.round(totalScore / categories.length)
  
  // Determine status
  const criticalMissing = missingFiles.filter(f => f.priority === 'critical').length
  const hasErrors = issues.some(i => i.severity === 'error')
  
  const status = criticalMissing > 0 || hasErrors 
    ? 'incomplete' 
    : avgScore >= 80 
      ? 'complete' 
      : 'incomplete'
  
  // Generate summary
  const summary = generateSummary(status, avgScore, missingFiles, issues)
  
  return {
    status,
    score: avgScore,
    categories,
    missingFiles,
    issues,
    recommendations,
    summary
  }
}

// =====================================================
// CATEGORY AUDIT FUNCTIONS
// =====================================================

function auditConfigFiles(files: Map<string, string>, config: ProjectConfig): AuditCategory {
  const items: AuditItem[] = []
  
  const configFiles = [
    { path: 'package.json', validator: validatePackageJson },
    { path: 'tsconfig.json', validator: validateTsConfig },
    { path: 'next.config.js', validator: null },
    { path: 'tailwind.config.js', validator: validateTailwindConfig },
    { path: 'postcss.config.js', validator: null },
    { path: '.gitignore', validator: null },
    { path: '.env.example', validator: null },
  ]
  
  for (const cf of configFiles) {
    const content = files.get(cf.path)
    const exists = content !== undefined
    let valid = exists
    let issues: string[] = []
    
    if (exists && cf.validator) {
      const result = cf.validator(content)
      valid = result.valid
      issues = result.issues
    }
    
    items.push({
      name: cf.path,
      path: cf.path,
      exists,
      valid,
      issues
    })
  }
  
  const existCount = items.filter(i => i.exists).length
  const validCount = items.filter(i => i.valid).length
  const score = Math.round((validCount / items.length) * 100)
  
  return {
    name: 'Configuration Files',
    status: score >= 80 ? 'pass' : score >= 50 ? 'warn' : 'fail',
    score,
    items
  }
}

function auditAppStructure(files: Map<string, string>, config: ProjectConfig): AuditCategory {
  const items: AuditItem[] = []
  
  const appFiles = [
    'src/app/layout.tsx',
    'src/app/page.tsx',
    'src/app/error.tsx',
    'src/app/loading.tsx',
    'src/app/not-found.tsx',
    'src/styles/globals.css',
    'src/middleware.ts',
  ]
  
  for (const path of appFiles) {
    const content = files.get(path)
    const exists = content !== undefined
    let valid = exists
    let issues: string[] = []
    
    if (exists) {
      // Run syntax checks
      const bracketCheck = checkBracketBalance(content)
      if (!bracketCheck.balanced) {
        valid = false
        issues.push(bracketCheck.details)
      }
      
      // Run component checks for TSX files
      if (path.endsWith('.tsx')) {
        const componentCheck = checkReactComponent(content)
        if (!componentCheck.valid) {
          issues.push(...componentCheck.issues)
        }
      }
      
      // Specific middleware validation
      if (path.includes('middleware')) {
        const middlewareCheck = validateMiddleware(content)
        if (!middlewareCheck.valid) {
          issues.push(...middlewareCheck.issues)
        }
      }
    }
    
    items.push({
      name: path.split('/').pop() || path,
      path,
      exists,
      valid,
      issues
    })
  }
  
  const existCount = items.filter(i => i.exists).length
  const score = Math.round((existCount / items.length) * 100)
  
  return {
    name: 'App Structure',
    status: score >= 80 ? 'pass' : score >= 50 ? 'warn' : 'fail',
    score,
    items
  }
}

function auditComponents(files: Map<string, string>): AuditCategory {
  const items: AuditItem[] = []
  
  const componentPaths = [
    'src/components/ui/Button.tsx',
    'src/components/ui/Input.tsx',
    'src/components/ui/Spinner.tsx',
    'src/components/ui/Toast.tsx',
    'src/components/ui/Modal.tsx',
    'src/components/layout/Header.tsx',
    'src/components/sidebar/Sidebar.tsx',
  ]
  
  for (const path of componentPaths) {
    const content = files.get(path)
    const exists = content !== undefined
    let valid = exists
    let issues: string[] = []
    
    if (exists) {
      const bracketCheck = checkBracketBalance(content)
      if (!bracketCheck.balanced) {
        valid = false
        issues.push(bracketCheck.details)
      }
      
      const componentCheck = checkReactComponent(content)
      if (!componentCheck.valid) {
        issues.push(...componentCheck.issues)
      }
      
      const importCheck = checkImports(content)
      if (!importCheck.valid) {
        issues.push(...importCheck.issues)
      }
    }
    
    items.push({
      name: path.split('/').pop() || path,
      path,
      exists,
      valid,
      issues
    })
  }
  
  const existCount = items.filter(i => i.exists).length
  const score = Math.round((existCount / items.length) * 100)
  
  return {
    name: 'UI Components',
    status: score >= 60 ? 'pass' : score >= 40 ? 'warn' : 'fail',
    score,
    items
  }
}

function auditUtilities(files: Map<string, string>): AuditCategory {
  const items: AuditItem[] = []
  
  const utilPaths = [
    'src/lib/utils.ts',
    'src/lib/types.ts',
    'src/lib/supabase.ts',
  ]
  
  for (const path of utilPaths) {
    const content = files.get(path)
    const exists = content !== undefined
    let valid = exists
    let issues: string[] = []
    
    if (exists) {
      const bracketCheck = checkBracketBalance(content)
      if (!bracketCheck.balanced) {
        valid = false
        issues.push(bracketCheck.details)
      }
    }
    
    items.push({
      name: path.split('/').pop() || path,
      path,
      exists,
      valid,
      issues
    })
  }
  
  const existCount = items.filter(i => i.exists).length
  const score = Math.round((existCount / items.length) * 100)
  
  return {
    name: 'Utilities',
    status: score >= 60 ? 'pass' : score >= 40 ? 'warn' : 'fail',
    score,
    items
  }
}

function auditApiRoutes(files: Map<string, string>): AuditCategory {
  const items: AuditItem[] = []
  
  // Find all API route files
  for (const [path, content] of files) {
    if (path.includes('/api/') && path.endsWith('route.ts')) {
      let valid = true
      let issues: string[] = []
      
      const bracketCheck = checkBracketBalance(content)
      if (!bracketCheck.balanced) {
        valid = false
        issues.push(bracketCheck.details)
      }
      
      // Check for proper HTTP method exports
      if (!content.includes('export async function')) {
        issues.push('Missing async function export')
      }
      
      items.push({
        name: path.split('/').slice(-2, -1)[0] || path, // Get route name
        path,
        exists: true,
        valid,
        issues
      })
    }
  }
  
  const validCount = items.filter(i => i.valid).length
  const score = items.length > 0 ? Math.round((validCount / items.length) * 100) : 100
  
  return {
    name: 'API Routes',
    status: score >= 80 ? 'pass' : score >= 50 ? 'warn' : 'fail',
    score,
    items
  }
}

function auditSyntax(files: Map<string, string>): AuditCategory {
  const items: AuditItem[] = []
  let totalValid = 0
  let totalFiles = 0
  
  for (const [path, content] of files) {
    if (path.endsWith('.ts') || path.endsWith('.tsx') || path.endsWith('.js') || path.endsWith('.jsx')) {
      totalFiles++
      let valid = true
      let issues: string[] = []
      
      // Check brackets
      const bracketCheck = checkBracketBalance(content)
      if (!bracketCheck.balanced) {
        valid = false
        issues.push(bracketCheck.details)
      }
      
      // Check imports
      const importCheck = checkImports(content)
      if (!importCheck.valid) {
        issues.push(...importCheck.issues)
      }
      
      if (valid) totalValid++
      
      // Only add items with issues to keep the list manageable
      if (issues.length > 0) {
        items.push({
          name: path.split('/').pop() || path,
          path,
          exists: true,
          valid,
          issues
        })
      }
    }
  }
  
  const score = totalFiles > 0 ? Math.round((totalValid / totalFiles) * 100) : 100
  
  return {
    name: 'Syntax Validation',
    status: score >= 90 ? 'pass' : score >= 70 ? 'warn' : 'fail',
    score,
    items
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function detectProjectType(files: Map<string, string>): ProjectConfig['type'] {
  if (files.has('next.config.js') || files.has('next.config.mjs')) {
    return 'nextjs'
  }
  if (files.has('vite.config.ts') || files.has('vite.config.js')) {
    return 'react'
  }
  if (files.has('vue.config.js') || files.has('nuxt.config.ts')) {
    return 'vue'
  }
  if (files.has('package.json')) {
    const pkg = files.get('package.json')
    if (pkg?.includes('"react"')) return 'react'
    if (pkg?.includes('"vue"')) return 'vue'
    return 'node'
  }
  return 'generic'
}

function detectFeatures(files: Map<string, string>): string[] {
  const features: string[] = []
  
  const pkg = files.get('package.json') || ''
  
  if (pkg.includes('tailwind')) features.push('tailwind')
  if (pkg.includes('supabase')) features.push('supabase')
  if (pkg.includes('stripe')) features.push('stripe')
  if (pkg.includes('prisma')) features.push('prisma')
  if (pkg.includes('trpc')) features.push('trpc')
  if (files.has('src/middleware.ts')) features.push('auth')
  
  return features
}

function determinePriority(path: string): MissingFile['priority'] {
  const criticalFiles = ['package.json', 'tsconfig.json', 'layout.tsx', 'page.tsx']
  const importantFiles = ['tailwind.config.js', 'postcss.config.js', '.gitignore', 'middleware.ts', 'utils.ts']
  
  const filename = path.split('/').pop() || ''
  
  if (criticalFiles.some(f => filename.includes(f))) return 'critical'
  if (importantFiles.some(f => filename.includes(f))) return 'important'
  return 'nice-to-have'
}

function generateSummary(
  status: AuditResult['status'],
  score: number,
  missingFiles: MissingFile[],
  issues: AuditIssue[]
): string {
  const criticalMissing = missingFiles.filter(f => f.priority === 'critical').length
  const importantMissing = missingFiles.filter(f => f.priority === 'important').length
  const errorCount = issues.filter(i => i.severity === 'error').length
  const warningCount = issues.filter(i => i.severity === 'warning').length
  
  let summary = `Project audit score: ${score}/100\n\n`
  
  if (status === 'complete') {
    summary += ' Project structure is complete and ready for deployment.\n'
  } else {
    summary += ' Project has issues that should be addressed:\n'
  }
  
  if (criticalMissing > 0) {
    summary += `\n ${criticalMissing} critical file(s) missing`
  }
  if (importantMissing > 0) {
    summary += `\n ${importantMissing} important file(s) missing`
  }
  if (errorCount > 0) {
    summary += `\n ${errorCount} syntax error(s) found`
  }
  if (warningCount > 0) {
    summary += `\n ${warningCount} warning(s) to review`
  }
  
  return summary
}

// =====================================================
// QUICK AUDIT FUNCTION (For fast checks)
// =====================================================

export function quickAudit(files: Map<string, string>): {
  complete: boolean
  missing: string[]
  issues: string[]
} {
  const criticalFiles = [
    'package.json',
    'tsconfig.json', 
    'next.config.js',
    'tailwind.config.js',
    'postcss.config.js',
    'src/app/layout.tsx',
    'src/app/page.tsx',
    'src/lib/utils.ts',
  ]
  
  const missing: string[] = []
  const issues: string[] = []
  
  for (const file of criticalFiles) {
    if (!files.has(file)) {
      missing.push(file)
    }
  }
  
  // Quick syntax check on existing files
  for (const [path, content] of files) {
    if (path.endsWith('.ts') || path.endsWith('.tsx')) {
      const bracketCheck = checkBracketBalance(content)
      if (!bracketCheck.balanced) {
        issues.push(`${path}: ${bracketCheck.details}`)
      }
    }
  }
  
  return {
    complete: missing.length === 0 && issues.length === 0,
    missing,
    issues
  }
}

export default auditProject
