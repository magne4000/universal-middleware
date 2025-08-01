import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, parse, posix, resolve } from "node:path";
import { packageUp } from "package-up";
import type { UnpluginFactory } from "unplugin";

export interface Options {
  servers?: (typeof defaultWrappers)[number][];
  serversExportNames?: string;
  entryExportNames?: string;
  ignoreRecommendations?: boolean;
  doNotEditPackageJson?: boolean;
  dts?: boolean;
  externalDependencies?: boolean;
  buildEnd?: (report: Report[]) => void | Promise<void>;
}

export interface Report {
  in: string;
  out: string;
  dts?: string;
  type: "handler" | "middleware";
  exports: string;
}

interface BundleInfo {
  in: string;
  out: string;
  dts: string;
  id: string;
  dir: string;
  name: string;
  type: "handler" | "middleware";
  exports: string;
}

const defaultWrappers = [
  "hono",
  "express",
  "hattip",
  "webroute",
  "fastify",
  "h3",
  "cloudflare-worker",
  "cloudflare-pages",
  "vercel-edge",
  "vercel-node",
  "elysia",
] as const;
const maybeExternals = [
  "@universal-middleware/hono",
  "@universal-middleware/express",
  "@universal-middleware/hattip",
  "@universal-middleware/webroute",
  "@universal-middleware/fastify",
  "@universal-middleware/h3",
  "@universal-middleware/cloudflare",
  "@universal-middleware/elysia",
  "@universal-middleware/vercel",
];
const typesByServer: Record<
  (typeof defaultWrappers)[number],
  {
    middleware?: string;
    handler?: string;
    selfImports?: string[];
    outContext?: (type: string) => string;
    generics?: (type: string) => string;
    typeHandler?: string;
    typeMiddleware?: string;
    target?: string;
  }
> = {
  hono: {
    middleware: "HonoMiddleware",
    handler: "HonoHandler",
  },
  express: {
    middleware: "NodeMiddleware",
    handler: "NodeHandler",
  },
  hattip: {
    middleware: "HattipMiddleware",
    handler: "HattipHandler",
  },
  fastify: {
    middleware: "FastifyMiddleware",
    handler: "FastifyHandler",
  },
  h3: {
    middleware: "H3Middleware",
    handler: "H3Handler",
  },
  webroute: {
    middleware: "WebrouteMiddleware",
    handler: "WebrouteHandler",
    selfImports: ["type MiddlewareFactoryDataResult"],
    outContext: (type) => `MiddlewareFactoryDataResult<typeof ${type}>`,
  },
  "cloudflare-worker": {
    handler: "CloudflareHandler",
    target: "cloudflare",
  },
  "cloudflare-pages": {
    middleware: "CloudflarePagesFunction",
    handler: "CloudflarePagesFunction",
    typeHandler: "createPagesFunction",
    typeMiddleware: "createPagesFunction",
    generics: (type) => (type === "handler" ? "Args, InContext, OutContext" : "Args, InContext, OutContext"),
    target: "cloudflare",
  },
  "vercel-edge": {
    handler: "VercelEdgeHandler",
    typeHandler: "createEdgeHandler",
    target: "vercel",
  },
  "vercel-node": {
    handler: "VercelNodeHandler",
    typeHandler: "createNodeHandler",
    target: "vercel",
  },
  elysia: {
    handler: "ElysiaHandler",
    middleware: "ElysiaMiddleware",
  },
};
const namespace = "virtual:universal-middleware";
const versionRange = "^0";

function getVirtualInputs(
  type: "handler" | "middleware",
  handler: string,
  wrappers: ReadonlyArray<(typeof defaultWrappers)[number]> = defaultWrappers,
) {
  const parsed = parse(handler);
  return (
    wrappers
      // Exclude wrapper that to not support either handler or middleware features
      .filter((w) => Boolean(typesByServer[w][type]))
      .map((server) => ({
        server,
        type,
        handler,
        get value() {
          return `${namespace}:${this.server}:${this.type}:${this.handler}`;
        },
        get key() {
          return join(parsed.dir, `universal-${this.server}-${this.type}-${parsed.name}`);
        },
      }))
  );
}

