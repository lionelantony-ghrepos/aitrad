/* global module */
"use strict";

/** Lighthouse CI — Architecture §8 / PBI-030: workspace TTI < 3s on CI profile. */
module.exports = {
  ci: {
    collect: {
      startServerCommand: "E2E_AUTH_STUB=1 pnpm --filter @meridian/web exec next start --port 3200",
      startServerReadyPattern: "Ready",
      startServerReadyTimeout: 120000,
      url: ["http://127.0.0.1:3200/workspace"],
      numberOfRuns: 1,
      settings: {
        preset: "desktop",
        onlyCategories: ["performance"],
      },
    },
    assert: {
      assertions: {
        interactive: ["error", { maxNumericValue: 3000 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci",
    },
  },
};
