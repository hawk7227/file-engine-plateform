'use client'
import { useState, useCallback, useRef } from 'react'

// Types
export interface ParsedFile {
  language: string
  filepath: string
  content: string
}

export interface ValidationError {
  type: 'error' | 'warning' | 'info'
  code: string
  message: string
  file: string
  line?: number
  column?: number
  suggestion?: string
}

export interface ValidationResult {
  isClean: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  suggestions: ValidationError[]
}

export type GeneratePhase = 
  | 'idle' 
  | 'generating' 
  | 'validating' 
  | 'ai_fixing' 
  | 'final_validation' 
  | 'complete' 
  | 'error'

interface GenerateState {
  phase: GeneratePhase
  phaseMessage: string
  response: string
  files: ParsedFile[]
  validation: ValidationResult | null
  error: string | null
  isGenerating: boolean
  stats: {
    filesGenerated: number
    errorsFound: number
    errorsFixed: number
    aiFixIterations: number
  }
}

interface GenerateOptions {
  projectId?: string
  buildId?: string
  model?: string
  strictMode?: boolean
  maxFixIterations?: number
  onChunk?: (chunk: string) => void
  onPhaseChange?: (phase: GeneratePhase, message: string) => void
  onValidation?: (result: ValidationResult) => void
  onComplete?: (files: ParsedFile[], validation: ValidationResult) => void
  onError?: (error: string) => void
}

const initialState: GenerateState = {
  phase: 'idle',
  phaseMessage: '',
  response: '',
  files: [],
  validation: null,
  error: null,
  isGenerating: false,
  stats: {
    filesGenerated: 0,
    errorsFound: 0,
    errorsFixed: 0,
    aiFixIterations: 0
  }
}

export function useGenerate() {
  const [state, setState] = useState<GenerateState>(initialState)
  const abortControllerRef = useRef<AbortController | null>(null)

  const generate = useCallback(async (prompt: string, options: GenerateOptions = {}) => {
    const { 
      projectId, 
      buildId, 
      model = 'claude-sonnet-4',
      strictMode = false,
      maxFixIterations = 3,
      onChunk, 
      onPhaseChange,
      onValidation,
      onComplete, 
      onError 
    } = options

    // Abort existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    // Reset state
    setState({
      ...initialState,
      phase: 'generating',
      phaseMessage: 'Generating code...',
      isGenerating: true
    })

    try {
      // Use validated endpoint for production-quality output
      const response = await fetch('/api/generate-validated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          projectId, 
          buildId, 
          model,
          strictMode,
          maxFixIterations
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Generation failed')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let fullResponse = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        
        // Process SSE events
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          
          try {
            const data = JSON.parse(line.slice(6))
            
            switch (data.type) {
              case 'phase':
                setState((prev: any) => ({
                  ...prev,
                  phase: data.phase as GeneratePhase,
                  phaseMessage: data.message
                }))
                onPhaseChange?.(data.phase, data.message)
                
                if (data.filesCount) {
                  setState((prev: any) => ({
                    ...prev,
                    stats: { ...prev.stats, filesGenerated: data.filesCount }
                  }))
                }
                break

              case 'chunk':
                fullResponse += data.content
                setState((prev: any) => ({
                  ...prev,
                  response: fullResponse
                }))
                onChunk?.(data.content)
                break

              case 'validation':
                setState((prev: any) => ({
                  ...prev,
                  stats: {
                    ...prev.stats,
                    errorsFound: data.errors + data.autoFixed,
                    errorsFixed: data.autoFixed
                  }
                }))
                break

              case 'ai_fix_result':
                setState((prev: any) => ({
                  ...prev,
                  stats: {
                    ...prev.stats,
                    aiFixIterations: data.iterations,
                    errorsFixed: prev.stats.errorsFixed + data.changes
                  }
                }))
                break

              case 'warning':
                console.warn('[Generate]', data.message)
                break

              case 'complete':
                const validation: ValidationResult = data.validation
                setState((prev: any) => ({
                  ...prev,
                  phase: 'complete',
                  phaseMessage: validation.isClean 
                    ? '✅ Code validated successfully!' 
                    : `⚠️ Completed with ${validation.errors.length} issues`,
                  files: data.files,
                  validation,
                  isGenerating: false
                }))
                onValidation?.(validation)
                onComplete?.(data.files, validation)
                break

              case 'error':
                throw new Error(data.error)
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue
            throw e
          }
        }
      }

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setState((prev: any) => ({ ...prev, phase: 'idle', isGenerating: false }))
        return
      }

      const errorMessage = error instanceof Error ? error.message : 'Generation failed'
      setState((prev: any) => ({
        ...prev,
        phase: 'error',
        phaseMessage: errorMessage,
        error: errorMessage,
        isGenerating: false
      }))
      onError?.(errorMessage)
    }
  }, [])

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setState((prev: any) => ({ ...prev, phase: 'idle', isGenerating: false }))
  }, [])

  const reset = useCallback(() => {
    setState(initialState)
  }, [])

  return {
    ...state,
    generate,
    abort,
    reset,
    // Computed
    isClean: state.validation?.isClean ?? false,
    hasErrors: (state.validation?.errors.length ?? 0) > 0,
    hasWarnings: (state.validation?.warnings.length ?? 0) > 0
  }
}
