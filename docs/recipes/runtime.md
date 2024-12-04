# Using runtime information

The runtime data and original adapter parameters can be accessed through the third `runtime` parameter
in any middleware or handler. For instance:

```ts twoslash
import { env, type Get, type UniversalMiddleware } from "@universal-middleware/core";

const handler = (() => (request, context, runtime) => {
  if (runtime.adapter === "express") {
    runtime.req;
    //      ^?
  }
}) satisfies Get<[], UniversalMiddleware>;
```

### Available properties

::: code-group

```ts twoslash [hono]
// @noErrors
import type { HonoAdapter } from "@universal-middleware/core";

export type Explain<A extends any> =
  A extends Function
    ? A
    : {[K in keyof A]: A[K]} & unknown

// ---cut---
// hover me
type Runtime = Explain<HonoAdapter>;
//   ^^^^^^^
```

```ts twoslash [h3]
// @noErrors
import type { H3Adapter } from "@universal-middleware/core";

export type Explain<A extends any> =
  A extends Function
    ? A
    : {[K in keyof A]: A[K]} & unknown

// ---cut---
// hover me
type Runtime = Explain<H3Adapter>;
//   ^^^^^^^
```

```ts twoslash [hattip]
// @noErrors
import type { HattipAdapter } from "@universal-middleware/core";

export type Explain<A extends any> =
  A extends Function
    ? A
    : {[K in keyof A]: A[K]} & unknown

// ---cut---
// hover me
type Runtime = Explain<HattipAdapter>;
//   ^^^^^^^
```

```ts twoslash [cloudflare-worker]
// @noErrors
import type { CloudflareWorkerAdapter } from "@universal-middleware/core";

export type Explain<A extends any> =
  A extends Function
    ? A
    : {[K in keyof A]: A[K]} & unknown

// ---cut---
// hover me
type Runtime = Explain<CloudflareWorkerAdapter>;
//   ^^^^^^^
```

```ts twoslash [cloudflare-pages]
// @noErrors
import type { CloudflarePagesAdapter } from "@universal-middleware/core";

export type Explain<A extends any> =
  A extends Function
    ? A
    : {[K in keyof A]: A[K]} & unknown

// ---cut---
// hover me
type Runtime = Explain<CloudflarePagesAdapter>;
//   ^^^^^^^
```

```ts twoslash [express]
// @noErrors
import type { ExpressAdapter } from "@universal-middleware/core";

export type Explain<A extends any> =
  A extends Function
    ? A
    : {[K in keyof A]: A[K]} & unknown

// ---cut---
// hover me
type Runtime = Explain<ExpressAdapter>;
//   ^^^^^^^
```

```ts twoslash [fastify]
// @noErrors
import type { FastifyAdapter } from "@universal-middleware/core";

export type Explain<A extends any> =
  A extends Function
    ? A
    : {[K in keyof A]: A[K]} & unknown

// ---cut---
// hover me
type Runtime = Explain<FastifyAdapter>;
//   ^^^^^^^
```

```ts twoslash [elysia]
// @noErrors
import type { ElysiaAdapter } from "@universal-middleware/core";

export type Explain<A extends any> =
  A extends Function
    ? A
    : {[K in keyof A]: A[K]} & unknown

// ---cut---
// hover me
type Runtime = Explain<ElysiaAdapter>;
//   ^^^^^^^
```

```ts twoslash [vercel-edge]
// @noErrors
import type { VercelEdgeAdapter } from "@universal-middleware/core";

export type Explain<A extends any> =
  A extends Function
    ? A
    : {[K in keyof A]: A[K]} & unknown

// ---cut---
// hover me
type Runtime = Explain<VercelEdgeAdapter>;
//   ^^^^^^^
```

```ts twoslash [vercel-node]
// @noErrors
import type { VercelNodeAdapter } from "@universal-middleware/core";

export type Explain<A extends any> =
  A extends Function
    ? A
    : {[K in keyof A]: A[K]} & unknown

// ---cut---
// hover me
type Runtime = Explain<VercelNodeAdapter>;
//   ^^^^^^^
```

:::

> [!NOTE]
> All runtime types are defined in [types.ts](https://github.com/magne4000/universal-middleware/blob/main/packages/core/src/types.ts)
