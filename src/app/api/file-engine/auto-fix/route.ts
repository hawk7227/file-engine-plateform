/**
 * FILE ENGINE - Auto-Fix API Route
 * 
 * POST /api/file-engine/auto-fix
 * 
 * Automatically fixes build errors using AI.
 */

import { NextRequest, NextResponse } from 'next/server';
import { autoFixErrors } from '@/lib/file-engine/auto-fix-engine';

// ============================================
// TYPES
// ============================================

interface AutoFixRequest {
  originalFiles: Array<{
    path: string;
    content: string;
  }>;

  errorLogs: string;
  attemptNumber?: number;
}

// ============================================
// ROUTE HANDLER
// ============================================

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body: AutoFixRequest = await request.json();
    
    // Validate request
    if (!body.originalFiles || !Array.isArray(body.originalFiles)) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      );
    }

    if (!body.errorLogs || typeof body.errorLogs !== 'string') {
      return NextResponse.json(
        { success: false, error: 'No error logs provided' },
        { status: 400 }
      );
    }

    // Run auto-fix
    const result = await autoFixErrors(body.originalFiles, body.errorLogs, {
      maxAttempts: 1,
      model: 'claude-sonnet-4'
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        fixedFiles: result.fixedFiles,
        explanation: result.explanation,
        changedFiles: result.changedFiles,
        confidence: result.confidence
      });
    } else {
      return NextResponse.json({
        success: false,
        fixedFiles: body.originalFiles,
        explanation: result.explanation,
        changedFiles: [],
        confidence: 0
      });
    }

  } catch (error) {
    console.error('Auto-fix error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
