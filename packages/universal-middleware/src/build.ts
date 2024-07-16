import { join, parse, resolve } from "node:path";
import { createUnplugin } from "unplugin";

export interface Options {
  servers?: (typeof defaultWrappers)[number][];
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
    return Object.fromEntries(
      input.map((e) => {
        if (typeof e === "string") {
          const parsed = parse(e);
          return getTuple(join(parsed.dir, parsed.name), e);
        }
        return getTuple(e.out, e.in);
      }),
    );
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

function load(id: string) {
  const [, , server, type, handler] = id.split(":");

  const fn = type === "handler" ? "createHandler" : "createMiddleware";
  const code = `import { ${fn} } from "@universal-middleware/${server}";
import ${type} from "${handler}";
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
      async options(opts) {
        const normalizedInput = normalizeInput(opts.input);
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
            !builder.initialOptions.entryNames.includes("[hash]")
          ) {
            console.warn(
              "esbuild config specifies `entryNames` without [hash]. This could lead to unknown behaviour",
            );
          }
          if (!builder.initialOptions.splitting) {
            console.warn(
              "enable esbuild `splitting` option to reduce bundle size",
            );
          }
          // TODO
        }

        if (!builder.initialOptions.entryNames) {
          builder.initialOptions.entryNames = "[name]-[hash]";
        }

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

        builder.initialOptions.entryPoints = normalizedInput;
        appendVirtualInputs(
          builder.initialOptions.entryPoints,
          options?.servers,
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
          // console.log("onResolve:?", args);
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

    load,
  };
});

export default universalMiddleware;
