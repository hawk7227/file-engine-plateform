// =====================================================
// FILE ENGINE - SEMANTIC ANALYSIS
// Deep code understanding, logic bug detection, data flow
// Goes beyond syntax to understand code intent and behavior
// =====================================================

// =====================================================
// TYPES
// =====================================================

export interface SemanticAnalysisResult {
  summary: string
  complexity: ComplexityMetrics
  dataFlow: DataFlowAnalysis
  dependencies: DependencyAnalysis
  potentialBugs: PotentialBug[]
  codeSmells: CodeSmell[]
  suggestions: Suggestion[]
  security: SecurityAnalysis
}

export interface ComplexityMetrics {
  cyclomaticComplexity: number
  cognitiveComplexity: number
  linesOfCode: number
  maintainabilityIndex: number
}

export interface DataFlowAnalysis {
  variables: VariableFlow[]
  stateChanges: StateChange[]
  sideEffects: SideEffect[]
  pureComponents: string[]
  impureComponents: string[]
}

export interface VariableFlow {
  name: string
  type: string
  definedAt: { file: string; line: number }
  usedAt: { file: string; line: number }[]
  isUnused: boolean
  scope: 'global' | 'module' | 'function' | 'block'
}

export interface StateChange {
  component: string
  stateName: string
  setterName: string
  changedAt: { file: string; line: number }[]
}

export interface SideEffect {
  type: 'api-call' | 'dom-mutation' | 'storage' | 'console' | 'timer' | 'event-listener'
  location: { file: string; line: number }
  description: string
  cleanup?: boolean
}

export interface DependencyAnalysis {
  imports: ImportInfo[]
  exports: ExportInfo[]
  circular: CircularDependency[]
  unused: string[]
  missing: string[]
}

export interface ImportInfo {
  source: string
  specifiers: string[]
  isDefault: boolean
  usedIn: string[]
}

export interface ExportInfo {
  name: string
  type: 'function' | 'class' | 'variable' | 'type' | 'default'
  usedBy: string[]
}

export interface CircularDependency {
  path: string[]
  severity: 'warning' | 'error'
}

export interface PotentialBug {
  type: BugType
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  location: { file: string; line: number; column?: number }
  explanation: string
  suggestion: string
  code?: string
}

export type BugType =
  | 'null-reference'
  | 'race-condition'
  | 'memory-leak'
  | 'infinite-loop'
  | 'dead-code'
  | 'unreachable-code'
  | 'type-coercion'
  | 'async-await-missing'
  | 'state-mutation'
  | 'missing-dependency'
  | 'stale-closure'
  | 'off-by-one'
  | 'logic-error'

export interface CodeSmell {
  type: SmellType
  severity: 'info' | 'warning'
  message: string
  location: { file: string; line: number }
  suggestion: string
}

export type SmellType =
  | 'long-function'
  | 'deep-nesting'
  | 'duplicate-code'
  | 'magic-number'
  | 'god-class'

export interface Suggestion {
  type: 'refactor' | 'performance' | 'readability' | 'best-practice'
  priority: 'low' | 'medium' | 'high'
  message: string
  location?: { file: string; line: number }
  before?: string
  after?: string
}

export interface SecurityAnalysis {
  vulnerabilities: SecurityVulnerability[]
  sensitiveData: SensitiveDataExposure[]
  score: number
}

export interface SecurityVulnerability {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  location: { file: string; line: number }
  fix?: string
}

export interface SensitiveDataExposure {
  type: 'api-key' | 'password' | 'token' | 'secret'
  location: { file: string; line: number }
  message: string
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function isCodeFile(path: string): boolean {
  return /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(path)
}

function getLineNumber(content: string, index: number): number {
  return content.substring(0, index).split('\n').length
}

// =====================================================
// SEMANTIC ANALYZER CLASS
// =====================================================

export class SemanticAnalyzer {
  private files: Map<string, string> = new Map()

  loadFiles(files: { path: string; content: string }[]): void {
    this.files.clear()
    for (const file of files) {
      this.files.set(file.path, file.content)
    }
  }

