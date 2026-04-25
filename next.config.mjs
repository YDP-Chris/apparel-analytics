/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Don't block deploys on ESLint warnings/errors. Lint runs locally and
  // in CI separately; treating it as a deploy gate just blocks shipping
  // on cosmetic issues like unescaped apostrophes.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
