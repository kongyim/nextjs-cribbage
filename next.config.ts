import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/cribbage",
  assetPrefix: "/cribbage",
  images: {
    unoptimized: true, // needed for static export with next/image
  },
  trailingSlash: true,
};

export default nextConfig;
