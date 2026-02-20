/**
 * FILE ENGINE - Vercel API Integration
 * 
 * Handles all Vercel API calls for:
 * - Preview deployments (build verification)
 * - Production deployments
 * - Deployment status polling
 * - Build log retrieval
 */

// ============================================
// TYPES
// ============================================

export interface VercelFile {
  file: string;
  data: string;
  encoding?: 'base64' | 'utf-8';
}

export interface VercelDeployment {
  id: string;
  url: string;
  readyState: 'QUEUED' | 'BUILDING' | 'INITIALIZING' | 'READY' | 'ERROR' | 'CANCELED';
  createdAt: number;
  buildingAt?: number;
  ready?: number;
  error?: {
    code: string;
    message: string;
  };
  inspectorUrl?: string;
}

export interface DeploymentStatus {
  status: 'queued' | 'building' | 'ready' | 'error';
  url?: string;
  previewUrl?: string;
  error?: string;
  buildLogs?: string;
  buildTime?: number;
}

export interface PreviewResult {
  success: boolean;
  deploymentId: string;
  previewUrl: string;
  status: DeploymentStatus['status'];
  buildTime?: number;
  error?: string;
  logs?: string;
}

export interface DeployResult {
  success: boolean;
  deploymentId: string;
  url: string;
  inspectorUrl?: string;
  error?: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

// ============================================
// CONFIGURATION
// ============================================

const VERCEL_API_BASE = 'https://api.vercel.com';
const MAX_POLL_ATTEMPTS = 60; // 60 * 2s = 2 minutes max wait
const POLL_INTERVAL_MS = 2000;

// Get Vercel token - admin uses env var, users use encrypted stored token
export function getVercelToken(userToken?: string): string | null {
  if (userToken) return userToken;
  return process.env.VERCEL_TOKEN || process.env.ADMIN_VERCEL_TOKEN || null;
}

// ============================================
// FILE PREPARATION
// ============================================

/**
 * Convert generated files to Vercel API format
 */
export function prepareFilesForVercel(files: GeneratedFile[]): VercelFile[] {
  return files.map(file => ({
    file: file.path.startsWith('/') ? file.path.slice(1) : file.path,
    data: Buffer.from(file.content).toString('base64'),
    encoding: 'base64' as const
  }));
}

/**
 * Detect framework from files for proper build settings
 */
export function detectFramework(files: GeneratedFile[]): string {
  const packageJson = files.find(f => f.path === 'package.json' || f.path === '/package.json');
  
  if (packageJson) {
    try {
      const pkg = JSON.parse(packageJson.content);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      if (deps['next']) return 'nextjs';
      if (deps['nuxt'] || deps['nuxt3']) return 'nuxtjs';
      if (deps['gatsby']) return 'gatsby';
      if (deps['svelte'] || deps['@sveltejs/kit']) return 'svelte';
      if (deps['vue']) return 'vue';
      if (deps['@angular/core']) return 'angular';
      if (deps['react']) return 'create-react-app';
      if (deps['express'] || deps['fastify'] || deps['koa']) return 'node';
    } catch (e) {
      console.error('Failed to parse package.json:', e);
    }
  }
  
  // Check for index.html (static site)
  if (files.some(f => f.path === 'index.html' || f.path === '/index.html' || f.path === 'public/index.html')) {
    return 'static';
  }
  
  return 'static';
}

/**
 * Get project settings based on detected framework
 */
export function getProjectSettings(framework: string) {
  const settings: Record<string, any> = {
    nextjs: {
      framework: 'nextjs',
      buildCommand: 'npm run build',
      outputDirectory: '.next',
      installCommand: 'npm install'
    },
    'create-react-app': {
      framework: 'create-react-app',
      buildCommand: 'npm run build',
      outputDirectory: 'build',
      installCommand: 'npm install'
    },
    vue: {
      framework: 'vue',
      buildCommand: 'npm run build',
      outputDirectory: 'dist',
      installCommand: 'npm install'
    },
    svelte: {
      framework: 'svelte',
      buildCommand: 'npm run build',
      outputDirectory: 'build',
      installCommand: 'npm install'
    },
    nuxtjs: {
      framework: 'nuxtjs',
      buildCommand: 'npm run build',
      outputDirectory: '.output',
      installCommand: 'npm install'
    },
    gatsby: {
      framework: 'gatsby',
      buildCommand: 'npm run build',
      outputDirectory: 'public',
      installCommand: 'npm install'
    },
    node: {
      framework: null,
      buildCommand: null,
      outputDirectory: null,
      installCommand: 'npm install'
    },
    static: {
      framework: null,
      buildCommand: null,
      outputDirectory: null,
      installCommand: null
    }
  };
  
  return settings[framework] || settings.static;
}

// ============================================
// CORE API FUNCTIONS
// ============================================

/**
 * Create a preview deployment for build verification
 */
export async function createPreviewDeployment(
  files: GeneratedFile[],
  options: {
    projectName?: string;
    token?: string;
    teamId?: string;
  } = {}
): Promise<PreviewResult> {
  const token = getVercelToken(options.token);
  
  if (!token) {
    return {
      success: false,
      deploymentId: '',
      previewUrl: '',
      status: 'error',
      error: 'Vercel token not configured'
    };
  }

  const framework = detectFramework(files);
  const projectSettings = getProjectSettings(framework);
  const vercelFiles = prepareFilesForVercel(files);
  
  // Generate unique preview name
  const timestamp = Date.now().toString(36);
  const projectName = options.projectName || `fe-preview-${timestamp}`;

  const payload = {
    name: projectName,
    files: vercelFiles,
    target: 'preview',
    projectSettings: {
      ...projectSettings,
      rootDirectory: null
    }
  };

  const teamParam = options.teamId ? `?teamId=${options.teamId}` : '';
  const url = `${VERCEL_API_BASE}/v13/deployments${teamParam}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Vercel deployment error:', errorData);
      return {
        success: false,
        deploymentId: '',
        previewUrl: '',
        status: 'error',
        error: errorData.error?.message || 'Failed to create deployment'
      };
    }

    const deployment: VercelDeployment = await response.json();
    
    return {
      success: true,
      deploymentId: deployment.id,
      previewUrl: `https://${deployment.url}`,
      status: mapVercelStatus(deployment.readyState)
    };

  } catch (error) {
    console.error('Vercel API error:', error);
    return {
      success: false,
      deploymentId: '',
      previewUrl: '',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Poll deployment status until ready or error
 */
export async function waitForDeployment(
  deploymentId: string,
  options: {
    token?: string;
    onProgress?: (status: DeploymentStatus) => void;
    maxAttempts?: number;
  } = {}
): Promise<DeploymentStatus> {
  const token = getVercelToken(options.token);
  const maxAttempts = options.maxAttempts || MAX_POLL_ATTEMPTS;
  
  if (!token) {
    return { status: 'error', error: 'Vercel token not configured' };
  }

  let attempts = 0;
  const startTime = Date.now();

  while (attempts < maxAttempts) {
    attempts++;
    
    try {
      const response = await fetch(`${VERCEL_API_BASE}/v13/deployments/${deploymentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          status: 'error',
          error: error.error?.message || 'Failed to get deployment status'
        };
      }

      const deployment: VercelDeployment = await response.json();
      const status = mapVercelStatus(deployment.readyState);
      
      const currentStatus: DeploymentStatus = {
        status,
        url: deployment.url ? `https://${deployment.url}` : undefined,
        previewUrl: deployment.url ? `https://${deployment.url}` : undefined,
        buildTime: Date.now() - startTime
      };

      // Report progress
      options.onProgress?.(currentStatus);

      // Check if done
      if (status === 'ready') {
        return {
          ...currentStatus,
          buildTime: deployment.ready ? deployment.ready - deployment.createdAt : Date.now() - startTime
        };
      }

      if (status === 'error') {
        // Try to get build logs
        const logs = await getBuildLogs(deploymentId, { token });
        return {
          status: 'error',
          error: deployment.error?.message || 'Build failed',
          buildLogs: logs
        };
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      
    } catch (error) {
      console.error('Error polling deployment:', error);
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  return {
    status: 'error',
    error: 'Deployment timed out',
    buildTime: Date.now() - startTime
  };
}

/**
 * Get build logs for a deployment
 */
export async function getBuildLogs(
  deploymentId: string,
  options: { token?: string } = {}
): Promise<string> {
  const token = getVercelToken(options.token);
  
  if (!token) return '';

  try {
    const response = await fetch(
      `${VERCEL_API_BASE}/v2/deployments/${deploymentId}/events`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (!response.ok) return '';

    const events = await response.json();
    
    // Extract log messages
    const logs = events
      .filter((e: any) => e.type === 'stdout' || e.type === 'stderr')
      .map((e: any) => e.payload?.text || e.text || '')
      .join('\n');

    return logs;
  } catch {
    return '';
  }
}

/**
 * Create a production deployment
 */
export async function createProductionDeployment(
  files: GeneratedFile[],
  options: {
    projectName: string;
    token?: string;
    teamId?: string;
  }
): Promise<DeployResult> {
  const token = getVercelToken(options.token);
  
  if (!token) {
    return {
      success: false,
      deploymentId: '',
      url: '',
      error: 'Vercel token not configured'
    };
  }

  const framework = detectFramework(files);
  const projectSettings = getProjectSettings(framework);
  const vercelFiles = prepareFilesForVercel(files);

  const payload = {
    name: options.projectName,
    files: vercelFiles,
    target: 'production',
    projectSettings: {
      ...projectSettings,
      rootDirectory: null
    }
  };

  const teamParam = options.teamId ? `?teamId=${options.teamId}` : '';
  const url = `${VERCEL_API_BASE}/v13/deployments${teamParam}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        deploymentId: '',
        url: '',
        error: errorData.error?.message || 'Deployment failed'
      };
    }

    const deployment: VercelDeployment = await response.json();
    
    return {
      success: true,
      deploymentId: deployment.id,
      url: `https://${deployment.url}`,
      inspectorUrl: deployment.inspectorUrl
    };

  } catch (error) {
    return {
      success: false,
      deploymentId: '',
      url: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Delete a deployment (for cleanup)
 */
export async function deleteDeployment(
  deploymentId: string,
  options: { token?: string } = {}
): Promise<boolean> {
  const token = getVercelToken(options.token);
  
  if (!token) return false;

  try {
    const response = await fetch(
      `${VERCEL_API_BASE}/v13/deployments/${deploymentId}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    return response.ok;
  } catch {
    return false;
  }
}

// ============================================
// HELPERS
// ============================================

function mapVercelStatus(vercelStatus: string): 'queued' | 'building' | 'ready' | 'error' {
  switch (vercelStatus) {
    case 'QUEUED': return 'queued';
    case 'BUILDING':
    case 'INITIALIZING': return 'building';
    case 'READY': return 'ready';
    case 'ERROR':
    case 'CANCELED': return 'error';
    default: return 'queued';
  }
}

// ============================================
// EXPORTS
// ============================================

export {
  mapVercelStatus,
  VERCEL_API_BASE,
  MAX_POLL_ATTEMPTS,
  POLL_INTERVAL_MS
};
