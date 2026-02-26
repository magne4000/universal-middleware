## [0.3.3](https://github.com/magne4000/universal-middleware/compare/hono-v0.3.2...hono-v0.3.3) (2024-12-09)

## 0.4.21

### Patch Changes

- 636b4bc: fix: apply typings to allow more lenient middleware types
- Updated dependencies [636b4bc]
  - @universal-middleware/core@0.4.17

## 0.4.20

### Patch Changes

- 7caff6e: fix: fallback if error while cloning response

## 0.4.19

### Patch Changes

- f34e0ff: feat: upgrade dependencies
- Updated dependencies [f34e0ff]
  - @universal-middleware/core@0.4.15

## 0.4.18

### Patch Changes

- c035641: fix: extract req/res from srvx
- Updated dependencies [c035641]
  - @universal-middleware/core@0.4.14

## 0.4.17

### Patch Changes

- 4dd534b: fix(deps): update all non-major dependencies
- Updated dependencies [4dd534b]
  - @universal-middleware/core@0.4.11

## 0.4.16

### Patch Changes

- 253b2f4: fix: dynamically import node:stream

## 0.4.15

### Patch Changes

- f0ea4c3: feat: declare static context through enhance
- Updated dependencies [f0ea4c3]
  - @universal-middleware/core@0.4.9

## 0.4.14

### Patch Changes

- 7982e46: feat: new vercel adapters for servers

## 0.4.13

### Patch Changes

- Updated dependencies [bd67eba]
  - @universal-middleware/core@0.4.8

## 0.4.12

### Patch Changes

- 7ddfafc: feat: export App type

## 0.4.11

### Patch Changes

- 72e55c1: fix: headers are not overriden with node adapter

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.3.3

## [0.4.10](https://github.com/magne4000/universal-middleware/compare/hono-v0.4.9...hono-v0.4.10) (2025-04-17)

### Bug Fixes

