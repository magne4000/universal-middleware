# @universal-middleware/node

## 0.2.8

### Patch Changes

- 956083e: The `Request` the Express adapter makes again once a universal middleware has read the body reuses the abort signal of the first one, instead of adding a `close` listener to the response each time: 11 middlewares that read the body raised a `MaxListenersExceededWarning`.
- c7e1579: The request URL takes its host, like its protocol, from Express's `trust proxy` setting: the first `X-Forwarded-Host` when the setting trusts the peer, with Express 4 and 5. Behind a proxy that terminates TLS, the URL was `https://<internal host>/…`. A relative redirect `Location` read by `responseAdapter` is made absolute with the origin of the request URL, so it follows `trust proxy` and the `origin` option too.
  
  `createRequestAdapter`'s adapter takes an optional third argument, the protocol and host the server framework resolved for the request (`RequestOrigin`).
- 956083e: `sendResponse` no longer sends `Content-Length: 0` with a 204 Response, which must not carry one, nor with a 304, whose `Content-Length` describes the 200 response (RFC 9110 §8.6). Other Responses without a body still get it.
- 956083e: `responseAdapter` makes a relative redirect `Location` absolute with an HTTP/2 request's `:authority`, as `createRequestAdapter` does for the request URL. It used `localhost`, as an HTTP/2 request may have no `Host` header.
- 956083e: A request whose `Host` header, or trusted forwarded host, isn't a host and an optional port is rejected with a `BadRequestError` (400), as is `OPTIONS *`. The header was pasted in front of the path: with `Host: x/admin?`, a request for `/public` got the URL `http://x/admin?/public`, so a universal handler saw the path `/admin` while Express or Fastify routed `/public`. A request whose target is a full URL (`GET http://example.com/path`) takes its host and path from it, instead of failing with a 500. Without `next`, the Express adapter answers a `BadRequestError` with a 400 and doesn't log it.
- d8e6816: `sendResponse` sends a body already in memory (a string, a buffer, JSON, a stream that is already complete) in one write, with its `Content-Length`, instead of chunked. It streams any other Web stream body itself, as fast as the client takes it, rather than through `Readable.fromWeb` and `pipeline`, and no longer imports `node:stream` for every response. `setResponseHeaders` no longer copies the Node response's headers outside of mirror mode.
- Updated dependencies [d8e6816]
  - @universal-middleware/core@0.6.2

## 0.2.7

### Patch Changes

- 967b047: The packages declare `engines.node: ">=22"`, the versions they are built for and tested on. Node 20 reached its end of life in April 2026; package managers now warn when installing on it.
- 2d36e0d: A request without a `Host` header gets `localhost` as its host every time, not only the first time: later ones got the URL `http://undefined/…`.
- 92a3206: An HTTP/2 request takes its host from the `:authority` pseudo-header, which HTTP/2 clients send instead of `Host`, and which wins over a `Host` header when both are present (RFC 9113 §8.3.1). A request without a `Host` header got `localhost` and a warning before.
- 01f8ccb: A relative redirect `Location` is made absolute with the same protocol as the request URL: Express's `req.protocol` is used, as `createRequestAdapter` does. Behind a proxy that terminates TLS, with Express's `trust proxy` enabled, a redirect to `/login` was turned into `http://…/login` while the request URL was `https://…`.
- Updated dependencies [aa3d958]
- Updated dependencies [7d163e4]
- Updated dependencies [967b047]
- Updated dependencies [a8c7d38]
- Updated dependencies [3953127]
- Updated dependencies [6f3d3dc]
- Updated dependencies [eca2954]
  - @universal-middleware/core@0.6.1

## 0.2.6

### Patch Changes

- Updated dependencies [0dc053f]
  - @universal-middleware/core@0.6.0

## 0.2.5

### Patch Changes

- 6add5b5: fix(fastify): a universal middleware no longer breaks the body of the routes after it, and `fastify-raw-body` is not required to read it
- 6add5b5: fix(express): use the body already parsed by `express.json()` and the like instead of failing on the consumed stream
- Updated dependencies [10e6e5f]
- Updated dependencies [6bb65ff]
  - @universal-middleware/core@0.5.0

## 0.2.4

### Patch Changes

- 31deb77: fix(node): keep a redirect's headers, and keep them mutable

## 0.2.3

### Patch Changes

- d763a15: fix(node): cancel the body instead of logging when the client left before the response was sent

## 0.2.2

### Patch Changes

- 5bf08ce: fix(node): report failures while sending the response instead of swallowing them
- b26ca94: fix(node): answer HEAD without draining the response body
- 3e5f59e: fix(node): resolve `X-Forwarded-*` from the trusted hop and gate it on `trustProxy`
- 20f6325: feat(node): resolve the origin from the `Forwarded` header (RFC 7239)
- 5421dcd: fix(node): resolve forwarded `proto`/`host` like Express `trust proxy`, and broaden client-abort detection

  `X-Forwarded-*` is now authoritative and read as its first (client-facing) value,
  matching Express; the RFC 7239 `Forwarded` header only fills a param the legacy
  header omits, so a passed-through client `Forwarded` can no longer override what
  the proxy set. Send-error logging also treats `ERR_STREAM_DESTROYED`/`ABORT_ERR`
  as routine client aborts, and the HEAD check guards a possibly-absent `req`.

## 0.2.1

### Patch Changes

- 060a74e: fix: duplicated Set-Cookie headers when Express response transformers mirror cookies already set on the response.
- Updated dependencies [060a74e]
  - @universal-middleware/core@0.4.18

## 0.2.0

### Minor Changes

- cd60e02: fix(node): wire request.signal to client disconnect, backpressure

## 0.1.0

### Minor Changes

- 2f31e30: feat: move node utilities in a dedicated package