function filterInput(input: string, importer?: string | undefined) {
  if (importer !== undefined && !importer.startsWith("virtual:universal-middleware")) {
    return null;
  }
  if (input.match(/(^|\.|\/|\\\\)handler\.[cm]?[jt]sx?$/)) {
    return "handler";
  }
  if (input.match(/(^|\.|\/|\\\\)middleware\.[cm]?[jt]sx?$/)) {
    return "middleware";
  }
  return null;
}

function normalizeInput(
  input: undefined | string | Record<string, string> | (string | { in: string; out: string })[],
  options?: Options,
) {
  const keys = new Set<string>();

  function getTuple(key: string, value: string) {
    if (keys.has(key)) {
      throw new Error(`Conflict on entry ${key}: ${value}`);
    }
    keys.add(key);
    return [key, value] as const;
  }

  if (typeof input === "string") {
    const filtered = filterInput(input);
    if (filtered) {
      const parsed = parse(input);
      const tuple = getTuple(join(parsed.dir, parsed.name), input);
      return {
        [tuple[0]]: tuple[1],
      };
    }
  } else if (Array.isArray(input)) {
    let i = 0;
    const res = Object.fromEntries(
      input.map((e) => {
        if (typeof e === "string") {
          if (filterInput(e)) {
            i += 1;
          }
          const parsed = parse(e);
          return getTuple(join(parsed.dir, parsed.name), e);
        }
        return getTuple(e.out, e.in);
      }),
    );

    if (!options?.ignoreRecommendations && i >= 2) {
      console.warn("Prefer using an object for esbuild/rollup `entryPoints` instead of an array");
    }

    return res;
  } else if (input && typeof input === "object") {
    return input;
  }
  return null;
}

function appendVirtualInputs(
  input: Record<string, string>,
  wrappers: ReadonlyArray<(typeof defaultWrappers)[number]> = defaultWrappers,
) {
  for (const v of Object.values(input)) {
    const filtered = filterInput(v);
    if (filtered) {
      const virtualInputs = getVirtualInputs(filtered, v, wrappers);
      for (const vinput of virtualInputs) {
        input[vinput.key] = vinput.value;
      }
    }
  }
}

function applyOutbase(input: Record<string, string>, outbase: string) {
  if (!outbase) return input;

  const re = new RegExp(`^(${outbase.replaceAll("\\\\", "/")}|${outbase.replaceAll("/", "\\\\")})/?`, "gu");

  return Object.keys(input).reduce(
    (acc, key) => {
      acc[key.replace(re, "")] = input[key];
      return acc;
    },
    {} as Record<string, string>,
  );
}

function shouldLoad(id: string) {
  if (id.startsWith(namespace)) {
    const [, , target, type] = id.split(":");

    const info = typesByServer[target as (typeof defaultWrappers)[number]];
    const t = info[type as "middleware" | "handler"];

    return Boolean(t);
  }
  return false;
}

function load(id: string, resolve?: (handler: string, type: string) => string) {
  const [, , target, type, handler] = id.split(":");

  const info = typesByServer[target as (typeof defaultWrappers)[number]];

  const fn = type === "handler" ? (info.typeHandler ?? "createHandler") : (info.typeMiddleware ?? "createMiddleware");
  const code = `import { ${fn} } from "universal-middleware/adapters/${info.target ?? target}";
import ${type} from "${resolve ? resolve(handler, type) : handler}";
export default ${fn}(${type});
`;
  return { code };
}

