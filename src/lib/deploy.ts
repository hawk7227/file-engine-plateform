import { supabase } from './supabase'
import { BRAND_NAME } from '@/lib/brand'

// =====================================================
// GITHUB INTEGRATION
// =====================================================

interface GitHubRepo {
  id: number
  name: string
  full_name: string
  html_url: string
  clone_url: string
  default_branch: string
}

interface GitHubFile {
  path: string
  content: string
}

// Create a new GitHub repository
export async function createGitHubRepo(
  name: string,
  description: string = '',
  isPrivate: boolean = false
): Promise<{ repo: GitHubRepo | null; error: string | null }> {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    return { repo: null, error: 'GitHub token not configured' }
  }

  try {
    const res = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        name,
        description,
        private: isPrivate,
        auto_init: true
      })
    })

    if (!res.ok) {
      const error = await res.json()
      return { repo: null, error: error.message || 'Failed to create repository' }
    }

    const repo = await res.json()
    return { repo, error: null }
  } catch (err: unknown) {
    return { repo: null, error: (err instanceof Error ? err.message : String(err)) }
  }
}

// Push files to a GitHub repository
export async function pushToGitHub(
  repoFullName: string,
  files: GitHubFile[],
  commitMessage: string = `Update from ${BRAND_NAME}`
): Promise<{ success: boolean; error: string | null }> {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    return { success: false, error: 'GitHub token not configured' }
  }

  try {
    // Get the default branch's latest commit SHA
    const refRes = await fetch(
      `https://api.github.com/repos/${repoFullName}/git/ref/heads/main`,
      {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    )

    let baseSha: string
    if (refRes.ok) {
      const refData = await refRes.json()
      baseSha = refData.object.sha
    } else {
      // Try 'master' branch
      const masterRes = await fetch(
        `https://api.github.com/repos/${repoFullName}/git/ref/heads/master`,
        {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      )
      if (!masterRes.ok) {
        return { success: false, error: 'Could not find default branch' }
      }
      const masterData = await masterRes.json()
      baseSha = masterData.object.sha
    }

    // Create blobs for each file
    const blobs = await Promise.all(
      files.map(async (file) => {
        const blobRes = await fetch(
          `https://api.github.com/repos/${repoFullName}/git/blobs`,
          {
            method: 'POST',
            headers: {
              'Authorization': `token ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
              content: Buffer.from(file.content).toString('base64'),
              encoding: 'base64'
            })
          }
        )
        const blobData = await blobRes.json()
        return {
          path: file.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: blobData.sha
        }
      })
    )

    // Create a new tree
    const treeRes = await fetch(
      `https://api.github.com/repos/${repoFullName}/git/trees`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          base_tree: baseSha,
          tree: blobs
        })
      }
    )
    const treeData = await treeRes.json()

    // Create a new commit
    const commitRes = await fetch(
      `https://api.github.com/repos/${repoFullName}/git/commits`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: commitMessage,
          tree: treeData.sha,
          parents: [baseSha]
        })
      }
    )
    const commitData = await commitRes.json()

    // Update the reference
    await fetch(
      `https://api.github.com/repos/${repoFullName}/git/refs/heads/main`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          sha: commitData.sha,
          force: true
        })
      }
    )

    return { success: true, error: null }
  } catch (err: unknown) {
    return { success: false, error: (err instanceof Error ? err.message : String(err)) }
  }
}

