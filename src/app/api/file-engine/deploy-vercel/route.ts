/**
 * FILE ENGINE - Deploy to Vercel API Route
 * 
 * POST /api/file-engine/deploy-vercel
 * 
 * Deploys files to Vercel production.
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  createProductionDeployment, 
  waitForDeployment 
} from '@/lib/file-engine/vercel-api';
import { supabase } from '@/lib/supabase';

// ============================================
// TYPES
// ============================================

interface DeployVercelRequest {
  files: Array<{
    path: string;
    content: string;
  }>;
  projectName: string;
  userId?: string;
  vercelToken?: string; // From user's connected account
  production?: boolean;
}

// ============================================
// ROUTE HANDLER
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body: DeployVercelRequest = await request.json();
    
    // Validate request
    if (!body.files || !Array.isArray(body.files) || body.files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      );
    }

    if (!body.projectName || typeof body.projectName !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Project name is required' },
        { status: 400 }
      );
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

    // Permission gate: require deploy_vercel feature
    if (userId) {
      try {
        const { hasFeature } = await import('@/lib/permissions')
        const allowed = await hasFeature(userId, 'deploy_vercel')
        if (!allowed) {
          return NextResponse.json(
            { success: false, error: 'Upgrade to Pro to deploy to Vercel', upsell: true },
            { status: 403 }
          )
        }
      } catch { /* permission check non-fatal in dev */ }
    }

    // Use user's token if provided, otherwise admin token
    const vercelToken = body.vercelToken || 
                       process.env.VERCEL_TOKEN || 
                       process.env.ADMIN_VERCEL_TOKEN;

    if (!vercelToken) {
      return NextResponse.json(
        { success: false, error: 'Vercel token not configured' },
        { status: 500 }
      );
    }

    // Sanitize project name
    const sanitizedName = body.projectName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 50);

    // Create production deployment
    const deployResult = await createProductionDeployment(body.files, {
      projectName: sanitizedName,
      token: vercelToken,
      teamId: process.env.VERCEL_TEAM_ID
    });

    if (!deployResult.success) {
      return NextResponse.json({
        success: false,
        error: deployResult.error || 'Deployment failed'
      }, { status: 422 });
    }

    // Wait for deployment to be ready
    const finalStatus = await waitForDeployment(deployResult.deploymentId, {
      token: vercelToken,
      maxAttempts: 90 // 3 minutes max for production
    });

    // Save deployment record
    if (userId) {
      await supabase.from('file_engine_deployments').insert({
        user_id: userId,
        project_name: body.projectName,
        files: body.files,
        deployed_to: ['vercel'],
        vercel_url: finalStatus.url || deployResult.url
      });
    }

    if (finalStatus.status === 'ready') {
      return NextResponse.json({
        success: true,
        url: finalStatus.url || deployResult.url,
        deploymentId: deployResult.deploymentId,
        inspectorUrl: deployResult.inspectorUrl
      });
    } else {
      return NextResponse.json({
        success: false,
        error: finalStatus.error || 'Deployment failed',
        deploymentId: deployResult.deploymentId
      }, { status: 422 });
    }

  } catch (error) {
    console.error('Deploy to Vercel error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
