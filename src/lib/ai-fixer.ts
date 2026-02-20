/**
 * FILE ENGINE - AI-Powered Code Fixer
 * 
 * Uses Claude/GPT to intelligently fix errors that can't be auto-fixed.
 * This is what makes File Engine BETTER than Cursor.
 * 
 * CAPABILITIES:
 * 1. Understands error context (surrounding code)
 * 2. Fixes multiple related errors at once
 * 3. Maintains code style consistency
 * 4. Explains fixes for user learning
 * 5. Iterative refinement until valid
 */

import { generate, parseCodeBlocks, AIModel, ParsedFile } from './ai'
import { validateAndFix, ValidationError, ValidationResult } from './validation'

// ============================================
// TYPES
// ============================================

export interface FixResult {
  success: boolean
  fixedFiles: ParsedFile[]
  changes: FileChange[]
  explanation: string
  iterations: number
  validationResult: ValidationResult
}

export interface FileChange {
  filepath: string
  original: string
  fixed: string
  errors: string[]
  explanation: string
}

export interface FixOptions {
  model?: AIModel
  apiKey?: string
  maxIterations?: number
  explainFixes?: boolean
  strictMode?: boolean
}

// ============================================
// MAIN FIX FUNCTION
// ============================================

export async function fixWithAI(
  files: ParsedFile[],
  errors: ValidationError[],
  options: FixOptions = {}
): Promise<FixResult> {
  const {
    model = 'claude-sonnet-4',
    apiKey,
    maxIterations = 5,
    explainFixes = true,
    strictMode = false
  } = options

  let currentFiles = [...files]
  let currentErrors = [...errors]
  let allChanges: FileChange[] = []
  let iteration = 0
  let explanation = ''

  while (currentErrors.length > 0 && iteration < maxIterations) {
    iteration++
    console.log(`[AI Fixer] Iteration ${iteration}: ${currentErrors.length} errors to fix`)

    // Group errors by file
    const errorsByFile = groupErrorsByFile(currentErrors)

    // Generate fixes for each file
    for (const [filepath, fileErrors] of errorsByFile) {
      const file = currentFiles.find(f => f.filepath === filepath)
      if (!file) continue

      // Build prompt for AI
      const prompt = buildFixPrompt(file, fileErrors, currentFiles, explainFixes)

      // Get AI fix
      let fullResponse = ''
      for await (const chunk of generate(prompt, model, apiKey)) {
        fullResponse += chunk
      }

      // Parse the response
      const { fixedContent, changeExplanation } = parseFixResponse(fullResponse, file)

      if (fixedContent && fixedContent !== file.content) {
        // Record change
        allChanges.push({
          filepath,
          original: file.content,
          fixed: fixedContent,
          errors: fileErrors.map((e: ValidationError) => e.message),
          explanation: changeExplanation
        })

        // Update file
        const fileIndex = currentFiles.findIndex(f => f.filepath === filepath)
        currentFiles[fileIndex] = { ...file, content: fixedContent }
        
        explanation += `\n\n**${filepath}:**\n${changeExplanation}`
      }
    }

    // Re-validate
    const validationResult = await validateAndFix(currentFiles, { autoFix: true, strictMode })
    currentFiles = validationResult.fixedFiles || currentFiles
    currentErrors = validationResult.errors

    // If no more errors, we're done
    if (currentErrors.length === 0) {
      return {
        success: true,
        fixedFiles: currentFiles,
        changes: allChanges,
        explanation: explanation.trim() || 'All errors fixed successfully!',
        iterations: iteration,
        validationResult
      }
    }
  }

  // Return partial success
  const finalValidation = await validateAndFix(currentFiles, { autoFix: false })
  
  return {
    success: finalValidation.errors.length === 0,
    fixedFiles: currentFiles,
    changes: allChanges,
    explanation: explanation.trim() || 'Some errors could not be fixed automatically.',
    iterations: iteration,
    validationResult: finalValidation
  }
}

