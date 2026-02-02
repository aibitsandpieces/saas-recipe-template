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
};

export default nextConfig;
