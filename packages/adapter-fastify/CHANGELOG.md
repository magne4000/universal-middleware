## [0.4.3](https://github.com/magne4000/universal-middleware/compare/fastify-v0.4.2...fastify-v0.4.3) (2024-12-09)

## 0.6.2

### Patch Changes

- aa3d958: When a response function replaces the Response, the body of the replaced one is cancelled, so an endless body (Server-Sent Events, a proxied stream) no longer keeps running. It is left alone when the replacement still reads it (the same stream, `pipeThrough`, `clone()`, `text()`, a wrapper that pulls from it). With Express, a response function no longer makes the adapter keep a second copy of the app's output in memory.
- d1363db: The packages that the published files import, at runtime or only in their types, are declared as peer dependencies: each adapter's framework (optional for type-only packages such as `@cloudflare/workers-types`), and for compress and sirv the frameworks of their per-server entries, all optional. The Vercel adapter no longer installs `@universal-middleware/express`, which it only needs for types; it and the other adapter packages it references are optional peers.
- 967b047: The packages declare `engines.node: ">=22"`, the versions they are built for and tested on. Node 20 reached its end of life in April 2026; package managers now warn when installing on it.
- bbe2ee8: `getRuntime` is exported, as the other adapters already did. The Express adapter also exports the `NodeAdapterHandlerOptions` and `NodeAdapterMiddlewareOptions` types of its `createHandler` and `createMiddleware` options.
- 6f3d3dc: A `HEAD` request answered with a streaming body that never ends (for example Server-Sent Events) no longer hangs: the response is sent with its status and headers and the body is cancelled.
- b038980: fix(fastify): installing the adapter no longer installs `fastify-raw-body`, which it hasn't needed since 0.5.27
- eca2954: Framework peer dependencies accept the whole major version (`hono ^4`, `fastify ^5`, `h3 ^1`, `elysia ^1`, `@webroute/route ^0.8`, `@cloudflare/workers-types ^4 || ^5`) instead of the latest release when the package was built (`hono ^4.13.13`, `@cloudflare/workers-types ^5.20261004.1`, …), which gave apps on an older minor an unmet peer warning.
- Updated dependencies [aa3d958]
- Updated dependencies [7d163e4]
- Updated dependencies [967b047]
- Updated dependencies [a8c7d38]
- Updated dependencies [3953127]
- Updated dependencies [6f3d3dc]
- Updated dependencies [2d36e0d]
- Updated dependencies [92a3206]
- Updated dependencies [01f8ccb]
- Updated dependencies [eca2954]
  - @universal-middleware/core@0.6.1
  - @universal-middleware/node@0.2.7

## 0.6.1

### Patch Changes

- Updated dependencies [0dc053f]
  - @universal-middleware/core@0.6.0
  - @universal-middleware/node@0.2.6

## 0.6.0

### Minor Changes

- 627168a: feat!: routes registered with `apply()` follow rou3 v0.12 through `@universal-middleware/core` 0.5, which aligns them with URLPattern: `*` matches the rest of the path, a bare `**` sets `runtime.params["0"]`, a `-` ends a param name, only one trailing slash is ignored, and a route holds at most one catch-all. See the core 0.5.0 changelog.

### Patch Changes

- 5eadb0d: fix(fastify): keep the context per request instead of on the shared route config

## 0.5.27

### Patch Changes

- 6add5b5: fix(fastify): a universal middleware no longer breaks the body of the routes after it, and `fastify-raw-body` is not required to read it
- b624589: fix(fastify): keep redirects, empty replies and `HEAD` and 404 answers when a middleware returns a response handler
- Updated dependencies [10e6e5f]
- Updated dependencies [6add5b5]
- Updated dependencies [6bb65ff]
- Updated dependencies [6add5b5]
  - @universal-middleware/core@0.5.0
  - @universal-middleware/node@0.2.5

## 0.5.26

### Patch Changes

- cd60e02: fix(node): wire request.signal to client disconnect, backpressure
- Updated dependencies [cd60e02]
  - @universal-middleware/node@0.2.0

## 0.5.25

### Patch Changes

- 2f31e30: feat: move node utilities in a dedicated package
- Updated dependencies [2f31e30]
  - @universal-middleware/node@0.1.0

## 0.5.24

### Patch Changes

- 636b4bc: fix: apply typings to allow more lenient middleware types
- Updated dependencies [636b4bc]
  - @universal-middleware/express@0.4.24
  - @universal-middleware/core@0.4.17

## 0.5.23

### Patch Changes

- f34e0ff: feat: upgrade dependencies
- Updated dependencies [f34e0ff]
  - @universal-middleware/express@0.4.23
  - @universal-middleware/core@0.4.15

## 0.5.22

### Patch Changes

- 4dd534b: fix(deps): update all non-major dependencies
- Updated dependencies [4dd534b]
  - @universal-middleware/core@0.4.11
  - @universal-middleware/express@0.4.19

## 0.5.21

### Patch Changes

- 519ea43: fix: Response callback could receive an empty Response

