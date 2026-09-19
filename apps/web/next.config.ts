import type { NextConfig } from "next";
import { applyInsforgeDotEnvLocal } from "./lib/insforge/apply-local-env";

applyInsforgeDotEnvLocal(process.cwd());

// Codespaces forwards Port 3000 as https://*-3000.app.github.dev. Server Actions
// compare Origin to Host and reject the mismatch unless those hosts are listed
// here (login posts to signInAction). Next 15.5 reads experimental.serverActions;
// keep the same object at the top level so the allowlist is not duplicated.
const serverActions = {
  allowedOrigins: [
    "localhost:3000",
    "127.0.0.1:3000",
    "*.app.github.dev",
    "*.github.dev",
  ],
};

const nextConfig: NextConfig = {
  transpilePackages: [
    "@meridian/schemas",
    "@meridian/rules-engine",
    "@meridian/paper-engine",
    "@meridian/mock-data",
    "dockview",
    "dockview-react",
  ],
  serverActions,
  experimental: {
    serverActions,
  },
};

export default nextConfig;
