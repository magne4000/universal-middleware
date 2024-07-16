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

function normalizeInput(
  input: undefined | string | string[] | Record<string, string>,
) {
  if (typeof input === "string") {
    const filtered = filterInput(input);
    if (filtered) {
      return {
        [parse(input).name]: input,
      };
    }
  } else if (Array.isArray(input)) {
    return Object.fromEntries(input.map((e) => [parse(e).name, e]));
  } else if (input && typeof input === "object") {
    return input;
  }
  return null;
}

function appendVirtualInputs(input: Record<string, string>) {
  Object.values(input).forEach((v) => {
    const filtered = filterInput(v);
    if (filtered) {
      const virtualInputs = getVirtualInputs(filtered, v);
      virtualInputs.forEach((vinput) => {
        input[vinput.key] = vinput.value;
      });
    }
  });
}

const universalMiddleware = createUnplugin((options = {}) => {
  return {
    name: namespace,
    enforce: "post",
    rollup: {
      async options(opts) {
        const normalizedInput = normalizeInput(opts.input);
        if (normalizedInput) {
          opts.input = normalizedInput;
          appendVirtualInputs(opts.input);
        }
      },
    },

    resolveId(id) {
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
