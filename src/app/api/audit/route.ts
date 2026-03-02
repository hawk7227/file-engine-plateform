// =====================================================
// FILE ENGINE - AUDIT API
// Endpoint for project completeness checking
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { auditProject, quickAudit } from '@/lib/audit'
import { autoFixMissingFiles, batchCreateFiles } from '@/lib/batch-operations'

// =====================================================
// POST - Run full audit
// =====================================================

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, any>
    const { files, projectName, autoFix = false } = body
    
    if (!files || typeof files !== 'object') {
      return NextResponse.json(
        { error: 'Files map is required' },
        { status: 400 }
      )
    }
    
    // Convert files object to Map
    const filesMap = new Map<string, string>(Object.entries(files))
    
    // Run audit
    const auditResult = await auditProject(filesMap)
    
    // Auto-fix if requested
    let fixResult = null
    if (autoFix && auditResult.missingFiles.length > 0) {
      const { operations, auditAfter } = await autoFixMissingFiles(filesMap, projectName || 'Project')
      
      // Execute the operations
      const batchResult = await batchCreateFiles(operations)
      
      fixResult = {
        operations: operations.map(op => ({
          type: op.type,
          path: op.path,
          description: op.description
        })),
        batchResult: {
          created: batchResult.created,
          updated: batchResult.updated,
          failed: batchResult.failed,
          summary: batchResult.summary
        },
        auditAfter
      }
    }
    
    return NextResponse.json({
      success: true,
      audit: auditResult,
      fix: fixResult
    })
    
  } catch (error: unknown) {
    console.error('[Audit API Error]', error)
    return NextResponse.json(
      { error: (error instanceof Error ? error.message : String(error)) || 'Audit failed' },
      { status: 500 }
    )
  }
}

// =====================================================
// GET - Quick audit (lighter weight)
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const filesParam = searchParams.get('files')
    
    if (!filesParam) {
      return NextResponse.json(
        { error: 'Files parameter required' },
        { status: 400 }
      )
    }
    
    const files = JSON.parse(filesParam)
    const filesMap = new Map<string, string>(Object.entries(files))
    
    const result = quickAudit(filesMap)
    
    return NextResponse.json({
      success: true,
      ...result
    })
    
  } catch (error: unknown) {
    console.error('[Quick Audit Error]', error)
    return NextResponse.json(
      { error: (error instanceof Error ? error.message : String(error)) || 'Quick audit failed' },
      { status: 500 }
    )
  }
}
