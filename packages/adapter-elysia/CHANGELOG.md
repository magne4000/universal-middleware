## [0.3.3](https://github.com/magne4000/universal-middleware/compare/elysia-v0.3.2...elysia-v0.3.3) (2024-12-09)

## 0.8.0

### Minor Changes

- 0f9f2cf: A route that returns something other than a `Response` (a string, an object, `status(201, …)`, nothing) no longer answers 500 when a middleware returns a response function: the response function gets what Elysia would send for that value, with the status and headers the route set, and what it returns is sent. With `aot: true`, the default, the value is first validated against the route's response schema, so the response function gets it cleaned, and the cookies Elysia sets (signed ones included) are sent once. A route that returns a `Response` now also hands its response functions the status and headers set with `set`.
  
  With `aot: false`, Elysia has no hook after it validates a response: response functions get the value as the route returned it, so a response schema doesn't clean it.
  
  Breaking: the peer dependency is now `elysia@^1.4`. The adapter tells `aot: true` from `aot: false` with `responseValue`, which Elysia sets since 1.4, and uses Elysia's own conversion, which Elysia exports since 1.2.

## 0.7.2

### Patch Changes

- aa3d958: When a response function replaces the Response, the body of the replaced one is cancelled, so an endless body (Server-Sent Events, a proxied stream) no longer keeps running. It is left alone when the replacement still reads it (the same stream, `pipeThrough`, `clone()`, `text()`, a wrapper that pulls from it). With Express, a response function no longer makes the adapter keep a second copy of the app's output in memory.
- 967b047: The packages declare `engines.node: ">=22"`, the versions they are built for and tested on. Node 20 reached its end of life in April 2026; package managers now warn when installing on it.
- 936456e: `@universal-middleware/h3` and `@universal-middleware/elysia` now declare `h3` and `elysia` as peer dependencies, so they resolve the framework they import under strict package managers (pnpm without hoisting, Yarn PnP).
- eca2954: Framework peer dependencies accept the whole major version (`hono ^4`, `fastify ^5`, `h3 ^1`, `elysia ^1`, `@webroute/route ^0.8`, `@cloudflare/workers-types ^4 || ^5`) instead of the latest release when the package was built (`hono ^4.13.13`, `@cloudflare/workers-types ^5.20261004.1`, …), which gave apps on an older minor an unmet peer warning.
- Updated dependencies [aa3d958]
- Updated dependencies [7d163e4]
- Updated dependencies [967b047]
- Updated dependencies [a8c7d38]
- Updated dependencies [3953127]
- Updated dependencies [6f3d3dc]
- Updated dependencies [eca2954]
  - @universal-middleware/core@0.6.1

## 0.7.1

### Patch Changes

- Updated dependencies [0dc053f]
  - @universal-middleware/core@0.6.0

## 0.7.0

### Minor Changes

- 627168a: feat!: routes registered with `apply()` follow rou3 v0.12 through `@universal-middleware/core` 0.5, which aligns them with URLPattern: `*` matches the rest of the path, a bare `**` sets `runtime.params["0"]`, a `-` ends a param name, only one trailing slash is ignored, and a route holds at most one catch-all. See the core 0.5.0 changelog.

## 0.6.6

### Patch Changes

- 6add5b5: fix(elysia): a universal middleware no longer replaces Elysia's body parsing for the routes after it; in an app with no universal middleware, a `createHandler` on a route with a body schema no longer gets the body (Node: 500 `unusable`; Bun: an empty body), and an app hook that reads `request.body` directly before the middleware makes a middleware that reads the body fail
- Updated dependencies [10e6e5f]
- Updated dependencies [6bb65ff]
  - @universal-middleware/core@0.5.0

## 0.6.5

### Patch Changes

- 8a1657d: fix: Elysia body parsing

## 0.6.4

### Patch Changes

- 636b4bc: fix: apply typings to allow more lenient middleware types
- Updated dependencies [636b4bc]
  - @universal-middleware/core@0.4.17

## 0.6.3

### Patch Changes

- f34e0ff: feat: upgrade dependencies
- Updated dependencies [f34e0ff]
  - @universal-middleware/core@0.4.15

## 0.6.2

### Patch Changes

- c035641: fix: extract req/res from srvx
- Updated dependencies [c035641]
  - @universal-middleware/core@0.4.14

## 0.6.1

### Patch Changes

- ec2d5c3: fix(deps): update all non-major dependencies

## 0.6.0

### Minor Changes

- 4dd534b: fix(deps): update all non-major dependencies

### Patch Changes

- Updated dependencies [4dd534b]
  - @universal-middleware/core@0.4.11

## 0.5.3

### Patch Changes

- f0ea4c3: feat: declare static context through enhance
- Updated dependencies [f0ea4c3]
  - @universal-middleware/core@0.4.9

## 0.5.2

### Patch Changes

- Updated dependencies [bd67eba]
  - @universal-middleware/core@0.4.8

## 0.5.1

### Patch Changes

- 7ddfafc: feat: export App type

## 0.5.0

### Minor Changes

- f492e9a: Support for elysia 1.3

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.3.3

