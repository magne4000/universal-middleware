import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      express: "src/express-entry.ts",
      fastify: "src/fastify-entry.ts",
      elysia: "src/elysia-entry.ts",
      h3: "src/h3-entry.ts",
      hattip: "src/hattip-entry.ts",
      srvx: "src/srvx-entry.ts",
    },
    format: "esm",
    bundle: true,
    minify: false,
    outDir: "dist",
    banner: {
      js: `import {createRequire as __createRequire} from 'module';var require=__createRequire(import.meta.url);`,
    },
    removeNodeProtocol: false,
  },
]);
