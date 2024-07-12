The goal of this repository is to flatten out the state of current JS (HTTP) servers(less) ecosystem,
and determine what would be the best course of action to create a unified way to represent Handlers and Middlewares (and their Context).

The [playground](https://github.com/magne4000/universal-handler/tree/main/playground) contains code to test some patterns, represent Handlers and Middlewares, and adapters for all the major implementations.

Some [packages](https://github.com/magne4000/universal-handler/tree/main/packages) are also being authored (WIP).
The goal of those packages will be to provide tool authors a mean to declare their Handlers and Middlewares once, targetting all supported servers.
Think of it as [unplugin](https://github.com/unjs/unplugin) but for Handlers and Middlewares.

## Definitions
### Handler
A function that returns a response. Depending on the framework, a response can be anything from a [standard Response](https://workers.js.org/), a string, an object, a [ServerResponse](https://nodejs.org/api/http.html#class-httpserverresponse), etc.

A standard, agnostic and future-proof way to represent a request would certainly be with the [Response interface](https://fetch.spec.whatwg.org/#request), even if it currently have [some limitations](https://github.com/whatwg/fetch/issues/1716).

### Middleware
A function that modifies the Context or Response, and can return nothing. It can be called before and after a Handler.
[Hono as a great way to represent this](https://hono.dev/concepts/middleware).
Each framework as its own way to implement middlewares.

### Context
Some data with the same lifespan as a Request.
Each framework as its own way to represent the Context, either by attaching it to their internal Request representation, or by having the Context itself containing the Request.

## Current state of popular servers
### express
- Internal representation as superset of [IncomingMessage](https://nodejs.org/api/http.html#class-httpincomingmessage) and [ServerResponse](https://nodejs.org/api/http.html#class-httpserverresponse)
- Legacy, most used
- Robust ecosystem of middlewares
- 😞 Not following WhatWG/WinterCG
- Works on:
  - node
  - bun
  - deno
  - netlify (and orobably others) with [serverless adapter](https://www.npmjs.com/package/serverless-http)

### fastify
- Own internal representation as [Request](https://github.com/fastify/fastify/blob/main/docs/Reference/Request.md#request) and [Reply](https://github.com/fastify/fastify/blob/main/docs/Reference/Reply.md#reply)
- Compatible with express middlewares with [@fastify/express](https://github.com/fastify/fastify-express)
  - Also has its own recommended middleware lib [@fastify/middie](https://github.com/fastify/middie)
- [Serverless compatible](https://github.com/fastify/fastify/blob/main/docs/Guides/Serverless.md), but like with express, actually tailored for stateful server usage
- 😞 Not following WhatWG/WinterCG
- Works on:
  - node
  - bun
  - [serverless with adapter](https://github.com/fastify/fastify/blob/main/docs/Guides/Serverless.md)

### h3
- Internal representation as node [IncomingMessage](https://nodejs.org/api/http.html#class-httpincomingmessage) and [ServerResponse](https://nodejs.org/api/http.html#class-httpserverresponse) (with partial polyfill for unsuported environments thanks to [unenv](https://github.com/unjs/unenv))
- Compatible with express middlewares with a [simple adapter](https://h3.unjs.io/examples/from-expressjs-to-h3#middleware)
- 😞 Not following WhatWG/WinterCG, but compatible with them
- Works on:
  - node
  - web
  - plain
  - bun
  - deno
  - cloudflare
  - netlify

### hatTip
- Internal representation as standard `Request` ([wrapped in context](https://github.com/hattipjs/hattip/blob/69237d181300b200a14114df2c3c115c44e0f3eb/packages/base/core/index.d.ts)) and standard `Response`
- 😊 Follows WhatWG/WinterCG
- Works on:
  - bun
  - cloudflare
  - deno (including Deno Deploy)
  - as an express middleware
  - fastly
  - lagon
  - netlify
  - node
  - uWebSockets.js
  - vercel

### hono
- Internal representation as a [superset of `Request`](https://hono.dev/api/request#honorequest) and standard `Response`
- 😊 [Follows WhatWG/WinterCG](https://hono.dev/concepts/web-standard)
- Works on:
  - cloudflare
  - deno
  - bun
  - fastly
  - vercel
  - netlify
  - aws lambda
  - lambda@edge
  - azure functions
  - node

### elysia
TBD

## Useful resources
- [Hono vs. H3 vs. HatTip vs. Elysia](https://dev.to/this-is-learning/hono-vs-h3-vs-hattip-vs-elysia-modern-serverless-replacements-for-express-3a6n)
- https://github.com/hattipjs/hattip/discussions/45
- https://workers.js.org/
