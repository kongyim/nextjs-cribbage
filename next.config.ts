import type { NextConfig } from "next";

const rawBasePath = process.env.BASE_PATH?.trim() || "";
const rawAssetPrefix = process.env.ASSET_PREFIX?.trim() || rawBasePath;

const normalize = (value: string) =>
  value ? `/${value.replace(/^\/+/, "").replace(/\/+$/, "")}` : "";

const basePath = normalize(rawBasePath);
const assetPrefix = normalize(rawAssetPrefix);

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true, // needed for static export with next/image
  },
  trailingSlash: true,
  assetPrefix: ".",
};

if (basePath) {
  nextConfig.basePath = basePath;
  nextConfig.assetPrefix = assetPrefix || basePath;
} else if (assetPrefix) {
  nextConfig.assetPrefix = assetPrefix;
}

export default nextConfig;
