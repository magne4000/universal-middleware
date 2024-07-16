import { parse } from "node:path";
import { createUnplugin } from "unplugin";

const wrappers = ["hono", "express", "hattip"];
const namespace = "virtual:universal-middleware";

function getVirtualInputs(type: "handler" | "middleware", handler: string) {
  return wrappers.map((server) => ({
    server,
    type,
    handler,
    get value() {
      return `${namespace}:${this.server}:${this.type}:${this.handler}`;
    },
    get key() {
      return `universal-${this.server}-${this.type}`;
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

const universalMiddleware = createUnplugin((options = {}) => {
  return {
    name: namespace,
    enforce: "post",
    rollup: {
      async options(opts) {
        if (typeof opts.input === "string") {
          const filtered = filterInput(opts.input);
          if (filtered) {
            const orig = opts.input;
            opts.input = {
              [parse(orig).name]: orig,
            };
            const virtualInputs = getVirtualInputs(filtered, orig);
            virtualInputs.forEach((vinput) => {
              (opts.input as Record<string, unknown>)[vinput.key] =
                vinput.value;
            });
          }
        } else if (Array.isArray(opts.input)) {
          const orig = opts.input;
          opts.input = Object.fromEntries(orig.map((e) => [parse(e).name, e]));
          orig.forEach((v) => {
            const filtered = filterInput(v);
            if (filtered) {
              const virtualInputs = getVirtualInputs(filtered, v);
              virtualInputs.forEach((vinput) => {
                (opts.input as Record<string, unknown>)[vinput.key] =
                  vinput.value;
              });
            }
          });
        } else if (opts.input && typeof opts.input === "object") {
          Object.entries(opts.input).forEach(([k, v]) => {
            const filtered = filterInput(v);
            if (filtered) {
              const virtualInputs = getVirtualInputs(filtered, v);
              virtualInputs.forEach((vinput) => {
                (opts.input as Record<string, unknown>)[vinput.key] =
                  vinput.value;
              });
            }
          });
        }
      },
    },

    resolveId(id, _importer, { isEntry }) {
      const filtered = filterInput(id);
      if (filtered) {
        return id.replace(`?${filtered}`, "");
      }
      if (id.startsWith("file:")) {
        id.replace("file:", "");
      }
    },

    loadInclude(id) {
      return id.startsWith(namespace);
    },

    load(id) {
      const [, , server, type, handler] = id.split(":");

      const fn = type === "handler" ? "createHandler" : "createMiddleware";
      const code = `import { ${fn} } from "@universal-middleware/${server}";
import ${type} from "${handler}?${type}";
export default ${fn}(${type});
`;
      return { code };
    },
  };
});

export default universalMiddleware;