// Deploy project to GitHub + Vercel
export async function deployToGitHubAndVercel(
  projectId: string,
  projectName: string,
  files: { path: string; content: string }[]
): Promise<{
  githubUrl: string | null
  vercelUrl: string | null
  error: string | null
}> {
  // Create GitHub repo
  const { repo, error: repoError } = await createGitHubRepo(
    projectName.toLowerCase().replace(/\s+/g, '-'),
    `Generated by ${BRAND_NAME}`,
    false
  )

  if (repoError || !repo) {
    return { githubUrl: null, vercelUrl: null, error: repoError || 'Failed to create repo' }
  }

  // Push files to GitHub
  const { success, error: pushError } = await pushToGitHub(
    repo.full_name,
    files,
    `Initial commit from ${BRAND_NAME}`
  )

  if (!success) {
    return { githubUrl: repo.html_url, vercelUrl: null, error: pushError }
  }

  // Deploy to Vercel
  const deployResult = await deployToVercel(projectId, 'anonymous', {})

  // Update project with GitHub URL
  await supabase
    .from('projects')
    .update({
      github_repo: repo.html_url,
      deploy_url: deployResult.url || null
    })
    .eq('id', projectId)

  return {
    githubUrl: repo.html_url,
    vercelUrl: deployResult.url,
    error: deployResult.status === 'error' ? 'Deployment failed' : null
  }
}

// =====================================================
// VERCEL DEPLOYMENT (existing code)
// =====================================================

// Vercel API types
interface VercelFile {
  file: string
  data: string
  encoding?: 'base64' | 'utf-8'
}

interface VercelDeployment {
  id: string
  url: string
  readyState: 'QUEUED' | 'BUILDING' | 'READY' | 'ERROR'
  createdAt: number
  inspectorUrl?: string
}

interface DeploymentResult {
  id: string
  url: string
  previewUrl: string
  inspectorUrl: string
  status: 'queued' | 'building' | 'ready' | 'error'
  createdAt: string
}

// Framework detection from files
export function detectFramework(files: { path: string; content: string }[]): string {
  const packageJson = files.find(f => f.path === 'package.json')
  if (packageJson) {
    try {
      const pkg = JSON.parse(packageJson.content)
      const deps = { ...pkg.dependencies, ...pkg.devDependencies }

      if (deps['next']) return 'nextjs'
      if (deps['nuxt']) return 'nuxtjs'
      if (deps['gatsby']) return 'gatsby'
      if (deps['svelte'] || deps['@sveltejs/kit']) return 'svelte'
      if (deps['vue']) return 'vue'
      if (deps['@angular/core']) return 'angular'
      if (deps['react']) return 'create-react-app'
      if (deps['express'] || deps['fastify'] || deps['koa']) return 'node'
    } catch (e) {
      // Invalid JSON, continue detection
    }
  }

  // Check for index.html (static site)
  if (files.some(f => f.path === 'index.html' || f.path === 'public/index.html')) {
    return 'static'
  }

  return 'static' // Default to static
}

// Generate project settings based on framework
function getProjectSettings(framework: string) {
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
  }

  return settings[framework] || settings.static
}

