# @universal-middleware/srvx

## 0.2.2

### Patch Changes

- aa3d958: When a response function replaces the Response, the body of the replaced one is cancelled, so an endless body (Server-Sent Events, a proxied stream) no longer keeps running. It is left alone when the replacement still reads it (the same stream, `pipeThrough`, `clone()`, `text()`, a wrapper that pulls from it). With Express, a response function no longer makes the adapter keep a second copy of the app's output in memory.
- a67d495: Calling `runtime.ctx.waitUntil()` or `runtime.ctx.passThroughOnException()` on Cloudflare no longer throws `TypeError: Illegal invocation`.
- d1363db: The packages that the published files import, at runtime or only in their types, are declared as peer dependencies: each adapter's framework (optional for type-only packages such as `@cloudflare/workers-types`), and for compress and sirv the frameworks of their per-server entries, all optional. The Vercel adapter no longer installs `@universal-middleware/express`, which it only needs for types; it and the other adapter packages it references are optional peers.
- 967b047: The packages declare `engines.node: ">=22"`, the versions they are built for and tested on. Node 20 reached its end of life in April 2026; package managers now warn when installing on it.
- Updated dependencies [aa3d958]
- Updated dependencies [7d163e4]
- Updated dependencies [967b047]
- Updated dependencies [a8c7d38]
- Updated dependencies [3953127]
- Updated dependencies [6f3d3dc]
- Updated dependencies [eca2954]
  - @universal-middleware/core@0.6.1

## 0.2.1

### Patch Changes

- Updated dependencies [0dc053f]
  - @universal-middleware/core@0.6.0

## 0.2.0

### Minor Changes

- 627168a: feat!: routes registered with `apply()` follow rou3 v0.12 through `@universal-middleware/core` 0.5, which aligns them with URLPattern: `*` matches the rest of the path, a bare `**` sets `runtime.params["0"]`, a `-` ends a param name, only one trailing slash is ignored, and a route holds at most one catch-all. See the core 0.5.0 changelog.

## 0.1.4

### Patch Changes

- Updated dependencies [10e6e5f]
- Updated dependencies [6bb65ff]
  - @universal-middleware/core@0.5.0

## 0.1.3

### Patch Changes

- 636b4bc: fix: apply typings to allow more lenient middleware types
- Updated dependencies [636b4bc]
  - @universal-middleware/core@0.4.17

## 0.1.2

### Patch Changes

- f34e0ff: feat: upgrade dependencies
- Updated dependencies [f34e0ff]
  - @universal-middleware/core@0.4.15

## 0.1.1

### Patch Changes

- 1a3a123: fix: srvx peerDependencies
- Updated dependencies [1a3a123]
  - @universal-middleware/core@0.4.12

## 0.1.0

### Minor Changes

- 540b8d8: feat: add srvx support

### Patch Changes

- Updated dependencies [540b8d8]
  - @universal-middleware/core@0.4.10