// ============================================
// PROMPT BUILDER
// ============================================

function buildFixPrompt(
  file: ParsedFile,
  errors: ValidationError[],
  allFiles: ParsedFile[],
  explainFixes: boolean
): string {
  // Get relevant context from other files
  const relatedFiles = findRelatedFiles(file, allFiles, errors)

  const prompt = `You are an expert code debugger. Fix the following errors in the code.

## FILE: ${file.filepath}
\`\`\`${file.language}
${file.content}
\`\`\`

## ERRORS TO FIX:
${errors.map((e, i) => `${i + 1}. Line ${e.line || '?'}: ${e.message}${e.suggestion ? ` (Suggestion: ${e.suggestion})` : ''}`).join('\n')}

${relatedFiles.length > 0 ? `## RELATED FILES (for context):
${relatedFiles.map(f => `### ${f.filepath}
\`\`\`${f.language}
${f.content.slice(0, 500)}${f.content.length > 500 ? '\n... (truncated)' : ''}
\`\`\``).join('\n\n')}` : ''}

## INSTRUCTIONS:
1. Fix ALL the errors listed above
2. Maintain the existing code style and formatting
3. Do NOT add new features or change functionality
4. Do NOT remove comments or logging unless they're the error
5. If an import is missing, add it
6. If a type is wrong, fix it
7. Return ONLY the fixed code

## OUTPUT FORMAT:
Return the COMPLETE fixed file using this exact format:

\`\`\`${file.language}:${file.filepath}
[complete fixed code here]
\`\`\`

${explainFixes ? `Then explain the fixes made:

FIXES:
- [describe each fix briefly]` : ''}`

  return prompt
}

// ============================================
// RESPONSE PARSER
// ============================================

function parseFixResponse(
  response: string,
  originalFile: ParsedFile
): { fixedContent: string | null; changeExplanation: string } {
  // Parse code blocks
  const parsedFiles = parseCodeBlocks(response)
  
  // Find the fixed file
  const fixedFile = parsedFiles.find(f => 
    f.filepath === originalFile.filepath ||
    f.filepath.endsWith(originalFile.filepath.split('/').pop() || '')
  )

  if (!fixedFile) {
    // Try to extract code block without filepath
    const codeBlockMatch = response.match(/```(?:\w+)?\n([\s\S]*?)```/)
    if (codeBlockMatch) {
      return {
        fixedContent: codeBlockMatch[1].trim(),
        changeExplanation: extractExplanation(response)
      }
    }
    return { fixedContent: null, changeExplanation: '' }
  }

  return {
    fixedContent: fixedFile.content,
    changeExplanation: extractExplanation(response)
  }
}

function extractExplanation(response: string): string {
  // Look for explanation after code block
  const parts = response.split('```')
  if (parts.length >= 3) {
    const afterCode = parts[parts.length - 1]
    const fixesMatch = afterCode.match(/FIXES?:?\s*([\s\S]+)/i)
    if (fixesMatch) {
      return fixesMatch[1].trim()
    }
    // Just return cleaned up text after code
    return afterCode.replace(/^\s*\n/, '').trim()
  }
  return ''
}

// ============================================
// CONTEXT FINDER
// ============================================

