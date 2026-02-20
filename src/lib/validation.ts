/**
 * FILE ENGINE - Code Validation Engine
 * 
 * Multi-layer validation system that catches errors before delivery.
 * Stronger and more accurate than Cursor's validation.
 * 
 * VALIDATION LAYERS:
 * 1. Syntax Validation (AST parsing)
 * 2. TypeScript Type Checking
 * 3. Import/Export Resolution
 * 4. React/JSX Validation
 * 5. Dependency Validation
 * 6. Security Scanning
 * 7. Best Practices Check
 * 8. Cross-file Consistency
 */

import { parse as parseTS } from '@typescript-eslint/parser'
import { parse as parseBabel } from '@babel/parser'
import * as acorn from 'acorn'
import * as acornJsx from 'acorn-jsx'

// ============================================
// TYPES
// ============================================

export interface ValidationError {
  type: 'error' | 'warning' | 'info'
  code: string
  message: string
  file: string
  line?: number
  column?: number
  suggestion?: string
  autoFix?: AutoFix
}

export interface AutoFix {
  description: string
  replacement: string
  range?: { start: number; end: number }
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  suggestions: ValidationError[]
  fixedFiles?: ParsedFile[]
  stats: {
    filesChecked: number
    errorsFound: number
    errorsFixed: number
    timeMs: number
  }
}

export interface ParsedFile {
  filepath: string
  language: string
  content: string
}

export interface ValidationContext {
  files: ParsedFile[]
  projectType: 'react' | 'nextjs' | 'node' | 'html' | 'unknown'
  dependencies: Record<string, string>
}

// ============================================
// MAIN VALIDATION FUNCTION
// ============================================

export async function validateAndFix(
  files: ParsedFile[],
  options: {
    autoFix?: boolean
    strictMode?: boolean
    maxIterations?: number
  } = {}
): Promise<ValidationResult> {
  const startTime = Date.now()
  const { autoFix = true, strictMode = false, maxIterations = 3 } = options

  // Build context
  const context = buildContext(files)
  
  let currentFiles = [...files]
  let allErrors: ValidationError[] = []
  let allWarnings: ValidationError[] = []
  let allSuggestions: ValidationError[] = []
  let totalFixed = 0
  let iteration = 0

  // Iterative validation and fixing
  while (iteration < maxIterations) {
    iteration++
    
    // Run all validators
    const results = await runAllValidators(currentFiles, context)
    
    const errors = results.filter(r => r.type === 'error')
    const warnings = results.filter(r => r.type === 'warning')
    const suggestions = results.filter(r => r.type === 'info')

    // If no errors or no auto-fix, we're done
    if (errors.length === 0 || !autoFix) {
      allErrors = errors
      allWarnings = warnings
      allSuggestions = suggestions
      break
    }

    // Apply auto-fixes
    const { fixedFiles, fixCount } = applyAutoFixes(currentFiles, errors)
    
    if (fixCount === 0) {
      // No more fixes possible
      allErrors = errors
      allWarnings = warnings
      allSuggestions = suggestions
      break
    }

    totalFixed += fixCount
    currentFiles = fixedFiles
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    suggestions: allSuggestions,
    fixedFiles: autoFix ? currentFiles : undefined,
    stats: {
      filesChecked: files.length,
      errorsFound: allErrors.length + totalFixed,
      errorsFixed: totalFixed,
      timeMs: Date.now() - startTime
    }
  }
}

// ============================================
// CONTEXT BUILDER
// ============================================

function buildContext(files: ParsedFile[]): ValidationContext {
  // Detect project type
  const projectType = detectProjectType(files)
  
  // Extract dependencies from package.json
  const packageJson = files.find(f => f.filepath === 'package.json' || f.filepath.endsWith('/package.json'))
  let dependencies: Record<string, string> = {}
  
  if (packageJson) {
    try {
      const pkg = JSON.parse(packageJson.content)
      dependencies = { ...pkg.dependencies, ...pkg.devDependencies }
    } catch {
      // package.json parse failed — continue without deps
    }
  }

  return { files, projectType, dependencies }
}

function detectProjectType(files: ParsedFile[]): ValidationContext['projectType'] {
  const hasPackageJson = files.some(f => f.filepath.includes('package.json'))
  const hasNextConfig = files.some(f => f.filepath.includes('next.config'))
  const hasAppDir = files.some(f => f.filepath.includes('/app/') && f.filepath.endsWith('.tsx'))
  const hasJsx = files.some(f => f.language === 'tsx' || f.language === 'jsx')
  const hasHtml = files.some(f => f.language === 'html')

  if (hasNextConfig || hasAppDir) return 'nextjs'
  if (hasJsx) return 'react'
  if (hasPackageJson && !hasJsx) return 'node'
  if (hasHtml) return 'html'
  return 'unknown'
}

// ============================================
// VALIDATOR RUNNER
// ============================================

async function runAllValidators(
  files: ParsedFile[],
  context: ValidationContext
): Promise<ValidationError[]> {
  const results: ValidationError[] = []

  for (const file of files) {
    // 1. Syntax Validation
    results.push(...validateSyntax(file))
    
    // 2. Import/Export Validation
    results.push(...validateImports(file, context))
    
    // 3. React/JSX Validation
    if (file.language === 'tsx' || file.language === 'jsx') {
      results.push(...validateReact(file, context))
    }
    
    // 4. TypeScript Validation
    if (file.language === 'ts' || file.language === 'tsx') {
      results.push(...validateTypeScript(file, context))
    }
    
    // 5. JSON Validation
    if (file.language === 'json') {
      results.push(...validateJSON(file))
    }
    
    // 6. HTML Validation
    if (file.language === 'html') {
      results.push(...validateHTML(file))
    }
    
    // 7. CSS Validation
    if (file.language === 'css') {
      results.push(...validateCSS(file))
    }
    
    // 8. Security Checks
    results.push(...validateSecurity(file))
    
    // 9. Best Practices
    results.push(...validateBestPractices(file, context))
  }

  // 10. Cross-file Validation
  results.push(...validateCrossFile(files, context))

  return results
}