## 0.5.20

### Patch Changes

- f0ea4c3: feat: declare static context through enhance
- Updated dependencies [f0ea4c3]
  - @universal-middleware/core@0.4.9
  - @universal-middleware/express@0.4.18

## 0.5.19

### Patch Changes

- Updated dependencies [bd67eba]
  - @universal-middleware/core@0.4.8
  - @universal-middleware/express@0.4.17

## 0.5.18

### Patch Changes

- 7ddfafc: feat: export App type
- Updated dependencies [7ddfafc]
  - @universal-middleware/express@0.4.16

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.3.3
    - @universal-middleware/express bumped to 0.3.3

## [0.5.17](https://github.com/magne4000/universal-middleware/compare/fastify-v0.5.16...fastify-v0.5.17) (2025-04-17)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/express bumped to 0.4.15

## [0.5.16](https://github.com/magne4000/universal-middleware/compare/fastify-v0.5.15...fastify-v0.5.16) (2025-04-06)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.4.7
    - @universal-middleware/express bumped to 0.4.14

## [0.5.15](https://github.com/magne4000/universal-middleware/compare/fastify-v0.5.14...fastify-v0.5.15) (2025-04-06)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/express bumped to 0.4.13

## [0.5.14](https://github.com/magne4000/universal-middleware/compare/fastify-v0.5.13...fastify-v0.5.14) (2025-04-03)

### Bug Fixes

