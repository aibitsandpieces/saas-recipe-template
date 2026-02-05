import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ hostname: "img.clerk.com" }],
  },
  experimental: {
    // Increase the body size limit for file uploads (20MB)
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  // Ensure PORT environment variable is respected
  env: {
    PORT: process.env.PORT,
    DEV_PORT: process.env.DEV_PORT,
  },
};

export default nextConfig;