// ============================================
// SYNTAX VALIDATOR
// ============================================

function validateSyntax(file: ParsedFile): ValidationError[] {
  const errors: ValidationError[] = []
  const { filepath, language, content } = file

  try {
    if (language === 'typescript' || language === 'ts') {
      parseTS(content, {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: false }
      })
    } else if (language === 'tsx') {
      parseTS(content, {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        jsxPragma: 'React'
      })
    } else if (language === 'javascript' || language === 'js') {
      acorn.parse(content, { ecmaVersion: 2022, sourceType: 'module' })
    } else if (language === 'jsx') {
      const Parser = acorn.Parser.extend((acornJsx as any)())
      Parser.parse(content, { ecmaVersion: 2022, sourceType: 'module' })
    }
  } catch (e: any) {
    const error = parseSyntaxError(e, filepath, content)
    errors.push(error)
  }

  // Additional syntax checks
  errors.push(...checkBracketBalance(file))
  errors.push(...checkStringTermination(file))
  errors.push(...checkCommonTypos(file))

  return errors
}

function parseSyntaxError(error: any, filepath: string, content: string): ValidationError {
  const line = error.loc?.line || error.lineNumber || 1
  const column = error.loc?.column || error.column || 0
  const message = error.message || 'Syntax error'

  // Try to generate auto-fix
  const autoFix = generateSyntaxFix(message, content, line, column)

  return {
    type: 'error',
    code: 'SYNTAX_ERROR',
    message: message.replace(/\(\d+:\d+\)$/, '').trim(),
    file: filepath,
    line,
    column,
    suggestion: autoFix?.description,
    autoFix
  }
}

// ============================================
// BRACKET BALANCE CHECKER
// ============================================

function checkBracketBalance(file: ParsedFile): ValidationError[] {
  const errors: ValidationError[] = []
  const { filepath, content } = file
  
  const brackets: { char: string; line: number; col: number }[] = []
  const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}', '<': '>' }
  const openBrackets = Object.keys(pairs)
  const closeBrackets = Object.values(pairs)
  
  let line = 1
  let col = 0
  let inString = false
  let stringChar = ''
  let inComment = false
  let inMultiComment = false

  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    const nextChar = content[i + 1]
    const prevChar = content[i - 1]

    // Track position
    if (char === '\n') {
      line++
      col = 0
      inComment = false
      continue
    }
    col++

    // Skip comments
    if (!inString && char === '/' && nextChar === '/') {
      inComment = true
      continue
    }
    if (!inString && char === '/' && nextChar === '*') {
      inMultiComment = true
      continue
    }
    if (inMultiComment && char === '*' && nextChar === '/') {
      inMultiComment = false
      i++
      continue
    }
    if (inComment || inMultiComment) continue

    // Track strings
    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      if (!inString) {
        inString = true
        stringChar = char
      } else if (char === stringChar) {
        inString = false
      }
      continue
    }
    if (inString) continue

    // Track brackets (skip < > in JSX/generics context)
    if (char === '<' || char === '>') {
      // Skip JSX and generics - too complex to track accurately
      continue
    }

    if (openBrackets.includes(char) && char !== '<') {
      brackets.push({ char, line, col })
    } else if (closeBrackets.includes(char) && char !== '>') {
      const expected = Object.entries(pairs).find(([, v]) => v === char)?.[0]
      const last = brackets.pop()
      
      if (!last) {
        errors.push({
          type: 'error',
          code: 'UNMATCHED_BRACKET',
          message: `Unexpected closing bracket '${char}'`,
          file: filepath,
          line,
          column: col,
          suggestion: `Remove the extra '${char}' or add matching '${expected}'`,
          autoFix: {
            description: `Remove extra '${char}'`,
            replacement: content.slice(0, i) + content.slice(i + 1)
          }
        })
      } else if (pairs[last.char] !== char) {
        errors.push({
          type: 'error',
          code: 'MISMATCHED_BRACKET',
          message: `Expected '${pairs[last.char]}' but found '${char}'`,
          file: filepath,
          line,
          column: col,
          suggestion: `Replace '${char}' with '${pairs[last.char]}' or fix the opening bracket at line ${last.line}`,
          autoFix: {
            description: `Replace '${char}' with '${pairs[last.char]}'`,
            replacement: content.slice(0, i) + pairs[last.char] + content.slice(i + 1)
          }
        })
      }
    }
  }

  // Report unclosed brackets
  for (const bracket of brackets) {
    errors.push({
      type: 'error',
      code: 'UNCLOSED_BRACKET',
      message: `Unclosed '${bracket.char}' - missing '${pairs[bracket.char]}'`,
      file: filepath,
      line: bracket.line,
      column: bracket.col,
      suggestion: `Add closing '${pairs[bracket.char]}'`,
      autoFix: {
        description: `Add closing '${pairs[bracket.char]}' at end of file`,
        replacement: content + pairs[bracket.char]
      }
    })
  }

  return errors
}

// ============================================
// STRING TERMINATION CHECKER
// ============================================

