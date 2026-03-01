/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['*.supabase.co'],
  },
  // §5: NO ignoreDuringBuilds. NO ignoreBuildErrors.
  // Lint and typecheck are enforced. Build fails on error.
}

module.exports = nextConfig
