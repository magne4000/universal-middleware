# Quick Start

## Installation

::: code-group

```sh [npm]
npm install -D universal-middleware
```

```sh [yarn]
yarn add -D universal-middleware
```

```sh [pnpm]
pnpm add -D universal-middleware
```

```sh [bun]
bun add -D universal-middleware
```

:::

## Creating your first middleware

In this step, we will create a simple middleware that returns an early response if some header is missing.

> [!IMPORTANT]
> All middleware files must include `.middleware.` in their name,
> and handlers `.handler.`.
> Without it, the bundler will not generate any adapter.
> 
> FIXME: merge both

```ts twoslash
// src/middlewares/demo.middleware.ts

import type { Get, UniversalMiddleware } from "universal-middleware";

interface Config {
  header: string;
}

// This middleware will return an early response if given header is missing
const guardMiddleware = ((config) => (request, ctx) => {
  if (!request.headers.has(config.header)) {
    return new Response("Header not present", {
      status: 401,
    });
  }
  // else we do nothing
  
  // Using `satisfies` to not lose return type
}) satisfies Get<[Config], UniversalMiddleware>;

// export default is mandatory
export default guardMiddleware;
```

::: info Example of usage with Hono after packaging

After [bundling](/guide/packaging), this middleware would be used as follows:

> [!TIP]
> This is what your user facing documentation would contain.

```ts
import { Hono } from "hono";
// Once published as "some-lib"
import guardMiddleware from "some-lib/middlewares/demo-middleware-hono";

const app = new Hono();

app.use(guardMiddleware({ header: 'X-Universal-Demo' }));

export default app;
```

:::
