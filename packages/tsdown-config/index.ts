// Shared tsdown build config for the monorepo. `defineConfig` is only an
// identity helper, so returning a plain object is equivalent.

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

type Deps = {
  neverBundle?: boolean | (string | RegExp)[];
  alwaysBundle?: (string | RegExp)[];
  /** The `node_modules` packages expected in the bundle: the build fails if another one ends up there */
  onlyBundle?: (string | RegExp)[];
};

type Chunk = { type: string; isEntry?: boolean; facadeModuleId?: string | null; fileName: string; outDir: string };

interface Options {
  entry: string[] | Record<string, string>;
  /** Sets `platform` and the default `target` (`neutral` → es2022, `node` → node22). */
  runtime: "neutral" | "node";
  target?: string;
  deps?: Deps;
  dts?: boolean | { entry: string[] };
  treeshake?: { moduleSideEffects: "no-external" };
  plugins?: unknown[];
  hooks?: { "build:done"?: (ctx: { chunks: Chunk[] }) => Promise<void> };
  outputOptions?: Record<string, unknown>;
}

interface MiddlewareOptions extends Omit<Options, "runtime" | "dts" | "outputOptions" | "hooks" | "treeshake"> {
  /**
   * Inline the `universal-middleware` and `@universal-middleware/*` packages the
   * package doesn't declare as dependencies. Defaults to `true`; only an unpublished
   * package can keep importing them from its devDependencies.
   */
  inlineAdapters?: boolean;
}

/**
 * Config for packages built with the `universalMiddleware` plugin. `dts.entry`
 * keeps tsgo off the plugin's virtual modules (it emits their `.d.ts` via oxc),
 * and `entryFileNames` strips the `src/` prefix the plugin keys them under so the
 * output mirrors the source layout.
 *
 * The plugin's entries import `universal-middleware/adapters/*`, which re-exports
 * the `@universal-middleware/*` adapters. Those are only devDependencies, so they
 * are inlined into the JS and into the plugin's `.d.ts` (see {@link bundleAdapterDts});
 * otherwise the published entries import packages consumers don't have. The
 * inlined code's unused imports of their own dependencies (e.g. core's
 * `regexparam`) would stay behind as bare `import "…"`, hence `no-external`.
 */
export function defineMiddlewareTsdown({ inlineAdapters = true, ...options }: MiddlewareOptions) {
  const config = {
    ...options,
    runtime: "neutral" as const,
    dts: { entry: ["src/**/*.ts"] },
    outputOptions: {
      entryFileNames: (chunk: { name: string }) => `${chunk.name.replace(/^src[\\/]/, "")}.js`,
    },
  };
  if (!inlineAdapters) return defineTsdown(config);

  const alwaysBundle = [...(options.deps?.alwaysBundle ?? []), undeclaredUniversalMiddleware()];
  return defineTsdown({
    ...config,
    deps: { neverBundle: true, ...options.deps, alwaysBundle },
    treeshake: { moduleSideEffects: "no-external" },
    hooks: {
      "build:done": ({ chunks }) => bundleAdapterDts(chunks, alwaysBundle),
    },
  });
}

/**
 * Matches `universal-middleware` and `@universal-middleware/*` imports, except
 * the packages declared in the built package's `dependencies`/`peerDependencies`.
 */
function undeclaredUniversalMiddleware() {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const scope = /^(?:universal-middleware|@universal-middleware\/[^/]+)$/;
  const declared = Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies }).filter((name) => scope.test(name));
  const exclude = declared.length > 0 ? `(?!(?:${declared.join("|")})(?:/|$))` : "";
  return new RegExp(`^${exclude}(?:universal-middleware|@universal-middleware/[^/]+)(?:/|$)`);
}

/**
 * The plugin writes each adapter entry's `.d.ts` itself, importing
 * `universal-middleware/adapters/*` and `@universal-middleware/core`. Bundle
 * those files in place with the same `alwaysBundle` as the JS, keeping their
 * relative import of the wrapped middleware/handler `.d.ts` as is.
 */
async function bundleAdapterDts(chunks: Chunk[], alwaysBundle: (string | RegExp)[]) {
  const files = chunks
    .filter((chunk) => chunk.type === "chunk" && chunk.isEntry && chunk.facadeModuleId?.startsWith("virtual:"))
    .map((chunk) => join(chunk.outDir, chunk.fileName.replace(/\.js$/, ".d.ts")))
    .filter((file) => existsSync(file));
  if (files.length === 0) return;

  const outDir = chunks[0].outDir;
  // Runtime-resolved: this package has no dependencies, so run the tsdown that is
  // building the package (its devDependency).
  const tsdown = createRequire(join(process.cwd(), "package.json")).resolve("tsdown");
  const { build } = await import(pathToFileURL(tsdown).href);
  await build({
    config: false,
    entry: Object.fromEntries(files.map((file) => [relative(outDir, file).replace(/\.d\.ts$/, ""), file])),
    outDir,
    clean: false,
    platform: "neutral",
    fixedExtension: false,
    dts: { dtsInput: true, emitDtsOnly: true },
    deps: { neverBundle: true, alwaysBundle },
    treeshake: { moduleSideEffects: "no-external" },
    plugins: [
      {
        name: "universal-middleware:relative-dts",
        resolveId(id: string, importer?: string) {
          if (id.startsWith(".") && importer && files.includes(importer)) return { id, external: true };
        },
      },
    ],
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
    target: target ?? (runtime === "neutral" ? "es2022" : "node22"),
    fixedExtension: false,
    dts,
    deps,
    // Printed once per package by rolldown-plugin-dts as long as TypeScript 7 is installed; nothing to act on
    suppressWarnings: ["TypeScript 7.0 does not yet have a stable API"],
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