function findRelatedFiles(
  file: ParsedFile,
  allFiles: ParsedFile[],
  errors: ValidationError[]
): ParsedFile[] {
  const related: ParsedFile[] = []
  const maxRelated = 3
  
  // Find imported files
  const importPattern = /import\s+.+\s+from\s+['"]([^'"]+)['"]/g
  let match
  
  while ((match = importPattern.exec(file.content)) !== null) {
    const importPath = match[1]
    if (importPath.startsWith('.')) {
      // Find the imported file
      const imported = allFiles.find(f => 
        f.filepath !== file.filepath &&
        (f.filepath.includes(importPath.replace('./', '').replace('../', '')) ||
         importPath.includes(f.filepath.replace(/\.[^.]+$/, '')))
      )
      if (imported && related.length < maxRelated) {
        related.push(imported)
      }
    }
  }

  // If errors mention specific files
  for (const error of errors) {
    if (error.message.includes("Cannot find module")) {
      const moduleMatch = error.message.match(/['"]([^'"]+)['"]/)
      if (moduleMatch) {
        const mentioned = allFiles.find(f => 
          f.filepath.includes(moduleMatch[1].replace('./', ''))
        )
        if (mentioned && !related.includes(mentioned) && related.length < maxRelated) {
          related.push(mentioned)
        }
      }
    }
  }

  return related
}

// ============================================
// ERROR GROUPING
// ============================================

function groupErrorsByFile(errors: ValidationError[]): Map<string, ValidationError[]> {
  const grouped = new Map<string, ValidationError[]>()
  
  for (const error of errors) {
    if (!grouped.has(error.file)) {
      grouped.set(error.file, [])
    }
    grouped.get(error.file)!.push(error)
  }
  
  return grouped
}

// ============================================
// QUICK FIX SUGGESTIONS
// ============================================

export function getQuickFixSuggestions(error: ValidationError): string[] {
  const suggestions: string[] = []

  switch (error.code) {
    case 'SYNTAX_ERROR':
      suggestions.push('Check for missing brackets, semicolons, or commas')
      suggestions.push('Verify string quotes are properly closed')
      break
      
    case 'IMPORT_NOT_FOUND':
      suggestions.push('Check the file path is correct')
      suggestions.push('Verify the file extension (.ts, .tsx, etc.)')
      suggestions.push('Make sure the file exists')
      break
      
    case 'MISSING_DEPENDENCY':
      suggestions.push(`Run: npm install ${error.message.match(/'([^']+)'/)?.[1] || 'package'}`)
      break
      
    case 'MISSING_KEY_PROP':
      suggestions.push('Add key={item.id} or key={index} to the mapped element')
      break
      
    case 'HOOK_IN_CONDITIONAL':
    case 'HOOK_IN_LOOP':
      suggestions.push('Move the hook call to the top level of your component')
      suggestions.push('Use a different approach that doesn\'t require conditional hooks')
      break
      
    case 'UNDEFINED_COMPONENT':
      suggestions.push('Import the component from the correct path')
      suggestions.push('Check the component name spelling')
      break
      
    case 'HARDCODED_SECRET':
      suggestions.push('Use environment variables: process.env.YOUR_KEY')
      suggestions.push('Store secrets in .env.local file')
      break
      
    default:
      if (error.suggestion) {
        suggestions.push(error.suggestion)
      }
  }

  return suggestions
}

// ============================================
// SMART DIFF GENERATOR
// ============================================

export function generateSmartDiff(original: string, fixed: string): string[] {
  const originalLines = original.split('\n')
  const fixedLines = fixed.split('\n')
  const diffs: string[] = []

  // Simple line-by-line diff
  const maxLines = Math.max(originalLines.length, fixedLines.length)
  
  for (let i = 0; i < maxLines; i++) {
    const origLine = originalLines[i]
    const fixedLine = fixedLines[i]

    if (origLine !== fixedLine) {
      if (origLine && !fixedLine) {
        diffs.push(`- Line ${i + 1}: ${origLine.trim()}`)
      } else if (!origLine && fixedLine) {
        diffs.push(`+ Line ${i + 1}: ${fixedLine.trim()}`)
      } else {
        diffs.push(`~ Line ${i + 1}:`)
        diffs.push(`  - ${origLine?.trim()}`)
        diffs.push(`  + ${fixedLine?.trim()}`)
      }
    }
  }

  return diffs
}

// ============================================
// EXPORTS
// ============================================

export { groupErrorsByFile, findRelatedFiles, buildFixPrompt }