  async analyze(): Promise<SemanticAnalysisResult> {
    const [complexity, dataFlow, dependencies, bugs, smells, security] = await Promise.all([
      this.analyzeComplexity(),
      this.analyzeDataFlow(),
      this.analyzeDependencies(),
      this.detectPotentialBugs(),
      this.detectCodeSmells(),
      this.analyzeSecurity()
    ])

    const suggestions = this.generateSuggestions(bugs, smells, complexity)

    return {
      summary: this.generateSummary(complexity, bugs, smells),
      complexity,
      dataFlow,
      dependencies,
      potentialBugs: bugs,
      codeSmells: smells,
      suggestions,
      security
    }
  }

  private async analyzeComplexity(): Promise<ComplexityMetrics> {
    let totalCyclomatic = 0
    let totalCognitive = 0
    let totalLines = 0

    for (const [path, content] of this.files) {
      if (!isCodeFile(path)) continue

      const lines = content.split('\n')
      totalLines += lines.length

      // Count decision points
      const decisionPoints = (content.match(/\b(if|else|for|while|switch|case|catch|&&|\|\||\?)/g) || []).length
      totalCyclomatic += decisionPoints + 1

      // Count nesting
      let nestingLevel = 0
      let maxNesting = 0
      for (const line of lines) {
        nestingLevel += (line.match(/{/g) || []).length
        nestingLevel -= (line.match(/}/g) || []).length
        maxNesting = Math.max(maxNesting, nestingLevel)
      }
      totalCognitive += maxNesting
    }

    const fileCount = Math.max(1, this.files.size)
    const avgCyclomatic = totalCyclomatic / fileCount

    return {
      cyclomaticComplexity: Math.round(avgCyclomatic * 10) / 10,
      cognitiveComplexity: totalCognitive,
      linesOfCode: totalLines,
      maintainabilityIndex: Math.max(0, Math.min(100, 171 - 5.2 * Math.log(totalLines) - 0.23 * avgCyclomatic))
    }
  }

