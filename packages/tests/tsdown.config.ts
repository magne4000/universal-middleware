import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts", "./src/utils.ts", "./src/utils-node.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  fixedExtension: false,
  nodeProtocol: false,
  dts: true,
  clean: true,
  deps: {
    // Only externalize the framework packages whose CJS/namespace/triple-slash
    // `.d.ts` shapes the oxc dts resolver cannot follow (they leak in through the
    // bundled `@universal-middleware/core` declaration). Everything else keeps
    // tsdown's default behavior — `@universal-middleware/core` (a devDependency)
    // and its transitive deps (`regexparam`, `tough-cookie`) get bundled, exactly
    // as tsup did.
    neverBundle: [
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
    ],
  },
});
