'use client';

/**
 * FILE ENGINE - Minimized Code Block
 * 
 * Shows file generation progress with:
 * - Animated "generating..." state
 * - Click to expand/collapse
 * - Status indicators (pending, validated, error)
 */

import { useState } from 'react';
import {
  FileCode,
  ChevronDown,
  ChevronRight,
  Check,
  AlertCircle,
  Loader2,
  Copy,
  Pause,
  Play
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export type FileStatus = 'generating' | 'paused' | 'pending' | 'validated' | 'error';

export interface MinimizedCodeBlockProps {
  path: string;
  content: string;
  language?: string;
  status?: FileStatus;
  errors?: string[];
  onCopy?: () => void;
  onPause?: () => void;
  onResume?: () => void;
}

// ============================================
// COMPONENT
// ============================================

export function MinimizedCodeBlock({
  path,
  content,
  language = 'typescript',
  status = 'pending',
  errors = [],
  onCopy,
  onPause,
  onResume
}: MinimizedCodeBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const fileName = path.split('/').pop() || path;
  const lineCount = content.split('\n').length;
  const charCount = content.length;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(content);
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = () => {
    switch (status) {
      case 'generating':
        return 'border-blue-500/50 bg-blue-500/5';
      case 'paused':
        return 'border-yellow-500/50 bg-yellow-500/5';
      case 'validated':
        return 'border-green-500/50 bg-green-500/5';
      case 'error':
        return 'border-red-500/50 bg-red-500/5';
      default:
        return 'border-zinc-700 bg-zinc-800/50';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'generating':
        return <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />;
      case 'paused':
        return <Pause className="w-3.5 h-3.5 text-yellow-400" />;
      case 'validated':
        return <Check className="w-3.5 h-3.5 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
      default:
        return <FileCode className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'generating':
        return 'generating...';
      case 'paused':
        return 'paused';
      case 'validated':
        return 'validated';
      case 'error':
        return 'error';
      default:
        return 'pending';
    }
  };

  return (
    <div className={`rounded-lg border transition-all ${getStatusColor()}`}>
      {/* Header - Always Visible */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-zinc-800/50 transition-colors"
      >
        {/* Expand/Collapse Icon */}
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-500" />
        )}

        {/* Status Icon */}
        {getStatusIcon()}

        {/* File Name */}
        <span className="font-mono text-sm text-white flex-1 truncate">
          {fileName}
        </span>

        {/* Status/Progress */}
        {status === 'generating' ? (
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 animate-pulse" />
            </div>
            <span className="text-xs text-blue-400">{getStatusText()}</span>
          </div>
        ) : (
          <span className={`text-xs ${
            status === 'validated' ? 'text-green-400' :
            status === 'error' ? 'text-red-400' :
            status === 'paused' ? 'text-yellow-400' :
            'text-zinc-500'
          }`}>
            {getStatusText()}
          </span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 ml-2">
          {status === 'generating' && onPause && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPause();
              }}
              className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded transition-colors"
              title="Pause generation"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          )}
          {status === 'paused' && onResume && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onResume();
              }}
              className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded transition-colors"
              title="Resume generation"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          )}
          {content && (
            <button
              onClick={handleCopy}
              className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded transition-colors"
              title="Copy code"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && content && (
        <div className="border-t border-zinc-700/50">
          {/* Code Preview */}
          <div className="max-h-[300px] overflow-auto">
            <pre className="p-3 text-xs font-mono text-zinc-300 whitespace-pre-wrap break-all">
              {content}
            </pre>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-3 py-1.5 border-t border-zinc-700/50 text-xs text-zinc-500">
            <span>{language}</span>
            <span>{lineCount} lines · {charCount} chars</span>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="px-3 py-2 border-t border-red-900/50 bg-red-900/20">
              {errors.map((error, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-red-400">
                  <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MinimizedCodeBlock;
