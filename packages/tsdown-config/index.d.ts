// Types of index.js: update them together.

export interface Deps {
  neverBundle?: boolean | (string | RegExp)[];
  alwaysBundle?: (string | RegExp)[];
  /** The `node_modules` packages expected in the bundle: the build fails if another one ends up there */
  onlyBundle?: (string | RegExp)[];
}

export interface Chunk {
  type: string;
  isEntry?: boolean;
  facadeModuleId?: string | null;
  fileName: string;
  outDir: string;
}

export interface Options {
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

export interface MiddlewareOptions extends Omit<Options, "runtime" | "dts" | "outputOptions" | "hooks" | "treeshake"> {
  /**
   * Inline the `universal-middleware` and `@universal-middleware/*` packages the
   * package doesn't declare as dependencies. Defaults to `true`; only an unpublished
   * package can keep importing them from its devDependencies.
   */
  inlineAdapters?: boolean;
}

/** A tsdown config: the options without `runtime`, plus the values `defineTsdown` sets */
export type TsdownConfig = Omit<Options, "runtime"> & {
  platform: "neutral" | "node";
  target: string;
  fixedExtension: false;
  suppressWarnings: string[];
};

/** Config for packages built with the `universalMiddleware` plugin */
export declare function defineMiddlewareTsdown(options: MiddlewareOptions): TsdownConfig;

/** Config with the monorepo's defaults */
export declare function defineTsdown(options: Options): TsdownConfig;

/** Frameworks whose `.d.ts` the oxc resolver can't follow, for packages that can't use `neverBundle: true` */
export declare const externalFrameworks: string[];

/** The servers `sirv` and `compress` build an entry for */
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
