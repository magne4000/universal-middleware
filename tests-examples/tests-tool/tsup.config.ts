import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      express: "src/express-entry.ts",
    },
    format: "esm",
    bundle: true,
    minify: false,
    outDir: "dist",
    banner: {
      js: `import {createRequire as __createRequire} from 'module';var require=__createRequire(import.meta.url);`,
    },
  },
]);
