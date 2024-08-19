# `universal-middleware`

Write standard-based middlewares and handlers once, target all supported servers.

Supports the following adapters:
- [Hono](https://github.com/magne4000/universal-middleware/tree/main/packages/adapter-hono)
- [Express](https://github.com/magne4000/universal-middleware/tree/main/packages/adapter-express)
- [Hattip](https://github.com/magne4000/universal-middleware/tree/main/packages/adapter-hattip)
- [Webroute](https://github.com/magne4000/universal-middleware/tree/main/packages/adapter-webroute)
- [Fastify](https://github.com/magne4000/universal-middleware/tree/main/packages/adapter-fastify)
- [h3](https://github.com/magne4000/universal-middleware/tree/main/packages/adapter-h3)
- TODO: elysia

## Who is this for?
The main goal of this package is for lib authors to be able to write server related logic once,
and target all supported servers.

Example of possible middleware or handler that can benefit from this lib:
- middleware that modifies HTTP headers
- middleware that modifies some request related context, like an authentication middleware that creates a `user` property for logged-in users
- middleware that applies guard logic upon request, like checking for `Authentication` header before continuing
- handler written following web standard Request/Response

## Code example

In this example, we are writing a middleware that adds a `something` property onto the request Context.
Any subsequent middleware or handler will have access to this property.
```ts
// src/middlewares/context.middleware.ts
import type { Get, UniversalMiddleware } from "universal-middleware";

const contextMiddleware = ((value) => (request, ctx) => {
  // Return the new Context, thus keeping complete type safety
  // A less typesafe way to do the same thing would be to `ctx.something = value` and return nothing
  return {
    ...ctx,
    something: value,
  };
  // Using `satisfies` to not lose return type
}) satisfies Get<[string], UniversalMiddleware>;

// export default is mandatory
export default contextMiddleware;
```

Here, the build process is handled by [tsup](https://tsup.egoist.dev/) (which mostly relies on [esbuild](https://esbuild.github.io/) under the hood).
It also supports [rollup](https://rollupjs.org/) (and by consequence [vite](https://vitejs.dev/))
```ts
// tsup.config.ts
import { defineConfig } from "tsup";
// Also available for rollup with "universal-middleware/rollup"
import universalMiddleware from "universal-middleware/esbuild";

export default defineConfig([
  {
    entry: {
      // all .middleware. or .handler. entry will be managed by `universal-middleware`
      "middlewares/context": "./src/middlewares/context.middleware.ts",
    },
    format: ["esm"],
    platform: "neutral",
    target: "es2022",
    dts: true,
    esbuildPlugins: [universalMiddleware({
      // Only generate files for selected servers. All enabled by default
      servers?: ('hono' | 'express' | 'hattip' | 'webroute')[];
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
      buildEnd?: (report: Report[]) => void | Promise<void>;
    })],
    esbuildOptions(opts) {
      opts.outbase = "src";
    },
    bundle: true,
  },
]);
```

Once the build is executed, all target files will be generated into your dist folder,
and your `package.json` will be updated with necessary `exports` config.
```json5
// package.json
// --> Generates the following "exports" in package.json

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
// hattip users would use "some-lib/middlewares/context-middleware-hattip"
// express users would use "some-lib/middlewares/context-middleware-express"
// etc.
import contextMiddleware from "some-lib/middlewares/context-middleware-hono";

const app = new Hono();

app.use(contextMiddleware("something"));
app.get("/", () => return new Response('ok')));

export default app;
```

## Supported syntax
### Handler

Universal Handler compatible with all supported servers.

```ts
// src/handlers/index.handler.ts
import type { Get, UniversalHandler } from "universal-middleware";

const handler: Get<[string], UniversalHandler> = () => (request, ctx) => {
  // A handler must ALWAYS return a Response
  // Here, we return the Context to the user
  return new Response(JSON.stringify(ctx));
};

// export default is mandatory
export default handler;
```

### Middleware that updates the Context

The Context contains data with the same lifespan as a Request. It can be used by middleware to pass any kind of data
to any subsequent middleware or handler.

```ts
// src/middlewares/context.middleware.ts
import type { Get, UniversalMiddleware } from "universal-middleware";

const contextMiddleware = (() => (request, ctx) => {
  // The new Context can either be returned, thus keeping complete type safety, or mutated
  return {
    ...ctx,
    // subsequent middlewares and handlers will have access to this property
    something: value,
  };
  // Using `satisfies` to not lose return type
}) satisfies Get<[string], UniversalMiddleware>;

// export default is mandatory
export default contextMiddleware;
```

#### Using the Context

Each adapter have its own way to store the Context.
For instance, using Hono, you can either retrieve the Context as usual in other `universal-middleware` middlewares.
Or you can write a simple Hono handler, and retrieve the Context like this:
```ts
// Also exists for others servers, such as "@universal-middleware/express", "@universal-middleware/hattip", etc.
import { getContext } from "@universal-middleware/hono";
import contextMiddleware from "@my-lib/middlewares/context-middleware-hono";
import { Hono } from "hono";

const app = new Hono();

// Update Context
app.use(contextMiddleware("something"));
app.get("/", (honoContext) => {
  // retrieve `universal-middleware` Context
  const universalContext = getContext(honoContext);
  // send it to the user
  return new Response(JSON.stringify(universalContext));
});

export default app;
```

### Middleware that updates the Response

Those are usually used to modify the Response headers.

```ts
// src/middlewares/headers.middleware.ts
import type { Get, UniversalMiddleware } from "universal-middleware";

const headersMiddleware = (() => (request, ctx) => {
  // This is a Response Handler, and will be executed after a handler or a middleware have returned a Response
  return (response) => {
    // Add a new header, using previously set Context
    response.headers.set("X-Custom-Header", ctx.something ?? "NONE");
    
    return response;
  }
  // Using `satisfies` to not lose return type
  // You can specify the type of the Context upon entry
}) satisfies Get<[string], UniversalMiddleware<{ something?: string }>>;

// export default is mandatory
export default headersMiddleware;
```

### Middleware that return an early Response

Those can be used to guard some routes

```ts
// src/middlewares/guard.middleware.ts
import type { Get, UniversalMiddleware } from "universal-middleware";

const guardMiddleware = (() => (request, ctx) => {
  if (!ctx.user) {
    return new Response("Unauthorized", {
      status: 401
    });
  }
  // If a middleware returns nothing, next middleware is automatically executed
  
  // Using `satisfies` to not lose return type
  // You can specify the type of the Context upon entry
}) satisfies Get<[string], UniversalMiddleware<{ user?: string }>>;

// export default is mandatory
export default guardMiddleware;
```

## Adapters specifity
### Hono
TODO

### Express
TODO

### Hattip
TODO

### Webroute
TODO

## Access runtime specific API
TODO