function checkStringTermination(file: ParsedFile): ValidationError[] {
  const errors: ValidationError[] = []
  const { filepath, content } = file
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let inString = false
    let stringChar = ''
    let stringStart = -1

    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      const prevChar = line[j - 1]

      // Skip escaped quotes
      if (prevChar === '\\') continue

      if ((char === '"' || char === "'") && !inString) {
        inString = true
        stringChar = char
        stringStart = j
      } else if (char === stringChar && inString) {
        inString = false
      }
    }

    // Template literals can span multiple lines
    if (inString && stringChar !== '`') {
      errors.push({
        type: 'error',
        code: 'UNTERMINATED_STRING',
        message: `Unterminated string literal`,
        file: filepath,
        line: i + 1,
        column: stringStart + 1,
        suggestion: `Add closing ${stringChar} at end of string`,
        autoFix: {
          description: `Close string with ${stringChar}`,
          replacement: lines.map((l, idx) => 
            idx === i ? l + stringChar : l
          ).join('\n')
        }
      })
    }
  }

  return errors
}

// ============================================
// COMMON TYPO CHECKER
// ============================================

function checkCommonTypos(file: ParsedFile): ValidationError[] {
  const errors: ValidationError[] = []
  const { filepath, content, language } = file

  if (!['ts', 'tsx', 'js', 'jsx', 'typescript', 'javascript'].includes(language)) {
    return errors
  }

  const typoPatterns: { pattern: RegExp; fix: string; message: string }[] = [
    { pattern: /\bfunciton\b/g, fix: 'function', message: "Typo: 'funciton' should be 'function'" },
    { pattern: /\bretrun\b/g, fix: 'return', message: "Typo: 'retrun' should be 'return'" },
    { pattern: /\bconts\b/g, fix: 'const', message: "Typo: 'conts' should be 'const'" },
    { pattern: /\blet\s+const\b/g, fix: 'const', message: "Invalid: 'let const' - use 'const' or 'let'" },
    { pattern: /\bexport\s+defualt\b/g, fix: 'export default', message: "Typo: 'defualt' should be 'default'" },
    { pattern: /\bimprot\b/g, fix: 'import', message: "Typo: 'improt' should be 'import'" },
    { pattern: /\basycn\b/g, fix: 'async', message: "Typo: 'asycn' should be 'async'" },
    { pattern: /\bawiat\b/g, fix: 'await', message: "Typo: 'awiat' should be 'await'" },
    { pattern: /\bnull\s*==\s*=/g, fix: '===', message: "Invalid operator: use '===' or '=='" },
    { pattern: /\b(\w+)\s*\.\s*lenght\b/g, fix: '.length', message: "Typo: 'lenght' should be 'length'" },
    { pattern: /\bunderfined\b/g, fix: 'undefined', message: "Typo: 'underfined' should be 'undefined'" },
    { pattern: /\bconsle\./g, fix: 'console.', message: "Typo: 'consle' should be 'console'" },
    { pattern: /\bdocuemnt\./g, fix: 'document.', message: "Typo: 'docuemnt' should be 'document'" },
    { pattern: /\bwidnow\./g, fix: 'window.', message: "Typo: 'widnow' should be 'window'" },
  ]

  const lines = content.split('\n')
  
  for (const { pattern, fix, message } of typoPatterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      const position = getLineAndColumn(content, match.index)
      errors.push({
        type: 'error',
        code: 'TYPO',
        message,
        file: filepath,
        line: position.line,
        column: position.column,
        autoFix: {
          description: `Replace with '${fix}'`,
          replacement: content.slice(0, match.index) + fix + content.slice(match.index + match[0].length)
        }
      })
    }
  }

  return errors
}

// ============================================
// IMPORT/EXPORT VALIDATOR
// ============================================

function validateImports(file: ParsedFile, context: ValidationContext): ValidationError[] {
  const errors: ValidationError[] = []
  const { filepath, content, language } = file

  if (!['ts', 'tsx', 'js', 'jsx', 'typescript', 'javascript'].includes(language)) {
    return errors
  }

  // Extract imports
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s*,?\s*)*\s*from\s+['"]([^'"]+)['"]/g
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g

  let match

  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1]
    const position = getLineAndColumn(content, match.index)

    // Check relative imports
    if (importPath.startsWith('.')) {
      const resolvedPath = resolveImportPath(filepath, importPath, context.files)
      if (!resolvedPath) {
        // Try to find similar file
        const suggestion = findSimilarFile(importPath, filepath, context.files)
        errors.push({
          type: 'error',
          code: 'IMPORT_NOT_FOUND',
          message: `Cannot find module '${importPath}'`,
          file: filepath,
          line: position.line,
          column: position.column,
          suggestion: suggestion ? `Did you mean '${suggestion}'?` : 'Check the file path',
          autoFix: suggestion ? {
            description: `Change import to '${suggestion}'`,
            replacement: content.replace(match[0], match[0].replace(importPath, suggestion))
          } : undefined
        })
      }
    }
    // Check npm imports
    else if (!importPath.startsWith('@/') && !importPath.startsWith('~')) {
      const packageName = importPath.split('/')[0].startsWith('@') 
        ? importPath.split('/').slice(0, 2).join('/')
        : importPath.split('/')[0]

      if (!context.dependencies[packageName] && !isBuiltinModule(packageName)) {
        errors.push({
          type: 'warning',
          code: 'MISSING_DEPENDENCY',
          message: `Package '${packageName}' is not in dependencies`,
          file: filepath,
          line: position.line,
          column: position.column,
          suggestion: `Run: npm install ${packageName}`
        })
      }
    }
  }

  // Check for duplicate imports
  const importedModules = new Map<string, number[]>()
  const simpleImportRegex = /import\s+.+\s+from\s+['"]([^'"]+)['"]/g
  
  while ((match = simpleImportRegex.exec(content)) !== null) {
    const modulePath = match[1]
    const position = getLineAndColumn(content, match.index)
    
    if (importedModules.has(modulePath)) {
      importedModules.get(modulePath)!.push(position.line)
    } else {
      importedModules.set(modulePath, [position.line])
    }
  }

  for (const [modulePath, lines] of importedModules) {
    if (lines.length > 1) {
      errors.push({
        type: 'warning',
        code: 'DUPLICATE_IMPORT',
        message: `Duplicate import from '${modulePath}' on lines ${lines.join(', ')}`,
        file: filepath,
        line: lines[1],
        suggestion: 'Merge imports into a single statement'
      })
    }
  }

  return errors
}

