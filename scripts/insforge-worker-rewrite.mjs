/**
 * InsForge local Deno runs user code in `new Function(...)` (a script).
 * ESM `import` / `export` throw "Cannot use import statement outside a module".
 * `createClient` is injected by the worker template; `createAdminClient` is not.
 */
export function rewriteInsforgeWorkerBundle(code) {
  const shim = `function createAdminClient(config) {
  const raw = config ?? {};
  const apiKey = typeof raw.apiKey === "string" ? raw.apiKey.trim() : "";
  if (!apiKey) {
    throw new Error("Missing apiKey. Pass apiKey to createAdminClient().");
  }
  const clientConfig = { ...raw };
  delete clientConfig.apiKey;
  return createClient({ ...clientConfig, accessToken: apiKey, isServerMode: true });
}
`;
  const header = `// rewritten for InsForge worker (new Function — no import/export)
${shim}`;

  const defaultMatch = /export\s*\{\s*(\w+)\s+as\s+default/.exec(code);
  if (defaultMatch?.[1]) {
    const stripped = code
      .replace(/import\s*\{[^}]*\}\s*from\s*["']npm:@insforge\/sdk["'];\s*/g, "")
      .replace(/\nexport\s*\{[\s\S]*?\};?\s*$/g, "\n");
    return `${header}${stripped}\nmodule.exports = ${defaultMatch[1]};\n`;
  }

  if (/export\s+default\s+async\s+function/.test(code)) {
    const stripped = code
      .replace(/import\s*\{[^}]*\}\s*from\s*["']npm:@insforge\/sdk["'];\s*/g, "")
      .replace(/export\s+default\s+async\s+function/, "async function __insforgeHandler");
    return `${header}${stripped}\nmodule.exports = __insforgeHandler;\n`;
  }

  throw new Error("INSFORGE_BUNDLE_NO_DEFAULT_EXPORT");
}
