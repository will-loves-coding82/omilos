import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      {
        protocol: "https",
        hostname: process.env.AWS_S3_BUCKET_HOSTNAME!,
      },
    ],
  },
};

export default nextConfig;
