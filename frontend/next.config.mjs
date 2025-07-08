/** @type {import('next').NextConfig} */
const nextConfig = {
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
