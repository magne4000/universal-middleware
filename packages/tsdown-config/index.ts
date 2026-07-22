// Shared tsdown build config for the monorepo. `defineConfig` is only an
// identity helper, so returning a plain object is equivalent.

type Deps = { neverBundle?: boolean | (string | RegExp)[]; alwaysBundle?: (string | RegExp)[] };

interface Options {
  entry: string[] | Record<string, string>;
  /** Sets `platform` and the default `target` (`neutral` → es2022, `node` → node20). */
  runtime: "neutral" | "node";
  target?: string;
  deps?: Deps;
  dts?: boolean | { entry: string[] };
  plugins?: unknown[];
  outputOptions?: Record<string, unknown>;
}

/**
 * Config for packages built with the `universalMiddleware` plugin. `dts.entry`
 * keeps tsgo off the plugin's virtual modules (it emits their `.d.ts` via oxc),
 * and `entryFileNames` strips the `src/` prefix the plugin keys them under — the
 * rolldown equivalent of tsup's esbuild `outbase: "src"`.
 */
export function defineMiddlewareTsdown(options: Omit<Options, "runtime" | "dts" | "outputOptions">) {
  return defineTsdown({
    ...options,
    runtime: "neutral",
    dts: { entry: ["src/**/*.ts"] },
    outputOptions: {
      entryFileNames: (chunk: { name: string }) => `${chunk.name.replace(/^src[\\/]/, "")}.js`,
    },
  });
}

/**
 * Only the values that differ from tsdown's defaults are set. `fixedExtension:
 * false` keeps `.js`/`.d.ts` output (the default is `.mjs` on `platform: node`),
 * and `deps.neverBundle: true` externalizes bare imports without resolving them,
 * which the oxc dts resolver needs for {@link externalFrameworks}.
 */
export function defineTsdown({ runtime, target, deps = { neverBundle: true }, dts = true, ...rest }: Options) {
  return {
    platform: runtime === "neutral" ? "neutral" : "node",
    target: target ?? (runtime === "neutral" ? "es2022" : "node20"),
    fixedExtension: false,
    dts,
    deps,
    ...rest,
  };
}

// Frameworks whose `.d.ts` the oxc resolver can't follow (CJS/namespace/triple-
// slash shapes). `neverBundle: true` covers them implicitly; packages that bundle
// a workspace dependency can't use `true` and list them explicitly instead.
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

export const middlewareServers = ["hono", "express", "hattip", "fastify", "h3", "webroute", "elysia", "srvx"] as const;
