import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@meridian/schemas",
    "@meridian/rules-engine",
    "@meridian/paper-engine",
    "@meridian/mock-data",
    "dockview",
    "dockview-react",
  ],
};

export default nextConfig;
