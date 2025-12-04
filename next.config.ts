import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true, // needed for static export with next/image
  },
};

export default nextConfig;
