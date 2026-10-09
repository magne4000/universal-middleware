# Node.js utilities

The `@universal-middleware/node` package provides low-level Node.js HTTP utilities for converting between
Node.js `IncomingMessage`/`ServerResponse` objects and the standard fetch API `Request`/`Response` objects.

These utilities are split into two tree-shakable entry points so that bundlers targeting non-Node.js environments
(edge runtimes, browsers) can exclude the Node.js stream dependencies when only the request adapter is needed.

## Installation

```bash
npm install @universal-middleware/node
```

## Entry points

| Import path | Exports | `node:` imports |
|---|---|---|
| `@universal-middleware/node` | All utilities | — |
| `@universal-middleware/node/request` | `createRequestAdapter`, `BadRequestError` | ❌ none |
| `@universal-middleware/node/response` | `sendResponse`, `responseAdapter` | ✅ `node:stream` |

## `createRequestAdapter`

Converts a Node.js `IncomingMessage` (or Express-compatible request) into a fetch API `Request` object.

```ts
import { createRequestAdapter } from "@universal-middleware/node/request";
import * as http from "node:http";

const requestAdapter = createRequestAdapter({
  // Optional: set the origin explicitly instead of inferring from headers
  origin: "https://example.com",
  // Optional: trust X-Forwarded-* headers (useful behind a reverse proxy)
  trustProxy: true,
});

const server = http.createServer((req, res) => {
  const request = requestAdapter(req, res);
  // `request` is now a standard fetch API Request
  console.log(request.url, request.method);
  res.end();
});
```

### Options

| Option | Type | Description |
|---|---|---|
| `origin` | `string` | Sets the origin part of the URL. Defaults to `process.env.ORIGIN`. If not set, the origin is inferred from protocol and hostname headers. |
| `trustProxy` | `boolean` | Trust `X-Forwarded-Proto`, `X-Forwarded-Host`, and `X-Forwarded-For` headers. Defaults to `true` if `process.env.TRUST_PROXY === "1"`. |

A request target that is a full URL (`GET http://example.com/path`) gives the request its host and path.
When the request has no URL a `Request` can hold, the adapter throws a `BadRequestError`, whose `status` and
`statusCode` are 400: Express and Fastify answer it with a 400. That is the case of a `Host` header, or a trusted
forwarded host, that isn't a host and an optional port, as it would otherwise change the path of the URL. It is also the
case of `OPTIONS *`.

### The server framework's origin

The adapter takes an optional third argument: the protocol and host the server framework resolved for the request,
from its own trust-proxy setting. They come after the `origin` option and the forwarding headers `trustProxy` trusts,
and before what the adapter reads itself.

```ts
const request = requestAdapter(req, res, { protocol: "https", host: "public.example" });
```

A relative redirect `Location` read by `responseAdapter` is made absolute with the origin of that request's URL.

### In the Express and Fastify adapters

The Express adapter's `createHandler`, `createMiddleware` and `apply` take the options above. The request URL follows
Express's `trust proxy` setting: `req.protocol`, and the first `X-Forwarded-Host` when the setting trusts the peer.

The Fastify adapter's `createHandler`, `createMiddleware` and `apply` take only `origin`. The request URL has the
protocol and host of Fastify's `request.protocol` and `request.host`, which follow its `trustProxy` option.
`TRUST_PROXY=1` still makes the forwarding headers win, in both adapters.

```ts
import { apply } from "@universal-middleware/express";

apply(app, middlewares, { origin: "https://example.com" });
```

## `sendResponse`

Sends a fetch API `Response` into a Node.js `ServerResponse` stream, including status code, headers, and body.
A body already in memory (a string, a buffer, JSON) goes out in one write with its `Content-Length`. Any other body is
streamed as fast as the client reads it, and cancelled if the client leaves.

```ts
import { createRequestAdapter } from "@universal-middleware/node/request";
import { sendResponse } from "@universal-middleware/node/response";
import * as http from "node:http";

const requestAdapter = createRequestAdapter();

const server = http.createServer(async (req, res) => {
  const request = requestAdapter(req, res);
  const response = new Response("Hello, world!", { status: 200 });
  await sendResponse(response, res);
});
```

## `responseAdapter`

Converts a Node.js `ServerResponse` into a fetch API `Response` object.
This is useful for reading the response that a Node.js handler has prepared, e.g. to apply post-processing middleware.

```ts
import { responseAdapter } from "@universal-middleware/node/response";
import * as http from "node:http";

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader("content-type", "text/plain");
  // Convert to a fetch Response for further processing
  const response = responseAdapter(res, "Hello, world!");
  console.log(response.status, response.headers.get("content-type"));
  res.end("Hello, world!");
});
```
