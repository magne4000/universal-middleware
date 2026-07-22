import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    cookie: "./src/cookies/index.ts",
  },
  format: ["esm"],
  platform: "node",
  target: "node20",
  fixedExtension: false,
  nodeProtocol: false,
  dts: true,
  clean: true,
  deps: {
    // Externalize every bare import without resolving it — the oxc dts resolver
    // cannot follow the CJS/namespace/triple-slash type shapes that several
    // framework packages (`bun`, `express`, `fastify`, …) expose. `rou3` is the
    // one dependency tsup bundled, so opt it back in.
    neverBundle: true,
    alwaysBundle: ["rou3"],
  },
});
