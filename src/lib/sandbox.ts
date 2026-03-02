// =====================================================
// FILE ENGINE - SANDBOX EXECUTION
// Run code in isolated environment, capture real errors
// Supports: npm install, build, test, dev server
// =====================================================

export interface SandboxResult {
  success: boolean
  output: string
  errors: SandboxError[]
  warnings: string[]
  executionTime: number
  exitCode: number
}

export interface SandboxError {
  type: 'syntax' | 'runtime' | 'type' | 'import' | 'build' | 'test' | 'lint'
  message: string
  file?: string
  line?: number
  column?: number
  stack?: string
  suggestion?: string
  code?: string
}

export interface SandboxOptions {
  timeout?: number
  installDeps?: boolean
  runBuild?: boolean
  runTests?: boolean
  runLint?: boolean
  runTypeCheck?: boolean
  startDevServer?: boolean
  customCommand?: string
  env?: Record<string, string>
}

// Parse errors from various output formats
function parseErrors(output: string, source: string): SandboxError[] {
  const errors: SandboxError[] = []
  
  // TypeScript errors: src/file.tsx(10,5): error TS2304: Cannot find name 'x'
  const tsRegex = /([^\s(]+)\((\d+),(\d+)\):\s*(error|warning)\s+(TS\d+):\s*(.+)/g
  let match
  while ((match = tsRegex.exec(output)) !== null) {
    errors.push({
      type: 'type',
      file: match[1],
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      code: match[5],
      message: match[6],
      suggestion: getTypescriptSuggestion(match[5], match[6])
    })
  }
  
  // ESLint errors: /path/file.tsx:10:5 - error rule-name: message
  const eslintRegex = /([^\s:]+):(\d+):(\d+)\s*-\s*(error|warning)\s+([^\s:]+):\s*(.+)/g
  while ((match = eslintRegex.exec(output)) !== null) {
    errors.push({
      type: 'lint',
      file: match[1],
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      code: match[5],
      message: match[6]
    })
  }
  
  // Next.js/Webpack: Module not found: Can't resolve 'package'
  const moduleRegex = /Module not found:\s*(?:Error:\s*)?Can't resolve '([^']+)'(?:\s+in\s+'([^']+)')?/g
  while ((match = moduleRegex.exec(output)) !== null) {
    errors.push({
      type: 'import',
      message: `Cannot find module '${match[1]}'`,
      file: match[2],
      suggestion: `Install with: npm install ${match[1]}`
    })
  }
  
  // Syntax errors: SyntaxError: Unexpected token
  const syntaxRegex = /SyntaxError:\s*(.+?)(?:\n|$)(?:[\s\S]*?at\s+([^\s(]+)(?:\s*\(([^:]+):(\d+):(\d+)\))?)?/g
  while ((match = syntaxRegex.exec(output)) !== null) {
    errors.push({
      type: 'syntax',
      message: match[1],
      file: match[3] || match[2],
      line: match[4] ? parseInt(match[4]) : undefined,
      column: match[5] ? parseInt(match[5]) : undefined
    })
  }
  
  // Runtime errors: TypeError, ReferenceError, etc.
  const runtimeRegex = /(TypeError|ReferenceError|RangeError|Error):\s*(.+?)(?:\n|$)(?:[\s\S]*?at\s+(?:[^\s(]+)\s*\(([^:]+):(\d+):(\d+)\))?/g
  while ((match = runtimeRegex.exec(output)) !== null) {
    errors.push({
      type: 'runtime',
      message: `${match[1]}: ${match[2]}`,
      file: match[3],
      line: match[4] ? parseInt(match[4]) : undefined,
      column: match[5] ? parseInt(match[5]) : undefined
    })
  }
  
  // Jest test failures
  const jestRegex = /FAIL\s+([^\n]+)\n[\s\S]*?●\s+([^\n]+)\n\n\s*(.+?)(?:\n\n|$)/g
  while ((match = jestRegex.exec(output)) !== null) {
    errors.push({
      type: 'test',
      file: match[1].trim(),
      message: `Test "${match[2]}" failed: ${match[3]}`
    })
  }
  
  // Build failed generic
  if (errors.length === 0 && /(?:build|compile|error)/i.test(output)) {
    const lines = output.split('\n').filter(l => /error/i.test(l))
    for (const line of lines.slice(0, 5)) {
      if (line.trim().length > 10) {
        errors.push({ type: 'build', message: line.trim() })
      }
    }
  }
  
  return errors
}

// Get helpful suggestions for common TypeScript errors
function getTypescriptSuggestion(code: string, message: string): string | undefined {
  const suggestions: Record<string, string> = {
    'TS2304': 'Import the missing type or declare it',
    'TS2307': 'Install the package or check the import path',
    'TS2339': 'Check if the property exists on the type',
    'TS2345': 'Check the argument types match the function signature',
    'TS2322': 'Ensure the assigned value matches the expected type',
    'TS7006': 'Add a type annotation to the parameter',
    'TS2532': 'Add null check or use optional chaining (?.) ',
    'TS2531': 'Object is possibly null - add null check',
    'TS1005': 'Check for missing punctuation (bracket, semicolon)',
    'TS1128': 'Check for missing closing brace or declaration'
  }
  return suggestions[code]
}

// Parse warnings
function parseWarnings(output: string): string[] {
  const warnings: string[] = []
  const warnRegex = /(?:warn(?:ing)?|WARN)[\s:]+(.+?)(?:\n|$)/gi
  let match
  while ((match = warnRegex.exec(output)) !== null) {
    const msg = match[1].trim()
    if (msg.length > 5 && !warnings.includes(msg)) {
      warnings.push(msg)
    }
  }
  return warnings.slice(0, 10)
}

// =====================================================
// SANDBOX EXECUTOR CLASS
// =====================================================

export class SandboxExecutor {
  private projectId: string
  private files: Map<string, string> = new Map()
  
  constructor(projectId: string) {
    this.projectId = projectId
  }
  
  // Load files into sandbox
  async loadFiles(files: { path: string; content: string }[]): Promise<void> {
    this.files.clear()
    for (const file of files) {
      this.files.set(file.path, file.content)
    }
    console.log(`[Sandbox] Loaded ${files.length} files`)
  }
  
  // Run full verification pipeline
  async runFullVerification(options: SandboxOptions = {}): Promise<SandboxResult> {
    const startTime = Date.now()
    const allErrors: SandboxError[] = []
    const allWarnings: string[] = []
    let output = ''
    
    try {
      // 1. Install dependencies
      if (options.installDeps !== false) {
        const installResult = await this.execute('npm install')
        output += installResult.output + '\n'
        if (!installResult.success) {
          allErrors.push(...installResult.errors)
        }
        allWarnings.push(...installResult.warnings)
      }
      
      // 2. Type check
      if (options.runTypeCheck !== false) {
        const typeResult = await this.execute('npx tsc --noEmit')
        output += typeResult.output + '\n'
        allErrors.push(...typeResult.errors)
        allWarnings.push(...typeResult.warnings)
      }
      
      // 3. Lint
      if (options.runLint) {
        const lintResult = await this.execute('npm run lint')
        output += lintResult.output + '\n'
        allErrors.push(...lintResult.errors.filter(e => e.type !== 'lint' || !e.message.includes('warning')))
        allWarnings.push(...lintResult.warnings)
      }
      
      // 4. Build
      if (options.runBuild !== false) {
        const buildResult = await this.execute('npm run build')
        output += buildResult.output + '\n'
        if (!buildResult.success) {
          allErrors.push(...buildResult.errors)
        }
        allWarnings.push(...buildResult.warnings)
      }
      
      // 5. Tests
      if (options.runTests) {
        const testResult = await this.execute('npm test -- --passWithNoTests')
        output += testResult.output + '\n'
        allErrors.push(...testResult.errors)
        allWarnings.push(...testResult.warnings)
      }
      
      // 6. Dev server check
      if (options.startDevServer) {
        const devResult = await this.execute('timeout 10 npm run dev || true')
        output += devResult.output + '\n'
        if (devResult.output.includes('ready') || devResult.output.includes('started')) {
          console.log('[Sandbox] Dev server started successfully')
        } else {
          allErrors.push(...devResult.errors)
        }
      }
      
      return {
        success: allErrors.length === 0,
        output,
        errors: allErrors,
        warnings: [...new Set(allWarnings)],
        executionTime: Date.now() - startTime,
        exitCode: allErrors.length === 0 ? 0 : 1
      }
    } catch (err: unknown) {
      return {
        success: false,
        output,
        errors: [{ type: 'runtime', message: (err instanceof Error ? err.message : String(err)) }],
        warnings: allWarnings,
        executionTime: Date.now() - startTime,
        exitCode: 1
      }
    }
  }
  
  // Execute single command
  async execute(command: string, timeout: number = 60000): Promise<SandboxResult> {
    const startTime = Date.now()
    
    try {
      const response = await fetch('/api/sandbox/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: this.projectId,
          command,
          timeout,
          files: Array.from(this.files.entries()).map(([path, content]) => ({ path, content }))
        })
      })
      
      if (!response.ok) {
        throw new Error(`Sandbox execution failed: ${response.status}`)
      }
      
      const result = await response.json()
      
      return {
        success: result.exitCode === 0,
        output: result.output || '',
        errors: parseErrors(result.output || '', command),
        warnings: parseWarnings(result.output || ''),
        executionTime: Date.now() - startTime,
        exitCode: result.exitCode || 0
      }
    } catch (err: unknown) {
      return {
        success: false,
        output: (err instanceof Error ? err.message : String(err)),
        errors: [{ type: 'runtime', message: (err instanceof Error ? err.message : String(err)) }],
        warnings: [],
        executionTime: Date.now() - startTime,
        exitCode: 1
      }
    }
  }
}

// =====================================================
// AUTO-FIX WITH VERIFICATION LOOP
// Run → Error → Fix → Verify → Repeat until success
// =====================================================

export interface AutoFixResult {
  success: boolean
  iterations: number
  maxIterations: number
  finalErrors: SandboxError[]
  fixHistory: {
    iteration: number
    errors: SandboxError[]
    fixes: string[]
  }[]
  finalFiles: { path: string; content: string }[]
}

export async function autoFixWithVerification(
  projectId: string,
  files: { path: string; content: string }[],
  maxIterations: number = 5,
  onProgress?: (message: string, iteration: number) => void
): Promise<AutoFixResult> {
  const sandbox = new SandboxExecutor(projectId)
  const fixHistory: AutoFixResult['fixHistory'] = []
  let currentFiles = [...files]
  
  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    onProgress?.(`Iteration ${iteration}: Running verification...`, iteration)
    
    // Load files and run verification
    await sandbox.loadFiles(currentFiles)
    const result = await sandbox.runFullVerification()
    
    if (result.success) {
      onProgress?.(`All checks passed on iteration ${iteration}`, iteration)
      return {
        success: true,
        iterations: iteration,
        maxIterations,
        finalErrors: [],
        fixHistory,
        finalFiles: currentFiles
      }
    }
    
    // Record errors
    fixHistory.push({
      iteration,
      errors: result.errors,
      fixes: []
    })
    
    onProgress?.(`Found ${result.errors.length} errors, attempting to fix...`, iteration)
    
    // Send errors to AI for fixing
    const fixResponse = await fetch('/api/ai/fix-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: currentFiles,
        errors: result.errors,
        iteration
      })
    })
    
    if (!fixResponse.ok) {
      onProgress?.(`Failed to get fixes from AI`, iteration)
      continue
    }
    
    const { fixedFiles, fixes } = await fixResponse.json()
    fixHistory[fixHistory.length - 1].fixes = fixes
    
    if (!fixedFiles || fixedFiles.length === 0) {
      onProgress?.(`AI could not fix the errors`, iteration)
      break
    }
    
    currentFiles = fixedFiles
    onProgress?.(`Applied ${fixes.length} fixes, re-verifying...`, iteration)
  }
  
  // Final verification after all iterations
  await sandbox.loadFiles(currentFiles)
  const finalResult = await sandbox.runFullVerification()
  
  return {
    success: finalResult.success,
    iterations: maxIterations,
    maxIterations,
    finalErrors: finalResult.errors,
    fixHistory,
    finalFiles: currentFiles
  }
}

// Export singleton for easy use
export function createSandbox(projectId: string): SandboxExecutor {
  return new SandboxExecutor(projectId)
}