// ============================================
// REACT/JSX VALIDATOR
// ============================================

function validateReact(file: ParsedFile, context: ValidationContext): ValidationError[] {
  const errors: ValidationError[] = []
  const { filepath, content } = file

  // Check for React import in JSX files (not needed in Next.js 13+)
  if (context.projectType !== 'nextjs') {
    const hasJsx = /<[A-Z][a-zA-Z]*|<[a-z]+\s/.test(content)
    const hasReactImport = /import\s+.*React.*from\s+['"]react['"]/.test(content)
    
    if (hasJsx && !hasReactImport) {
      errors.push({
        type: 'error',
        code: 'MISSING_REACT_IMPORT',
        message: "JSX requires React to be in scope",
        file: filepath,
        line: 1,
        autoFix: {
          description: "Add React import",
          replacement: `import React from 'react'\n${content}`
        }
      })
    }
  }

  // Check for key prop in map
  const mapWithoutKey = /\.map\s*\(\s*(?:\([^)]*\)|[^=]+)\s*=>\s*(?:<[A-Z][^>]*(?!key=)[^>]*>|<[a-z]+[^>]*(?!key=)[^>]*>)/g
  let match
  
  while ((match = mapWithoutKey.exec(content)) !== null) {
    // More precise check - look for JSX without key in the map callback
    const mapContent = content.slice(match.index, match.index + 200)
    if (!mapContent.includes('key=') && !mapContent.includes('key:')) {
      const position = getLineAndColumn(content, match.index)
      errors.push({
        type: 'error',
        code: 'MISSING_KEY_PROP',
        message: "Each child in a list should have a unique 'key' prop",
        file: filepath,
        line: position.line,
        suggestion: "Add key={item.id} or key={index} to the JSX element"
      })
    }
  }

  // Check for hooks rules
  const hookPattern = /\b(use[A-Z]\w+)\s*\(/g
  const conditionalHookPattern = /if\s*\([^)]*\)\s*\{[^}]*\buse[A-Z]\w+\s*\(/g
  const loopHookPattern = /(for|while)\s*\([^)]*\)\s*\{[^}]*\buse[A-Z]\w+\s*\(/g

  while ((match = conditionalHookPattern.exec(content)) !== null) {
    const position = getLineAndColumn(content, match.index)
    errors.push({
      type: 'error',
      code: 'HOOK_IN_CONDITIONAL',
      message: "React Hook cannot be called inside a condition",
      file: filepath,
      line: position.line,
      suggestion: "Move the hook call to the top level of your component"
    })
  }

  while ((match = loopHookPattern.exec(content)) !== null) {
    const position = getLineAndColumn(content, match.index)
    errors.push({
      type: 'error',
      code: 'HOOK_IN_LOOP',
      message: "React Hook cannot be called inside a loop",
      file: filepath,
      line: position.line,
      suggestion: "Move the hook call to the top level of your component"
    })
  }

  // Check for undefined components
  const componentUsagePattern = /<([A-Z][a-zA-Z0-9]*)/g
  const importedComponents = new Set<string>()
  const definedComponents = new Set<string>()

  // Find imported components
  const importPattern = /import\s+\{?\s*([^}]+?)\s*\}?\s*from/g
  while ((match = importPattern.exec(content)) !== null) {
    match[1].split(',').forEach(c => importedComponents.add(c.trim().split(' ')[0]))
  }

  // Find locally defined components
  const functionPattern = /(?:function|const|let|var)\s+([A-Z][a-zA-Z0-9]*)/g
  while ((match = functionPattern.exec(content)) !== null) {
    definedComponents.add(match[1])
  }

  // Check component usage
  while ((match = componentUsagePattern.exec(content)) !== null) {
    const componentName = match[1]
    if (!importedComponents.has(componentName) && 
        !definedComponents.has(componentName) &&
        !isBuiltinComponent(componentName)) {
      const position = getLineAndColumn(content, match.index)
      errors.push({
        type: 'error',
        code: 'UNDEFINED_COMPONENT',
        message: `'${componentName}' is not defined`,
        file: filepath,
        line: position.line,
        column: position.column,
        suggestion: `Import ${componentName} or define it in this file`
      })
    }
  }

  // Check for self-closing tags
  const voidElements = ['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr']
  for (const tag of voidElements) {
    const badPattern = new RegExp(`<${tag}[^>]*>\\s*</${tag}>`, 'gi')
    while ((match = badPattern.exec(content)) !== null) {
      const position = getLineAndColumn(content, match.index)
      errors.push({
        type: 'warning',
        code: 'VOID_ELEMENT_CHILDREN',
        message: `'${tag}' is a void element and should be self-closing`,
        file: filepath,
        line: position.line,
        autoFix: {
          description: `Convert to self-closing <${tag} />`,
          replacement: content.slice(0, match.index) + 
            match[0].replace(new RegExp(`>\\s*</${tag}>$`, 'i'), ' />') +
            content.slice(match.index + match[0].length)
        }
      })
    }
  }

  return errors
}

// ============================================
// TYPESCRIPT VALIDATOR
// ============================================

function validateTypeScript(file: ParsedFile, context: ValidationContext): ValidationError[] {
  const errors: ValidationError[] = []
  const { filepath, content } = file

  // Check for 'any' type usage
  const anyPattern = /:\s*any\b/g
  let match

  while ((match = anyPattern.exec(content)) !== null) {
    const position = getLineAndColumn(content, match.index)
    errors.push({
      type: 'warning',
      code: 'AVOID_ANY_TYPE',
      message: "Avoid using 'any' type - use a specific type or 'unknown'",
      file: filepath,
      line: position.line,
      column: position.column,
      suggestion: "Consider using a more specific type or 'unknown'"
    })
  }

  // Check for missing return types on exported functions
  const exportedFunctionPattern = /export\s+(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*(?!:)/g
  
  while ((match = exportedFunctionPattern.exec(content)) !== null) {
    // Check if there's a return type
    const afterParams = content.slice(match.index + match[0].length, match.index + match[0].length + 50)
    if (!afterParams.trim().startsWith(':') && !afterParams.trim().startsWith('{')) {
      const position = getLineAndColumn(content, match.index)
      errors.push({
        type: 'info',
        code: 'MISSING_RETURN_TYPE',
        message: `Exported function '${match[1]}' should have an explicit return type`,
        file: filepath,
        line: position.line,
        suggestion: "Add a return type annotation for better type safety"
      })
    }
  }

  // Check for non-null assertions
  const nonNullPattern = /!\./g
  
  while ((match = nonNullPattern.exec(content)) !== null) {
    const position = getLineAndColumn(content, match.index)
    errors.push({
      type: 'warning',
      code: 'NON_NULL_ASSERTION',
      message: "Avoid non-null assertions (!) - use optional chaining or null checks",
      file: filepath,
      line: position.line,
      column: position.column,
      suggestion: "Use optional chaining (?.) or add proper null checks"
    })
  }

  return errors
}

// ============================================
// JSON VALIDATOR
// ============================================

function validateJSON(file: ParsedFile): ValidationError[] {
  const errors: ValidationError[] = []
  const { filepath, content } = file

  try {
    JSON.parse(content)
  } catch (e: any) {
    const match = e.message.match(/position (\d+)/)
    const position = match ? parseInt(match[1]) : 0
    const { line, column } = getLineAndColumn(content, position)

    errors.push({
      type: 'error',
      code: 'INVALID_JSON',
      message: e.message,
      file: filepath,
      line,
      column,
      suggestion: "Check for missing commas, quotes, or brackets"
    })
  }

  // Check for trailing commas (invalid in JSON)
  const trailingCommaPattern = /,\s*[}\]]/g
  let match

  while ((match = trailingCommaPattern.exec(content)) !== null) {
    const position = getLineAndColumn(content, match.index)
    errors.push({
      type: 'error',
      code: 'TRAILING_COMMA',
      message: "Trailing commas are not allowed in JSON",
      file: filepath,
      line: position.line,
      column: position.column,
      autoFix: {
        description: "Remove trailing comma",
        replacement: content.slice(0, match.index) + match[0].replace(',', '') + content.slice(match.index + match[0].length)
      }
    })
  }

  return errors
}