function loadDts(id: string, resolve?: (handler: string, type: string) => string) {
  const [, , target, type, handler] = id.split(":");

  const info = typesByServer[target as (typeof defaultWrappers)[number]];
  const fn = type === "handler" ? (info.typeHandler ?? "createHandler") : (info.typeMiddleware ?? "createMiddleware");
  const t = info[type as "middleware" | "handler"];
  const generics = info.generics
    ? info.generics(type)
    : type === "handler"
      ? "Args, InContext"
      : "Args, InContext, OutContext";
  if (t === undefined) return;

  const selfImports = [fn, `type ${t}`, ...(info.selfImports ?? [])];
  const code = `import { type UniversalMiddleware, type RuntimeAdapterTarget } from '@universal-middleware/core';
import { ${selfImports.join(", ")} } from "universal-middleware/adapters/${info.target ?? target}";
import ${type} from "${resolve ? resolve(handler, type) : handler}";
type ExtractT<T> = T extends (...args: infer X) => any ? X : never;
type ExtractInContext<T> = T extends (...args: any[]) => UniversalMiddleware<infer X> ? unknown extends X ? Universal.Context : X : {};
export type Target = '${target}';
export type RuntimeAdapter = RuntimeAdapterTarget<Target>;
export type InContext = ExtractInContext<typeof ${type}>;
export type OutContext = ${info.outContext?.(type) ?? "unknown"};
export type Args = ExtractT<typeof ${type}>;
export type Middleware = ReturnType<ReturnType<typeof ${fn}<${generics}>>>;
export default ${fn}(${type}) as (...args: Args) => Middleware;
`;

  return { code };
}

function findDuplicateReports(reports: Report[]): Map<string, Report[]> {
  const exportCounts: Record<string, number> = {};
  const duplicates = new Map<string, Report[]>();

  // Count occurrences of each 'exports' value
  for (const report of reports) {
    exportCounts[report.exports] = (exportCounts[report.exports] || 0) + 1;
  }

  // Collect reports that have duplicates
  for (const report of reports) {
    if (exportCounts[report.exports] > 1) {
      if (!duplicates.has(report.exports)) {
        duplicates.set(report.exports, []);
      }
      duplicates.get(report.exports)?.push(report);
    }
  }

  return duplicates;
}

function formatDuplicatesForErrorMessage(duplicates: Map<string, Report[]>) {
  let formattedMessage = "The following files have overlapping exports:\n";

  duplicates.forEach((reports, exportValue) => {
    formattedMessage += `exports: ${exportValue}\n`;
    for (const report of reports) {
      formattedMessage += `  in: ${report.in}, out: ${report.out}\n`;
    }
  });

  formattedMessage +=
    "Make sure you are using esbuild `entryPoints` object syntax or that `serversExportNames` option contains [dir].";

  return formattedMessage;
}

function genBundleInfo(input: Record<string, string>, findDest: (path: string) => string): Record<string, BundleInfo> {
  const entries = Object.entries(input);

  return Object.fromEntries(
    entries.map(([k, v]) => {
      const dest = findDest(v);
      const parsed = parse(dest);
      return [
        v,
        {
          in: v,
          out: dest,
          dts: dest.replace(/\.js$/, ".d.ts"),
          id: k,
          dir: parsed.dir,
          name: parsed.name,
          type: filterInput(v) as "handler" | "middleware",
          exports: "",
        },
      ];
    }),
  );
}

function fixBundleExports(
  bundle: Record<string, BundleInfo>,
  options: { entryExportNames: string; serversExportNames: string },
) {
  for (const [k, v] of Object.entries(bundle)) {
    if (!k.startsWith(namespace)) {
      if (options.entryExportNames === ".") {
        v.exports = ".";
      } else {
        v.exports = `./${posix
          .normalize(
            options.entryExportNames.replace("[dir]", v.dir).replace("[name]", v.name).replace("[type]", v.type),
          )
          .replaceAll("\\", "/")}`;
      }
    }
  }

  for (const [k, v] of Object.entries(bundle)) {
    if (k.startsWith(namespace)) {
      const [, , server, type, handler] = k.split(":");
      if (options.serversExportNames === ".") {
        v.exports = ".";
      } else {
        v.exports = `./${posix
          .normalize(
            options.serversExportNames
              .replace("[name]", bundle[handler].name)
              .replace("[dir]", bundle[handler].dir)
              .replace("[type]", type)
              .replace("[server]", server),
          )
          .replaceAll("\\", "/")}`;
      }
    }
  }

  return bundle;
}

async function generateDts(content: string, outFile: string) {
  const { isolatedDeclaration } = await import("oxc-transform");

  const code = isolatedDeclaration("file.ts", content, {
    sourcemap: false,
  });

  await mkdir(dirname(outFile), { recursive: true });

  await writeFile(outFile, code.code);
}

