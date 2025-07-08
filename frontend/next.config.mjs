/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add this line
  output: 'export',
  // Keep the basePath from before
  basePath: '/my_chatbot',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
