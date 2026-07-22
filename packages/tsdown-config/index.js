// Shared tsdown build config for the monorepo. Plain JS (with a sibling
// `index.d.ts`) so package configs import it by name — the native config loader
// resolves it from node_modules and tsc reads its types, with no build step and
// no declaration emitted for it. `defineConfig` is only an identity helper, so
// returning a plain object is equivalent.

/**
 * Framework packages whose `.d.ts` use CJS/namespace/triple-slash shapes the
 * oxc declaration resolver cannot follow. They must stay external in the dts
 * build; `deps.neverBundle: true` covers them implicitly, but packages that
 * bundle a workspace dependency (and therefore cannot use `true`) list them
 * explicitly instead — see `packages/tests`.
 */
export const externalFrameworks = [
  "bun",
  "express",
  "fastify",
  "elysia",
  "h3",
  "hono",
  "srvx",
  "@cloudflare/workers-types",
  "@hattip/core",
  "@webroute/route",
];

/** Servers the `universalMiddleware` plugin generates middleware wrappers for. */
export const middlewareServers = ["hono", "express", "hattip", "fastify", "h3", "webroute", "elysia", "srvx"];

/**
 * Shared tsdown config. Only values that differ from tsdown's defaults are set:
 * - `fixedExtension: false` keeps `.js`/`.d.ts` output (default is `.mjs` on
 *   `platform: "node"`), so the published `exports` maps stay unchanged.
 * - `dts` is enabled (default is off unless package.json exposes `types`).
 * - `deps.neverBundle: true` externalizes every bare import without resolving
 *   it, which the oxc dts resolver needs for `externalFrameworks`.
 * (`format: "esm"`, `clean`, `nodeProtocol: false` are already the defaults.)
 */
export function defineTsdown({ runtime, target, deps = { neverBundle: true }, dts = true, ...rest }) {
  return {
    platform: runtime === "neutral" ? "neutral" : "node",
    target: target ?? (runtime === "neutral" ? "es2022" : "node20"),
    fixedExtension: false,
    dts,
    deps,
    ...rest,
  };
}

/**
 * Config for packages built with the `universalMiddleware` plugin (which emits
 * per-server middleware files as virtual entries). Adds the two things those
 * builds need on top of `defineTsdown`:
 * - `dts.entry` limits tsgo declarations to the real source files; the plugin
 *   emits the virtual modules' `.d.ts` itself (via oxc), and tsgo cannot.
 * - `entryFileNames` strips the `src/` prefix the plugin keys virtual entries
 *   under (the rolldown equivalent of tsup's esbuild `outbase: "src"`).
 */
export function defineMiddlewareTsdown(options) {
  return defineTsdown({
    ...options,
    runtime: "neutral",
    dts: { entry: ["src/**/*.ts"] },
    outputOptions: {
      entryFileNames: (chunk) => `${chunk.name.replace(/^src[\\/]/, "")}.js`,
    },
  });
}
