// Types for `index.js`. Kept dependency-free (no `tsdown` import) so it resolves
// with no extra tsconfig setup; the returned objects are plain tsdown configs.

type Deps = { neverBundle?: boolean | (string | RegExp)[]; alwaysBundle?: (string | RegExp)[] };
type Dts = boolean | { entry: string[] };

interface Options {
  entry: string[] | Record<string, string>;
  /** Sets `platform` and the default `target` (`neutral` → es2022, `node` → node20). */
  runtime: "neutral" | "node";
  target?: string;
  deps?: Deps;
  dts?: Dts;
  plugins?: unknown[];
  outputOptions?: Record<string, unknown>;
}

/**
 * Framework packages whose `.d.ts` use CJS/namespace/triple-slash shapes the
 * oxc declaration resolver cannot follow; they must stay external in the dts
 * build. Used by packages that bundle a workspace dependency and so cannot use
 * `deps.neverBundle: true`.
 */
export declare const externalFrameworks: string[];

/** Servers the `universalMiddleware` plugin generates middleware wrappers for. */
export declare const middlewareServers: readonly [
  "hono",
  "express",
  "hattip",
  "fastify",
  "h3",
  "webroute",
  "elysia",
  "srvx",
];

/**
 * Shared tsdown config. Only values that differ from tsdown's defaults are set:
 * `fixedExtension: false` (keep `.js`/`.d.ts` output), `dts` enabled, and
 * `deps.neverBundle: true` (externalize bare imports without resolving them,
 * which the oxc dts resolver needs).
 */
export declare function defineTsdown(options: Options): Record<string, unknown>;

/**
 * Config for packages built with the `universalMiddleware` plugin. Adds
 * `dts.entry` (tsgo only emits declarations for real source files; the plugin
 * emits the virtual modules' `.d.ts` itself via oxc) and an `entryFileNames`
 * that strips the `src/` prefix the plugin keys virtual entries under (the
 * rolldown equivalent of tsup's esbuild `outbase: "src"`).
 */
export declare function defineMiddlewareTsdown(
  options: Omit<Options, "runtime" | "dts" | "outputOptions">,
): Record<string, unknown>;
