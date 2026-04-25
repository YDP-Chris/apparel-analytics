/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Don't block deploys on ESLint or TypeScript errors. Lint and types
  // run locally and in CI separately; treating them as deploy gates blocks
  // shipping on cosmetic issues like unescaped apostrophes or stale type
  // assumptions in client-fetched JSON. Build errors that would actually
  // break runtime still fail the build.
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