- **fastify:** remove console.log (fix [#107](https://github.com/magne4000/universal-middleware/issues/107)) ([642fb4b](https://github.com/magne4000/universal-middleware/commit/642fb4b119835c88f2da2c50abbcbd07fe1e9e11))

## [0.5.13](https://github.com/magne4000/universal-middleware/compare/fastify-v0.5.12...fastify-v0.5.13) (2025-04-02)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/express bumped to 0.4.12

## [0.5.12](https://github.com/magne4000/universal-middleware/compare/fastify-v0.5.11...fastify-v0.5.12) (2025-04-01)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/express bumped to 0.4.11

## [0.5.11](https://github.com/magne4000/universal-middleware/compare/fastify-v0.5.10...fastify-v0.5.11) (2025-04-01)

### Bug Fixes

- ensure late errors are forwarded as expected ([#138](https://github.com/magne4000/universal-middleware/issues/138)) ([f37cac7](https://github.com/magne4000/universal-middleware/commit/f37cac764b8b2fe054b297a52bbf12cde7076949))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.4.6
    - @universal-middleware/express bumped to 0.4.10

## [0.5.10](https://github.com/magne4000/universal-middleware/compare/fastify-v0.5.9...fastify-v0.5.10) (2025-03-26)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.4.5
    - @universal-middleware/express bumped to 0.4.9

## [0.5.9](https://github.com/magne4000/universal-middleware/compare/fastify-v0.5.8...fastify-v0.5.9) (2025-03-06)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.4.4
    - @universal-middleware/express bumped to 0.4.8

## [0.5.8](https://github.com/magne4000/universal-middleware/compare/fastify-v0.5.7...fastify-v0.5.8) (2025-03-05)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.4.3
    - @universal-middleware/express bumped to 0.4.7

## [0.5.7](https://github.com/magne4000/universal-middleware/compare/fastify-v0.5.6...fastify-v0.5.7) (2025-03-05)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/express bumped to 0.4.6

## [0.5.6](https://github.com/magne4000/universal-middleware/compare/fastify-v0.5.5...fastify-v0.5.6) (2025-03-04)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/express bumped to 0.4.5

## [0.5.5](https://github.com/magne4000/universal-middleware/compare/fastify-v0.5.4...fastify-v0.5.5) (2025-03-04)

### Bug Fixes

- **fastify:** ensure that early responses are awaited ([a989eea](https://github.com/magne4000/universal-middleware/commit/a989eea9ef39b3bc01b1cb40a3e91202bcedc79d))

## [0.5.4](https://github.com/magne4000/universal-middleware/compare/fastify-v0.5.3...fastify-v0.5.4) (2025-03-03)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.4.2
    - @universal-middleware/express bumped to 0.4.4

## [0.5.3](https://github.com/magne4000/universal-middleware/compare/fastify-v0.5.2...fastify-v0.5.3) (2025-02-27)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/express bumped to 0.4.3

## [0.5.2](https://github.com/magne4000/universal-middleware/compare/fastify-v0.5.1...fastify-v0.5.2) (2025-02-26)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.4.1
    - @universal-middleware/express bumped to 0.4.2

## [0.5.1](https://github.com/magne4000/universal-middleware/compare/fastify-v0.5.0...fastify-v0.5.1) (2025-02-13)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/express bumped to 0.4.1

## [0.5.0](https://github.com/magne4000/universal-middleware/compare/fastify-v0.4.3...fastify-v0.5.0) (2025-01-21)

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
    - @universal-middleware/express bumped to 0.4.0

## [0.4.2](https://github.com/magne4000/universal-middleware/compare/fastify-v0.4.1...fastify-v0.4.2) (2024-12-09)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.3.2
    - @universal-middleware/express bumped to 0.3.2

## [0.4.1](https://github.com/magne4000/universal-middleware/compare/fastify-v0.4.0...fastify-v0.4.1) (2024-12-04)

### Features

- document runtime and add adapter specific properties ([203febf](https://github.com/magne4000/universal-middleware/commit/203febfec402d095a443b21255a8c2d4fa99fcab))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.3.1
    - @universal-middleware/express bumped to 0.3.1

## [0.4.0](https://github.com/magne4000/universal-middleware/compare/fastify-v0.3.7...fastify-v0.4.0) (2024-11-28)

### ⚠ BREAKING CHANGES

- add Context typings to FastifyHandler and FastifyMiddleware

### Features

- add the ability to `pipe` adapter middlewares in addition to universal ones ([#66](https://github.com/magne4000/universal-middleware/issues/66)) ([28332e3](https://github.com/magne4000/universal-middleware/commit/28332e3e2bc3c2730191655ae77f56ab6a33d771))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.3.0
    - @universal-middleware/express bumped to 0.3.0

## [0.3.7](https://github.com/magne4000/universal-middleware/compare/fastify-v0.3.6...fastify-v0.3.7) (2024-11-27)

### Features

- export are now self-contained bundles by default ([adf9f30](https://github.com/magne4000/universal-middleware/commit/adf9f3007ac7655e6288fef24d418b159c79d8fd))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.2.14
    - @universal-middleware/express bumped to 0.2.10

## 0.3.6 (2024-10-15)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/express bumped to 0.2.9

## [0.3.4](https://github.com/magne4000/universal-handler/compare/@universal-middleware/fastify@0.3.3...@universal-middleware/fastify@0.3.4) (2024-10-08)

### Features

- add env() helper ([#32](https://github.com/magne4000/universal-handler/issues/32)) ([9fc051f](https://github.com/magne4000/universal-handler/commit/9fc051f6423aac20a5a3c676893c88f9813a3069))

## [0.3.3](https://github.com/magne4000/universal-handler/compare/@universal-middleware/fastify@0.3.2...@universal-middleware/fastify@0.3.3) (2024-09-11)

### Features

- access route parameters ([#29](https://github.com/magne4000/universal-handler/issues/29)) ([3a7d500](https://github.com/magne4000/universal-handler/commit/3a7d500abe579f1d2387de038a7a437091be9e0d))

## [0.3.2](https://github.com/magne4000/universal-handler/compare/@universal-middleware/fastify@0.3.1...@universal-middleware/fastify@0.3.2) (2024-09-09)

## [0.3.1](https://github.com/magne4000/universal-handler/compare/@universal-middleware/fastify@0.3.0...@universal-middleware/fastify@0.3.1) (2024-09-09)

# [0.3.0](https://github.com/magne4000/universal-handler/compare/@universal-middleware/fastify@0.2.3...@universal-middleware/fastify@0.3.0) (2024-09-04)

### Bug Fixes

- impose usage of fastify-raw-body instead of overriding `contentTypeParser` ([#25](https://github.com/magne4000/universal-handler/issues/25)) ([96aa087](https://github.com/magne4000/universal-handler/commit/96aa087d0dd3c6f384524475bda0613cfc101aaa))

### Features

- getContext returns Context without undefined ([f3f0977](https://github.com/magne4000/universal-handler/commit/f3f0977781da43131ad6b60bc63a25d913d8758c))

## [0.2.3](https://github.com/magne4000/universal-handler/compare/@universal-middleware/fastify@0.2.2...@universal-middleware/fastify@0.2.3) (2024-09-02)

### Features

- adapter-cloudflare ([#23](https://github.com/magne4000/universal-handler/issues/23)) ([e6129e3](https://github.com/magne4000/universal-handler/commit/e6129e35bce87af34d45ed361140fb69ed822ffa))

## [0.2.2](https://github.com/magne4000/universal-handler/compare/@universal-middleware/fastify@0.2.1...@universal-middleware/fastify@0.2.2) (2024-08-21)

## [0.2.1](https://github.com/magne4000/universal-handler/compare/@universal-middleware/fastify@0.2.0...@universal-middleware/fastify@0.2.1) (2024-08-19)

### Features

- h3 ([#18](https://github.com/magne4000/universal-handler/issues/18)) ([74a774d](https://github.com/magne4000/universal-handler/commit/74a774deaf56e60ee6be13d2e78f132bdcbe7b9c))

# 0.2.0 (2024-08-19)

### Features

- Add support for Fastify ([#17](https://github.com/magne4000/universal-handler/issues/17)) ([fcd2fdd](https://github.com/magne4000/universal-handler/commit/fcd2fdd14f04022621f997d6655442dc77a4d9b0))

## 0.1.1 (2024-08-19)

### Features

- adapter-fastify ([b1bb889](https://github.com/magne4000/universal-handler/commit/b1bb8897a0a4bebee14336356b1bb12dd3ba9d60))