// Deploy project to Vercel
export async function deployToVercel(
  projectId: string,
  userId: string,
  options: {
    production?: boolean
    customDomain?: string
  } = {}
): Promise<DeploymentResult> {
  const VERCEL_TOKEN = process.env.VERCEL_TOKEN
  const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID

  if (!VERCEL_TOKEN) {
    throw new Error('VERCEL_TOKEN not configured')
  }

  // Get project files from database
  const { data: files, error: filesError } = await supabase
    .from('files')
    .select('path, content, mime_type')
    .eq('project_id', projectId)
    .eq('type', 'generated')

  if (filesError || !files || files.length === 0) {
    throw new Error('No files found for deployment')
  }

  // Get project info
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('name, type')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    throw new Error('Project not found')
  }

  // Detect framework
  const framework = detectFramework(files)
  const projectSettings = getProjectSettings(framework)

  // Prepare files for Vercel API
  const vercelFiles: VercelFile[] = files.map((file: any) => ({
    file: file.path.startsWith('/') ? file.path.slice(1) : file.path,
    data: Buffer.from(file.content).toString('base64'),
    encoding: 'base64'
  }))

  // Generate unique project name
  const projectName = `fe-${projectId.slice(0, 8)}`

  // Create deployment via Vercel API
  const deploymentPayload = {
    name: projectName,
    files: vercelFiles,
    target: options.production ? 'production' : 'preview',
    projectSettings: {
      ...projectSettings,
      rootDirectory: null
    }
  }

  const vercelUrl = VERCEL_TEAM_ID
    ? `https://api.vercel.com/v13/deployments?teamId=${VERCEL_TEAM_ID}`
    : 'https://api.vercel.com/v13/deployments'

  const response = await fetch(vercelUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(deploymentPayload)
  })

  if (!response.ok) {
    const errorData = await response.json()
    console.error('Vercel deployment error:', errorData)
    throw new Error(errorData.error?.message || 'Deployment failed')
  }

  const deployment: VercelDeployment = await response.json()

  // Save deployment record to database
  const { data: deploymentRecord, error: dbError } = await supabase
    .from('deployments')
    .insert({
      project_id: projectId,
      user_id: userId,
      vercel_deployment_id: deployment.id,
      url: `https://${deployment.url}`,
      status: mapVercelStatus(deployment.readyState),
      framework,
      production: options.production || false
    })
    .select()
    .single()

  if (dbError) {
    console.error('Failed to save deployment record:', dbError)
  }

  // Update project with latest deployment
  await supabase
    .from('projects')
    .update({
      last_deployment_url: `https://${deployment.url}`,
      status: 'deployed',
      updated_at: new Date().toISOString()
    })
    .eq('id', projectId)

  return {
    id: deployment.id,
    url: `https://${deployment.url}`,
    previewUrl: `https://${deployment.url}`,
    inspectorUrl: deployment.inspectorUrl || `https://vercel.com/${projectName}/${deployment.id}`,
    status: mapVercelStatus(deployment.readyState),
    createdAt: new Date(deployment.createdAt).toISOString()
  }
}

// Check deployment status
export async function getDeploymentStatus(deploymentId: string): Promise<{
  status: 'queued' | 'building' | 'ready' | 'error'
  url?: string
  error?: string
}> {
  const VERCEL_TOKEN = process.env.VERCEL_TOKEN

  if (!VERCEL_TOKEN) {
    throw new Error('VERCEL_TOKEN not configured')
  }

  const response = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`
    }
  })

  if (!response.ok) {
    throw new Error('Failed to get deployment status')
  }

  const deployment = await response.json()

  return {
    status: mapVercelStatus(deployment.readyState),
    url: deployment.url ? `https://${deployment.url}` : undefined,
    error: deployment.errorMessage
  }
}

// Map Vercel status to our status
function mapVercelStatus(vercelStatus: string): 'queued' | 'building' | 'ready' | 'error' {
  switch (vercelStatus) {
    case 'QUEUED': return 'queued'
    case 'BUILDING':
    case 'INITIALIZING': return 'building'
    case 'READY': return 'ready'
    case 'ERROR':
    case 'CANCELED': return 'error'
    default: return 'queued'
  }
}

// Set custom domain for project
export async function setCustomDomain(
  projectId: string,
  domain: string
): Promise<{ success: boolean; error?: string }> {
  const VERCEL_TOKEN = process.env.VERCEL_TOKEN
  const projectName = `fe-${projectId.slice(0, 8)}`

  if (!VERCEL_TOKEN) {
    throw new Error('VERCEL_TOKEN not configured')
  }

  // Add domain to Vercel project
  const response = await fetch(`https://api.vercel.com/v10/projects/${projectName}/domains`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: domain })
  })

  if (!response.ok) {
    const error = await response.json()
    return { success: false, error: error.error?.message || 'Failed to add domain' }
  }

  // Update project in database
  await supabase
    .from('projects')
    .update({ custom_domain: domain })
    .eq('id', projectId)

  return { success: true }
}

// Get deployment history for project
export async function getDeploymentHistory(projectId: string, limit = 10) {
  const { data, error } = await supabase
    .from('deployments')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}
