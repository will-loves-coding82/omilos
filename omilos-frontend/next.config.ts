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
        hostname: "omilos-s3-demo-bucket.s3.us-east-2.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
