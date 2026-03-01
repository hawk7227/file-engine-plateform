/**
 * FILE ENGINE - User Fix API Route
 * 
 * POST /api/file-engine/user-fix
 * 
 * Fixes code based on user feedback (text or voice).
 */

import { NextRequest, NextResponse } from 'next/server';
import { userRequestedFix } from '@/lib/file-engine/auto-fix-engine';
import { validationErrorResponse } from '@/lib/schemas'

// ============================================
// TYPES
// ============================================

interface UserFixRequest {
  originalFiles: Array<{
    path: string;
    content: string;
  }>;

  userFeedback: string;
  previewUrl?: string;
  voiceTranscript?: string | null;
}

// ============================================
// ROUTE HANDLER
// ============================================

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, any>;
    
    // Validate request
    if (!body.originalFiles || !Array.isArray(body.originalFiles)) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      );
    }

    // Use voice transcript if provided, otherwise user feedback
    const feedback = body.voiceTranscript || body.userFeedback;
    
    if (!feedback || typeof feedback !== 'string' || feedback.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'No feedback provided' },
        { status: 400 }
      );
    }

    // Run user-requested fix
    const result = await userRequestedFix(body.originalFiles, feedback, {
      previewUrl: body.previewUrl,
      model: 'claude-sonnet-4'
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        fixedFiles: result.fixedFiles,
        explanation: result.explanation,
        changedFiles: result.changedFiles
      });
    } else {
      return NextResponse.json({
        success: false,
        fixedFiles: body.originalFiles,
        explanation: result.explanation || 'Could not apply the requested changes',
        changedFiles: []
      });
    }

  } catch (error) {
    console.error('User fix error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
