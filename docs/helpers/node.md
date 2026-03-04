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
| `@universal-middleware/node/request` | `createRequestAdapter` | ❌ none |
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
  const request = requestAdapter(req);
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

## `sendResponse`

Sends a fetch API `Response` into a Node.js `ServerResponse` stream, including status code, headers, and body.

```ts
import { createRequestAdapter } from "@universal-middleware/node/request";
import { sendResponse } from "@universal-middleware/node/response";
import * as http from "node:http";

const requestAdapter = createRequestAdapter();

const server = http.createServer(async (req, res) => {
  const request = requestAdapter(req);
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
