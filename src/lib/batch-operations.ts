// =====================================================
// FILE ENGINE - BATCH FILE OPERATIONS
// Create, update, and manage multiple files at once
// Like Claude's ability to "Created 7 files, ran a command"
// =====================================================

import { auditProject, quickAudit, type AuditResult, type MissingFile } from './audit'
import { BRAND_NAME } from '@/lib/brand'

// =====================================================
// TYPES
// =====================================================

export interface FileOperation {
  type: 'create' | 'update' | 'delete' | 'rename' | 'move'
  path: string
  content?: string
  newPath?: string // For rename/move
  description?: string
}

export interface BatchResult {
  success: boolean
  operations: OperationResult[]
  created: number
  updated: number
  deleted: number
  failed: number
  duration: number
  summary: string
}

export interface OperationResult {
  operation: FileOperation
  success: boolean
  error?: string
  timestamp: string
}

export interface ProjectScaffold {
  name: string
  type: 'nextjs' | 'react' | 'node' | 'api'
  files: FileOperation[]
  postCommands?: string[]
}

// =====================================================
// FILE TEMPLATES
// =====================================================

const templates = {
  // Config files
  'package.json': (name: string) => JSON.stringify({
    name: name.toLowerCase().replace(/\s+/g, '-'),
    version: '0.1.0',
    private: true,
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'next lint'
    },
    dependencies: {
      'next': '^14.0.0',
      'react': '^18.2.0',
      'react-dom': '^18.2.0'
    },
    devDependencies: {
      '@types/node': '^20.0.0',
      '@types/react': '^18.2.0',
      '@types/react-dom': '^18.2.0',
      'typescript': '^5.0.0',
      'tailwindcss': '^3.4.0',
      'postcss': '^8.4.0',
      'autoprefixer': '^10.4.0'
    }
  }, null, 2),

  'tsconfig.json': () => JSON.stringify({
    compilerOptions: {
      target: 'es5',
      lib: ['dom', 'dom.iterable', 'esnext'],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: 'esnext',
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: 'preserve',
      incremental: true,
      plugins: [{ name: 'next' }],
      paths: { '@/*': ['./src/*'] }
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
    exclude: ['node_modules']
  }, null, 2),

  'next.config.js': () => `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig
`,

  'tailwind.config.js': () => `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
}
`,

  'postcss.config.js': () => `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`,

  '.gitignore': () => `# Dependencies
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

  '.env.example': () => `# Database
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

# Payments (optional)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
`,

  // App files
  'src/app/layout.tsx': (name: string) => `import type { Metadata } from 'next'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: '${name}',
  description: 'Built with ${BRAND_NAME}',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
`,

  'src/app/page.tsx': (name: string) => `export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">${name}</h1>
        <p className="text-gray-600">${BRAND_NAME}</p>
      </div>
    </main>
  )
}
`,

  'src/styles/globals.css': () => `@tailwind base;
