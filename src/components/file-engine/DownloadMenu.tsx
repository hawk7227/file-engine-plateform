'use client';

/**
 * FILE ENGINE - Download Menu
 * 
 * Dropdown menu for download options:
 * - Download ZIP
 * - Download specific files
 * - Copy to clipboard
 */

import { useState, useRef, useEffect } from 'react';
import {
  Download,
  ChevronDown,
  Package,
  FileCode,
  Copy,
  Check,
  Loader2
} from 'lucide-react';
import JSZip from 'jszip';

// ============================================
// TYPES
// ============================================

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface DownloadMenuProps {
  files: GeneratedFile[];
  projectName?: string;
  disabled?: boolean;
}

// ============================================
// COMPONENT
// ============================================

import { brand, BRAND_NAME } from '@/lib/brand'

export function DownloadMenu({
  files,
  projectName = `${BRAND_NAME.toLowerCase().replace(/\s+/g, '-')}-project`,
  disabled = false
}: DownloadMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowFilePicker(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Download as ZIP
  const downloadZip = async () => {
    if (files.length === 0) return;

    setDownloading(true);
    setIsOpen(false);

    try {
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
    } catch (error) {
      console.error('Error creating ZIP:', error);
    } finally {
      setDownloading(false);
    }
  };

  // Download selected files
  const downloadSelectedFiles = async () => {
    if (selectedFiles.size === 0) return;

    setDownloading(true);

    try {
      if (selectedFiles.size === 1) {
        // Single file - download directly
        const filePath = Array.from(selectedFiles)[0];
        const file = files.find(f => f.path === filePath);
        if (file) {
          const blob = new Blob([file.content], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.path.split('/').pop() || 'file.txt';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } else {
        // Multiple files - create ZIP
        const zip = new JSZip();
        
        for (const filePath of selectedFiles) {
          const file = files.find(f => f.path === filePath);
          if (file) {
            const path = file.path.startsWith('/') ? file.path.slice(1) : file.path;
            zip.file(path, file.content);
          }
        }

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName}-selected.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading files:', error);
    } finally {
      setDownloading(false);
      setShowFilePicker(false);
      setSelectedFiles(new Set());
    }
  };

  // Copy all files to clipboard
  const copyToClipboard = async () => {
    if (files.length === 0) return;

    const content = files.map(f => 
      `// ${f.path}\n${f.content}`
    ).join('\n\n// ========================================\n\n');

    await navigator.clipboard.writeText(content);
    setCopied(true);
    setIsOpen(false);
    setTimeout(() => setCopied(false), 2000);
  };

  // Toggle file selection
  const toggleFile = (path: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    setSelectedFiles(newSelected);
  };

  // Select/deselect all
  const toggleAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.path)));
    }
  };

  const isDisabled = disabled || files.length === 0;

  return (
    <div className="relative" ref={menuRef}>
      {/* Main Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDisabled || downloading}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
          copied
            ? 'bg-green-600 text-white'
            : 'bg-zinc-700 hover:bg-zinc-600 text-white'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {downloading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Downloading...
          </>
        ) : copied ? (
          <>
            <Check className="w-4 h-4" />
            Copied!
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Download
            <ChevronDown className="w-3 h-3" />
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && !downloading && !showFilePicker && (
        <div className="absolute right-0 bottom-full mb-2 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 py-1">
          <button
            onClick={downloadZip}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            <Package className="w-4 h-4" />
            Download ZIP
          </button>
          <button
            onClick={() => {
              setShowFilePicker(true);
              setSelectedFiles(new Set());
            }}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            <FileCode className="w-4 h-4" />
            Download Files...
          </button>
          <div className="my-1 border-t border-zinc-700" />
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            <Copy className="w-4 h-4" />
            Copy to Clipboard
          </button>
        </div>
      )}

      {/* File Picker */}
      {showFilePicker && (
        <div className="absolute right-0 bottom-full mb-2 w-72 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50">
          <div className="p-3 border-b border-zinc-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">Select files</span>
              <button
                onClick={toggleAll}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                {selectedFiles.size === files.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
          </div>
          
          <div className="max-h-60 overflow-y-auto p-2">
            {files.map(file => (
              <label
                key={file.path}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedFiles.has(file.path)}
                  onChange={() => toggleFile(file.path)}
                  className="rounded border-zinc-600 bg-zinc-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                />
                <FileCode className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                <span className="text-sm text-zinc-300 truncate">
                  {file.path.split('/').pop()}
                </span>
              </label>
            ))}
          </div>

          <div className="p-3 border-t border-zinc-700 flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              {selectedFiles.size} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowFilePicker(false);
                  setSelectedFiles(new Set());
                }}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={downloadSelectedFiles}
                disabled={selectedFiles.size === 0}
                className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-50"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DownloadMenu;
