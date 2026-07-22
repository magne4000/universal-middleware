import { defineConfig } from "tsdown";
import universalMiddleware from "universal-middleware/rollup";

export default defineConfig({
  entry: ["./src/middleware.ts"],
  format: ["esm"],
  platform: "neutral",
  target: "es2022",
  fixedExtension: false,
  nodeProtocol: false,
  // Only emit tsgo declarations for the real source entries; the per-server
  // virtual modules injected by `universalMiddleware` get their `.d.ts` from the
  // plugin itself (via oxc `isolatedDeclaration`), and tsgo cannot process them.
  dts: { entry: ["src/**/*.ts"] },
  // The `universalMiddleware` plugin keys its virtual entries under `src/` (tsup
  // stripped this with esbuild's `outbase: "src"`); strip it here so the
  // per-server files land at the `dist/` root the package `exports` expect.
  outputOptions: {
    entryFileNames: (chunk) => `${chunk.name.replace(/^src[\\/]/, "")}.js`,
  },
  clean: true,
  plugins: [
    universalMiddleware({
      servers: ["hono", "express", "hattip", "fastify", "h3", "webroute", "elysia", "srvx"],
      entryExportNames: ".",
      serversExportNames: "./[dir]/[server]",
    }),
  ],
  // Externalize every bare import without resolving it — the oxc dts resolver
  // cannot follow several frameworks' CJS type shapes. `@universal-middleware/core`
  // is now a real dependency (it is imported at runtime) and stays external too;
  // `mrmime`/`totalist` are dependencies and stay external, as before.
  deps: { neverBundle: true },
});
