// =====================================================
// FILE ENGINE - VERCEL-PROOF VALIDATION API
// 500+ Pre-Build Checks
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { 
  vercelProofValidate, 
  generateQuickFixes,
  type FileContent,
  type ValidationResult,
  type QuickFix
} from '@/lib/vercel-proof'

// =====================================================
// POST - Run full Vercel-proof validation
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { files, autoFix = false } = body
    
    if (!files || !Array.isArray(files)) {
      return NextResponse.json(
        { error: 'Files array is required. Format: [{ path: string, content: string }]' },
        { status: 400 }
      )
    }
    
    // Validate file format
    const validFiles: FileContent[] = files.filter((f: any) => 
      f && typeof f.path === 'string' && typeof f.content === 'string'
    )
    
    if (validFiles.length === 0) {
      return NextResponse.json(
        { error: 'No valid files provided' },
        { status: 400 }
      )
    }
    
    // Run Vercel-proof validation
    const result = vercelProofValidate(validFiles)
    
    // Generate quick fixes if requested and there are errors
    let fixes: QuickFix[] = []
    if (autoFix && result.errors.length > 0) {
      fixes = generateQuickFixes(result, validFiles)
    }
    
    return NextResponse.json({
      success: true,
      validation: result,
      fixes: autoFix ? fixes : undefined,
      meta: {
        filesScanned: validFiles.length,
        checksRun: result.checks,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error: any) {
    console.error('[Vercel-Proof Validation Error]', error)
    return NextResponse.json(
      { error: error.message || 'Validation failed' },
      { status: 500 }
    )
  }
}

// =====================================================
// GET - Get validation info/status
// =====================================================

export async function GET() {
  return NextResponse.json({
    name: 'Vercel-Proof Validation API',
    version: '2.0',
    description: '500+ pre-build checks for Next.js + TypeScript + React + Supabase',
    categories: [
      { name: 'Syntax & Structure', checks: '1-65' },
      { name: 'TypeScript Types', checks: '66-130' },
      { name: 'Imports & Modules', checks: '131-195' },
      { name: 'React & JSX', checks: '196-270' },
      { name: 'Next.js Specific', checks: '271-340' },
      { name: 'React Hooks', checks: '341-400' },
      { name: 'State Management', checks: '401-440' },
      { name: 'Async & Promises', checks: '441-490' },
      { name: 'CSS & Tailwind', checks: '491-530' },
      { name: 'Config & Environment', checks: '531-570' }
    ],
    usage: {
      method: 'POST',
      body: {
        files: '[{ path: "src/app/page.tsx", content: "..." }]',
        autoFix: 'boolean (optional)'
      }
    },
    knownBugs: [
      { id: '401-403', description: 'useState setter naming mismatch (setQuickSMSSending vs setSendingQuickSMS)' },
      { id: '66-69', description: 'Block-scoped variable used before declaration' },
      { id: '86-87', description: 'Property access on type that doesn\'t have it' },
      { id: '372', description: 'Reading state immediately after setState (async)' }
    ]
  })
}
