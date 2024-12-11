# Using `RuntimeAdapter` in userland

Any package generated through `universal-middleware` exposes a `RuntimeAdapter` type.

It can be used to type `runtime` when exposed to userland.

### Adapter specific properties

::: code-group

```ts twoslash [hono]
// @noErrors
import type { Runtime, HonoAdapter } from "@universal-middleware/core";

export type Explain<A extends any> =
  A extends Function
    ? A
    : {[K in keyof A]: A[K]} & unknown

type RuntimeAdapter = Explain<HonoAdapter>;

// ---cut---
import type { RuntimeAdapter } from "somelib/hono";

const runtime: RuntimeAdapter;

// original Hono Context. See https://hono.dev/docs/api/context
runtime.hono;
//      ^^^^
```

```ts twoslash [h3]
// @noErrors
import type { Runtime, H3Adapter } from "@universal-middleware/core";

export type Explain<A extends any> =
  A extends Function
    ? A
    : {[K in keyof A]: A[K]} & unknown

type RuntimeAdapter = Explain<H3Adapter>;

// ---cut---
import type { RuntimeAdapter } from "somelib/h3";

const runtime: RuntimeAdapter;

// original H3 Event. See https://h3.unjs.io/guide/event
runtime.h3;
//      ^^
```

```ts twoslash [hattip]
// @noErrors
import type { Runtime, HattipAdapter } from "@universal-middleware/core";

export type Explain<A extends any> =
  A extends Function
    ? A
    : {[K in keyof A]: A[K]} & unknown

type RuntimeAdapter = Explain<HattipAdapter>;

// ---cut---
import type { RuntimeAdapter } from "somelib/hattip";

const runtime: RuntimeAdapter;

// original Hattip context
runtime.hattip;
//      ^^^^^^
```

```ts twoslash [cloudflare-worker]
// @noErrors
import type { Runtime, CloudflareWorkerAdapter } from "@universal-middleware/core";

export type Explain<A extends any> =
  A extends Function
    ? A
    : {[K in keyof A]: A[K]} & unknown

type RuntimeAdapter = Explain<CloudflareWorkerAdapter>;

// ---cut---
import type { RuntimeAdapter } from "somelib/cloudflare-worker";

const runtime: RuntimeAdapter;
const originalParameters = runtime["cloudflare-worker"];

// original Cloudflare Worker env. See https://developers.cloudflare.com/workers/runtime-apis/bindings/
originalParameters.env;
//                 ^^^
// original Cloudflare Worker ctx. See https://developers.cloudflare.com/workers/runtime-apis/context/
originalParameters.ctx;
//                 ^^^
```

```ts twoslash [cloudflare-pages]
// @noErrors
import type { Runtime, CloudflarePagesAdapter } from "@universal-middleware/core";

export type Explain<A extends any> =
  A extends Function
    ? A
    : {[K in keyof A]: A[K]} & unknown

type RuntimeAdapter = Explain<CloudflarePagesAdapter>;

// ---cut---
import type { RuntimeAdapter } from "somelib/cloudflare-pages";

const runtime: RuntimeAdapter;

// original Cloudflare Worker context. See https://developers.cloudflare.com/pages/functions/api-reference/#eventcontext
const originalContext = runtime["cloudflare-pages"];
//    ^^^^^^^^^^^^^^^
```

```ts twoslash [express]
// @noErrors
import type { Runtime, ExpressAdapter } from "@universal-middleware/core";

export type Explain<A extends any> =
  A extends Function
    ? A
    : {[K in keyof A]: A[K]} & unknown

type RuntimeAdapter = Explain<ExpressAdapter>;

// ---cut---
import type { RuntimeAdapter } from "somelib/express";

const runtime: RuntimeAdapter;

// original express `req` object. See https://expressjs.com/en/guide/using-middleware.html
runtime.express.req;
//              ^^^
// original express `res` object. See https://expressjs.com/en/guide/using-middleware.html
runtime.express.res;
//              ^^^
```

```ts twoslash [fastify]
// @noErrors
import type { Runtime, FastifyAdapter } from "@universal-middleware/core";

export type Explain<A extends any> =
  A extends Function
    ? A
    : {[K in keyof A]: A[K]} & unknown

type RuntimeAdapter = Explain<FastifyAdapter>;

// ---cut---
import type { RuntimeAdapter } from "somelib/fastify";

const runtime: RuntimeAdapter;

// original fastify `request` object. See https://fastify.dev/docs/latest/Reference/Request/
runtime.fastify.request;
//              ^^^^^^^
// original fastify `reply` object. See https://fastify.dev/docs/latest/Reference/Reply/
runtime.fastify.reply;
//              ^^^^^
```

```ts twoslash [elysia]
// @noErrors
import type { Runtime, ElysiaAdapter } from "@universal-middleware/core";

export type Explain<A extends any> =
  A extends Function
    ? A
    : {[K in keyof A]: A[K]} & unknown

type RuntimeAdapter = Explain<ElysiaAdapter>;

// ---cut---
import type { RuntimeAdapter } from "somelib/elysia";

const runtime: RuntimeAdapter;

// original elysia context. See https://elysiajs.com/essential/handler#context
runtime.elysia;
//      ^^^^^^
```

```ts twoslash [vercel-node]
// @noErrors
import type { Runtime, VercelNodeAdapter } from "@universal-middleware/core";

export type Explain<A extends any> =
  A extends Function
    ? A
    : {[K in keyof A]: A[K]} & unknown

type RuntimeAdapter = Explain<VercelNodeAdapter>;

// ---cut---
import type { RuntimeAdapter } from "somelib/vercel-node";

const runtime: RuntimeAdapter;
const originalParameters = runtime["vercel-node"];

// original Vercel Request object. See https://vercel.com/docs/functions/runtimes/node-js
originalParameters.req;
//                 ^^^
// original Vercel Response object. See https://vercel.com/docs/functions/runtimes/node-js
originalParameters.res;
//                 ^^^
```

:::

### Common properties

All `runtime` objects can also contain the following properties:

```ts twoslash
// @noErrors
import type { Runtimes, Adapters } from "@universal-middleware/core";
import type { IncomingMessage, ServerResponse } from "node:http";

export type Explain<A extends any> =
  A extends Function
    ? A
    : { [K in keyof A]: A[K] } & unknown

interface _RuntimeAdapter {
  adapter: Adapters;
  runtime: Runtimes;
  params?: Record<string, string>;
  req?: IncomingMessage;
  res?: ServerResponse;
}

type RuntimeAdapter = Explain<_RuntimeAdapter>;

// ---cut---
const runtime: RuntimeAdapter;

// identify which adapter is currently used. For example 'hono' when using @universal-middleware/hono
runtime.adapter;
//      ^^^^^^^
// the runtime name ('hono', 'express', ...). Follows https://runtime-keys.proposal.wintercg.org/
runtime.runtime;
//      ^^^^^^^
// extracted route parameters. See https://universal-middleware.dev/recipes/params-handler
runtime.params;
//      ^^^^^^
// the original Node.js HTTP request object (if available), see https://nodejs.org/api/http.html#class-httpincomingmessage
runtime.req;
//      ^^^
// the original Node.js HTTP response object (if available), see https://nodejs.org/api/http.html#class-httpserverresponse
runtime.res;
//      ^^^
```

> [!NOTE]
> All runtime types are defined in [types.ts](https://github.com/magne4000/universal-middleware/blob/main/packages/core/src/types.ts)
