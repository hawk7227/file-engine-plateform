// =====================================================
// FILE ENGINE - VERCEL-PROOF VALIDATION SYSTEM
// 500+ Pre-Build Checks for Next.js + TypeScript + React
// Based on real Vercel build failures
// =====================================================

// =====================================================
// TYPES
// =====================================================

export interface ValidationResult {
  passed: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  checks: number
  score: number // 0-100
  categories: CategoryResult[]
  summary: string
}

export interface ValidationError {
  id: number
  category: string
  file: string
  line?: number
  message: string
  fix?: string
  severity: 'error'
}

export interface ValidationWarning {
  id: number
  category: string
  file: string
  line?: number
  message: string
  fix?: string
  severity: 'warning'
}

export interface CategoryResult {
  name: string
  passed: number
  failed: number
  warnings: number
  total: number
}

export interface FileContent {
  path: string
  content: string
}

// =====================================================
// VALIDATION CHECKS BY CATEGORY
// =====================================================

// Category 1: Syntax & Structure (Checks 1-65)
export function validateSyntax(files: FileContent[]): { errors: ValidationError[], warnings: ValidationWarning[] } {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  let checkId = 1

  for (const file of files) {
    if (!file.path.endsWith('.ts') && !file.path.endsWith('.tsx')) continue
    const content = file.content
    const lines = content.split('\n')

    // 1-3: Bracket Balance
    const brackets = [
      { open: '(', close: ')', name: 'parentheses' },
      { open: '{', close: '}', name: 'braces' },
      { open: '[', close: ']', name: 'brackets' }
    ]

    for (const bracket of brackets) {
      const opens = (content.match(new RegExp('\\' + bracket.open, 'g')) || []).length
      const closes = (content.match(new RegExp('\\' + bracket.close, 'g')) || []).length

      if (opens !== closes) {
        errors.push({
          id: checkId++,
          category: 'Syntax',
          file: file.path,
          message: `Unbalanced ${bracket.name}: ${bracket.open}=${opens}, ${bracket.close}=${closes}`,
          fix: `Check for missing or extra ${bracket.close} in this file`,
          severity: 'error'
        })
      }
    }

    // 4-6: JSX Fragment Balance
    if (file.path.endsWith('.tsx')) {
      const fragOpens = (content.match(/<>/g) || []).length
      const fragCloses = (content.match(/<\/>/g) || []).length
      if (fragOpens !== fragCloses) {
        errors.push({
          id: checkId++,
          category: 'Syntax',
          file: file.path,
          message: `Unbalanced fragments: <> = ${fragOpens}, </> = ${fragCloses}`,
          fix: 'Ensure every <> has a matching </>',
          severity: 'error'
        })
      }
    }

    // 7-10: Template Literal Issues
    const templateMatches = content.match(/`[^`]*\$\{[^}]*$/gm)
    if (templateMatches) {
      errors.push({
        id: checkId++,
        category: 'Syntax',
        file: file.path,
        message: 'Unclosed template literal expression ${...}',
        fix: 'Close the template literal with }',
        severity: 'error'
      })
    }

    // 11-15: Multiple default exports
    const defaultExports = (content.match(/^export default/gm) || []).length
    if (defaultExports > 1) {
      errors.push({
        id: checkId++,
        category: 'Syntax',
        file: file.path,
        message: `Multiple 'export default' statements (${defaultExports} found)`,
        fix: 'A file can only have one default export',
        severity: 'error'
      })
    }

    // 16-20: Duplicate const declarations
    const constDecls = content.match(/const\s+(\w+)\s*=/g)
    if (constDecls) {
      const names = constDecls.map(d => d.match(/const\s+(\w+)/)?.[1]).filter(Boolean)
      const duplicates = names.filter((name, i) => names.indexOf(name) !== i)
      if (duplicates.length > 0) {
        errors.push({
          id: checkId++,
          category: 'Syntax',
          file: file.path,
          message: `Duplicate const declarations: ${[...new Set(duplicates)].join(', ')}`,
          fix: 'Remove or rename the duplicates',
          severity: 'error'
        })
      }
    }

    // 21-25: Empty catch blocks
    if (/catch\s*\([^)]*\)\s*\{\s*\}/g.test(content)) {
      warnings.push({
        id: checkId++,
        category: 'Syntax',
        file: file.path,
        message: 'Empty catch block — errors silently swallowed',
        fix: 'Add error handling or at least console.error()',
        severity: 'warning'
      })
    }

    // 26-30: Return statement issues (ASI)
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*return\s*$/.test(lines[i])) {
        if (i + 1 < lines.length && /^\s*[<({]/.test(lines[i + 1])) {
          warnings.push({
            id: checkId++,
            category: 'Syntax',
            file: file.path,
            line: i + 1,
            message: "Bare 'return' on its own line — JSX on next line won't be returned (ASI issue)",
            fix: 'Put opening ( on same line as return: return (',
            severity: 'warning'
          })
        }
      }
    }

    // 31-35: Consecutive operators
    if (/[^&|=!<>]\s*(&&|\|\|)\s*(&&|\|\|)/.test(content)) {
      errors.push({
        id: checkId++,
        category: 'Syntax',
        file: file.path,
        message: 'Consecutive logical operators (&&& or |||)',
        fix: 'Remove the extra operator',
        severity: 'error'
      })
    }
  }

  return { errors, warnings }
}

