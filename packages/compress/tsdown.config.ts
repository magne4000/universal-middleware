import { defineConfig } from "tsdown";
import universalMiddleware from "universal-middleware/rollup";

export default defineConfig([
  {
    entry: ["./src/middleware.ts"],
    format: ["esm"],
    platform: "neutral",
    target: "es2022",
    dts: false,
    plugins: [
      universalMiddleware({
        servers: ["hono", "express", "hattip", "fastify", "h3", "webroute", "elysia", "srvx"],
        entryExportNames: ".",
        serversExportNames: "./[dir]/[server]",
        dts: true,
      }),
    ],
    external: ["node:zlib"],
    treeshake: true,
    fixedExtension: false,
    removeNodeProtocol: false,
  },
]);
