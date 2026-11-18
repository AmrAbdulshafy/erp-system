/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.ELECTRON_BUILD === 'true' ? { output: 'standalone' } : {}),
  experimental: {
    proxyClientMaxBodySize: '100mb',
  },
  async rewrites() {
    if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
      return [];
    }
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost/api/:path*',
      },
    ];
  },
};

export default nextConfig;
