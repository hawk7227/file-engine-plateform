'use client';

/**
 * FILE ENGINE - Deploy Menu
 * 
 * Dropdown menu for deployment options:
 * - Deploy to Vercel
 * - Push to GitHub
 * - Both (Vercel + GitHub)
 */

import { useState, useRef, useEffect } from 'react';
import {
  Rocket,
  ChevronDown,
  ExternalLink,
  Loader2,
  Check,
  AlertCircle
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export type DeployTarget = 'vercel' | 'github' | 'both';

export interface DeployMenuProps {
  onDeploy: (target: DeployTarget) => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
  result?: {
    success: boolean;
    vercelUrl?: string;
    githubUrl?: string;
    error?: string;
  } | null;
}

// ============================================
// ICONS
// ============================================

const VercelIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M24 22.525H0l12-21.05 12 21.05z" />
  </svg>
);

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

// ============================================
// COMPONENT
// ============================================

export function DeployMenu({
  onDeploy,
  isLoading = false,
  disabled = false,
  result
}: DeployMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deploying, setDeploying] = useState<DeployTarget | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDeploy = async (target: DeployTarget) => {
    setDeploying(target);
    setIsOpen(false);
    try {
      await onDeploy(target);
    } finally {
      setDeploying(null);
    }
  };

  const isDisabled = disabled || isLoading || deploying !== null;

  return (
    <div className="relative" ref={menuRef}>
      {/* Main Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDisabled}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
          result?.success
            ? 'bg-green-600 text-white'
            : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {deploying ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Deploying...
          </>
        ) : result?.success ? (
          <>
            <Check className="w-4 h-4" />
            Deployed!
          </>
        ) : (
          <>
            <Rocket className="w-4 h-4" />
            Deploy
            <ChevronDown className="w-3 h-3" />
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && !deploying && (
        <div className="absolute right-0 bottom-full mb-2 w-56 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 py-1">
          <button
            onClick={() => handleDeploy('vercel')}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            <VercelIcon />
            Deploy to Vercel
          </button>
          <button
            onClick={() => handleDeploy('github')}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            <GitHubIcon />
            Push to GitHub
          </button>
          <div className="my-1 border-t border-zinc-700" />
          <button
            onClick={() => handleDeploy('both')}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-1">
              <VercelIcon />
              <span className="text-zinc-500">+</span>
              <GitHubIcon />
            </div>
            Both (Vercel + GitHub)
          </button>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className={`absolute right-0 bottom-full mb-2 w-72 p-3 rounded-lg shadow-xl z-50 ${
          result.success ? 'bg-green-900/90 border border-green-700' : 'bg-red-900/90 border border-red-700'
        }`}>
          {result.success ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-400 font-medium">
                <Check className="w-4 h-4" />
                Deployment successful!
              </div>
              {result.vercelUrl && (
                <a
                  href={result.vercelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-green-300 hover:text-green-200 transition-colors"
                >
                  <VercelIcon />
                  <span className="truncate flex-1">{result.vercelUrl}</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              )}
              {result.githubUrl && (
                <a
                  href={result.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-green-300 hover:text-green-200 transition-colors"
                >
                  <GitHubIcon />
                  <span className="truncate flex-1">{result.githubUrl}</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-red-400 font-medium">Deployment failed</div>
                <div className="text-sm text-red-300 mt-1">{result.error}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DeployMenu;