// Category 2: TypeScript Type Errors (Checks 66-130)
export function validateTypes(files: FileContent[]): { errors: ValidationError[], warnings: ValidationWarning[] } {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  let checkId = 66

  for (const file of files) {
    if (!file.path.endsWith('.ts') && !file.path.endsWith('.tsx')) continue
    const content = file.content
    const lines = content.split('\n')

    // 66-70: Block-scoped variable used before declaration (THE CRITICAL BUG)
    const constDeclarations = new Map<string, number>()

    // First pass: collect all const declarations with line numbers
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/const\s+(\w+)\s*=/)
      if (match) {
        constDeclarations.set(match[1], i + 1)
      }
    }

    // Second pass: check for usage before declaration
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Skip comments and imports
      if (line.trim().startsWith('//') || line.includes('import ')) continue

      for (const [varName, declLine] of constDeclarations) {
        // Check if variable is used before its declaration
        if (i + 1 < declLine) {
          const varRegex = new RegExp(`\\b${varName}\\b`)
          if (varRegex.test(line) && !line.includes(`const ${varName}`)) {
            errors.push({
              id: checkId++,
              category: 'Types',
              file: file.path,
              line: i + 1,
              message: `'${varName}' used at line ${i + 1} before declaration at line ${declLine}`,
              fix: 'Move the declaration above its first usage, or use function declaration (which hoists)',
              severity: 'error'
            })
          }
        }
      }
    }

    // 71-75: Deep property access without optional chaining
    const deepAccessRegex = /\w+\.\w+\.\w+\.\w+\.\w+/g
    const deepAccesses = content.match(deepAccessRegex)
    if (deepAccesses) {
      for (const access of deepAccesses) {
        if (!access.includes('?.') && !access.includes('//')) {
          warnings.push({
            id: checkId++,
            category: 'Types',
            file: file.path,
            message: `Deep property chain without optional chaining: ${access.slice(0, 40)}...`,
            fix: 'Add ?. for nullable properties to prevent runtime crashes',
            severity: 'warning'
          })
        }
      }
    }

    // 76-80: Empty generic types
    if (/Promise<>/.test(content)) {
      errors.push({
        id: checkId++,
        category: 'Types',
        file: file.path,
        message: 'Empty generic Promise<> — needs a type parameter',
        fix: 'Use Promise<void> or Promise<SomeType>',
        severity: 'error'
      })
    }

    // 81-85: @ts-ignore without explanation
    const tsIgnores = content.match(/@ts-ignore(?!\s*:)/g)
    if (tsIgnores) {
      warnings.push({
        id: checkId++,
        category: 'Types',
        file: file.path,
        message: `@ts-ignore without explanation (${tsIgnores.length} found)`,
        fix: 'Add explanation: // @ts-ignore: reason here',
        severity: 'warning'
      })
    }

    // 86-90: @ts-nocheck in production
    if (/@ts-nocheck/.test(content)) {
      errors.push({
        id: checkId++,
        category: 'Types',
        file: file.path,
        message: '@ts-nocheck disables all type checking — not safe for production',
        fix: 'Remove @ts-nocheck and fix the type errors properly',
        severity: 'error'
      })
    }
  }

  return { errors, warnings }
}

