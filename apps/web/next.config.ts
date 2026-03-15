import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@null/ui', '@null/domain', '@null/api-client', '@null/desktop-bridge', '@null/api', '@null/db']
};

export default nextConfig;