  private async analyzeDataFlow(): Promise<DataFlowAnalysis> {
    const variables: VariableFlow[] = []
    const stateChanges: StateChange[] = []
    const sideEffects: SideEffect[] = []
    const pureComponents: string[] = []
    const impureComponents: string[] = []

    for (const [path, content] of this.files) {
      if (!isCodeFile(path)) continue

      // Find variable declarations
      const varMatches = content.matchAll(/(?:const|let|var)\s+(\w+)\s*(?::\s*[\w<>[\]|]+)?\s*=/g)
      for (const match of varMatches) {
        const varName = match[1]
        const restOfContent = content.slice(match.index! + match[0].length)
        const usageCount = (restOfContent.match(new RegExp(`\\b${varName}\\b`, 'g')) || []).length

        variables.push({
          name: varName,
          type: 'inferred',
          definedAt: { file: path, line: getLineNumber(content, match.index!) },
          usedAt: [],
          isUnused: usageCount === 0,
          scope: 'module'
        })
      }

      // Find React state
      const stateMatches = content.matchAll(/const\s+\[(\w+),\s*(\w+)\]\s*=\s*useState/g)
      for (const match of stateMatches) {
        stateChanges.push({
          component: path,
          stateName: match[1],
          setterName: match[2],
          changedAt: []
        })
      }

      // Find side effects
      const effectPatterns: { pattern: RegExp; type: SideEffect['type'] }[] = [
        { pattern: /fetch\s*\(/g, type: 'api-call' },
        { pattern: /document\.\w+/g, type: 'dom-mutation' },
        { pattern: /localStorage|sessionStorage/g, type: 'storage' },
        { pattern: /console\.\w+/g, type: 'console' },
        { pattern: /setTimeout|setInterval/g, type: 'timer' },
        { pattern: /addEventListener/g, type: 'event-listener' }
      ]

      let hasSideEffects = false
      for (const { pattern, type } of effectPatterns) {
        const matches = content.matchAll(pattern)
        for (const match of matches) {
          hasSideEffects = true
          sideEffects.push({
            type,
            location: { file: path, line: getLineNumber(content, match.index!) },
            description: match[0],
            cleanup: type === 'timer' || type === 'event-listener'
          })
        }
      }

      if (content.includes('function') || content.includes('=>')) {
        if (hasSideEffects) {
          impureComponents.push(path)
        } else {
          pureComponents.push(path)
        }
      }
    }

    return { variables, stateChanges, sideEffects, pureComponents, impureComponents }
  }

  private async analyzeDependencies(): Promise<DependencyAnalysis> {
    const imports: ImportInfo[] = []
    const exports: ExportInfo[] = []
    const importGraph: Map<string, Set<string>> = new Map()

    for (const [path, content] of this.files) {
      if (!isCodeFile(path)) continue

      // Find imports
      const importMatches = content.matchAll(/import\s+(?:(\w+)|{([^}]+)}|(\w+)\s*,\s*{([^}]+)})\s+from\s+['"]([^'"]+)['"]/g)
      for (const match of importMatches) {
        const defaultImport = match[1] || match[3]
        const namedImports = (match[2] || match[4])?.split(',').map((s: string) => s.trim().split(' as ')[0].trim()).filter(Boolean) || []
        const source = match[5]

        imports.push({
          source,
          specifiers: defaultImport ? [defaultImport, ...namedImports] : namedImports,
          isDefault: !!defaultImport,
          usedIn: [path]
        })

        if (!importGraph.has(path)) {
          importGraph.set(path, new Set())
        }
        importGraph.get(path)!.add(source)
      }

      // Find exports
      const exportMatches = content.matchAll(/export\s+(?:(default)\s+)?(?:(function|class|const|let|var|type|interface)\s+)?(\w+)/g)
      for (const match of exportMatches) {
        exports.push({
          name: match[3],
          type: match[1] ? 'default' : (match[2] as ExportInfo['type'] || 'variable'),
          usedBy: []
        })
      }
    }

    // Detect circular dependencies
    const circular: CircularDependency[] = []
    for (const [startFile] of importGraph) {
      const visited = new Set<string>()
      const stack: string[] = []

      const dfs = (file: string): void => {
        if (stack.includes(file)) {
          const cycleStart = stack.indexOf(file)
          circular.push({
            path: [...stack.slice(cycleStart), file],
            severity: 'warning'
          })
          return
        }
        if (visited.has(file)) return

        visited.add(file)
        stack.push(file)

        const deps = importGraph.get(file)
        if (deps) {
          for (const dep of deps) {
            dfs(dep)
          }
        }

        stack.pop()
      }

      dfs(startFile)
    }

    // Find unused imports
    const unused: string[] = []
    for (const imp of imports) {
      for (const spec of imp.specifiers) {
        const file = imp.usedIn[0]
        const content = this.files.get(file) || ''
        const usageCount = (content.match(new RegExp(`\\b${spec}\\b`, 'g')) || []).length
        if (usageCount <= 1) {
          unused.push(`${spec} from ${imp.source}`)
        }
      }
    }

    return { imports, exports, circular, unused, missing: [] }
  }

