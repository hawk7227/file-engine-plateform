/**
 * FILE ENGINE - Preview Manager
 * 
 * Orchestrates the complete build verification flow:
 * 1. Create preview deployment
 * 2. Wait for build
 * 3. Auto-fix if errors (up to 3 times)
 * 4. Return final result
 */

import { 
  createPreviewDeployment, 
  waitForDeployment, 
  deleteDeployment,
  type PreviewResult,
  type DeploymentStatus
} from './vercel-api';
import { autoFixErrors, type GeneratedFile, type AutoFixResult } from './auto-fix-engine';
import { supabase } from '@/lib/supabase';

// ============================================
// TYPES
// ============================================

export type PreviewPhase = 
  | 'idle'
  | 'uploading'
  | 'building'
  | 'auto-fixing'
  | 'ready'
  | 'error';

export interface PreviewManagerResult {
  success: boolean;
  phase: PreviewPhase;
  previewUrl?: string;
  deploymentId?: string;
  buildTime?: number;
  autoFixAttempts: number;
  error?: string;
  logs?: string;
}

export interface PreviewManagerOptions {
  userId?: string;
  projectId?: string;
  projectName?: string;
  maxAutoFixAttempts?: number;
  vercelToken?: string;
  teamId?: string;
  onPhaseChange?: (phase: PreviewPhase, message: string) => void;
  onProgress?: (status: DeploymentStatus) => void;
}

// ============================================
// MAIN PREVIEW MANAGER
// ============================================

/**
 * Run the complete build verification flow
 */
export async function runBuildVerification(
  files: GeneratedFile[],
  options: PreviewManagerOptions = {}
): Promise<PreviewManagerResult> {
  const {
    userId,
    projectId,
    projectName,
    maxAutoFixAttempts = 3,
    vercelToken,
    teamId,
    onPhaseChange,
    onProgress
  } = options;

  let currentFiles = [...files];
  let autoFixAttempts = 0;
  let lastError = '';
  let lastLogs = '';

  // Report phase changes
  const reportPhase = (phase: PreviewPhase, message: string) => {
    onPhaseChange?.(phase, message);
  };

  while (autoFixAttempts <= maxAutoFixAttempts) {
    // Phase 1: Create preview deployment
    reportPhase(autoFixAttempts === 0 ? 'uploading' : 'auto-fixing', 
      autoFixAttempts === 0 
        ? 'Uploading files to Vercel...' 
        : `Auto-fixing (attempt ${autoFixAttempts})...`
    );

    const previewResult = await createPreviewDeployment(currentFiles, {
      projectName: projectName || `fe-preview-${Date.now().toString(36)}`,
      token: vercelToken,
      teamId
    });

    if (!previewResult.success) {
      return {
        success: false,
        phase: 'error',
        autoFixAttempts,
        error: previewResult.error || 'Failed to create preview deployment'
      };
    }

    // Phase 2: Wait for build
    reportPhase('building', 'Building preview...');

    const buildStatus = await waitForDeployment(previewResult.deploymentId, {
      token: vercelToken,
      onProgress
    });

    // Success!
    if (buildStatus.status === 'ready') {
      // Save preview to database if user/project provided
      if (userId && previewResult.deploymentId) {
        await savePreviewRecord(
          userId,
          previewResult.deploymentId,
          previewResult.previewUrl,
          currentFiles,
          projectId
        );
      }

      reportPhase('ready', 'Preview ready!');

      return {
        success: true,
        phase: 'ready',
        previewUrl: buildStatus.url || previewResult.previewUrl,
        deploymentId: previewResult.deploymentId,
        buildTime: buildStatus.buildTime,
        autoFixAttempts
      };
    }

    // Build failed
    lastError = buildStatus.error || 'Build failed';
    lastLogs = buildStatus.buildLogs || '';

    // Check if we can auto-fix
    autoFixAttempts++;
    
    if (autoFixAttempts > maxAutoFixAttempts) {
      // Delete failed deployment
      await deleteDeployment(previewResult.deploymentId, { token: vercelToken });
      
      return {
        success: false,
        phase: 'error',
        autoFixAttempts: autoFixAttempts - 1,
        error: lastError,
        logs: lastLogs
      };
    }

    // Phase 3: Auto-fix
    reportPhase('auto-fixing', `Attempting automatic fix (${autoFixAttempts}/${maxAutoFixAttempts})...`);

    const fixResult = await autoFixErrors(currentFiles, lastLogs || lastError, {
      maxAttempts: 1 // Single attempt per iteration
    });

    if (!fixResult.success || fixResult.changedFiles.length === 0) {
      // Auto-fix couldn't help
      await deleteDeployment(previewResult.deploymentId, { token: vercelToken });
      
      return {
        success: false,
        phase: 'error',
        autoFixAttempts,
        error: `Auto-fix failed: ${fixResult.explanation}`,
        logs: lastLogs
      };
    }

    // Use fixed files for next attempt
    currentFiles = fixResult.fixedFiles;
    
    // Delete failed deployment before retry
    await deleteDeployment(previewResult.deploymentId, { token: vercelToken });
  }

  // Should never reach here
  return {
    success: false,
    phase: 'error',
    autoFixAttempts,
    error: lastError,
    logs: lastLogs
  };
}

// ============================================
// DATABASE FUNCTIONS
// ============================================

/**
 * Save preview record to database
 */
async function savePreviewRecord(
  userId: string,
  deploymentId: string,
  previewUrl: string,
  files: GeneratedFile[],
  projectId?: string
): Promise<void> {
  try {
    await supabase.from('file_engine_previews').insert({
      user_id: userId,
      project_id: projectId,
      deployment_id: deploymentId,
      preview_url: previewUrl,
      files: files,
      status: 'active',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    });
  } catch (error) {
    console.error('Failed to save preview record:', error);
  }
}

/**
 * Clean up expired previews
 */
export async function cleanupExpiredPreviews(
  vercelToken?: string
): Promise<{ deleted: number; errors: number }> {
  let deleted = 0;
  let errors = 0;

  try {
    // Get expired previews
    const { data: expired, error } = await supabase
      .from('file_engine_previews')
      .select('id, deployment_id')
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString());

    if (error || !expired) {
      console.error('Failed to fetch expired previews:', error);
      return { deleted: 0, errors: 1 };
    }

    // Delete each from Vercel and update database
    for (const preview of expired) {
      try {
        // Delete from Vercel
        const success = await deleteDeployment(preview.deployment_id, { token: vercelToken });
        
        // Update database status
        await supabase
          .from('file_engine_previews')
          .update({ status: 'deleted' })
          .eq('id', preview.id);

        if (success) {
          deleted++;
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
    }

  } catch (error) {
    console.error('Cleanup error:', error);
    errors++;
  }

  return { deleted, errors };
}

/**
 * Get user's active previews
 */
export async function getUserPreviews(userId: string): Promise<{
  id: string;
  preview_url: string;
  created_at: string;
  expires_at: string;
}[]> {
  const { data, error } = await supabase
    .from('file_engine_previews')
    .select('id, preview_url, created_at, expires_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Failed to fetch user previews:', error);
    return [];
  }

  return data || [];
}

// ============================================
// EXPORTS
// ============================================

export type { GeneratedFile };
