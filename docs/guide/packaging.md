# Bundling and packaging

After creating your universal middleware, you need to bundle it before publishing.

You can use either rollup-based tools (such as [rollup](https://rollupjs.org/) or [vite](https://vitejs.dev/)) or
esbuild-based tools (like [esbuild](https://esbuild.github.io/) or [tsup](https://tsup.egoist.dev/)) for bundling.

### Bundling

::: code-group

```ts [rollup]
import { rollup } from "rollup";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import universalMiddleware from "universal-middleware/rollup";

// See https://github.com/magne4000/universal-middleware/blob/main/packages/universal-middleware/test/rollup.test.ts
// for a list of possible options and usage
const result = await rollup({
  // Your middlewares and handlers must all be added as input
  input: "./src/middleware/demo.middleware.ts",
  plugins: [
    universalMiddleware(),
    // usually required
    nodeResolve(),
    // required if using typescript
    typescript(),
  ]
});
```

```ts [vite]
// vite.config.js

import { resolve } from "node:path";
import { defineConfig } from "vite";
import universalMiddleware from "universal-middleware/rollup";

export default defineConfig({
  plugins: [universalMiddleware()],
  build: {
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'src/middleware/demo.middleware.ts'),
      name: 'My Awesome Middleware',
      fileName: 'some-lib',
    }
  },
});
```

```ts [esbuild]
import { build } from "esbuild";
import universalMiddleware from "universal-middleware/esbuild";

// See https://github.com/magne4000/universal-middleware/blob/main/packages/universal-middleware/test/esbuild.test.ts
// for a list of possible options and usage
const result = await build({
  entryPoints: ["./src/middleware/demo.middleware.ts"],
  plugins: [
    universalMiddleware(),
  ],
  outdir: "dist",
  bundle: true,
  platform: "neutral",
  format: "esm",
  target: "es2022",
  splitting: true,
});
```

```ts [tsup]
// tsup.config.ts

import { defineConfig } from "tsup";
import universalMiddleware from "universal-middleware/esbuild";

export default defineConfig([
  {
    entry: {
      "middlewares/demo": "./src/middlewares/demo.middleware.ts",
    },
    format: ["esm"],
    platform: "neutral",
    target: "es2022",
    esbuildPlugins: [universalMiddleware()],
    esbuildOptions(opts) {
      opts.outbase = "src";
    },
    bundle: true,
  },
]);

```

:::

::: details Plugin options

The bundler plugin also accepts the following options:

```ts
universalMiddleware({
  // Only generate files for selected servers. All enabled by default
  servers?: ('hono' | 'express' | 'hattip' | 'fastify' | 'h3' | 'webroute')[];
  // akin to esbuild `entryNames` for generated "exports" in package.json
  serversExportNames?: string;
  // akin to ebsuild `entryNames` for generated "exports" in package.json
  entryExportNames?: string;
  // Disables some warning
  ignoreRecommendations?: boolean;
  // No auto writing in package.json. All info available to do it manually in `buildEnd`
  doNotEditPackageJson?: boolean;
  // Generate typings. true by default
  dts?: boolean;
  // Hook called when bundle is generated
  // For details, check https://github.com/magne4000/universal-middleware/blob/main/packages/universal-middleware/src/plugin.ts
  buildEnd?: (report: Report[]) => void | Promise<void>;
});
```

:::

### Building

Once the build is executed, your dist folder will contain the following files:

```
dist
└─ middlewares
  # raw middleware, compiled to js + types
  ├─ demo.d.ts
  ├─ demo.js
  # compiled adapters + types
  ├─ universal-express-middleware-demo.middleware.d.ts
  ├─ universal-express-middleware-demo.middleware.js
  ├─ universal-h3-middleware-demo.middleware.d.ts
  ├─ universal-h3-middleware-demo.middleware.js
  ├─ universal-hono-middleware-demo.middleware.d.ts
  ├─ universal-hono-middleware-demo.middleware.js
  └─ ...
```

Your project's `package.json` will be updated to contains the necessary `exports` and `optionalDependencies`.

::: details

```json5
{
  // ...
  "exports": {
    "./middlewares/demo-middleware": {
      "types": "./dist/middlewares/demo.d.ts",
      "import": "./dist/middlewares/demo.js",
      "default": "./dist/middlewares/demo.js"
    },
    "./middlewares/demo-middleware-hono": {
      "types": "./dist/middlewares/universal-hono-middleware-demo.middleware.d.ts",
      "import": "./dist/middlewares/universal-hono-middleware-demo.middleware.js",
      "default": "./dist/middlewares/universal-hono-middleware-demo.middleware.js"
    },
    "./middlewares/demo-middleware-express": {
      "types": "./dist/middlewares/universal-express-middleware-demo.middleware.d.ts",
      "import": "./dist/middlewares/universal-express-middleware-demo.middleware.js",
      "default": "./dist/middlewares/universal-express-middleware-demo.middleware.js"
    },
    "./middlewares/demo-middleware-h3": {
      "types": "./dist/middlewares/universal-h3-middleware-demo.middleware.d.ts",
      "import": "./dist/middlewares/universal-h3-middleware-demo.middleware.js",
      "default": "./dist/middlewares/universal-h3-middleware-demo.middleware.js"
    },
    // ...
  },
  "optionalDependencies": {
    "@universal-middleware/express": "^0",
    "@universal-middleware/h3": "^0",
    "@universal-middleware/hono": "^0",
    // ...
  }
}
```

:::

> [!TIP]
> You can opt out of this behaviour by setting `doNotEditPackageJson: true` in the plugin options.

### Publishing

Your package should now be ready to be published! :rocket:
