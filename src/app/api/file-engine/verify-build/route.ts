/**
 * FILE ENGINE - Verify Build API Route
 * 
 * POST /api/file-engine/verify-build
 * 
 * Sends files to Vercel for build verification.
 * Returns preview URL if successful, or error details for auto-fix.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runBuildVerification, type PreviewPhase } from '@/lib/file-engine/preview-manager';
import { supabase } from '@/lib/supabase';
import { validationErrorResponse } from '@/lib/schemas'

// ============================================
// TYPES
// ============================================

interface VerifyBuildRequest {
  files: Array<{
    path: string;
    content: string;
  }>;

  framework?: string;
  userId?: string;
  projectId?: string;
  projectName?: string;
}

// ============================================
// ROUTE HANDLER
// ============================================

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, any>;
    
    // Validate request
    if (!body.files || !Array.isArray(body.files) || body.files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      );
    }

    // Validate each file
    for (const file of body.files) {
      if (!file.path || typeof file.content !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Invalid file format. Each file needs path and content.' },
          { status: 400 }
        );
      }
    }

    // Check file size limit (10MB total)
    const totalSize = body.files.reduce((acc, f) => acc + f.content.length, 0);
    if (totalSize > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Total file size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Get user from session if not provided
    let userId = body.userId;
    if (!userId) {
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id;
    }

    // Run build verification
    const result = await runBuildVerification(body.files, {
      userId,
      projectId: body.projectId,
      projectName: body.projectName,
      maxAutoFixAttempts: 3,
      vercelToken: process.env.VERCEL_TOKEN || process.env.ADMIN_VERCEL_TOKEN,
      teamId: process.env.VERCEL_TEAM_ID
    });

    // Return appropriate response
    if (result.success) {
      return NextResponse.json({
        success: true,
        deploymentId: result.deploymentId,
        previewUrl: result.previewUrl,
        buildTime: result.buildTime,
        autoFixAttempts: result.autoFixAttempts,
        status: 'READY'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Build failed',
        logs: result.logs,
        autoFixAttempts: result.autoFixAttempts,
        phase: result.phase
      }, { status: 422 }); // 422 Unprocessable Entity - valid request but build failed
    }

  } catch (error) {
    console.error('Verify build error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// ============================================
// STREAMING VERSION (for real-time updates)
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    const body: VerifyBuildRequest = await request.json();
    
    if (!body.files || body.files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      );
    }

    // Get user from session
    let userId = body.userId;
    if (!userId) {
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id;
    }

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (type: string, data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, ...data })}\n\n`));
        };

        try {
          const result = await runBuildVerification(body.files, {
            userId,
            projectId: body.projectId,
            projectName: body.projectName,
            maxAutoFixAttempts: 3,
            vercelToken: process.env.VERCEL_TOKEN || process.env.ADMIN_VERCEL_TOKEN,
            teamId: process.env.VERCEL_TEAM_ID,
            onPhaseChange: (phase: PreviewPhase, message: string) => {
              sendEvent('phase', { phase, message });
            },
            onProgress: (status) => {
              sendEvent('progress', { status: status.status, buildTime: status.buildTime });
            }
          });

          if (result.success) {
            sendEvent('complete', {
              success: true,
              deploymentId: result.deploymentId,
              previewUrl: result.previewUrl,
              buildTime: result.buildTime,
              autoFixAttempts: result.autoFixAttempts
            });
          } else {
            sendEvent('error', {
              success: false,
              error: result.error,
              logs: result.logs,
              autoFixAttempts: result.autoFixAttempts
            });
          }

        } catch (error) {
          sendEvent('error', {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    console.error('Streaming verify error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
