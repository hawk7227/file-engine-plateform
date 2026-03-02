'use client';

/**
 * FILE ENGINE - Enhanced Preview Panel V2
 * 
 * Complete preview panel with:
 * - Live iframe preview
 * - Code view
 * - Feedback input with voice
 * - Download/Deploy menus
 * - Toolbar with all actions
 */

import { useState, useCallback, useRef } from 'react';
import { PreviewToolbar, type ViewMode } from './PreviewToolbar';
import { FeedbackInput } from './FeedbackInput';
import { DeployMenu, type DeployTarget } from './DeployMenu';
import { DownloadMenu } from './DownloadMenu';
import { MinimizedCodeBlock } from './MinimizedCodeBlock';
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import JSZip from 'jszip';

// ============================================
// TYPES
// ============================================

export interface GeneratedFile {
  path: string;
  content: string;
  language?: string;
  status?: 'generating' | 'pending' | 'validated' | 'error';
  errors?: string[];
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

export interface PreviewPanelV2Props {
  files: GeneratedFile[];
  previewUrl: string | null;
  phase: PreviewPhase;
  phaseMessage: string;
  error: string | null;
  logs: string | null;
  buildTime: number | null;
  autoFixAttempts: number;
  projectName?: string;
  onFix: (feedback: string, voiceTranscript?: string) => Promise<void>;
  onPerfect: () => void;
  onDeployVercel: (projectName: string) => Promise<{ success: boolean; vercelUrl?: string; error?: string }>;
  onPushGitHub: (repoName: string) => Promise<{ success: boolean; githubUrl?: string; error?: string }>;
  onDeployBoth: (projectName: string) => Promise<{ success: boolean; vercelUrl?: string; githubUrl?: string; error?: string }>;
  onRefresh: () => void;
  onClose: () => void;
  isMaximized?: boolean;
  onMaximize?: () => void;
}

// ============================================
// COMPONENT
// ============================================

import { brand, BRAND_NAME } from '@/lib/brand'

export function PreviewPanelV2({
  files,
  previewUrl,
  phase,
  phaseMessage,
  error,
  logs,
  buildTime,
  autoFixAttempts,
  projectName = 'MyApp',
  onFix,
  onPerfect,
  onDeployVercel,
  onPushGitHub,
  onDeployBoth,
  onRefresh,
  onClose,
  isMaximized = false,
  onMaximize
}: PreviewPanelV2Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [deployResult, setDeployResult] = useState<{
    success: boolean;
    vercelUrl?: string;
    githubUrl?: string;
    error?: string;
  } | null>(null);
  const [domainInput, setDomainInput] = useState('');
  const [domainStatus, setDomainStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [domainError, setDomainError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ========================================
  // HANDLERS
  // ========================================

  const handleDeploy = async (target: DeployTarget) => {
    setDeployResult(null);
    
    let result;
    switch (target) {
      case 'vercel':
        result = await onDeployVercel(projectName);
        break;
      case 'github':
        result = await onPushGitHub(projectName);
        break;
      case 'both':
        result = await onDeployBoth(projectName);
        break;
    }
    
    setDeployResult(result);
  };

  const handleCopyCode = useCallback(() => {
    if (files.length === 0) return;
    const allCode = files.map(f => `// ${f.path}\n${f.content}`).join('\n\n');
    navigator.clipboard.writeText(allCode);
  }, [files]);

  const handleCopyUrl = useCallback(() => {
    if (previewUrl) {
      navigator.clipboard.writeText(previewUrl);
    }
  }, [previewUrl]);

  const handleCopyAllFiles = useCallback(() => {
    const content = files.map(f => 
      `// ========================================\n// ${f.path}\n// ========================================\n\n${f.content}`
    ).join('\n\n');
    navigator.clipboard.writeText(content);
  }, [files]);

  const handleExportZip = useCallback(async () => {
    if (files.length === 0) return;

    const zip = new JSZip();
    for (const file of files) {
      const path = file.path.startsWith('/') ? file.path.slice(1) : file.path;
      zip.file(path, file.content);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [files, projectName]);

  const handleRefresh = useCallback(() => {
    if (iframeRef.current && previewUrl) {
      iframeRef.current.src = previewUrl;
    }
    onRefresh();
  }, [previewUrl, onRefresh]);

  const handleConnectDomain = useCallback(async () => {
    const domain = domainInput.trim();
    if (!domain) return;

    setDomainStatus('connecting');
    setDomainError(null);

    try {
      const response = await fetch('/api/deploy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: projectName, domain })
      });

      const data = await response.json();

      if (!response.ok) {
        setDomainStatus('error');
        setDomainError(data.error || 'Failed to connect domain');
        return;
      }

      setDomainStatus('connected');
    } catch (err: unknown) {
      setDomainStatus('error');
      setDomainError((err instanceof Error ? err.message : String(err)) || 'Connection failed');
    }
  }, [domainInput, projectName]);

  const handleMaximize = useCallback(() => {
    onMaximize?.();
  }, [onMaximize]);

  // ========================================
  // COMPUTED
  // ========================================

  const isLoading = ['verifying', 'auto-fixing', 'fixing', 'deploying'].includes(phase);
  const isPreviewReady = phase === 'previewing' && !!previewUrl;
  const hasError = phase === 'error';
  const isComplete = phase === 'complete';

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className={`flex flex-col bg-zinc-900 ${
      isMaximized ? 'fixed inset-0 z-50' : 'h-full'
    }`}>
      {/* Toolbar */}
      <PreviewToolbar
        projectName={projectName}
        isLive={isPreviewReady}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onCopyCode={handleCopyCode}
        onCopyUrl={handleCopyUrl}
        onCopyAllFiles={handleCopyAllFiles}
        onExportZip={handleExportZip}
        onRefresh={handleRefresh}
        onMaximize={handleMaximize}
        onClose={onClose}
        isMaximized={isMaximized}
        previewUrl={previewUrl || undefined}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
            <div className="text-lg font-medium text-white mb-2">
              {phaseMessage || 'Processing...'}
            </div>
            {phase === 'auto-fixing' && autoFixAttempts > 0 && (
              <div className="text-sm text-zinc-400">
                Auto-fix attempt {autoFixAttempts}/3
              </div>
            )}
            {buildTime && (
              <div className="text-sm text-zinc-500 mt-2">
                {(buildTime / 1000).toFixed(1)}s
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {hasError && (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
            <div className="text-lg font-medium text-red-400 mb-2">
              Build Failed
            </div>
            <div className="text-sm text-zinc-400 max-w-md mb-4">
              {error || 'An error occurred during the build process.'}
            </div>
            {logs && (
              <details className="w-full max-w-lg">
                <summary className="text-sm text-zinc-500 cursor-pointer hover:text-zinc-300 mb-2">
                  View build logs
                </summary>
                <pre className="text-xs text-left bg-zinc-800 rounded-lg p-4 overflow-auto max-h-48 text-zinc-400">
                  {logs}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Preview View */}
        {!isLoading && !hasError && viewMode === 'preview' && (
          <>
            {previewUrl ? (
              <iframe
                ref={iframeRef}
                src={previewUrl}
                className="w-full h-full border-0 bg-white"
                title="Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                <div className="text-4xl mb-4"></div>
                <div className="text-sm">Preview will appear here</div>
              </div>
            )}
          </>
        )}

        {/* Code View */}
        {!isLoading && !hasError && viewMode === 'code' && (
          <div className="h-full overflow-auto p-4 space-y-2">
            {files.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                <div className="text-4xl mb-4"></div>
                <div className="text-sm">No files generated yet</div>
              </div>
            ) : (
              files.map((file) => (
                <MinimizedCodeBlock
                  key={file.path}
                  path={file.path}
                  content={file.content}
                  language={file.language}
                  status={file.status || (phase === 'generating' ? 'generating' : 'validated')}
                  errors={file.errors}
                />
              ))
            )}
          </div>
        )}

        {/* Complete State */}
        {isComplete && (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <CheckCircle className="w-10 h-10 text-green-500 mb-4" />
            <div className="text-lg font-medium text-green-400 mb-2">
              Deployment Complete!
            </div>
            {deployResult?.vercelUrl && (
              <a
                href={deployResult.vercelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-2"
              >
                <ExternalLink className="w-4 h-4" />
                {deployResult.vercelUrl}
              </a>
            )}
            {deployResult?.githubUrl && (
              <a
                href={deployResult.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
              >
                <ExternalLink className="w-4 h-4" />
                {deployResult.githubUrl}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Bottom Section - Feedback & Actions */}
      {isPreviewReady && (
        <>
          {/* Feedback Input */}
          <FeedbackInput
            onPerfect={onPerfect}
            onFix={onFix}
            isLoading={(phase as string) === 'fixing'}
            disabled={isLoading}
          />

          {/* Action Buttons */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 bg-zinc-900">
            <DownloadMenu
              files={files}
              projectName={projectName}
              disabled={isLoading}
            />

            <DeployMenu
              onDeploy={handleDeploy}
              isLoading={(phase as string) === 'deploying'}
              disabled={isLoading}
              result={deployResult}
            />
          </div>

          {/* Go Live - Custom Domain */}
          <div className="flex items-center gap-2 px-3 py-2 border-t border-zinc-800" style={{ background: 'rgba(139,92,246,0.05)' }}>
            <span className="text-[10px] font-semibold text-purple-400 whitespace-nowrap flex items-center gap-1">
               Go Live
              <span className="text-[8px] px-1 py-px bg-purple-500 text-white rounded">PRO</span>
            </span>
            <input
              type="text"
              className="flex-1 min-w-0 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-[10px] font-mono text-white placeholder-zinc-500"
              placeholder="yourdomain.com"
              value={domainInput}
              onChange={(e) => { setDomainInput(e.target.value); setDomainStatus('idle'); setDomainError(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConnectDomain(); }}
            />
            <button
              className="px-2.5 py-1 bg-purple-500 border-none rounded text-[10px] font-semibold text-white cursor-pointer whitespace-nowrap hover:bg-purple-400 disabled:opacity-50"
              onClick={handleConnectDomain}
              disabled={!domainInput.trim() || domainStatus === 'connecting'}
            >
              {domainStatus === 'connecting' ? '...' : domainStatus === 'connected' ? '✓' : 'Connect'}
            </button>
            <span className="text-[9px] text-zinc-500 whitespace-nowrap">
              <strong className="text-green-400">$9/mo</strong>
            </span>
          </div>
          {/* Domain status feedback */}
          {domainStatus === 'connected' && (
            <div className="px-3 py-1.5 text-[10px] text-green-400 bg-green-500/10 border-t border-zinc-800">
              ✓ Domain connected! DNS propagation may take 24-48h.
            </div>
          )}
          {domainStatus === 'error' && domainError && (
            <div className="px-3 py-1.5 text-[10px] text-red-400 bg-red-500/10 border-t border-zinc-800">
               {domainError}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PreviewPanelV2;
