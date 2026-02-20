/**
 * FILE ENGINE - Auto-Fix Engine
 * 
 * Automatically fixes build errors using Claude AI.
 * Supports up to 3 retry attempts before failing.
 */

import { generate, parseCodeBlocks } from '@/lib/ai';

// ============================================
// TYPES
// ============================================

export interface AutoFixResult {
  success: boolean;
  fixedFiles: GeneratedFile[];
  explanation: string;
  attemptNumber: number;
  changedFiles: string[];
  confidence: number;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface AutoFixOptions {
  maxAttempts?: number;
  model?: string;
  apiKey?: string;
}

// ============================================
// MAIN AUTO-FIX FUNCTION
// ============================================

/**
 * Attempt to automatically fix build errors
 */
export async function autoFixErrors(
  files: GeneratedFile[],
  errorLogs: string,
  options: AutoFixOptions = {}
): Promise<AutoFixResult> {
  const {
    maxAttempts = 3,
    model = 'claude-sonnet-4',
    apiKey
  } = options;

  const prompt = buildAutoFixPrompt(files, errorLogs);
  
  try {
    // Generate fix using AI
    let fullResponse = '';
    for await (const chunk of generate(prompt, model as any, apiKey)) {
      fullResponse += chunk;
    }

    // Parse the response
    const { fixedFiles, explanation, changedFiles } = parseAutoFixResponse(fullResponse, files);

    if (fixedFiles.length === 0) {
      return {
        success: false,
        fixedFiles: files,
        explanation: 'Could not parse fix from AI response',
        attemptNumber: 1,
        changedFiles: [],
        confidence: 0
      };
    }

    // Calculate confidence based on how many files were changed
    const confidence = Math.min(0.95, 0.7 + (changedFiles.length * 0.05));

    return {
      success: true,
      fixedFiles,
      explanation,
      attemptNumber: 1,
      changedFiles,
      confidence
    };

  } catch (error) {
    console.error('Auto-fix error:', error);
    return {
      success: false,
      fixedFiles: files,
      explanation: error instanceof Error ? error.message : 'Unknown error',
      attemptNumber: 1,
      changedFiles: [],
      confidence: 0
    };
  }
}

// ============================================
// PROMPT BUILDER
// ============================================

function buildAutoFixPrompt(files: GeneratedFile[], errorLogs: string): string {
  const fileList = files.map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n');

  return `You are an expert code debugger. Fix the build errors in the following code.

## BUILD ERROR LOGS:
\`\`\`
${errorLogs}
\`\`\`

## CURRENT FILES:
${fileList}

## INSTRUCTIONS:
1. Analyze the error logs carefully
2. Identify the root cause of each error
3. Fix ALL errors - don't just fix one
4. Keep all existing functionality intact
5. Do NOT remove any code unless it's causing the error
6. Do NOT add new features
7. Fix missing imports, type errors, syntax errors, etc.

## OUTPUT FORMAT:
For each file that needs changes, output it in this exact format:

\`\`\`typescript:path/to/file.ts
[complete fixed code]
\`\`\`

After all files, explain what you fixed:

FIXES:
- [describe each fix]

Only output files that you actually changed. If a file doesn't need changes, don't include it.`;
}

// ============================================
// RESPONSE PARSER
// ============================================

function parseAutoFixResponse(
  response: string,
  originalFiles: GeneratedFile[]
): {
  fixedFiles: GeneratedFile[];
  explanation: string;
  changedFiles: string[];
} {
  // Parse code blocks from response
  const parsedFiles = parseCodeBlocks(response);
  
  // Build map of original files
  const originalMap = new Map(originalFiles.map(f => [f.path, f]));
  
  // Track which files were changed
  const changedFiles: string[] = [];
  
  // Merge fixed files with originals
  const fixedFiles: GeneratedFile[] = [...originalFiles];
  
  for (const parsed of parsedFiles) {
    // Find matching original file (handle path variations)
    const matchingPath = findMatchingPath(parsed.filepath, originalFiles);
    
    if (matchingPath) {
      const idx = fixedFiles.findIndex(f => f.path === matchingPath);
      if (idx !== -1) {
        // Check if content actually changed
        if (fixedFiles[idx].content !== parsed.content) {
          fixedFiles[idx] = {
            path: matchingPath,
            content: parsed.content
          };
          changedFiles.push(matchingPath);
        }
      }
    } else {
      // New file added
      fixedFiles.push({
        path: parsed.filepath,
        content: parsed.content
      });
      changedFiles.push(parsed.filepath);
    }
  }

  // Extract explanation
  const explanation = extractExplanation(response);

  return {
    fixedFiles,
    explanation,
    changedFiles
  };
}

function findMatchingPath(filepath: string, files: GeneratedFile[]): string | null {
  // Direct match
  const direct = files.find(f => f.path === filepath);
  if (direct) return direct.path;

  // Match without leading slash
  const noSlash = files.find(f => 
    f.path === filepath.replace(/^\//, '') ||
    f.path === '/' + filepath
  );
  if (noSlash) return noSlash.path;

  // Match by filename only
  const filename = filepath.split('/').pop();
  const byName = files.find(f => f.path.endsWith('/' + filename) || f.path === filename);
  if (byName) return byName.path;

  return null;
}

function extractExplanation(response: string): string {
  // Look for FIXES: section
  const fixesMatch = response.match(/FIXES?:[\s\S]*$/i);
  if (fixesMatch) {
    return fixesMatch[0]
      .replace(/^FIXES?:\s*/i, '')
      .split('```')[0]
      .trim();
  }

  // Look for any text after the last code block
  const parts = response.split('```');
  if (parts.length > 2) {
    const afterCode = parts[parts.length - 1].trim();
    if (afterCode.length > 10) {
      return afterCode;
    }
  }

  return 'Applied automatic fixes based on error analysis.';
}

// ============================================
// USER FIX FUNCTION
// ============================================

/**
 * Fix code based on user feedback
 */
export async function userRequestedFix(
  files: GeneratedFile[],
  userFeedback: string,
  options: {
    previewUrl?: string;
    model?: string;
    apiKey?: string;
  } = {}
): Promise<AutoFixResult> {
  const { model = 'claude-sonnet-4', apiKey, previewUrl } = options;

  const prompt = buildUserFixPrompt(files, userFeedback, previewUrl);

  try {
    let fullResponse = '';
    for await (const chunk of generate(prompt, model as any, apiKey)) {
      fullResponse += chunk;
    }

    const { fixedFiles, explanation, changedFiles } = parseAutoFixResponse(fullResponse, files);

    return {
      success: changedFiles.length > 0,
      fixedFiles,
      explanation,
      attemptNumber: 1,
      changedFiles,
      confidence: changedFiles.length > 0 ? 0.85 : 0.5
    };

  } catch (error) {
    return {
      success: false,
      fixedFiles: files,
      explanation: error instanceof Error ? error.message : 'Unknown error',
      attemptNumber: 1,
      changedFiles: [],
      confidence: 0
    };
  }
}

function buildUserFixPrompt(
  files: GeneratedFile[],
  userFeedback: string,
  previewUrl?: string
): string {
  const fileList = files.map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n');

  return `You are an expert developer. The user has tested the preview and wants changes made.

## USER FEEDBACK:
"${userFeedback}"

${previewUrl ? `## PREVIEW URL: ${previewUrl}` : ''}

## CURRENT FILES:
${fileList}

## INSTRUCTIONS:
1. Understand what the user wants changed
2. Make ONLY the requested changes
3. Keep all other functionality intact
4. Do NOT remove any code unless the user explicitly asked
5. Do NOT add new features unless the user asked

## OUTPUT FORMAT:
For each file that needs changes, output it in this exact format:

\`\`\`typescript:path/to/file.ts
[complete fixed code]
\`\`\`

After all files, explain what you changed:

CHANGES:
- [describe each change]

Only output files that you actually changed.`;
}

// ============================================
// EXPORTS
// ============================================

export {
  buildAutoFixPrompt,
  buildUserFixPrompt,
  parseAutoFixResponse
};
