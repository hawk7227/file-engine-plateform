/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['*.supabase.co'],
  },
  // §5: NO ignoreDuringBuilds. NO ignoreBuildErrors.
  // Lint and typecheck are enforced. Build fails on error.

  // Force unique build ID per deploy — prevents ChunkLoadError on refresh
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
}

module.exports = nextConfig