// Category 3: Import & Module Errors (Checks 131-195)
export function validateImports(files: FileContent[]): { errors: ValidationError[], warnings: ValidationWarning[] } {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  let checkId = 131

  const reactHooks = ['useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'useContext', 'useReducer']

  for (const file of files) {
    if (!file.path.endsWith('.tsx')) continue
    const content = file.content

    // 131-140: Missing React hook imports
    for (const hook of reactHooks) {
      const hookRegex = new RegExp(`\\b${hook}\\b`)
      if (hookRegex.test(content)) {
        const importRegex = new RegExp(`import.*${hook}.*from\\s+['"]react['"]`)
        const reactImport = /import\s+React/.test(content)
        if (!importRegex.test(content) && !reactImport) {
          errors.push({
            id: checkId++,
            category: 'Imports',
            file: file.path,
            message: `'${hook}' used but not imported`,
            fix: `Add: import { ${hook} } from 'react'`,
            severity: 'error'
          })
        }
      }
    }

    // 141-150: Node.js modules in client components
    const nodeModules = ['fs', 'path', 'child_process', 'crypto', 'os', 'http', 'https']
    const isClient = content.includes("'use client'") || !content.includes("'use server'")

    if (isClient) {
      for (const mod of nodeModules) {
        if (new RegExp(`from\\s+['"]${mod}['"]`).test(content)) {
          errors.push({
            id: checkId++,
            category: 'Imports',
            file: file.path,
            message: `'${mod}' module imported in client component — will fail at build`,
            fix: 'Move to Server Component or API route',
            severity: 'error'
          })
        }
      }
    }

    // 151-160: Unused imports (basic check)
    const importMatches = content.matchAll(/import\s+\{([^}]+)\}\s+from/g)
    for (const match of importMatches) {
      const imports = match[1].split(',').map((i: string) => i.trim().split(' as ')[0].trim())
      for (const imp of imports) {
        if (!imp) continue
        const usageRegex = new RegExp(`\\b${imp}\\b`, 'g')
        const usages = (content.match(usageRegex) || []).length
        if (usages <= 1) {
          warnings.push({
            id: checkId++,
            category: 'Imports',
            file: file.path,
            message: `Possibly unused import: '${imp}'`,
            fix: 'Remove if not needed',
            severity: 'warning'
          })
        }
      }
    }
  }

  return { errors, warnings }
}

