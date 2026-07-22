import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  fixedExtension: false,
  nodeProtocol: false,
  dts: true,
  clean: true,
  deps: {
    // Externalize bare imports without resolving (the oxc dts resolver cannot
    // follow fastify's CJS type shapes), but keep bundling `fastify-plugin`,
    // which tsup bundled as a devDependency.
    neverBundle: true,
    alwaysBundle: ["fastify-plugin"],
  },
});
