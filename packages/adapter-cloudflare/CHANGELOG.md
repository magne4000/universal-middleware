## [0.3.3](https://github.com/magne4000/universal-middleware/compare/cloudflare-v0.3.2...cloudflare-v0.3.3) (2024-12-09)

## 0.4.9

### Patch Changes

- Updated dependencies [bd67eba]
  - @universal-middleware/core@0.4.8

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.3.3

## [0.4.8](https://github.com/magne4000/universal-middleware/compare/cloudflare-v0.4.7...cloudflare-v0.4.8) (2025-04-06)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.4.7

## [0.4.7](https://github.com/magne4000/universal-middleware/compare/cloudflare-v0.4.6...cloudflare-v0.4.7) (2025-04-01)

### Bug Fixes

- ensure late errors are forwarded as expected ([#138](https://github.com/magne4000/universal-middleware/issues/138)) ([f37cac7](https://github.com/magne4000/universal-middleware/commit/f37cac764b8b2fe054b297a52bbf12cde7076949))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.4.6

## [0.4.6](https://github.com/magne4000/universal-middleware/compare/cloudflare-v0.4.5...cloudflare-v0.4.6) (2025-03-26)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.4.5

## [0.4.5](https://github.com/magne4000/universal-middleware/compare/cloudflare-v0.4.4...cloudflare-v0.4.5) (2025-03-06)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.4.4

## [0.4.4](https://github.com/magne4000/universal-middleware/compare/cloudflare-v0.4.3...cloudflare-v0.4.4) (2025-03-05)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.4.3

## [0.4.3](https://github.com/magne4000/universal-middleware/compare/cloudflare-v0.4.2...cloudflare-v0.4.3) (2025-03-05)

### Bug Fixes

- **express:** large streams are no longer terminated unexpectedly ([#123](https://github.com/magne4000/universal-middleware/issues/123)) ([82c43f1](https://github.com/magne4000/universal-middleware/commit/82c43f12f254d0b26505a19f7d58c3480ab7883a))

## [0.4.2](https://github.com/magne4000/universal-middleware/compare/cloudflare-v0.4.1...cloudflare-v0.4.2) (2025-03-03)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.4.2

## [0.4.1](https://github.com/magne4000/universal-middleware/compare/cloudflare-v0.4.0...cloudflare-v0.4.1) (2025-02-26)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.4.1

## [0.4.0](https://github.com/magne4000/universal-middleware/compare/cloudflare-v0.3.3...cloudflare-v0.4.0) (2025-01-21)

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

## [0.3.2](https://github.com/magne4000/universal-middleware/compare/cloudflare-v0.3.1...cloudflare-v0.3.2) (2024-12-09)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.3.2

## [0.3.1](https://github.com/magne4000/universal-middleware/compare/cloudflare-v0.3.0...cloudflare-v0.3.1) (2024-12-04)

### Features

- document runtime and add adapter specific properties ([203febf](https://github.com/magne4000/universal-middleware/commit/203febfec402d095a443b21255a8c2d4fa99fcab))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.3.1

## [0.3.0](https://github.com/magne4000/universal-middleware/compare/cloudflare-v0.2.7...cloudflare-v0.3.0) (2024-11-28)

### ⚠ BREAKING CHANGES

- add Context typings to CloudflareHandler and CloudflarePagesFunction

### Features

- add the ability to `pipe` adapter middlewares in addition to universal ones ([#66](https://github.com/magne4000/universal-middleware/issues/66)) ([28332e3](https://github.com/magne4000/universal-middleware/commit/28332e3e2bc3c2730191655ae77f56ab6a33d771))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.3.0

## [0.2.7](https://github.com/magne4000/universal-middleware/compare/cloudflare-v0.2.6...cloudflare-v0.2.7) (2024-11-27)

### Features

- export are now self-contained bundles by default ([adf9f30](https://github.com/magne4000/universal-middleware/commit/adf9f3007ac7655e6288fef24d418b159c79d8fd))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.2.14

## [0.2.5](https://github.com/magne4000/universal-handler/compare/@universal-middleware/cloudflare@0.2.4...@universal-middleware/cloudflare@0.2.5) (2024-10-08)

### Features

- add env() helper ([#32](https://github.com/magne4000/universal-handler/issues/32)) ([9fc051f](https://github.com/magne4000/universal-handler/commit/9fc051f6423aac20a5a3c676893c88f9813a3069))
- elysia adapter ([#39](https://github.com/magne4000/universal-handler/issues/39)) ([348a7fd](https://github.com/magne4000/universal-handler/commit/348a7fd8cb832aecd24f955d24ee076abf069bd7))

## [0.2.4](https://github.com/magne4000/universal-handler/compare/@universal-middleware/cloudflare@0.2.3...@universal-middleware/cloudflare@0.2.4) (2024-09-11)

### Features

- access route parameters ([#29](https://github.com/magne4000/universal-handler/issues/29)) ([3a7d500](https://github.com/magne4000/universal-handler/commit/3a7d500abe579f1d2387de038a7a437091be9e0d))

## [0.2.3](https://github.com/magne4000/universal-handler/compare/@universal-middleware/cloudflare@0.2.2...@universal-middleware/cloudflare@0.2.3) (2024-09-09)

## [0.2.2](https://github.com/magne4000/universal-handler/compare/@universal-middleware/cloudflare@0.2.1...@universal-middleware/cloudflare@0.2.2) (2024-09-09)

### Features

- getContext returns Context without undefined ([f3f0977](https://github.com/magne4000/universal-handler/commit/f3f0977781da43131ad6b60bc63a25d913d8758c))

## [0.2.1](https://github.com/magne4000/universal-handler/compare/@universal-middleware/cloudflare@0.2.0...@universal-middleware/cloudflare@0.2.1) (2024-08-29)

### Features

- **cloudflare:** add getRuntime helper ([ac20190](https://github.com/magne4000/universal-handler/commit/ac20190583b41a80573bf9b7b7f13495b8de8462))

# 0.2.0 (2024-08-29)

### Features

- adapter-cloudflare ([#23](https://github.com/magne4000/universal-handler/issues/23)) ([e6129e3](https://github.com/magne4000/universal-handler/commit/e6129e35bce87af34d45ed361140fb69ed822ffa))
