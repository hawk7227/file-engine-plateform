'use client';

/**
 * FILE ENGINE - Preview & Deploy Hook
 * 
 * State management for the complete preview & deploy flow:
 * - Build verification
 * - Auto-fix loop
 * - User feedback fixes
 * - Deployment to Vercel/GitHub
 */

import { useState, useCallback, useRef } from 'react';

// ============================================
// TYPES
// ============================================

export interface GeneratedFile {
  path: string;
  content: string;
}

export type PreviewPhase = 
  | 'idle'
  | 'generating'
  | 'verifying'
  | 'auto-fixing'
  | 'previewing'
  | 'fixing'
  | 'deploying'
  | 'complete'
  | 'error';

export interface PreviewState {
  phase: PreviewPhase;
  phaseMessage: string;
  files: GeneratedFile[];
  previewUrl: string | null;
  deploymentId: string | null;
  buildTime: number | null;
  autoFixAttempts: number;
  error: string | null;
  logs: string | null;
}

export interface DeployResult {
  success: boolean;
  vercelUrl?: string;
  githubUrl?: string;
  error?: string;
}

// ============================================
// INITIAL STATE
// ============================================

const initialState: PreviewState = {
  phase: 'idle',
  phaseMessage: '',
  files: [],
  previewUrl: null,
  deploymentId: null,
  buildTime: null,
  autoFixAttempts: 0,
  error: null,
  logs: null
};

// ============================================
// HOOK
// ============================================

