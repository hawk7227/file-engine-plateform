'use client';

/**
 * FILE ENGINE - Preview Toolbar
 * 
 * Toolbar for the preview panel with:
 * - Preview/Code toggle
 * - Project name and status
 * - Copy menu
 * - Refresh, Maximize, Close buttons
 */

import { useState, useRef, useEffect } from 'react';
import {
  Eye,
  Code,
  Copy,
  Check,
  RefreshCw,
  Maximize2,
  Minimize2,
  X,
  ChevronDown,
  Link,
  FileCode,
  Package,
  ExternalLink
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export type ViewMode = 'preview' | 'code';

export interface PreviewToolbarProps {
  projectName?: string;
  isLive?: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onCopyCode: () => void;
  onCopyUrl: () => void;
  onCopyAllFiles: () => void;
  onExportZip: () => void;
  onRefresh: () => void;
  onMaximize: () => void;
  onClose: () => void;
  isMaximized?: boolean;
  previewUrl?: string;
}

// ============================================
// COMPONENT
// ============================================

export function PreviewToolbar({
  projectName = 'MyApp',
  isLive = true,
  viewMode,
  onViewModeChange,
  onCopyCode,
  onCopyUrl,
  onCopyAllFiles,
  onExportZip,
  onRefresh,
  onMaximize,
  onClose,
  isMaximized = false,
  previewUrl
}: PreviewToolbarProps) {
  const [copyMenuOpen, setCopyMenuOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const copyMenuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (copyMenuRef.current && !copyMenuRef.current.contains(event.target as Node)) {
        setCopyMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = (action: () => void, label: string) => {
    action();
    setCopied(label);
    setCopyMenuOpen(false);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800">
      {/* Left: View Mode Toggle */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-zinc-800 rounded-lg p-0.5">
          <button
            onClick={() => onViewModeChange('preview')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === 'preview'
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Preview</span>
          </button>
          <button
            onClick={() => onViewModeChange('code')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === 'code'
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Code</span>
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-zinc-700 mx-1" />

        {/* Project Name & Status */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{projectName}</span>
          {isLive && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Live
            </span>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Copy Menu */}
        <div className="relative" ref={copyMenuRef}>
          <button
            onClick={() => setCopyMenuOpen(!copyMenuOpen)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-colors ${
              copied
                ? 'text-green-400'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{copied}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy</span>
                <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>

          {copyMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 py-1">
              <button
                onClick={() => handleCopy(onCopyCode, 'Code copied!')}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
              >
                <FileCode className="w-4 h-4" />
                Copy code
              </button>
              {previewUrl && (
                <button
                  onClick={() => handleCopy(onCopyUrl, 'URL copied!')}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                >
                  <Link className="w-4 h-4" />
                  Copy preview URL
                </button>
              )}
              <button
                onClick={() => handleCopy(onCopyAllFiles, 'Files copied!')}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
              >
                <Copy className="w-4 h-4" />
                Copy all files
              </button>
              <div className="my-1 border-t border-zinc-700" />
              <button
                onClick={() => { onExportZip(); setCopyMenuOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
              >
                <Package className="w-4 h-4" />
                Export as ZIP
              </button>
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                  onClick={() => setCopyMenuOpen(false)}
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in new tab
                </a>
              )}
            </div>
          )}
        </div>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
          title="Refresh preview"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Maximize */}
        <button
          onClick={onMaximize}
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>

        {/* Close */}
        <button
          onClick={onClose}
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
          title="Close preview"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default PreviewToolbar;