## [0.4.8](https://github.com/magne4000/universal-middleware/compare/elysia-v0.4.7...elysia-v0.4.8) (2025-04-06)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.4.7

## [0.4.7](https://github.com/magne4000/universal-middleware/compare/elysia-v0.4.6...elysia-v0.4.7) (2025-04-01)

### Bug Fixes

- ensure late errors are forwarded as expected ([#138](https://github.com/magne4000/universal-middleware/issues/138)) ([f37cac7](https://github.com/magne4000/universal-middleware/commit/f37cac764b8b2fe054b297a52bbf12cde7076949))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.4.6

## [0.4.6](https://github.com/magne4000/universal-middleware/compare/elysia-v0.4.5...elysia-v0.4.6) (2025-03-26)

### Bug Fixes

- **elysia:** middlewares returning early responses are handled correctly ([#134](https://github.com/magne4000/universal-middleware/issues/134)) ([0d8f22a](https://github.com/magne4000/universal-middleware/commit/0d8f22a16f01430cb4d13bf45c5aa0ad5622db70))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.4.5

## [0.4.5](https://github.com/magne4000/universal-middleware/compare/elysia-v0.4.4...elysia-v0.4.5) (2025-03-06)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.4.4

## [0.4.4](https://github.com/magne4000/universal-middleware/compare/elysia-v0.4.3...elysia-v0.4.4) (2025-03-05)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.4.3

## [0.4.3](https://github.com/magne4000/universal-middleware/compare/elysia-v0.4.2...elysia-v0.4.3) (2025-03-04)

### Bug Fixes

- **elysia:** better elysia apply function type ([c2419c6](https://github.com/magne4000/universal-middleware/commit/c2419c6fd9a5346c9e81dda1d94b42569ab9cd3e))

## [0.4.2](https://github.com/magne4000/universal-middleware/compare/elysia-v0.4.1...elysia-v0.4.2) (2025-03-03)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.4.2

## [0.4.1](https://github.com/magne4000/universal-middleware/compare/elysia-v0.4.0...elysia-v0.4.1) (2025-02-26)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.4.1

## [0.4.0](https://github.com/magne4000/universal-middleware/compare/elysia-v0.3.3...elysia-v0.4.0) (2025-01-21)

### ⚠ BREAKING CHANGES

- drop support for Deno v1

### Features

- Default to 404 when a `UniversalHandler` does not return a Response ([cc44c7c](https://github.com/magne4000/universal-middleware/commit/cc44c7cc1ef6f29df278ddabc093b4225b7e7bd5))
- Universal Router support for most adapters ([cc44c7c](https://github.com/magne4000/universal-middleware/commit/cc44c7cc1ef6f29df278ddabc093b4225b7e7bd5))
- update Deno support ([cc44c7c](https://github.com/magne4000/universal-middleware/commit/cc44c7cc1ef6f29df278ddabc093b4225b7e7bd5))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.4.0

## [0.3.2](https://github.com/magne4000/universal-middleware/compare/elysia-v0.3.1...elysia-v0.3.2) (2024-12-09)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.3.2

## [0.3.1](https://github.com/magne4000/universal-middleware/compare/elysia-v0.3.0...elysia-v0.3.1) (2024-12-04)

### Features

- document runtime and add adapter specific properties ([203febf](https://github.com/magne4000/universal-middleware/commit/203febfec402d095a443b21255a8c2d4fa99fcab))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.3.1

## [0.3.0](https://github.com/magne4000/universal-middleware/compare/elysia-v0.2.3...elysia-v0.3.0) (2024-11-28)

### ⚠ BREAKING CHANGES

- add Context typings to ElysiaHandler and ElysiaMiddleware

### Features

- add the ability to `pipe` adapter middlewares in addition to universal ones ([#66](https://github.com/magne4000/universal-middleware/issues/66)) ([28332e3](https://github.com/magne4000/universal-middleware/commit/28332e3e2bc3c2730191655ae77f56ab6a33d771))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.3.0

## [0.2.3](https://github.com/magne4000/universal-middleware/compare/elysia-v0.2.2...elysia-v0.2.3) (2024-11-27)

### Features

- export are now self-contained bundles by default ([adf9f30](https://github.com/magne4000/universal-middleware/commit/adf9f3007ac7655e6288fef24d418b159c79d8fd))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.2.14

## 0.2.2 (2024-10-15)

### Features

- @universal-middleware/compress package ([#41](https://github.com/magne4000/universal-middleware/issues/41)) ([97fd518](https://github.com/magne4000/universal-middleware/commit/97fd51819192a1d8b1d6659995b197ae8ddeb163))

## [0.2.1](https://github.com/magne4000/universal-handler/compare/@universal-middleware/elysia@0.2.0...@universal-middleware/elysia@0.2.1) (2024-10-09)

## 0.2.0 (2024-10-08)

### Features

- elysia adapter ([#39](https://github.com/magne4000/universal-handler/issues/39)) ([348a7fd](https://github.com/magne4000/universal-handler/commit/348a7fd8cb832aecd24f955d24ee076abf069bd7))
