/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Prevents dual socket initialization in dev
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5001/api/:path*',
      },
    ];
  },
};

export default nextConfig;

