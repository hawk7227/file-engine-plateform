import { createAppAuth } from '@octokit/auth-app'
import { Octokit } from '@octokit/rest'

// ── Config ────────────────────────────────────────────────────────────────────
function getGithubConfig() {
  const appId = process.env.GITHUB_APP_ID
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY
  const installationId = process.env.GITHUB_INSTALLATION_ID

  if (!appId) throw new Error('GITHUB_APP_ID is not set')
  if (!privateKey) throw new Error('GITHUB_APP_PRIVATE_KEY is not set')
  if (!installationId) throw new Error('GITHUB_INSTALLATION_ID is not set')

  return {
    appId: Number(appId),
    privateKey: privateKey.replace(/\\n/g, '\n'),
    installationId: Number(installationId),
  }
}

// ── Authenticated Octokit client (auto-refreshes installation token) ──────────
export async function getOctokit(): Promise<Octokit> {
  const { appId, privateKey, installationId } = getGithubConfig()

  const auth = createAppAuth({ appId, privateKey, installationId })
  const { token } = await auth({ type: 'installation' })

  return new Octokit({ auth: token })
}

// ── Agent operations ──────────────────────────────────────────────────────────

export async function readFile(owner: string, repo: string, path: string, ref = 'main'): Promise<string> {
  const octokit = await getOctokit()
  const { data } = await octokit.repos.getContent({ owner, repo, path, ref })
  if (Array.isArray(data) || data.type !== 'file') throw new Error(`${path} is not a file`)
  return Buffer.from(data.content, 'base64').toString('utf-8')
}

export async function listFiles(owner: string, repo: string, branch = 'main'): Promise<string[]> {
  const octokit = await getOctokit()
  const { data } = await octokit.git.getTree({ owner, repo, tree_sha: branch, recursive: '1' })
  return (data.tree ?? [])
    .filter(f => f.type === 'blob' && f.path)
    .map(f => f.path!)
}

export async function createOrUpdateFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch = 'main'
): Promise<void> {
  const octokit = await getOctokit()

  // Get existing SHA if file exists (required for updates)
  let sha: string | undefined
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path, ref: branch })
    if (!Array.isArray(data) && data.type === 'file') sha = data.sha
  } catch {
    // File doesn't exist yet — create it
  }

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: Buffer.from(content, 'utf-8').toString('base64'),
    branch,
    ...(sha ? { sha } : {}),
  })
}

export async function createBranch(owner: string, repo: string, branch: string, fromBranch = 'main'): Promise<void> {
  const octokit = await getOctokit()
  const { data: ref } = await octokit.git.getRef({ owner, repo, ref: `heads/${fromBranch}` })
  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branch}`,
    sha: ref.object.sha,
  })
}

export async function openPullRequest(
  owner: string,
  repo: string,
  title: string,
  body: string,
  head: string,
  base = 'main'
): Promise<string> {
  const octokit = await getOctokit()
  const { data } = await octokit.pulls.create({ owner, repo, title, body, head, base })
  return data.html_url
}

export async function getConnectionStatus(): Promise<{ connected: boolean; appId: number; installationId: number; error?: string }> {
  try {
    const { appId, installationId } = getGithubConfig()
    const octokit = await getOctokit()
    // Verify token works by listing repos for this installation
    await octokit.apps.listReposAccessibleToInstallation({ per_page: 1 })
    return { connected: true, appId, installationId }
  } catch (err) {
    return {
      connected: false,
      appId: Number(process.env.GITHUB_APP_ID ?? 0),
      installationId: Number(process.env.GITHUB_INSTALLATION_ID ?? 0),
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
