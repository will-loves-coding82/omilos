import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      // Cover images are uploaded to S3 through a Server Action, so the
      // request body has to fit the image rather than the 1MB default.
      bodySizeLimit: "10mb",
    },
  },
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