- **hono:** handlers without a response now fallback to middleware chain before 404 ([084656a](https://github.com/magne4000/universal-middleware/commit/084656a92d381ac3c288f0d6bdddd3193993f049))

## [0.4.9](https://github.com/magne4000/universal-middleware/compare/hono-v0.4.8...hono-v0.4.9) (2025-04-06)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.4.7

## [0.4.8](https://github.com/magne4000/universal-middleware/compare/hono-v0.4.7...hono-v0.4.8) (2025-04-01)

### Bug Fixes

- ensure late errors are forwarded as expected ([#138](https://github.com/magne4000/universal-middleware/issues/138)) ([f37cac7](https://github.com/magne4000/universal-middleware/commit/f37cac764b8b2fe054b297a52bbf12cde7076949))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.4.6

## [0.4.7](https://github.com/magne4000/universal-middleware/compare/hono-v0.4.6...hono-v0.4.7) (2025-03-26)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.4.5

## [0.4.6](https://github.com/magne4000/universal-middleware/compare/hono-v0.4.5...hono-v0.4.6) (2025-03-06)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.4.4

## [0.4.5](https://github.com/magne4000/universal-middleware/compare/hono-v0.4.4...hono-v0.4.5) (2025-03-05)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.4.3

## [0.4.4](https://github.com/magne4000/universal-middleware/compare/hono-v0.4.3...hono-v0.4.4) (2025-03-05)

### Bug Fixes

- **express:** large streams are no longer terminated unexpectedly ([#123](https://github.com/magne4000/universal-middleware/issues/123)) ([82c43f1](https://github.com/magne4000/universal-middleware/commit/82c43f12f254d0b26505a19f7d58c3480ab7883a))

## [0.4.3](https://github.com/magne4000/universal-middleware/compare/hono-v0.4.2...hono-v0.4.3) (2025-03-04)

### Bug Fixes

- **hono:** better hono apply function type ([03faf92](https://github.com/magne4000/universal-middleware/commit/03faf92789eb111ac6188b92778cc07c9df0e787))

## [0.4.2](https://github.com/magne4000/universal-middleware/compare/hono-v0.4.1...hono-v0.4.2) (2025-03-03)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.4.2

## [0.4.1](https://github.com/magne4000/universal-middleware/compare/hono-v0.4.0...hono-v0.4.1) (2025-02-26)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.4.1

## [0.4.0](https://github.com/magne4000/universal-middleware/compare/hono-v0.3.3...hono-v0.4.0) (2025-01-21)

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

## [0.3.2](https://github.com/magne4000/universal-middleware/compare/hono-v0.3.1...hono-v0.3.2) (2024-12-09)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.3.2

## [0.3.1](https://github.com/magne4000/universal-middleware/compare/hono-v0.3.0...hono-v0.3.1) (2024-12-04)

### Features

- document runtime and add adapter specific properties ([203febf](https://github.com/magne4000/universal-middleware/commit/203febfec402d095a443b21255a8c2d4fa99fcab))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.3.1

## [0.3.0](https://github.com/magne4000/universal-middleware/compare/hono-v0.2.13...hono-v0.3.0) (2024-11-28)

### ⚠ BREAKING CHANGES

- add Context typings to HonoHandler and HonoMiddleware

### Features

- add the ability to `pipe` adapter middlewares in addition to universal ones ([#66](https://github.com/magne4000/universal-middleware/issues/66)) ([28332e3](https://github.com/magne4000/universal-middleware/commit/28332e3e2bc3c2730191655ae77f56ab6a33d771))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.3.0

## [0.2.13](https://github.com/magne4000/universal-middleware/compare/hono-v0.2.12...hono-v0.2.13) (2024-11-27)

### Features

- export are now self-contained bundles by default ([adf9f30](https://github.com/magne4000/universal-middleware/commit/adf9f3007ac7655e6288fef24d418b159c79d8fd))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @universal-middleware/core bumped to 0.2.14

## 0.2.12 (2024-10-15)

### Features

- @universal-middleware/compress package ([#41](https://github.com/magne4000/universal-middleware/issues/41)) ([97fd518](https://github.com/magne4000/universal-middleware/commit/97fd51819192a1d8b1d6659995b197ae8ddeb163))

## [0.2.11](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hono@0.2.10...@universal-middleware/hono@0.2.11) (2024-10-10)

### Features

- add req and res to hono runtime ([c441d95](https://github.com/magne4000/universal-handler/commit/c441d954c2dcf6a37a1f6865f7c0df27dcff5325))

## [0.2.10](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hono@0.2.9...@universal-middleware/hono@0.2.10) (2024-10-09)

## [0.2.9](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hono@0.2.8...@universal-middleware/hono@0.2.9) (2024-10-08)

### Features

- add env() helper ([#32](https://github.com/magne4000/universal-handler/issues/32)) ([9fc051f](https://github.com/magne4000/universal-handler/commit/9fc051f6423aac20a5a3c676893c88f9813a3069))

## [0.2.8](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hono@0.2.7...@universal-middleware/hono@0.2.8) (2024-09-11)

### Features

- access route parameters ([#29](https://github.com/magne4000/universal-handler/issues/29)) ([3a7d500](https://github.com/magne4000/universal-handler/commit/3a7d500abe579f1d2387de038a7a437091be9e0d))

## [0.2.7](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hono@0.2.6...@universal-middleware/hono@0.2.7) (2024-09-09)

## [0.2.6](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hono@0.2.5...@universal-middleware/hono@0.2.6) (2024-09-09)

### Features

- getContext returns Context without undefined ([f3f0977](https://github.com/magne4000/universal-handler/commit/f3f0977781da43131ad6b60bc63a25d913d8758c))

## [0.2.5](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hono@0.2.4...@universal-middleware/hono@0.2.5) (2024-08-29)

### Features

- **hono:** add getRuntime helper ([99ba12d](https://github.com/magne4000/universal-handler/commit/99ba12d86f89bd6ac1b651f3fa7092aabc9e3474))

## [0.2.4](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hono@0.2.3...@universal-middleware/hono@0.2.4) (2024-08-29)

### Features

- adapter-cloudflare ([#23](https://github.com/magne4000/universal-handler/issues/23)) ([e6129e3](https://github.com/magne4000/universal-handler/commit/e6129e35bce87af34d45ed361140fb69ed822ffa))

## [0.2.3](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hono@0.2.2...@universal-middleware/hono@0.2.3) (2024-08-22)

### Bug Fixes

- **hono:** content-type could be removed in middlewares ([460d7d5](https://github.com/magne4000/universal-handler/commit/460d7d5972d86e77781027207d7feff368290476))

## [0.2.2](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hono@0.2.1...@universal-middleware/hono@0.2.2) (2024-08-21)

## [0.2.1](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hono@0.2.0...@universal-middleware/hono@0.2.1) (2024-08-19)

### Features

- Add support for Fastify ([#17](https://github.com/magne4000/universal-handler/issues/17)) ([fcd2fdd](https://github.com/magne4000/universal-handler/commit/fcd2fdd14f04022621f997d6655442dc77a4d9b0))

# [0.2.0](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hono@0.1.1...@universal-middleware/hono@0.2.0) (2024-08-18)

- `universal-middleware` ([8ed60e7](https://github.com/magne4000/universal-handler/commit/8ed60e7f5441e657c60faa6a0a630667b9a8258e))

### BREAKING CHANGES

- All utils now accepts Handler and Middleware factories instead of direct Handler or Middleware

- feat: support for In and Out Context

- feat: webroute adapter

- chore: deno.lock

- fixes

- fix: typings

- feat: initial support for runtime parameter

- chore: update package.sjon

- chore: update package.sjon

- chore: dedupe webroute

- chore: return context update

- feat: complete webroute support

- chore: better TS types for webroute generated exports

- refactor: dts generation

- tests: auto generated exports typings

- chore: deps

- release: @universal-middleware/webroute@0.1.0

- chore: prepare files for release

- chore: update deno lock files

- chore: deno lock false

- chore: deno --unstable-byonm

- doc(universal-middleware): readme

- doc: symlink global README to universal-middleware package

- doc: intro to universal-middleware usage

- doc: README

## 0.1.1 (2024-07-12)

### Features

- hono adapter ([#10](https://github.com/magne4000/universal-handler/issues/10)) ([044bc66](https://github.com/magne4000/universal-handler/commit/044bc6608851c3f3d3a68dc413e3c769fa22647c))
