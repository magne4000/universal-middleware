import { join, parse, resolve } from "node:path";
import { createUnplugin } from "unplugin";

export interface Options {
  servers?: (typeof defaultWrappers)[number][];
  serversExportNames?: string;
  entryExportNames?: string;
  ignoreRecommendations?: boolean;
}

const defaultWrappers = ["hono", "express", "hattip"] as const;
const namespace = "virtual:universal-middleware";

function getVirtualInputs(
  type: "handler" | "middleware",
  handler: string,
  wrappers: ReadonlyArray<(typeof defaultWrappers)[number]> = defaultWrappers,
) {
  const parsed = parse(handler);
  return wrappers.map((server) => ({
    server,
    type,
    handler,
    get value() {
      return `${namespace}:${this.server}:${this.type}:${this.handler}`;
    },
    get key() {
      return join(
        parsed.dir,
        `universal-${this.server}-${this.type}-${parsed.name}`,
      );
    },
  }));
}

function filterInput(input: string) {
  if (input.endsWith("?handler")) {
    return "handler";
  }
  if (input.endsWith("?middleware")) {
    return "middleware";
  }
  return null;
}

function normalizeInput(
  input:
    | undefined
    | string
    | string[]
    | Record<string, string>
    | { in: string; out: string }[],
  options?: Options,
) {
  const keys = new Set<string>();

  function getTuple(key: string, value: string) {
    if (keys.has(key)) {
      throw new Error(`Conflict on entry ${key}: ${value}`);
    } else {
      keys.add(key);
    }
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
      console.warn(
        "Prefer using an object for esbuild `entryPoints` instead of an array",
      );
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
  Object.values(input).forEach((v) => {
    const filtered = filterInput(v);
    if (filtered) {
      const virtualInputs = getVirtualInputs(filtered, v, wrappers);
      virtualInputs.forEach((vinput) => {
        input[vinput.key] = vinput.value;
      });
    }
  });
}

function applyOutbase(input: Record<string, string>, outbase: string) {
  if (!outbase) return input;

  const re = new RegExp("^" + outbase + "/?", "gu");

  return Object.keys(input).reduce(
    (acc, key) => {
      acc[key.replace(re, "")] = input[key];
      return acc;
    },
    {} as Record<string, string>,
  );
}

function load(id: string, resolve?: (handler: string, type: string) => string) {
  const [, , server, type, handler] = id.split(":");

  const fn = type === "handler" ? "createHandler" : "createMiddleware";
  const code = `import { ${fn} } from "@universal-middleware/${server}";
import ${type} from "${resolve ? resolve(handler, type) : handler}";
export default ${fn}(${type});
`;
  return { code };
}

function cleanPath(s: string) {
  return s.replace(`?middleware`, "").replace(`?handler`, "");
}

const universalMiddleware = createUnplugin((options?: Options) => {
  return {
    name: namespace,
    enforce: "post",
    rollup: {
      options(opts) {
        const normalizedInput = normalizeInput(opts.input, options);
        if (normalizedInput) {
          opts.input = normalizedInput;
          appendVirtualInputs(opts.input, options?.servers);
        }
      },
    },

    esbuild: {
      setup(builder) {
        if (builder.initialOptions.bundle !== true) {
          throw new Error(
            "`bundle` options must be `true` for universal-middleware to work properly",
          );
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
            console.warn(
              "enable esbuild `splitting` option to reduce bundle size",
            );
          }
          // TODO
        }

        builder.initialOptions.metafile = true;

        if (builder.initialOptions.bundle) {
          builder.initialOptions.external = [
            ...(builder.initialOptions.external ?? []),
            "@universal-middleware/express",
            "@universal-middleware/hattip",
            "@universal-middleware/hono",
          ];
        }

        const normalizedInput = normalizeInput(
          builder.initialOptions.entryPoints,
        );

        if (!normalizedInput) return;

        const outbase = builder.initialOptions.outbase ?? "";

        builder.initialOptions.entryPoints = normalizedInput;
        appendVirtualInputs(
          builder.initialOptions.entryPoints,
          options?.servers,
        );
        builder.initialOptions.entryPoints = applyOutbase(
          builder.initialOptions.entryPoints,
          outbase,
        );

        builder.onResolve(
          { filter: /^virtual:universal-middleware/ },
          (args) => {
            // console.log("onResolve:virtual", args);
            return {
              path: args.path,
              namespace,
              pluginData: {
                resolveDir: args.resolveDir,
              },
            };
          },
        );

        builder.onResolve({ filter: /\?(middleware|handler)$/ }, (args) => {
          // console.log("onResolve:?", args, resolve(cleanPath(args.path)));
          return {
            path: resolve(cleanPath(args.path)),
          };
        });

        builder.onLoad({ filter: /.*/, namespace }, async (args) => {
          // console.log("onLoad", args);
          const { code } = load(args.path);

          return {
            contents: code,
            resolveDir: args.pluginData.resolveDir,
            loader: "js",
          };
        });

        builder.onEnd((result) => {
          const serversExportNames =
            options?.serversExportNames ?? "./[name]-[type]-[server]";
          const entryExportNames =
            options?.entryExportNames ?? "./[name]-[type]";

          const entries = Object.entries(normalizedInput);
          const outputs = Object.entries(result.metafile!.outputs);

          const mapping = Object.fromEntries(
            entries.map(([k, v]) => {
              const cleanV = cleanPath(v);
              const dest = outputs.find(([, value]) => {
                if (value.entryPoint) {
                  const cleanEntry = cleanPath(value.entryPoint);
                  return (
                    cleanEntry === cleanV ||
                    cleanEntry === namespace + ":" + cleanV
                  );
                }

                return false;
              })?.[0];
              const parsed = parse(cleanV);
              return [
                cleanV,
                {
                  dest,
                  id: k,
                  dir: parsed.dir,
                  name: parsed.name,
                  type: filterInput(v),
                },
              ];
            }),
          );

          Object.entries(mapping).forEach(([k, v]) => {
            if (!k.startsWith(namespace)) {
              (v as Record<string, unknown>).exports = entryExportNames
                .replace("[name]", v.name)
                .replace("[type]", v.type!);
            }
          });

          Object.entries(mapping).forEach(([k, v]) => {
            if (k.startsWith(namespace)) {
              const [, , server, type, handler] = k.split(":");
              (v as Record<string, unknown>).exports = serversExportNames
                .replace("[name]", mapping[handler].name)
                .replace("[type]", type)
                .replace("[server]", server);
            }
          });

          // TODO: test with https://esbuild.github.io/api/#outbase

          // console.log(mapping);
        });
      },
    },

    resolveId(id) {
      const filtered = filterInput(id);
      if (filtered) {
        return id.replace(`?${filtered}`, "");
      }
    },

    loadInclude(id) {
      return id.startsWith(namespace);
    },

    load(id) {
      return load(id, (handler, type) => `${handler}?${type}`);
    },
  };
});

export default universalMiddleware;
