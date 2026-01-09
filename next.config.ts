import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  async redirects() {
    return [
      {
        source: "/ask-us-anything",
        destination: "/marketing-advice",
        permanent: true, // 301 redirect
      },
    ];
  },
};

export default nextConfig;

