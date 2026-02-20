/**
 * FILE ENGINE - Library Index
 * 
 * Export all preview & deploy functionality
 */

// Vercel API
export {
  createPreviewDeployment,
  createProductionDeployment,
  waitForDeployment,
  deleteDeployment,
  getBuildLogs,
  getVercelToken,
  prepareFilesForVercel,
  detectFramework,
  getProjectSettings,
  type PreviewResult,
  type DeployResult,
  type DeploymentStatus,
  type VercelFile,
  type VercelDeployment,
  type GeneratedFile as VercelGeneratedFile
} from './vercel-api';

// GitHub API
export {
  createRepository,
  pushFiles,
  createRepoAndPush,
  deleteRepository,
  checkRepoExists,
  getCurrentUser,
  getGitHubToken,
  getGitHubUsername,
  type GitHubRepo,
  type GitHubFile,
  type CreateRepoResult,
  type PushResult,
  type GitHubOptions
} from './github-api';

// Auto-Fix Engine
export {
  autoFixErrors,
  userRequestedFix,
  type AutoFixResult,
  type AutoFixOptions,
  type GeneratedFile as AutoFixGeneratedFile
} from './auto-fix-engine';

// Preview Manager
export {
  runBuildVerification,
  cleanupExpiredPreviews,
  getUserPreviews,
  type PreviewPhase,
  type PreviewManagerResult,
  type PreviewManagerOptions,
  type GeneratedFile
} from './preview-manager';