export function useFileEnginePreview() {
  const [state, setState] = useState<PreviewState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ========================================
  // VERIFY BUILD
  // ========================================

  const verifyBuild = useCallback(async (
    files: GeneratedFile[],
    options: {
      projectId?: string;
      projectName?: string;
      onPhaseChange?: (phase: PreviewPhase, message: string) => void;
    } = {}
  ) => {
    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setState(prev => ({
      ...prev,
      phase: 'verifying',
      phaseMessage: 'Uploading files to Vercel...',
      files,
      error: null,
      logs: null
    }));

    options.onPhaseChange?.('verifying', 'Uploading files to Vercel...');

    try {
      const response = await fetch('/api/file-engine/verify-build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files,
          projectId: options.projectId,
          projectName: options.projectName
        }),
        signal: abortControllerRef.current.signal
      });

      const data = await response.json();

      if (data.success) {
        setState(prev => ({
          ...prev,
          phase: 'previewing',
          phaseMessage: 'Preview ready!',
          previewUrl: data.previewUrl,
          deploymentId: data.deploymentId,
          buildTime: data.buildTime,
          autoFixAttempts: data.autoFixAttempts || 0
        }));
        options.onPhaseChange?.('previewing', 'Preview ready!');
        return { success: true, previewUrl: data.previewUrl };
      } else {
        setState(prev => ({
          ...prev,
          phase: 'error',
          phaseMessage: data.error || 'Build failed',
          error: data.error,
          logs: data.logs,
          autoFixAttempts: data.autoFixAttempts || 0
        }));
        options.onPhaseChange?.('error', data.error || 'Build failed');
        return { success: false, error: data.error };
      }

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setState(prev => ({ ...prev, phase: 'idle', phaseMessage: '' }));
        return { success: false, error: 'Aborted' };
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        phase: 'error',
        phaseMessage: errorMessage,
        error: errorMessage
      }));
      options.onPhaseChange?.('error', errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // ========================================
  // USER FIX
  // ========================================

  const requestFix = useCallback(async (
    feedback: string,
    options: {
      voiceTranscript?: string;
      onPhaseChange?: (phase: PreviewPhase, message: string) => void;
    } = {}
  ) => {
    if (state.files.length === 0) {
      return { success: false, error: 'No files to fix' };
    }

    setState(prev => ({
      ...prev,
      phase: 'fixing',
      phaseMessage: 'Applying your changes...',
      error: null
    }));

    options.onPhaseChange?.('fixing', 'Applying your changes...');

    try {
      // First, get the fixed files
      const fixResponse = await fetch('/api/file-engine/user-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalFiles: state.files,
          userFeedback: feedback,
          voiceTranscript: options.voiceTranscript,
          previewUrl: state.previewUrl
        })
      });

      const fixData = await fixResponse.json();

      if (!fixData.success || fixData.changedFiles.length === 0) {
        setState(prev => ({
          ...prev,
          phase: 'previewing',
          phaseMessage: 'No changes needed',
          error: null
        }));
        return { success: false, error: 'Could not apply changes' };
      }

      // Update files
      setState(prev => ({
        ...prev,
        files: fixData.fixedFiles,
        phaseMessage: 'Rebuilding preview...'
      }));

      // Now verify the new build
      const verifyResponse = await fetch('/api/file-engine/verify-build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: fixData.fixedFiles
        })
      });

      const verifyData = await verifyResponse.json();

      if (verifyData.success) {
        setState(prev => ({
          ...prev,
          phase: 'previewing',
          phaseMessage: 'Preview updated!',
          previewUrl: verifyData.previewUrl,
          deploymentId: verifyData.deploymentId,
          buildTime: verifyData.buildTime
        }));
        options.onPhaseChange?.('previewing', 'Preview updated!');
        return { success: true, previewUrl: verifyData.previewUrl };
      } else {
        setState(prev => ({
          ...prev,
          phase: 'error',
          phaseMessage: verifyData.error || 'Rebuild failed',
          error: verifyData.error,
          logs: verifyData.logs
        }));
        options.onPhaseChange?.('error', verifyData.error || 'Rebuild failed');
        return { success: false, error: verifyData.error };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        phase: 'error',
        phaseMessage: errorMessage,
        error: errorMessage
      }));
      options.onPhaseChange?.('error', errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [state.files, state.previewUrl]);

  // ========================================
  // DEPLOY TO VERCEL
  // ========================================

  const deployToVercel = useCallback(async (
    projectName: string,
    options: {
      onPhaseChange?: (phase: PreviewPhase, message: string) => void;
    } = {}
  ): Promise<DeployResult> => {
    if (state.files.length === 0) {
      return { success: false, error: 'No files to deploy' };
    }

    setState(prev => ({
      ...prev,
      phase: 'deploying',
      phaseMessage: 'Deploying to Vercel...',
      error: null
    }));

    options.onPhaseChange?.('deploying', 'Deploying to Vercel...');

    try {
      const response = await fetch('/api/file-engine/deploy-vercel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: state.files,
          projectName
        })
      });

      const data = await response.json();

      if (data.success) {
        setState(prev => ({
          ...prev,
          phase: 'complete',
          phaseMessage: 'Deployed to Vercel!'
        }));
        options.onPhaseChange?.('complete', 'Deployed to Vercel!');
        return { success: true, vercelUrl: data.url };
      } else {
        setState(prev => ({
          ...prev,
          phase: 'previewing', // Go back to previewing on error
          phaseMessage: 'Deploy failed',
          error: data.error
        }));
        options.onPhaseChange?.('error', data.error || 'Deploy failed');
        return { success: false, error: data.error };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        phase: 'previewing',
        phaseMessage: 'Deploy failed',
        error: errorMessage
      }));
      options.onPhaseChange?.('error', errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [state.files]);

  // ========================================
  // PUSH TO GITHUB
  // ========================================

  const pushToGitHub = useCallback(async (
    repoName: string,
    options: {
      repoOwner?: string;
      isPrivate?: boolean;
      onPhaseChange?: (phase: PreviewPhase, message: string) => void;
    } = {}
  ): Promise<DeployResult> => {
    if (state.files.length === 0) {
      return { success: false, error: 'No files to push' };
    }

    setState(prev => ({
      ...prev,
      phase: 'deploying',
      phaseMessage: 'Pushing to GitHub...',
      error: null
    }));

    options.onPhaseChange?.('deploying', 'Pushing to GitHub...');

    try {
      const response = await fetch('/api/file-engine/push-github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: state.files,
          repoName,
          repoOwner: options.repoOwner,
          isPrivate: options.isPrivate
        })
      });

      const data = await response.json();

      if (data.success) {
        setState(prev => ({
          ...prev,
          phase: 'complete',
          phaseMessage: 'Pushed to GitHub!'
        }));
        options.onPhaseChange?.('complete', 'Pushed to GitHub!');
        return { success: true, githubUrl: data.repoUrl };
      } else {
        setState(prev => ({
          ...prev,
          phase: 'previewing',
          phaseMessage: 'Push failed',
          error: data.error
        }));
        options.onPhaseChange?.('error', data.error || 'Push failed');
        return { success: false, error: data.error };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        phase: 'previewing',
        phaseMessage: 'Push failed',
        error: errorMessage
      }));
      options.onPhaseChange?.('error', errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [state.files]);

  // ========================================
  // DEPLOY BOTH
  // ========================================

  const deployBoth = useCallback(async (
    projectName: string,
    options: {
      repoOwner?: string;
      repoName?: string;
      onPhaseChange?: (phase: PreviewPhase, message: string) => void;
    } = {}
  ): Promise<DeployResult> => {
    if (state.files.length === 0) {
      return { success: false, error: 'No files to deploy' };
    }

    setState(prev => ({
      ...prev,
      phase: 'deploying',
      phaseMessage: 'Deploying to Vercel & GitHub...',
      error: null
    }));

    options.onPhaseChange?.('deploying', 'Deploying to Vercel & GitHub...');

    try {
      const response = await fetch('/api/file-engine/deploy-both', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: state.files,
          projectName,
          github: {
            repoOwner: options.repoOwner,
            repoName: options.repoName || projectName
          },
          vercel: {
            production: true,
            linkToGithub: true
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        setState(prev => ({
          ...prev,
          phase: 'complete',
          phaseMessage: 'Deployed to Vercel & GitHub!'
        }));
        options.onPhaseChange?.('complete', 'Deployed to Vercel & GitHub!');
        return { 
          success: true, 
          vercelUrl: data.vercel?.url,
          githubUrl: data.github?.repoUrl
        };
      } else {
        setState(prev => ({
          ...prev,
          phase: 'previewing',
          phaseMessage: 'Deploy failed',
          error: data.error
        }));
        options.onPhaseChange?.('error', data.error || 'Deploy failed');
        return { success: false, error: data.error };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        phase: 'previewing',
        phaseMessage: 'Deploy failed',
        error: errorMessage
      }));
      options.onPhaseChange?.('error', errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [state.files]);

  // ========================================
  // UTILITY FUNCTIONS
  // ========================================

  const setFiles = useCallback((files: GeneratedFile[]) => {
    setState(prev => ({ ...prev, files }));
  }, []);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({ ...prev, phase: 'idle', phaseMessage: '' }));
  }, []);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(initialState);
  }, []);

  const backToPreview = useCallback(() => {
    if (state.previewUrl) {
      setState(prev => ({
        ...prev,
        phase: 'previewing',
        phaseMessage: '',
        error: null
      }));
    }
  }, [state.previewUrl]);

  // ========================================
  // RETURN
  // ========================================

  return {
    // State
    ...state,
    
    // Computed
    isLoading: ['verifying', 'auto-fixing', 'fixing', 'deploying'].includes(state.phase),
    isPreviewReady: state.phase === 'previewing' && !!state.previewUrl,
    hasError: state.phase === 'error',
    isComplete: state.phase === 'complete',
    
    // Actions
    verifyBuild,
    requestFix,
    deployToVercel,
    pushToGitHub,
    deployBoth,
    setFiles,
    abort,
    reset,
    backToPreview
  };
}

export default useFileEnginePreview;
