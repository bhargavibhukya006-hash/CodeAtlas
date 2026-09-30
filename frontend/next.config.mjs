/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow rewrites if needed to proxy backend
  async rewrites() {
    return [
      {
        source: '/backend-api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
