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
  // Codespaces forwards Port 3000 as https://*-3000.app.github.dev. Server Actions
  // compare Origin to Host and reject the mismatch unless those hosts are listed
  // here (login posts to signInAction). Next 15.5.25 Zod schema only accepts
  // experimental.serverActions — a top-level serverActions key is unrecognized
  // and is dropped, so the allowlist never applies.
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "127.0.0.1:3000",
        "*.app.github.dev",
        "*.github.dev",
      ],
    },
  },
};

export default nextConfig;