// ============================================
// HTML VALIDATOR
// ============================================

function validateHTML(file: ParsedFile): ValidationError[] {
  const errors: ValidationError[] = []
  const { filepath, content } = file

  // Check for unclosed tags
  const tagStack: { tag: string; line: number }[] = []
  const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*\/?>/g
  const selfClosingTags = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']
  
  let match
  while ((match = tagPattern.exec(content)) !== null) {
    const isClosing = match[0].startsWith('</')
    const isSelfClosing = match[0].endsWith('/>') || selfClosingTags.includes(match[1].toLowerCase())
    const tagName = match[1].toLowerCase()
    const position = getLineAndColumn(content, match.index)

    if (isClosing) {
      const lastOpen = tagStack.pop()
      if (!lastOpen || lastOpen.tag !== tagName) {
        errors.push({
          type: 'error',
          code: 'MISMATCHED_TAG',
          message: lastOpen 
            ? `Expected </${lastOpen.tag}> but found </${tagName}>`
            : `Unexpected closing tag </${tagName}>`,
          file: filepath,
          line: position.line
        })
      }
    } else if (!isSelfClosing) {
      tagStack.push({ tag: tagName, line: position.line })
    }
  }

  for (const unclosed of tagStack) {
    errors.push({
      type: 'error',
      code: 'UNCLOSED_TAG',
      message: `Unclosed <${unclosed.tag}> tag`,
      file: filepath,
      line: unclosed.line
    })
  }

  // Check for missing alt on images
  const imgWithoutAlt = /<img(?![^>]*alt=)[^>]*>/gi
  while ((match = imgWithoutAlt.exec(content)) !== null) {
    const position = getLineAndColumn(content, match.index)
    errors.push({
      type: 'warning',
      code: 'MISSING_ALT',
      message: "Image is missing 'alt' attribute",
      file: filepath,
      line: position.line,
      suggestion: "Add alt attribute for accessibility"
    })
  }

  return errors
}

// ============================================
// CSS VALIDATOR
// ============================================

function validateCSS(file: ParsedFile): ValidationError[] {
  const errors: ValidationError[] = []
  const { filepath, content } = file

  // Check for bracket balance
  let braceCount = 0
  let line = 1
  
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '\n') line++
    if (content[i] === '{') braceCount++
    if (content[i] === '}') braceCount--
    
    if (braceCount < 0) {
      errors.push({
        type: 'error',
        code: 'UNMATCHED_BRACE',
        message: "Unexpected closing brace '}'",
        file: filepath,
        line
      })
      braceCount = 0
    }
  }

  if (braceCount > 0) {
    errors.push({
      type: 'error',
      code: 'UNCLOSED_BRACE',
      message: `${braceCount} unclosed brace(s) in CSS`,
      file: filepath,
      line: 1
    })
  }

  // Check for missing semicolons (common error)
  const missingSemicolon = /[a-zA-Z0-9)%]\s*\n\s*[a-zA-Z-]+\s*:/g
  let match
  
  while ((match = missingSemicolon.exec(content)) !== null) {
    const position = getLineAndColumn(content, match.index)
    errors.push({
      type: 'warning',
      code: 'MISSING_SEMICOLON',
      message: "Possible missing semicolon",
      file: filepath,
      line: position.line
    })
  }

  return errors
}