@tailwind components;
@tailwind utilities;
`,

  'src/lib/utils.ts': () => `// Utility functions

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return (...args) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}
`,

  // Component templates
  'src/components/ui/Button.tsx': () => `'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-blue-500 text-white hover:bg-blue-600',
      secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
      outline: 'border border-gray-300 hover:bg-gray-50',
    }
    
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2',
      lg: 'px-6 py-3 text-lg',
    }
    
    return (
      <button
        ref={ref}
        className={\`inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50 \${variants[variant]} \${sizes[size]} \${className || ''}\`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <svg className="animate-spin w-4 h-4 mr-2" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : null}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
`,

  'src/components/ui/Input.tsx': () => `'use client'

import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || \`input-\${Math.random().toString(36).slice(2)}\`
    
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={\`w-full px-4 py-2 rounded-lg border \${error ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500/20 \${className || ''}\`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
`,

  'src/components/ui/Spinner.tsx': () => `export default function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
  
  return (
    <svg className={\`animate-spin text-blue-500 \${sizes[size]}\`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
`,
}

// =====================================================
// BATCH OPERATIONS
// =====================================================

export async function batchCreateFiles(
  operations: FileOperation[],
  onProgress?: (current: number, total: number, file: string) => void
): Promise<BatchResult> {
  const startTime = Date.now()
  const results: OperationResult[] = []
  let created = 0
  let updated = 0
  let deleted = 0
  let failed = 0

  for (let i = 0; i < operations.length; i++) {
    const op = operations[i]
    onProgress?.(i + 1, operations.length, op.path)

    try {
      switch (op.type) {
        case 'create':
          // In real implementation, this would write to file system or virtual FS
          created++
          results.push({
            operation: op,
            success: true,
            timestamp: new Date().toISOString()
          })
          break

        case 'update':
          updated++
          results.push({
            operation: op,
            success: true,
            timestamp: new Date().toISOString()
          })
          break

        case 'delete':
          deleted++
          results.push({
            operation: op,
            success: true,
            timestamp: new Date().toISOString()
          })
          break

        default:
          results.push({
            operation: op,
            success: true,
            timestamp: new Date().toISOString()
          })
      }
    } catch (err: unknown) {
      failed++
      results.push({
        operation: op,
        success: false,
        error: (err instanceof Error ? err.message : String(err)),
        timestamp: new Date().toISOString()
      })
    }
  }

  const duration = Date.now() - startTime
  const success = failed === 0

  return {
    success,
    operations: results,
    created,
    updated,
    deleted,
    failed,
    duration,
    summary: `${success ? '' : ''} Created ${created} files, updated ${updated}, deleted ${deleted}${failed > 0 ? `, ${failed} failed` : ''} in ${duration}ms`
  }
}

// =====================================================
// PROJECT SCAFFOLDING
// =====================================================

export function createProjectScaffold(
  name: string,
  type: ProjectScaffold['type'] = 'nextjs'
): ProjectScaffold {
  const files: FileOperation[] = []

  if (type === 'nextjs') {
    // Config files
    files.push(
      { type: 'create', path: 'package.json', content: templates['package.json'](name), description: 'Project configuration' },
      { type: 'create', path: 'tsconfig.json', content: templates['tsconfig.json'](), description: 'TypeScript configuration' },
      { type: 'create', path: 'next.config.js', content: templates['next.config.js'](), description: 'Next.js configuration' },
      { type: 'create', path: 'tailwind.config.js', content: templates['tailwind.config.js'](), description: 'Tailwind CSS configuration' },
      { type: 'create', path: 'postcss.config.js', content: templates['postcss.config.js'](), description: 'PostCSS configuration' },
      { type: 'create', path: '.gitignore', content: templates['.gitignore'](), description: 'Git ignore file' },
      { type: 'create', path: '.env.example', content: templates['.env.example'](), description: 'Environment template' },
    )

    // App structure
    files.push(
      { type: 'create', path: 'src/app/layout.tsx', content: templates['src/app/layout.tsx'](name), description: 'Root layout' },
      { type: 'create', path: 'src/app/page.tsx', content: templates['src/app/page.tsx'](name), description: 'Home page' },
      { type: 'create', path: 'src/styles/globals.css', content: templates['src/styles/globals.css'](), description: 'Global styles' },
    )

    // Utilities
    files.push(
      { type: 'create', path: 'src/lib/utils.ts', content: templates['src/lib/utils.ts'](), description: 'Utility functions' },
    )

    // UI Components
    files.push(
      { type: 'create', path: 'src/components/ui/Button.tsx', content: templates['src/components/ui/Button.tsx'](), description: 'Button component' },
      { type: 'create', path: 'src/components/ui/Input.tsx', content: templates['src/components/ui/Input.tsx'](), description: 'Input component' },
      { type: 'create', path: 'src/components/ui/Spinner.tsx', content: templates['src/components/ui/Spinner.tsx'](), description: 'Loading spinner' },
    )
  }

  return {
    name,
    type,
    files,
    postCommands: ['npm install', 'npm run dev']
  }
}

// =====================================================
// AUTO-FIX MISSING FILES
// =====================================================

export async function autoFixMissingFiles(
  currentFiles: Map<string, string>,
  projectName: string = 'Project'
): Promise<{ operations: FileOperation[]; auditBefore: AuditResult; auditAfter: AuditResult }> {
  // Run initial audit
  const auditBefore = await auditProject(currentFiles)

  const operations: FileOperation[] = []

  // Create missing files
  for (const missing of auditBefore.missingFiles) {
    const filename = missing.path.split('/').pop() || ''

    // Try to get template
    let content = missing.template || ''

    if (!content && templates[filename as keyof typeof templates]) {
      const templateFn = templates[filename as keyof typeof templates]
      content = typeof templateFn === 'function' ? templateFn(projectName) : templateFn
    }

    if (!content && templates[missing.path as keyof typeof templates]) {
      const templateFn = templates[missing.path as keyof typeof templates]
      content = typeof templateFn === 'function' ? templateFn(projectName) : templateFn
    }

    if (content) {
      operations.push({
        type: 'create',
        path: missing.path,
        content,
        description: missing.description
      })

      // Add to current files for re-audit
      currentFiles.set(missing.path, content)
    }
  }

  // Run audit after fixes
  const auditAfter = await auditProject(currentFiles)

  return { operations, auditBefore, auditAfter }
}

// =====================================================
// FILE GENERATION FROM PROMPT
// =====================================================

export interface GenerationPlan {
  files: FileOperation[]
  directories: string[]
  dependencies: string[]
  devDependencies: string[]
  commands: string[]
  estimatedTime: number
}

export function planFileGeneration(prompt: string, projectType: ProjectScaffold['type'] = 'nextjs'): GenerationPlan {
  const plan: GenerationPlan = {
    files: [],
    directories: [],
    dependencies: [],
    devDependencies: [],
    commands: [],
    estimatedTime: 0
  }

  const promptLower = prompt.toLowerCase()

  // Detect what needs to be created
  if (promptLower.includes('landing page') || promptLower.includes('home page')) {
    plan.files.push({
      type: 'create',
      path: 'src/app/page.tsx',
      description: 'Landing page component'
    })
    plan.estimatedTime += 30
  }

  if (promptLower.includes('dashboard')) {
    plan.files.push({
      type: 'create',
      path: 'src/app/dashboard/page.tsx',
      description: 'Dashboard page'
    })
    plan.directories.push('src/app/dashboard')
    plan.estimatedTime += 45
  }

  if (promptLower.includes('auth') || promptLower.includes('login') || promptLower.includes('signup')) {
    plan.files.push(
      { type: 'create', path: 'src/app/auth/login/page.tsx', description: 'Login page' },
      { type: 'create', path: 'src/app/auth/signup/page.tsx', description: 'Signup page' },
      { type: 'create', path: 'src/middleware.ts', description: 'Auth middleware' }
    )
    plan.directories.push('src/app/auth/login', 'src/app/auth/signup')
    plan.dependencies.push('@supabase/supabase-js')
    plan.estimatedTime += 60
  }

  if (promptLower.includes('api') || promptLower.includes('endpoint')) {
    plan.files.push({
      type: 'create',
      path: 'src/app/api/route.ts',
      description: 'API endpoint'
    })
    plan.directories.push('src/app/api')
    plan.estimatedTime += 20
  }

  if (promptLower.includes('form')) {
    plan.files.push({
      type: 'create',
      path: 'src/components/ui/Form.tsx',
      description: 'Form component'
    })
    plan.dependencies.push('react-hook-form')
    plan.estimatedTime += 25
  }

  if (promptLower.includes('table') || promptLower.includes('data')) {
    plan.files.push({
      type: 'create',
      path: 'src/components/ui/DataTable.tsx',
      description: 'Data table component'
    })
    plan.estimatedTime += 30
  }

  if (promptLower.includes('chart') || promptLower.includes('graph')) {
    plan.dependencies.push('recharts')
    plan.files.push({
      type: 'create',
      path: 'src/components/ui/Chart.tsx',
      description: 'Chart component'
    })
    plan.estimatedTime += 25
  }

  // Add npm install if new dependencies
  if (plan.dependencies.length > 0 || plan.devDependencies.length > 0) {
    plan.commands.push('npm install')
  }

  return plan
}

const batchOperations = {
  batchCreateFiles,
  createProjectScaffold,
  autoFixMissingFiles,
  planFileGeneration,
  templates
}

export default batchOperations