  private async detectPotentialBugs(): Promise<PotentialBug[]> {
    const bugs: PotentialBug[] = []

    for (const [path, content] of this.files) {
      if (!isCodeFile(path)) continue

      // Null reference potential
      const optionalChainCandidates = content.matchAll(/(\w+)\.(\w+)(?!\?)/g)
      for (const match of optionalChainCandidates) {
        const varName = match[1]
        if (content.includes(`${varName} = null`) ||
          content.includes(`${varName} = undefined`) ||
          content.includes(`${varName}?`) ||
          content.includes(`| null`) ||
          content.includes(`| undefined`)) {
          bugs.push({
            type: 'null-reference',
            severity: 'medium',
            message: `Potential null reference: ${varName}.${match[2]}`,
            location: { file: path, line: getLineNumber(content, match.index!) },
            explanation: `'${varName}' may be null/undefined when accessed`,
            suggestion: `Use optional chaining: ${varName}?.${match[2]}`
          })
        }
      }

      // Missing await
      const asyncCalls = content.matchAll(/(?<!await\s)(fetch|axios\.\w+|supabase\.from)\s*\(/g)
      for (const match of asyncCalls) {
        const lineNum = getLineNumber(content, match.index!)
        const lines = content.split('\n')
        const line = lines[lineNum - 1] || ''

        if (!line.includes('await') && !line.includes('.then(')) {
          bugs.push({
            type: 'async-await-missing',
            severity: 'high',
            message: `Async call without await: ${match[1]}`,
            location: { file: path, line: lineNum },
            explanation: 'Async operations need await to handle results',
            suggestion: `Add await before ${match[1]}`
          })
        }
      }

      // Stale closure in useEffect
      const effectMatches = content.matchAll(/useEffect\s*\(\s*(?:async\s*)?\(\)\s*=>\s*{[\s\S]*?}\s*,\s*\[\s*\]/g)
      for (const match of effectMatches) {
        const effectBody = match[0]
        // Find variables used in effect that aren't in deps
        const varsUsed = effectBody.match(/\b(props|state|\w+State|\w+Value)\b/g) || []
        if (varsUsed.length > 0) {
          bugs.push({
            type: 'stale-closure',
            severity: 'medium',
            message: `useEffect with empty deps may have stale values`,
            location: { file: path, line: getLineNumber(content, match.index!) },
            explanation: 'Variables used in useEffect should be in dependency array',
            suggestion: `Add dependencies: [${[...new Set(varsUsed)].join(', ')}]`
          })
        }
      }

      // Memory leak - missing cleanup
      const timerMatches = content.matchAll(/(setInterval|setTimeout)\s*\(/g)
      for (const match of timerMatches) {
        const lineNum = getLineNumber(content, match.index!)
        const surroundingCode = content.substring(Math.max(0, match.index! - 500), match.index! + 500)

        if (surroundingCode.includes('useEffect') && !surroundingCode.includes('clearInterval') && !surroundingCode.includes('clearTimeout')) {
          bugs.push({
            type: 'memory-leak',
            severity: 'high',
            message: `${match[1]} without cleanup in useEffect`,
            location: { file: path, line: lineNum },
            explanation: 'Timers should be cleared in useEffect cleanup',
            suggestion: `Return cleanup: return () => clear${match[1] === 'setInterval' ? 'Interval' : 'Timeout'}(id)`
          })
        }
      }

      // Infinite loop potential
      const loopMatches = content.matchAll(/while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)/g)
      for (const match of loopMatches) {
        bugs.push({
          type: 'infinite-loop',
          severity: 'critical',
          message: 'Potential infinite loop detected',
          location: { file: path, line: getLineNumber(content, match.index!) },
          explanation: 'This loop has no exit condition',
          suggestion: 'Add a break condition or use a bounded loop'
        })
      }

      // State mutation
      const mutationMatches = content.matchAll(/(\w+)\.push\(|(\w+)\.pop\(|(\w+)\.shift\(|(\w+)\.splice\(/g)
      for (const match of mutationMatches) {
        const varName = match[1] || match[2] || match[3] || match[4]
        if (content.includes(`const [${varName}`) || content.includes(`useState`)) {
          bugs.push({
            type: 'state-mutation',
            severity: 'high',
            message: `Direct state mutation: ${varName}`,
            location: { file: path, line: getLineNumber(content, match.index!) },
            explanation: 'React state should not be mutated directly',
            suggestion: `Use spread: set${varName.charAt(0).toUpperCase() + varName.slice(1)}([...${varName}, newItem])`
          })
        }
      }
    }

    return bugs
  }

  private async detectCodeSmells(): Promise<CodeSmell[]> {
    const smells: CodeSmell[] = []

    for (const [path, content] of this.files) {
      if (!isCodeFile(path)) continue

      const lines = content.split('\n')

      // Long function (>50 lines)
      const funcMatches = content.matchAll(/(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)\s*{/g)
      for (const match of funcMatches) {
        const startLine = getLineNumber(content, match.index!)
        let braceCount = 1
        let endLine = startLine

        for (let i = startLine; i < lines.length && braceCount > 0; i++) {
          braceCount += (lines[i].match(/{/g) || []).length
          braceCount -= (lines[i].match(/}/g) || []).length
          endLine = i + 1
        }

        const funcLength = endLine - startLine
        if (funcLength > 50) {
          smells.push({
            type: 'long-function',
            severity: 'warning',
            message: `Function is ${funcLength} lines (recommended: <50)`,
            location: { file: path, line: startLine },
            suggestion: 'Consider breaking into smaller functions'
          })
        }
      }

      // Deep nesting (>4 levels)
      let maxNesting = 0
      let currentNesting = 0
      let maxNestingLine = 0

      for (let i = 0; i < lines.length; i++) {
        currentNesting += (lines[i].match(/{/g) || []).length
        currentNesting -= (lines[i].match(/}/g) || []).length
        if (currentNesting > maxNesting) {
          maxNesting = currentNesting
          maxNestingLine = i + 1
        }
      }

      if (maxNesting > 4) {
        smells.push({
          type: 'deep-nesting',
          severity: 'warning',
          message: `Deep nesting detected (${maxNesting} levels)`,
          location: { file: path, line: maxNestingLine },
          suggestion: 'Consider early returns or extracting logic'
        })
      }

      // Magic numbers
      const magicNumbers = content.matchAll(/(?<![.\w])(\d{2,})(?![.\d\w])/g)
      for (const match of magicNumbers) {
        const num = parseInt(match[1])
        if (num > 1 && num !== 10 && num !== 100 && num !== 1000) {
          smells.push({
            type: 'magic-number',
            severity: 'info',
            message: `Magic number: ${num}`,
            location: { file: path, line: getLineNumber(content, match.index!) },
            suggestion: `Extract to named constant: const MEANINGFUL_NAME = ${num}`
          })
        }
      }
    }

    return smells
  }

  private async analyzeSecurity(): Promise<SecurityAnalysis> {
    const vulnerabilities: SecurityVulnerability[] = []
    const sensitiveData: SensitiveDataExposure[] = []

    for (const [path, content] of this.files) {
      // API keys / secrets
      const secretPatterns = [
        { pattern: /['"]sk[-_][\w]{20,}['"]/g, type: 'api-key' as const, name: 'Stripe secret key' },
        { pattern: /['"]pk[-_][\w]{20,}['"]/g, type: 'api-key' as const, name: 'Stripe public key' },
        { pattern: /['"]ghp_[\w]{36}['"]/g, type: 'token' as const, name: 'GitHub token' },
        { pattern: /['"]xox[baprs]-[\w-]{10,}['"]/g, type: 'token' as const, name: 'Slack token' },
        { pattern: /password\s*[:=]\s*['"][^'"]+['"]/gi, type: 'password' as const, name: 'Hardcoded password' },
        { pattern: /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi, type: 'api-key' as const, name: 'API key' },
        { pattern: /secret\s*[:=]\s*['"][^'"]+['"]/gi, type: 'secret' as const, name: 'Secret value' }
      ]

      for (const { pattern, type, name } of secretPatterns) {
        const matches = content.matchAll(pattern)
        for (const match of matches) {
          sensitiveData.push({
            type,
            location: { file: path, line: getLineNumber(content, match.index!) },
            message: `${name} found in code`
          })
        }
      }

      // XSS vulnerability
      const xssPatterns = content.matchAll(/dangerouslySetInnerHTML\s*=\s*{/g)
      for (const match of xssPatterns) {
        vulnerabilities.push({
          type: 'XSS',
          severity: 'high',
          message: 'dangerouslySetInnerHTML usage detected',
          location: { file: path, line: getLineNumber(content, match.index!) },
          fix: 'Sanitize HTML content or use safe alternatives'
        })
      }

      // SQL injection potential
      const sqlPatterns = content.matchAll(/`[^`]*\$\{[^}]+\}[^`]*(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)/gi)
      for (const match of sqlPatterns) {
        vulnerabilities.push({
          type: 'SQL Injection',
          severity: 'critical',
          message: 'Potential SQL injection with template literal',
          location: { file: path, line: getLineNumber(content, match.index!) },
          fix: 'Use parameterized queries'
        })
      }

      // eval usage
      const evalMatches = content.matchAll(/\beval\s*\(/g)
      for (const match of evalMatches) {
        vulnerabilities.push({
          type: 'Code Injection',
          severity: 'critical',
          message: 'eval() usage detected',
          location: { file: path, line: getLineNumber(content, match.index!) },
          fix: 'Avoid eval() - use safer alternatives'
        })
      }
    }

    // Calculate security score
    let score = 100
    for (const vuln of vulnerabilities) {
      if (vuln.severity === 'critical') score -= 25
      else if (vuln.severity === 'high') score -= 15
      else if (vuln.severity === 'medium') score -= 10
      else score -= 5
    }
    score -= sensitiveData.length * 10

    return {
      vulnerabilities,
      sensitiveData,
      score: Math.max(0, score)
    }
  }

  private generateSuggestions(
    bugs: PotentialBug[],
    smells: CodeSmell[],
    complexity: ComplexityMetrics
  ): Suggestion[] {
    const suggestions: Suggestion[] = []

    // Based on bugs
    if (bugs.filter(b => b.type === 'async-await-missing').length > 2) {
      suggestions.push({
        type: 'best-practice',
        priority: 'high',
        message: 'Multiple async calls without await - consider using Promise.all'
      })
    }

    if (bugs.filter(b => b.type === 'null-reference').length > 3) {
      suggestions.push({
        type: 'best-practice',
        priority: 'medium',
        message: 'Enable TypeScript strict null checks to catch null references'
      })
    }

    // Based on complexity
    if (complexity.cyclomaticComplexity > 10) {
      suggestions.push({
        type: 'refactor',
        priority: 'high',
        message: 'High cyclomatic complexity - break down complex functions'
      })
    }

    if (complexity.maintainabilityIndex < 50) {
      suggestions.push({
        type: 'refactor',
        priority: 'high',
        message: 'Low maintainability index - consider refactoring'
      })
    }

    // Based on smells
    if (smells.filter(s => s.type === 'long-function').length > 2) {
      suggestions.push({
        type: 'refactor',
        priority: 'medium',
        message: 'Multiple long functions - extract reusable logic'
      })
    }

    return suggestions
  }

  private generateSummary(
    complexity: ComplexityMetrics,
    bugs: PotentialBug[],
    smells: CodeSmell[]
  ): string {
    const criticalBugs = bugs.filter(b => b.severity === 'critical' || b.severity === 'high').length
    const warnings = bugs.filter(b => b.severity === 'medium' || b.severity === 'low').length

    let status = 'Good'
    if (criticalBugs > 0) status = 'Needs Attention'
    if (criticalBugs > 3) status = 'Critical Issues'

    return `Code Analysis: ${status}. Found ${bugs.length} potential issues (${criticalBugs} critical/high, ${warnings} medium/low), ${smells.length} code smells. Complexity: ${complexity.cyclomaticComplexity.toFixed(1)} cyclomatic, ${complexity.linesOfCode} LOC, maintainability index: ${complexity.maintainabilityIndex.toFixed(0)}/100.`
  }
}

// =====================================================
// EXPORTS
// =====================================================

export function createSemanticAnalyzer(): SemanticAnalyzer {
  return new SemanticAnalyzer()
}

export async function analyzeCode(
  files: { path: string; content: string }[]
): Promise<SemanticAnalysisResult> {
  const analyzer = new SemanticAnalyzer()
  analyzer.loadFiles(files)
  return analyzer.analyze()
}
