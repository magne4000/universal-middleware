# `universal-middleware`
### For tool authors
Declare middlewares and handlers once, target all supported servers:

```ts
// src/middlewares/context.middleware.ts
import type { Get, UniversalMiddleware } from "universal-middleware";

const contextMiddleware = ((value) => (request, ctx) => {
  // Can return a Response, a Response Handler, updated Context data or void
  return {
    ...ctx,
    something: value,
  };
  // Using `satisfies` to not lose return type
}) satisfies Get<[string], UniversalMiddleware>;

export default contextMiddleware;
```
```ts
// tsup.config.ts
import { defineConfig } from "tsup";
// Also available for rollup with "universal-middleware/rollup"
import universalMiddleware from "universal-middleware/esbuild";

export default defineConfig([
  {
    entry: {
      "middlewares/context": "./src/middlewares/context.middleware.ts",
    },
    format: ["esm"],
    platform: "neutral",
    target: "es2022",
    dts: true,
    esbuildPlugins: [universalMiddleware({
      // Only generate files for selected servers. All enabled by default
      servers?: ('hono' | 'express' | 'hattip' | 'webroute')[];
      // akin to ebsuild `entryNames` for generated "exports" in package.json
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
      buildEnd?: (report: Report[]) => void | Promise<void>;
    })],
    esbuildOptions(opts) {
      opts.outbase = "src";
    },
    bundle: true,
  },
]);
```

```json5
// package.json
// --> Generates the following "exports" in package.json, and all files in dist folder

{
  "./middlewares/context-middleware": {
    "types": "./dist/middlewares/context.d.ts",
    "import": "./dist/middlewares/context.js",
    "default": "./dist/middlewares/context.js"
  },
  "./middlewares/context-middleware-hono": {
    "types": "./dist/middlewares/universal-hono-middleware-context.middleware.d.ts",
    "import": "./dist/middlewares/universal-hono-middleware-context.middleware.js",
    "default": "./dist/middlewares/universal-hono-middleware-context.middleware.js"
  },
  "./middlewares/context-middleware-express": {
    "types": "./dist/middlewares/universal-express-middleware-context.middleware.d.ts",
    "import": "./dist/middlewares/universal-express-middleware-context.middleware.js",
    "default": "./dist/middlewares/universal-express-middleware-context.middleware.js"
  },
  "./middlewares/context-middleware-hattip": {
    "types": "./dist/middlewares/universal-hattip-middleware-context.middleware.d.ts",
    "import": "./dist/middlewares/universal-hattip-middleware-context.middleware.js",
    "default": "./dist/middlewares/universal-hattip-middleware-context.middleware.js"
  }
}

// --> Also generates "optionalDependencies"
{
  "@universal-middleware/express": "^0",
  "@universal-middleware/hattip": "^0",
  "@universal-middleware/webroute": "^0",
  "@universal-middleware/hono": "^0"
}
```

### For users
Easy usage for supported servers:

```ts
//hono-entry.ts
import { Hono } from "hono";
import contextMiddleware from "some-lib/middlewares/context-middleware-hono";

const app = new Hono();

app.use(contextMiddleware("something"));
app.get("/", () => return new Response('ok')));

export default app;
```