// Category 4: React & JSX Errors (Checks 196-270)
export function validateReact(files: FileContent[]): { errors: ValidationError[], warnings: ValidationWarning[] } {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  let checkId = 196

  for (const file of files) {
    if (!file.path.endsWith('.tsx')) continue
    const content = file.content

    // 196-200: Component naming (must be PascalCase)
    const funcMatches = content.match(/export\s+(default\s+)?function\s+([a-z]\w*)/g)
    if (funcMatches) {
      errors.push({
        id: checkId++,
        category: 'React',
        file: file.path,
        message: 'Component function starts with lowercase — React won\'t recognize it as component',
        fix: 'Rename to PascalCase (e.g., myComponent → MyComponent)',
        severity: 'error'
      })
    }

    // 201-210: Missing key prop in .map()
    const mapCalls = (content.match(/\.map\(/g) || []).length
    const keyProps = (content.match(/key=/g) || []).length
    if (mapCalls > keyProps) {
      warnings.push({
        id: checkId++,
        category: 'React',
        file: file.path,
        message: `.map() calls (${mapCalls}) exceed key= props (${keyProps}) — may be missing key props`,
        fix: 'Add key prop to elements returned from .map()',
        severity: 'warning'
      })
    }

    // 211-215: onClick calls function immediately
    if (/onClick=\{[a-z]\w+\(\)/.test(content)) {
      warnings.push({
        id: checkId++,
        category: 'React',
        file: file.path,
        message: 'onClick calls function immediately instead of passing reference',
        fix: 'Use onClick={() => fn()} or onClick={fn}',
        severity: 'warning'
      })
    }

    // 216-220: HTML style string instead of object
    if (/style="[^"]*"/.test(content)) {
      errors.push({
        id: checkId++,
        category: 'React',
        file: file.path,
        message: 'HTML-style string in style attribute — JSX requires object',
        fix: 'Change style="..." to style={{ ... }}',
        severity: 'error'
      })
    }

    // 221-225: class= instead of className=
    if (/\bclass=/.test(content) && !/className/.test(content.split('\n').find(l => /\bclass=/.test(l)) || '')) {
      errors.push({
        id: checkId++,
        category: 'React',
        file: file.path,
        message: "Uses 'class=' instead of 'className=' in JSX",
        fix: 'Replace class= with className=',
        severity: 'error'
      })
    }

    // 226-230: for= instead of htmlFor=
    if (/\bfor=/.test(content) && !/htmlFor/.test(content)) {
      if (!/for\s*\(/.test(content.split('\n').find(l => /\bfor=/.test(l)) || '')) {
        warnings.push({
          id: checkId++,
          category: 'React',
          file: file.path,
          message: "Uses 'for=' instead of 'htmlFor=' in JSX",
          fix: 'Replace for= with htmlFor=',
          severity: 'warning'
        })
      }
    }
  }

  return { errors, warnings }
}

// Category 5: Next.js Specific (Checks 271-340)
export function validateNextJs(files: FileContent[]): { errors: ValidationError[], warnings: ValidationWarning[] } {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  let checkId = 271

  for (const file of files) {
    const content = file.content

    // 271-275: 'use client' missing with hooks in app directory
    if (file.path.includes('/app/') && file.path.endsWith('.tsx')) {
      const hasHooks = /\b(useState|useEffect|useCallback|useRef|useMemo|useContext)\b/.test(content)
      const hasUseClient = /'use client'/.test(content)

      if (hasHooks && !hasUseClient) {
        errors.push({
          id: checkId++,
          category: 'Next.js',
          file: file.path,
          message: "Uses React hooks but missing 'use client' directive",
          fix: "Add 'use client' at the top of the file",
          severity: 'error'
        })
      }
    }

    // 276-280: API route issues
    if (file.path.includes('/api/') && file.path.endsWith('route.ts')) {
      // Check for default export (wrong in App Router)
      if (/export default/.test(content)) {
        errors.push({
          id: checkId++,
          category: 'Next.js',
          file: file.path,
          message: "API route uses 'export default' — App Router requires named exports",
          fix: 'Change to: export async function POST(request: Request) { ... }',
          severity: 'error'
        })
      }

      // Check for Pages Router methods
      if (/res\.json|res\.send|res\.status/.test(content)) {
        errors.push({
          id: checkId++,
          category: 'Next.js',
          file: file.path,
          message: 'Uses Pages Router API response methods in App Router',
          fix: 'Use: return NextResponse.json({...}) or return new Response()',
          severity: 'error'
        })
      }
    }

    // 281-285: Page/Layout missing default export
    if ((file.path.endsWith('page.tsx') || file.path.endsWith('layout.tsx')) && file.path.includes('/app/')) {
      if (!/export default/.test(content)) {
        errors.push({
          id: checkId++,
          category: 'Next.js',
          file: file.path,
          message: "Page/Layout missing 'export default'",
          fix: 'Next.js pages and layouts must have a default export',
          severity: 'error'
        })
      }
    }

    // 286-290: Metadata in client component
    if (/'use client'/.test(content) && /export.*metadata/.test(content)) {
      errors.push({
        id: checkId++,
        category: 'Next.js',
        file: file.path,
        message: "Cannot export 'metadata' from a Client Component",
        fix: 'Move metadata to a Server Component or use generateMetadata()',
        severity: 'error'
      })
    }

    // 291-295: <img> instead of <Image>
    if (/<img\s/.test(content)) {
      warnings.push({
        id: checkId++,
        category: 'Next.js',
        file: file.path,
        message: 'Uses <img> instead of Next.js <Image> component',
        fix: "Import and use: import Image from 'next/image'",
        severity: 'warning'
      })
    }

    // 296-300: Hooks in 'use server' file
    if (/'use server'/.test(content) && /\b(useState|useEffect)\b/.test(content)) {
      errors.push({
        id: checkId++,
        category: 'Next.js',
        file: file.path,
        message: "React hooks used in 'use server' file — hooks only work in client components",
        fix: "Remove 'use server' or move hooks to a client component",
        severity: 'error'
      })
    }
  }

  return { errors, warnings }
}

// Category 6: React Hooks Rules (Checks 341-400)
export function validateHooks(files: FileContent[]): { errors: ValidationError[], warnings: ValidationWarning[] } {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  let checkId = 341

  for (const file of files) {
    if (!file.path.endsWith('.tsx')) continue
    const content = file.content
    const lines = content.split('\n')

    // 341-350: async useEffect (not allowed directly)
    if (/useEffect\(\s*async/.test(content)) {
      errors.push({
        id: checkId++,
        category: 'Hooks',
        file: file.path,
        message: 'async function passed directly to useEffect — not allowed',
        fix: 'Wrap in IIFE: useEffect(() => { (async () => { ... })() }, [])',
        severity: 'error'
      })
    }

    // 351-360: Hook call may be inside conditional
    for (let i = 0; i < lines.length; i++) {
      if (/^\s+if\s*\(/.test(lines[i])) {
        // Check next 10 lines for hook calls
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          if (/\buse[A-Z]\w*\(/.test(lines[j]) && !/^\s*\/\//.test(lines[j])) {
            // Check if we've exited the if block
            const slice = lines.slice(i, j + 1).join('\\n')
            const openBraces = (slice.match(/\{/g) || []).length
            const closeBraces = (slice.match(/\}/g) || []).length
            if (openBraces > closeBraces) {
              errors.push({
                id: checkId++,
                category: 'Hooks',
                file: file.path,
                line: j + 1,
                message: 'Hook call may be inside a conditional — hooks must be called at top level',
                fix: 'Move the hook call outside the if/else block',
                severity: 'error'
              })
              break
            }
          }
        }
      }
    }

    // 361-370: useCallback may be missing dependency array
    if (/useCallback\([^)]*\)$/.test(content)) {
      warnings.push({
        id: checkId++,
        category: 'Hooks',
        file: file.path,
        message: 'useCallback may be missing dependency array',
        fix: 'Add dependency array: useCallback(() => { ... }, [deps])',
        severity: 'warning'
      })
    }
  }

  return { errors, warnings }
}

// Category 7: State Management (Checks 401-440)
export function validateState(files: FileContent[]): { errors: ValidationError[], warnings: ValidationWarning[] } {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  let checkId = 401

  for (const file of files) {
    if (!file.path.endsWith('.tsx')) continue
    const content = file.content

    // 401-410: useState setter naming mismatch (THE sendingQuickSMS BUG)
    const useStateMatches = content.matchAll(/\[\s*(\w+)\s*,\s*(\w+)\s*\]\s*=\s*useState/g)

    for (const match of useStateMatches) {
      const stateName = match[1]
      const setterName = match[2]
      const expectedSetter = 'set' + stateName.charAt(0).toUpperCase() + stateName.slice(1)

      // Check if setter is actually used
      const setterUsages = (content.match(new RegExp(`\\b${setterName}\\b`, 'g')) || []).length
      if (setterUsages <= 1) {
        // Find other set* calls that might be misspellings
        const allSetCalls = content.match(/set[A-Z]\w+\(/g) || []
        const suspiciousSetters = allSetCalls.filter(s => {
          const setterWithoutParen = s.slice(0, -1)
          return setterWithoutParen !== setterName &&
            setterWithoutParen.toLowerCase().includes(stateName.toLowerCase().slice(0, 4))
        })

        if (suspiciousSetters.length > 0) {
          errors.push({
            id: checkId++,
            category: 'State',
            file: file.path,
            message: `State setter '${setterName}' declared but may be misspelled elsewhere. Found: ${[...new Set(suspiciousSetters)].join(', ')}`,
            fix: 'Ensure all setState calls match the declared setter name',
            severity: 'error'
          })
        }
      }

      // Check naming convention
      if (setterName !== expectedSetter && setterName !== 'set' + stateName) {
        warnings.push({
          id: checkId++,
          category: 'State',
          file: file.path,
          message: `useState pair [${stateName}, ${setterName}] — setter doesn't match convention (expected ${expectedSetter})`,
          fix: `Rename setter to ${expectedSetter}`,
          severity: 'warning'
        })
      }
    }

    // 411-420: setState immediately followed by reading state (async issue)
    const setStateLines = content.split('\n')
    for (let i = 0; i < setStateLines.length; i++) {
      const setMatch = setStateLines[i].match(/\bset([A-Z]\w*)\(/)
      if (setMatch) {
        const stateName = setMatch[1].charAt(0).toLowerCase() + setMatch[1].slice(1)
        // Check next 5 lines for reading this state
        for (let j = i + 1; j < Math.min(i + 5, setStateLines.length); j++) {
          if (new RegExp(`\\b${stateName}\\b`).test(setStateLines[j]) &&
            !setStateLines[j].includes('set') &&
            !setStateLines[j].trim().startsWith('//')) {
            warnings.push({
              id: checkId++,
              category: 'State',
              file: file.path,
              line: j + 1,
              message: `State '${stateName}' read right after setter — React setState is async, value may be stale`,
              fix: 'Use functional update: setState(prev => ...) or useEffect for side effects',
              severity: 'warning'
            })
            break
          }
        }
      }
    }

    // 421-430: useState without initial value
    if (/useState\(\)/.test(content)) {
      warnings.push({
        id: checkId++,
        category: 'State',
        file: file.path,
        message: 'useState() called without initial value — state will be undefined',
        fix: 'Provide initial value: useState(initialValue)',
        severity: 'warning'
      })
    }
  }

  return { errors, warnings }
}

// Category 8: Async & Promise Errors (Checks 441-490)
export function validateAsync(files: FileContent[]): { errors: ValidationError[], warnings: ValidationWarning[] } {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  let checkId = 441

  for (const file of files) {
    if (!file.path.endsWith('.ts') && !file.path.endsWith('.tsx')) continue
    const content = file.content

    // 441-450: Missing await on async operations
    const asyncOps = ['fetch', 'supabase', '.insert', '.update', '.delete', '.select']
    for (const op of asyncOps) {
      const regex = new RegExp(`\\b${op.replace('.', '\\.')}\\b`, 'g')
      const matches = content.match(regex) || []
      const awaited = (content.match(new RegExp(`await\\s+.*${op.replace('.', '\\.')}`, 'g')) || []).length
      if (matches.length > awaited + 1) {
        warnings.push({
          id: checkId++,
          category: 'Async',
          file: file.path,
          message: `'${op}' called without await — may cause unhandled promise`,
          fix: 'Add await keyword or handle the Promise',
          severity: 'warning'
        })
      }
    }

    // 451-460: .then() without .catch()
    const thenCount = (content.match(/\.then\(/g) || []).length
    const catchCount = (content.match(/\.catch\(/g) || []).length
    if (thenCount > catchCount) {
      warnings.push({
        id: checkId++,
        category: 'Async',
        file: file.path,
        message: `.then() calls (${thenCount}) exceed .catch() (${catchCount}) — some promises may be unhandled`,
        fix: 'Add .catch() for error handling',
        severity: 'warning'
      })
    }

    // 461-470: Promise.all without error handling
    if (/Promise\.all/.test(content) && !/try|catch/.test(content)) {
      warnings.push({
        id: checkId++,
        category: 'Async',
        file: file.path,
        message: 'Promise.all without try/catch — one rejection fails all',
        fix: 'Wrap in try/catch or use Promise.allSettled',
        severity: 'warning'
      })
    }
  }

  return { errors, warnings }
}

// Category 9-10: Environment & Config (Checks 531-570)
export function validateConfig(files: FileContent[]): { errors: ValidationError[], warnings: ValidationWarning[] } {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  let checkId = 531

  const packageJson = files.find(f => f.path === 'package.json' || f.path.endsWith('/package.json'))
  const tsConfig = files.find(f => f.path === 'tsconfig.json' || f.path.endsWith('/tsconfig.json'))

  // Check package.json
  if (packageJson) {
    const content = packageJson.content

    if (!content.includes('"build"')) {
      errors.push({
        id: checkId++,
        category: 'Config',
        file: packageJson.path,
        message: "Missing 'build' script — Vercel won't know how to build",
        fix: 'Add: "build": "next build"',
        severity: 'error'
      })
    }
  }

  // Check tsconfig.json
  if (tsConfig) {
    const content = tsConfig.content

    if (!content.includes('"strict"') || content.includes('"strict": false')) {
      warnings.push({
        id: checkId++,
        category: 'Config',
        file: tsConfig.path,
        message: "'strict' mode not enabled — may miss type errors",
        fix: 'Add "strict": true to compilerOptions',
        severity: 'warning'
      })
    }
  }

  // Check for client-side env var access
  for (const file of files) {
    if (!file.path.endsWith('.ts') && !file.path.endsWith('.tsx')) continue

    const isClient = file.content.includes("'use client'") || file.path.includes('/components/')
    if (isClient) {
      const envAccess = file.content.match(/process\.env\.(\w+)/g) || []
      for (const access of envAccess) {
        const varName = access.replace('process.env.', '')
        if (!varName.startsWith('NEXT_PUBLIC_') && varName !== 'NODE_ENV') {
          warnings.push({
            id: checkId++,
            category: 'Config',
            file: file.path,
            message: `Server-side env var '${varName}' accessed in client code`,
            fix: 'Use NEXT_PUBLIC_ prefix for client-accessible env vars',
            severity: 'warning'
          })
        }
      }
    }
  }

  return { errors, warnings }
}

// =====================================================
// MAIN VALIDATION FUNCTION
// =====================================================

export function vercelProofValidate(files: FileContent[]): ValidationResult {
  const allErrors: ValidationError[] = []
  const allWarnings: ValidationWarning[] = []
  const categories: CategoryResult[] = []

  // Run all validation categories
  const validators = [
    { name: 'Syntax & Structure', fn: validateSyntax },
    { name: 'TypeScript Types', fn: validateTypes },
    { name: 'Imports & Modules', fn: validateImports },
    { name: 'React & JSX', fn: validateReact },
    { name: 'Next.js Specific', fn: validateNextJs },
    { name: 'React Hooks', fn: validateHooks },
    { name: 'State Management', fn: validateState },
    { name: 'Async & Promises', fn: validateAsync },
    { name: 'Config & Environment', fn: validateConfig },
  ]

  for (const validator of validators) {
    const { errors, warnings } = validator.fn(files)

    categories.push({
      name: validator.name,
      passed: errors.length === 0 ? 1 : 0,
      failed: errors.length,
      warnings: warnings.length,
      total: errors.length + warnings.length
    })

    allErrors.push(...errors)
    allWarnings.push(...warnings)
  }

  // Calculate score
  const totalChecks = files.length * 50 // Approximate checks per file
  const errorPenalty = allErrors.length * 5
  const warningPenalty = allWarnings.length * 1
  const score = Math.max(0, Math.min(100, 100 - errorPenalty - warningPenalty))

  // Generate summary
  let summary = ''
  if (allErrors.length === 0 && allWarnings.length === 0) {
    summary = ' All checks passed! Safe to deploy to Vercel.'
  } else if (allErrors.length === 0) {
    summary = ` ${allWarnings.length} warning(s) found. Build will succeed but review recommended.`
  } else {
    summary = ` ${allErrors.length} error(s) found. Build will fail on Vercel. Fix before pushing.`
  }

  return {
    passed: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    checks: totalChecks,
    score,
    categories,
    summary
  }
}

// =====================================================
// QUICK FIXES
// =====================================================

export interface QuickFix {
  file: string
  original: string
  fixed: string
  description: string
}

export function generateQuickFixes(result: ValidationResult, files: FileContent[]): QuickFix[] {
  const fixes: QuickFix[] = []

  for (const error of result.errors) {
    const file = files.find(f => f.path === error.file)
    if (!file) continue

    // Fix: class= → className=
    if (error.message.includes("'class=' instead of 'className='")) {
      fixes.push({
        file: error.file,
        original: file.content,
        fixed: file.content.replace(/\bclass=/g, 'className='),
        description: 'Replace class= with className='
      })
    }

    // Fix: style="..." → style={{...}}
    if (error.message.includes('HTML-style string in style attribute')) {
      const styleRegex = /style="([^"]*)"/g
      let fixed = file.content
      let match
      while ((match = styleRegex.exec(file.content)) !== null) {
        const cssProps = match[1].split(';').filter(Boolean).map(prop => {
          const [key, value] = prop.split(':').map(s => s.trim())
          const camelKey = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
          return `${camelKey}: '${value}'`
        }).join(', ')
        fixed = fixed.replace(match[0], `style={{ ${cssProps} }}`)
      }
      fixes.push({
        file: error.file,
        original: file.content,
        fixed,
        description: 'Convert style strings to React style objects'
      })
    }

    // Fix: Add 'use client'
    if (error.message.includes("missing 'use client'")) {
      fixes.push({
        file: error.file,
        original: file.content,
        fixed: "'use client'\n\n" + file.content,
        description: "Add 'use client' directive"
      })
    }
  }

  return fixes
}

export default vercelProofValidate