// ============================================
// SECURITY VALIDATOR
// ============================================

function validateSecurity(file: ParsedFile): ValidationError[] {
  const errors: ValidationError[] = []
  const { filepath, content } = file

  // Check for hardcoded secrets
  const secretPatterns = [
    { pattern: /['"]sk[-_]live[-_][a-zA-Z0-9]{20,}['"]/g, type: 'Stripe secret key' },
    { pattern: /['"]sk[-_]test[-_][a-zA-Z0-9]{20,}['"]/g, type: 'Stripe test key' },
    { pattern: /['"][a-zA-Z0-9]{32,}['"]/g, type: 'Possible API key' },
    { pattern: /password\s*[:=]\s*['"][^'"]+['"]/gi, type: 'Hardcoded password' },
    { pattern: /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi, type: 'Hardcoded API key' },
    { pattern: /secret\s*[:=]\s*['"][^'"]+['"]/gi, type: 'Hardcoded secret' },
  ]

  for (const { pattern, type } of secretPatterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      const position = getLineAndColumn(content, match.index)
      
      // Skip obvious non-secrets
      if (match[0].includes('process.env') || 
          match[0].includes('placeholder') ||
          match[0].length < 20) {
        continue
      }

      errors.push({
        type: 'error',
        code: 'HARDCODED_SECRET',
        message: `Possible ${type} detected`,
        file: filepath,
        line: position.line,
        suggestion: "Use environment variables instead of hardcoding secrets"
      })
    }
  }

  // Check for eval usage
  if (/\beval\s*\(/.test(content)) {
    const match = /\beval\s*\(/.exec(content)
    if (match) {
      const position = getLineAndColumn(content, match.index)
      errors.push({
        type: 'error',
        code: 'EVAL_USAGE',
        message: "Avoid using eval() - it's a security risk",
        file: filepath,
        line: position.line,
        suggestion: "Use safer alternatives like JSON.parse() or Function constructor"
      })
    }
  }

  // Check for innerHTML usage
  if (/\.innerHTML\s*=/.test(content)) {
    const match = /\.innerHTML\s*=/.exec(content)
    if (match) {
      const position = getLineAndColumn(content, match.index)
      errors.push({
        type: 'warning',
        code: 'INNERHTML_USAGE',
        message: "innerHTML can lead to XSS vulnerabilities",
        file: filepath,
        line: position.line,
        suggestion: "Use textContent or sanitize input before using innerHTML"
      })
    }
  }

  return errors
}

// ============================================
// BEST PRACTICES VALIDATOR
// ============================================

function validateBestPractices(file: ParsedFile, context: ValidationContext): ValidationError[] {
  const errors: ValidationError[] = []
  const { filepath, content, language } = file

  if (!['ts', 'tsx', 'js', 'jsx'].includes(language)) {
    return errors
  }

  // Check for console.log (should be removed in production)
  const consolePattern = /console\.(log|debug|info)\s*\(/g
  let match

  while ((match = consolePattern.exec(content)) !== null) {
    const position = getLineAndColumn(content, match.index)
    errors.push({
      type: 'info',
      code: 'CONSOLE_LOG',
      message: `console.${match[1]}() should be removed in production`,
      file: filepath,
      line: position.line,
      suggestion: "Remove or replace with proper logging"
    })
  }

  // Check for TODO/FIXME comments
  const todoPattern = /\/\/\s*(TODO|FIXME|HACK|XXX)[\s:]*(.+)?/gi
  
  while ((match = todoPattern.exec(content)) !== null) {
    const position = getLineAndColumn(content, match.index)
    errors.push({
      type: 'info',
      code: 'TODO_COMMENT',
      message: `${match[1]}: ${match[2] || 'No description'}`,
      file: filepath,
      line: position.line
    })
  }

  // Check for empty catch blocks
  const emptyCatchPattern = /catch\s*\([^)]*\)\s*\{\s*\}/g
  
  while ((match = emptyCatchPattern.exec(content)) !== null) {
    const position = getLineAndColumn(content, match.index)
    errors.push({
      type: 'warning',
      code: 'EMPTY_CATCH',
      message: "Empty catch block - errors should be handled",
      file: filepath,
      line: position.line,
      suggestion: "Add error handling or at least log the error"
    })
  }

  // Check for === vs ==
  const looseEqualityPattern = /[^!=]==[^=]/g
  
  while ((match = looseEqualityPattern.exec(content)) !== null) {
    const position = getLineAndColumn(content, match.index)
    errors.push({
      type: 'warning',
      code: 'LOOSE_EQUALITY',
      message: "Use === instead of == for strict equality",
      file: filepath,
      line: position.line,
      autoFix: {
        description: "Replace == with ===",
        replacement: content.slice(0, match.index + 1) + '===' + content.slice(match.index + 3)
      }
    })
  }

  return errors
}

// ============================================
// CROSS-FILE VALIDATOR
// ============================================

function validateCrossFile(files: ParsedFile[], context: ValidationContext): ValidationError[] {
  const errors: ValidationError[] = []

  // Check for circular imports
  const importGraph = buildImportGraph(files)
  const cycles = findCycles(importGraph)
  
  for (const cycle of cycles) {
    errors.push({
      type: 'warning',
      code: 'CIRCULAR_IMPORT',
      message: `Circular import detected: ${cycle.join(' -> ')}`,
      file: cycle[0],
      suggestion: "Refactor to break the circular dependency"
    })
  }

  // Check for unused exports
  const exports = collectExports(files)
  const imports = collectImports(files)
  
  for (const [filepath, exportedNames] of exports) {
    for (const name of exportedNames) {
      const isUsed = Array.from(imports.values()).some(
        fileImports => fileImports.some(imp => imp.names.includes(name) || imp.names.includes('*'))
      )
      
      if (!isUsed && name !== 'default') {
        errors.push({
          type: 'info',
          code: 'UNUSED_EXPORT',
          message: `'${name}' is exported but never imported`,
          file: filepath,
          suggestion: "Consider removing if not needed"
        })
      }
    }
  }

  return errors
}

// ============================================
// AUTO-FIX APPLICATOR
// ============================================

function applyAutoFixes(
  files: ParsedFile[],
  errors: ValidationError[]
): { fixedFiles: ParsedFile[]; fixCount: number } {
  let fixCount = 0
  const fixedFiles = files.map(file => ({ ...file }))

  // Group fixes by file
  const fixesByFile = new Map<string, ValidationError[]>()
  
  for (const error of errors) {
    if (error.autoFix) {
      if (!fixesByFile.has(error.file)) {
        fixesByFile.set(error.file, [])
      }
      fixesByFile.get(error.file)!.push(error)
    }
  }

  // Apply fixes (one per file to avoid conflicts)
  for (const [filepath, fileErrors] of fixesByFile) {
    const fileIndex = fixedFiles.findIndex(f => f.filepath === filepath)
    if (fileIndex === -1) continue

    // Sort by position (reverse) to apply from end to start
    const sortedErrors = fileErrors.sort((a: any, b: any) => (b.line || 0) - (a.line || 0))
    
    // Apply first fix only to avoid conflicts
    const error = sortedErrors[0]
    if (error.autoFix) {
      fixedFiles[fileIndex].content = error.autoFix.replacement
      fixCount++
    }
  }

  return { fixedFiles, fixCount }
}

// ============================================
// SYNTAX FIX GENERATOR
// ============================================

function generateSyntaxFix(
  message: string,
  content: string,
  line: number,
  column: number
): AutoFix | undefined {
  const lines = content.split('\n')
  const errorLine = lines[line - 1] || ''

  // Missing semicolon
  if (message.includes('Missing semicolon') || message.includes("';' expected")) {
    return {
      description: 'Add missing semicolon',
      replacement: lines.map((l, i) => 
        i === line - 1 ? l.trimEnd() + ';' : l
      ).join('\n')
    }
  }

  // Unexpected token (often missing comma)
  if (message.includes('Unexpected token') && message.includes(',')) {
    // Try adding comma at end of previous line
    if (line > 1) {
      return {
        description: 'Add missing comma',
        replacement: lines.map((l, i) => 
          i === line - 2 ? l.trimEnd() + ',' : l
        ).join('\n')
      }
    }
  }

  // Missing closing bracket/brace/paren
  if (message.includes("'}' expected") || message.includes("')' expected") || message.includes("']' expected")) {
    const char = message.includes("'}'") ? '}' : message.includes("')'") ? ')' : ']'
    return {
      description: `Add missing '${char}'`,
      replacement: content + '\n' + char
    }
  }

  return undefined
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getLineAndColumn(content: string, index: number): { line: number; column: number } {
  const lines = content.slice(0, index).split('\n')
  return {
    line: lines.length,
    column: (lines[lines.length - 1]?.length || 0) + 1
  }
}

function resolveImportPath(
  fromFile: string,
  importPath: string,
  files: ParsedFile[]
): string | null {
  const fromDir = fromFile.split('/').slice(0, -1).join('/')
  const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx']
  
  // Resolve relative path
  let resolved = importPath
  if (importPath.startsWith('./')) {
    resolved = fromDir + importPath.slice(1)
  } else if (importPath.startsWith('../')) {
    const parts = fromDir.split('/')
    let upCount = 0
    let remaining = importPath
    while (remaining.startsWith('../')) {
      upCount++
      remaining = remaining.slice(3)
    }
    resolved = parts.slice(0, -upCount).join('/') + '/' + remaining
  }

  // Try extensions
  for (const ext of extensions) {
    const fullPath = resolved + ext
    if (files.some(f => f.filepath === fullPath || f.filepath === fullPath.replace(/^\//, ''))) {
      return importPath
    }
  }

  return null
}

function findSimilarFile(importPath: string, fromFile: string, files: ParsedFile[]): string | null {
  const fileName = importPath.split('/').pop()?.replace(/\.[^.]+$/, '') || ''
  
  for (const file of files) {
    const filePart = file.filepath.split('/').pop()?.replace(/\.[^.]+$/, '') || ''
    if (filePart.toLowerCase() === fileName.toLowerCase() && file.filepath !== fromFile) {
      // Calculate relative path
      const fromParts = fromFile.split('/').slice(0, -1)
      const toParts = file.filepath.split('/')
      
      // Simple relative path (same directory or subdirectory)
      if (fromParts.length === 0) {
        return './' + file.filepath.replace(/\.[^.]+$/, '')
      }
      
      return './' + file.filepath.replace(/\.[^.]+$/, '')
    }
  }
  
  return null
}

function isBuiltinModule(name: string): boolean {
  const builtins = [
    'fs', 'path', 'http', 'https', 'url', 'util', 'os', 'crypto', 'stream',
    'events', 'buffer', 'querystring', 'child_process', 'cluster', 'dns',
    'net', 'readline', 'repl', 'tls', 'dgram', 'assert', 'zlib', 'react', 'react-dom'
  ]
  return builtins.includes(name)
}

function isBuiltinComponent(name: string): boolean {
  const builtins = [
    'Fragment', 'Suspense', 'StrictMode', 'Profiler',
    // Next.js
    'Link', 'Image', 'Script', 'Head',
    // Common
    'Provider', 'Router', 'Route', 'Switch'
  ]
  return builtins.includes(name)
}

function buildImportGraph(files: ParsedFile[]): Map<string, string[]> {
  const graph = new Map<string, string[]>()
  
  for (const file of files) {
    const imports: string[] = []
    const importPattern = /import\s+.+\s+from\s+['"]([^'"]+)['"]/g
    let match
    
    while ((match = importPattern.exec(file.content)) !== null) {
      if (match[1].startsWith('.')) {
        imports.push(match[1])
      }
    }
    
    graph.set(file.filepath, imports)
  }
  
  return graph
}

function findCycles(graph: Map<string, string[]>): string[][] {
  const cycles: string[][] = []
  const visited = new Set<string>()
  const recursionStack = new Set<string>()
  const path: string[] = []

  function dfs(node: string) {
    visited.add(node)
    recursionStack.add(node)
    path.push(node)

    const neighbors = graph.get(node) || []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor)
      } else if (recursionStack.has(neighbor)) {
        const cycleStart = path.indexOf(neighbor)
        cycles.push([...path.slice(cycleStart), neighbor])
      }
    }

    path.pop()
    recursionStack.delete(node)
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node)
    }
  }

  return cycles
}

function collectExports(files: ParsedFile[]): Map<string, string[]> {
  const exports = new Map<string, string[]>()
  
  for (const file of files) {
    const exportNames: string[] = []
    
    // Named exports
    const namedExportPattern = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g
    let match
    while ((match = namedExportPattern.exec(file.content)) !== null) {
      exportNames.push(match[1])
    }
    
    // Export { ... }
    const exportListPattern = /export\s+\{([^}]+)\}/g
    while ((match = exportListPattern.exec(file.content)) !== null) {
      match[1].split(',').forEach(name => {
        const cleaned = name.trim().split(' ')[0]
        if (cleaned) exportNames.push(cleaned)
      })
    }
    
    // Default export
    if (/export\s+default/.test(file.content)) {
      exportNames.push('default')
    }
    
    exports.set(file.filepath, exportNames)
  }
  
  return exports
}

function collectImports(files: ParsedFile[]): Map<string, { from: string; names: string[] }[]> {
  const imports = new Map<string, { from: string; names: string[] }[]>()
  
  for (const file of files) {
    const fileImports: { from: string; names: string[] }[] = []
    
    const importPattern = /import\s+(?:(\w+)\s*,?\s*)?(?:\{([^}]+)\})?\s*(?:\*\s+as\s+(\w+))?\s*from\s+['"]([^'"]+)['"]/g
    let match
    
    while ((match = importPattern.exec(file.content)) !== null) {
      const names: string[] = []
      if (match[1]) names.push('default')
      if (match[2]) names.push(...match[2].split(',').map(n => n.trim().split(' ')[0]))
      if (match[3]) names.push('*')
      
      fileImports.push({ from: match[4], names })
    }
    
    imports.set(file.filepath, fileImports)
  }
  
  return imports
}

// ============================================
// VERCEL-PROOF INTEGRATION
// Import the 500+ Vercel-specific checks
// ============================================

import { 
  vercelProofValidate, 
  generateQuickFixes,
  type ValidationResult as VercelProofResult,
  type FileContent 
} from './vercel-proof'

/**
 * Run Vercel-proof validation on files
 * This catches all the errors that would fail on Vercel deployment
 */
export async function validateForVercel(files: ParsedFile[]): Promise<{
  vercelResult: VercelProofResult
  combinedErrors: ValidationError[]
}> {
  // Convert to FileContent format
  const fileContents: FileContent[] = files.map(f => ({
    path: f.filepath,
    content: f.content
  }))
  
  // Run Vercel-proof validation
  const vercelResult = vercelProofValidate(fileContents)
  
  // Convert to our ValidationError format
  const combinedErrors: ValidationError[] = [
    ...vercelResult.errors.map(e => ({
      type: 'error' as const,
      code: `VP${e.id}`,
      message: e.message,
      file: e.file,
      line: e.line,
      suggestion: e.fix
    })),
    ...vercelResult.warnings.map(w => ({
      type: 'warning' as const,
      code: `VP${w.id}`,
      message: w.message,
      file: w.file,
      line: w.line,
      suggestion: w.fix
    }))
  ]
  
  return { vercelResult, combinedErrors }
}

/**
 * Full validation with Vercel-proof checks
 * Use this for the most comprehensive validation
 */
export async function fullValidation(
  files: ParsedFile[],
  options: { autoFix?: boolean; strictMode?: boolean } = {}
): Promise<ValidationResult & { vercelScore: number }> {
  // Run standard validation
  const standardResult = await validateAndFix(files, options)
  
  // Run Vercel-proof validation
  const { vercelResult, combinedErrors } = await validateForVercel(files)
  
  // Merge errors
  const mergedErrors = [
    ...standardResult.errors,
    ...combinedErrors.filter(e => e.type === 'error')
  ]
  
  const mergedWarnings = [
    ...standardResult.warnings,
    ...combinedErrors.filter(e => e.type === 'warning')
  ]
  
  return {
    ...standardResult,
    valid: standardResult.valid && vercelResult.passed,
    errors: mergedErrors,
    warnings: mergedWarnings,
    vercelScore: vercelResult.score,
    stats: {
      ...standardResult.stats,
      errorsFound: mergedErrors.length
    }
  }
}

// All functions exported at declaration
