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
      {
        source: "/for-businesses/digital-property-audit",
        destination: "/for-businesses/digital-health-check",
        permanent: true,
      },
      {
        source: "/for-businesses/local-marketing",
        destination: "/for-businesses/direct-mail",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

