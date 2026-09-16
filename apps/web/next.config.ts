import type { NextConfig } from "next";
import { applyInsforgeDotEnvLocal } from "./lib/insforge/apply-local-env";

applyInsforgeDotEnvLocal(process.cwd());

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