async function genDts(bundle: Record<string, BundleInfo>, options?: Options) {
  if (options?.dts === false) return;

  for (const value of Object.values(bundle)) {
    if (!value.in.startsWith(namespace)) continue;

    const res = loadDts(value.in, (handler) => posix.relative(value.dts, bundle[handler].dts).replace(/^\.\./, "."));
    if (!res) continue;

    await generateDts(res.code, value.dts);
  }
}

function genReport(bundle: Record<string, BundleInfo>, options?: Options) {
  const reports = Object.values(bundle).reduce((acc, curr) => {
    const report: Report = {
      in: curr.in,
      out: curr.out,
      type: curr.type,
      exports: curr.exports,
    };

    if (options?.dts !== false) {
      report.dts = curr.dts;
    }

    acc.push(report);

    return acc;
  }, [] as Report[]);

  const duplicates = findDuplicateReports(reports);

  if (duplicates.size > 0) {
    const message = formatDuplicatesForErrorMessage(duplicates);
    throw new Error(message);
  }

  return reports;
}

export async function readAndEditPackageJson(reports: Report[], options?: Options) {
  const packageJsonPath = await packageUp();

  if (!packageJsonPath) {
    throw new Error("Cannot find package.json");
  }

  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));

  if (options?.externalDependencies === true) {
    packageJson.dependencies ??= {};
    for (const external of maybeExternals) {
      packageJson.dependencies[external] = versionRange;
    }
  }

  packageJson.exports ??= {};

  for (const report of reports) {
    // No CJS support
    packageJson.exports[report.exports] = {
      types: report.dts ? `./${report.dts}` : undefined,
      import: `./${report.out}`,
      default: `./${report.out}`,
    };
  }

  return {
    path: packageJsonPath,
    packageJson,
  };
}

