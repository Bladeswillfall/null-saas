import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@null/ui', '@null/domain', '@null/api-client', '@null/desktop-bridge']
};

export default nextConfig;