const universalMiddleware: UnpluginFactory<Options | undefined, boolean> = (options?: Options) => {
  const serversExportNames = options?.serversExportNames ?? "./[dir]/[name]-[type]-[server]";
  const entryExportNames = options?.entryExportNames ?? "./[dir]/[name]-[type]";

  let normalizedInput: Record<string, string> | null = null;

  return {
    name: namespace,
    enforce: "post",
    rollup: {
      resolveId(id, importer) {
        if (id.startsWith(namespace) || filterInput(id, importer)) {
          return id;
        }
      },

      options(opts) {
        normalizedInput = normalizeInput(opts.input, options);

        opts.onwarn = (warning, handler) => {
          // Elysia and Typebox warnings
          if (
            warning.code === "THIS_IS_UNDEFINED" ||
            (warning.code === "CIRCULAR_DEPENDENCY" && warning.message.includes("typebox")) ||
            (warning.code === "CIRCULAR_DEPENDENCY" && warning.message.includes("elysia"))
          ) {
            return;
          }

          // console.warn everything else
          handler(warning);
        };
        if (normalizedInput) {
          opts.input = normalizedInput;
          appendVirtualInputs(opts.input, options?.servers);

          if (options?.externalDependencies === true) {
            if (typeof opts.external === "function") {
              const orig = opts.external;
              opts.external = (id, parentId, isResolved) => {
                if (maybeExternals.includes(id)) return true;
                return orig(id, parentId, isResolved);
              };
            } else if (Array.isArray(opts.external)) {
              opts.external = [...opts.external, ...maybeExternals];
            } else if (opts.external) {
              opts.external = [opts.external, ...maybeExternals];
            } else {
              opts.external = [...maybeExternals];
            }
          }

          return opts;
        }
      },
      async generateBundle(opts, bundle) {
        if (!normalizedInput) return;

        const out = opts.dir ?? "dist";
        const outputs = Object.entries(bundle);

        let mapping = genBundleInfo(normalizedInput, (cleanV) => {
          const found = outputs.find(([, value]) => {
            if (value.type === "chunk" && value.isEntry) {
              // biome-ignore lint/style/noNonNullAssertion: ignored
              const cleanEntry = value.facadeModuleId!;
              return (
                posix.relative(cleanEntry, cleanV) === "" || posix.relative(cleanEntry, `${namespace}:${cleanV}`) === ""
              );
            }

            return false;
          })?.[0];

          if (!found) {
            throw new Error("Error occurred while generating bundle info");
          }

          return found;
        });

        mapping = fixBundleExports(mapping, {
          serversExportNames,
          entryExportNames,
        });

        // Add dist folder to `out` and `dts`
        for (const v of Object.values(mapping)) {
          v.out = join(out, v.out);
          v.dts = join(out, v.dts);
        }

        await genDts(mapping, options);

        const report = genReport(mapping);

        if (!options?.doNotEditPackageJson) {
          const { path, packageJson } = await readAndEditPackageJson(report);
          await writeFile(path, JSON.stringify(packageJson, undefined, 2));
        }

        await options?.buildEnd?.(report);
      },
    },

    esbuild: {
      setup(builder) {
        if (builder.initialOptions.bundle !== true) {
          throw new Error("`bundle` options must be `true` for universal-middleware to work properly");
        }

        if (!options?.ignoreRecommendations) {
          if (
            builder.initialOptions.entryNames &&
            !builder.initialOptions.entryNames.includes("[hash]") &&
            !builder.initialOptions.entryNames.includes("[dir]")
          ) {
            console.warn(
              "esbuild config specifies `entryNames` without [hash] or [dir]. This could lead to missing files",
            );
          }
          if (!builder.initialOptions.splitting) {
            console.warn("enable esbuild `splitting` option to reduce bundle size");
          }
        }

        builder.initialOptions.metafile = true;

        builder.initialOptions.external ??= [];
        builder.initialOptions.external.push("node:*", "elysia");

        if (builder.initialOptions.bundle && options?.externalDependencies === true) {
          builder.initialOptions.external.push(...maybeExternals);
        }

        const normalizedInput = normalizeInput(builder.initialOptions.entryPoints);

        if (!normalizedInput) return;

        const outbase = builder.initialOptions.outbase ?? "";
        const outdir = builder.initialOptions.outdir ?? "dist";

        builder.initialOptions.entryPoints = normalizedInput;
        appendVirtualInputs(builder.initialOptions.entryPoints, options?.servers);
        builder.initialOptions.entryPoints = applyOutbase(builder.initialOptions.entryPoints, outbase);

        builder.onResolve({ filter: /^virtual:universal-middleware/ }, (args) => {
          // console.log("onResolve:virtual", args);
          return {
            path: args.path,
            namespace: namespace,
            pluginData: {
              resolveDir: args.resolveDir,
            },
          };
        });

        builder.onResolve({ filter: /(^|\.|\/|\\\\)(handler|middleware)\./ }, (args) => {
          // console.log("onResolve:?", args);
          return {
            path: resolve(args.path),
          };
        });

        builder.onLoad({ filter: /.*/, namespace: namespace }, async (args) => {
          // console.log("onLoad", args);
          if (args.path.startsWith(namespace) && !shouldLoad(args.path)) {
            return null;
          }
          const { code } = load(args.path);

          return {
            contents: code,
            resolveDir: args.pluginData.resolveDir,
            loader: "js",
          };
        });

        builder.onEnd(async (result) => {
          const outputs = Object.entries(result.metafile?.outputs ?? {});

          let mapping = genBundleInfo(normalizedInput, (cleanV) => {
            const found = outputs.find(([, value]) => {
              if (value.entryPoint) {
                const cleanEntry = value.entryPoint;
                return (
                  posix.relative(cleanEntry, cleanV) === "" ||
                  posix.relative(cleanEntry, `${namespace}:${cleanV}`) === ""
                );
              }

              return false;
            })?.[0];

            if (!found) {
              throw new Error("Error occurred while generating bundle info");
            }

            return found;
          });

          mapping = fixBundleExports(mapping, {
            serversExportNames,
            entryExportNames,
          });

          // Remove dist folder from `exports`
          for (const v of Object.values(mapping)) {
            if (v.exports !== ".") {
              v.exports = `./${posix.relative(outdir, v.exports)}`;
            }
          }

          await genDts(mapping, options);

          const report = genReport(mapping);

          if (!options?.doNotEditPackageJson) {
            const { path, packageJson } = await readAndEditPackageJson(report);
            await writeFile(path, JSON.stringify(packageJson, undefined, 2));
          }

          await options?.buildEnd?.(report);
        });
      },
    },

    loadInclude(id) {
      return shouldLoad(id);
    },

    load,
  };
};

export default universalMiddleware;
