## [0.3.3](https://github.com/magne4000/universal-middleware/compare/core-v0.3.2...core-v0.3.3) (2024-12-09)

## 0.4.9

### Patch Changes

- f0ea4c3: feat: declare static context through enhance

## 0.4.8

### Patch Changes

- bd67eba: fix: do not override context with response using pipe

### Features

- new type RuntimeAdapterTarget ([8768e6d](https://github.com/magne4000/universal-middleware/commit/8768e6dd6f1e7e7bfcbe88baf13a21bbaae842c6))

## [0.4.7](https://github.com/magne4000/universal-middleware/compare/core-v0.4.6...core-v0.4.7) (2025-04-06)

### Features

- **compress:** compress stream are now flushable ([#144](https://github.com/magne4000/universal-middleware/issues/144)) ([8235847](https://github.com/magne4000/universal-middleware/commit/823584751041516889c7cc7ee077fffc74fa5b04))

## [0.4.6](https://github.com/magne4000/universal-middleware/compare/core-v0.4.5...core-v0.4.6) (2025-04-01)

### Bug Fixes

- ensure late errors are forwarded as expected ([#138](https://github.com/magne4000/universal-middleware/issues/138)) ([f37cac7](https://github.com/magne4000/universal-middleware/commit/f37cac764b8b2fe054b297a52bbf12cde7076949))

## [0.4.5](https://github.com/magne4000/universal-middleware/compare/core-v0.4.4...core-v0.4.5) (2025-03-26)

### Bug Fixes

- **elysia:** middlewares returning early responses are handled correctly ([#134](https://github.com/magne4000/universal-middleware/issues/134)) ([0d8f22a](https://github.com/magne4000/universal-middleware/commit/0d8f22a16f01430cb4d13bf45c5aa0ad5622db70))

## [0.4.4](https://github.com/magne4000/universal-middleware/compare/core-v0.4.3...core-v0.4.4) (2025-03-06)

### Features

- **core:** export getRuntimeKey ([27a97a9](https://github.com/magne4000/universal-middleware/commit/27a97a9d03c1e9d55186758d31e3b6b2389f596a))

## [0.4.3](https://github.com/magne4000/universal-middleware/compare/core-v0.4.2...core-v0.4.3) (2025-03-05)

### Features

- new utils ([#125](https://github.com/magne4000/universal-middleware/issues/125)) ([e4fb3e8](https://github.com/magne4000/universal-middleware/commit/e4fb3e86ec97224a24336b49febb75499c29b2d9))

## [0.4.2](https://github.com/magne4000/universal-middleware/compare/core-v0.4.1...core-v0.4.2) (2025-03-03)

### Features

- new `pipeRoute` util ([bc7148a](https://github.com/magne4000/universal-middleware/commit/bc7148a3561a00cdb910059606c4054c05a5b312))

## [0.4.1](https://github.com/magne4000/universal-middleware/compare/core-v0.4.0...core-v0.4.1) (2025-02-26)

### Bug Fixes

- **pipe:** do not execute multiple handlers if we already have a response ([dc7c7bb](https://github.com/magne4000/universal-middleware/commit/dc7c7bb9babfec11d9bdcfde7a98ab367792777d))

## [0.4.0](https://github.com/magne4000/universal-middleware/compare/core-v0.3.3...core-v0.4.0) (2025-01-21)

### ⚠ BREAKING CHANGES

- drop support for Deno v1

### Features

- Default to 404 when a `UniversalHandler` does not return a Response ([cc44c7c](https://github.com/magne4000/universal-middleware/commit/cc44c7cc1ef6f29df278ddabc093b4225b7e7bd5))
- Universal Router support for most adapters ([cc44c7c](https://github.com/magne4000/universal-middleware/commit/cc44c7cc1ef6f29df278ddabc093b4225b7e7bd5))
- update Deno support ([cc44c7c](https://github.com/magne4000/universal-middleware/commit/cc44c7cc1ef6f29df278ddabc093b4225b7e7bd5))

## [0.3.2](https://github.com/magne4000/universal-middleware/compare/core-v0.3.1...core-v0.3.2) (2024-12-09)

### Bug Fixes

- ensure h3 eventHandler is called ([#82](https://github.com/magne4000/universal-middleware/issues/82)) ([8dd3cc3](https://github.com/magne4000/universal-middleware/commit/8dd3cc385f06a46afec9239897b10361bd09b4ed))

## [0.3.1](https://github.com/magne4000/universal-middleware/compare/core-v0.3.0...core-v0.3.1) (2024-12-04)

### Features

- document runtime and add adapter specific properties ([203febf](https://github.com/magne4000/universal-middleware/commit/203febfec402d095a443b21255a8c2d4fa99fcab))

## [0.3.0](https://github.com/magne4000/universal-middleware/compare/core-v0.2.14...core-v0.3.0) (2024-11-28)

### ⚠ BREAKING CHANGES

- add Context typings to HonoHandler and HonoMiddleware

### Features

- add the ability to `pipe` adapter middlewares in addition to universal ones ([#66](https://github.com/magne4000/universal-middleware/issues/66)) ([28332e3](https://github.com/magne4000/universal-middleware/commit/28332e3e2bc3c2730191655ae77f56ab6a33d771))

## [0.2.14](https://github.com/magne4000/universal-middleware/compare/core-v0.2.13...core-v0.2.14) (2024-11-27)

### Features

- Add `vercel-edge` and `vercel-node` support ([f0b33f8](https://github.com/magne4000/universal-middleware/commit/f0b33f8fcb751d50f7062f4b450b7a2c30d9a460))

## [0.2.13](https://github.com/magne4000/universal-handler/compare/@universal-middleware/core@0.2.12...@universal-middleware/core@0.2.13) (2024-10-09)

## [0.2.12](https://github.com/magne4000/universal-handler/compare/@universal-middleware/core@0.2.11...@universal-middleware/core@0.2.12) (2024-10-08)

### Features

- elysia adapter ([#39](https://github.com/magne4000/universal-handler/issues/39)) ([348a7fd](https://github.com/magne4000/universal-handler/commit/348a7fd8cb832aecd24f955d24ee076abf069bd7))

## [0.2.11](https://github.com/magne4000/universal-handler/compare/@universal-middleware/core@0.2.10...@universal-middleware/core@0.2.11) (2024-09-27)

### Features

- cookie helpers using tough-cookie ([#36](https://github.com/magne4000/universal-handler/issues/36)) ([4ee350b](https://github.com/magne4000/universal-handler/commit/4ee350b97bee459adceb36ddba2b2fb126a74e9f))

## [0.2.10](https://github.com/magne4000/universal-handler/compare/@universal-middleware/core@0.2.9...@universal-middleware/core@0.2.10) (2024-09-16)

### Features

- add env() helper ([#32](https://github.com/magne4000/universal-handler/issues/32)) ([9fc051f](https://github.com/magne4000/universal-handler/commit/9fc051f6423aac20a5a3c676893c88f9813a3069))

## [0.2.9](https://github.com/magne4000/universal-handler/compare/@universal-middleware/core@0.2.8...@universal-middleware/core@0.2.9) (2024-09-11)

### Features

- access route parameters ([#29](https://github.com/magne4000/universal-handler/issues/29)) ([3a7d500](https://github.com/magne4000/universal-handler/commit/3a7d500abe579f1d2387de038a7a437091be9e0d))

## [0.2.8](https://github.com/magne4000/universal-handler/compare/@universal-middleware/core@0.2.7...@universal-middleware/core@0.2.8) (2024-09-09)

## [0.2.7](https://github.com/magne4000/universal-handler/compare/@universal-middleware/core@0.2.6...@universal-middleware/core@0.2.7) (2024-09-09)

### Bug Fixes

- UniversalMiddleware type fix. Fixes [#26](https://github.com/magne4000/universal-handler/issues/26) ([99feb35](https://github.com/magne4000/universal-handler/commit/99feb35526015ab63583d625ade1b4413025e4e6))

## [0.2.6](https://github.com/magne4000/universal-handler/compare/@universal-middleware/core@0.2.5...@universal-middleware/core@0.2.6) (2024-08-29)

### Features

- adapter-cloudflare ([#23](https://github.com/magne4000/universal-handler/issues/23)) ([e6129e3](https://github.com/magne4000/universal-handler/commit/e6129e35bce87af34d45ed361140fb69ed822ffa))

## [0.2.5](https://github.com/magne4000/universal-handler/compare/@universal-middleware/core@0.2.4...@universal-middleware/core@0.2.5) (2024-08-22)

### Features

- pipe universal middlewares ([#19](https://github.com/magne4000/universal-handler/issues/19)) ([c13e8f5](https://github.com/magne4000/universal-handler/commit/c13e8f54634f352a07be3d9e56b4776613ccbda5))

## [0.2.4](https://github.com/magne4000/universal-handler/compare/@universal-middleware/core@0.2.3...@universal-middleware/core@0.2.4) (2024-08-21)

## [0.2.3](https://github.com/magne4000/universal-handler/compare/@universal-middleware/core@0.2.2...@universal-middleware/core@0.2.3) (2024-08-19)

### Bug Fixes

- core types for middleware returning empty context ([ed0c33f](https://github.com/magne4000/universal-handler/commit/ed0c33fb9bcf011de55cdc1b22dd83e2135811f3))

## [0.2.2](https://github.com/magne4000/universal-handler/compare/@universal-middleware/core@0.2.1...@universal-middleware/core@0.2.2) (2024-08-19)

### Bug Fixes

- core types for middleware returning empty context ([781fb15](https://github.com/magne4000/universal-handler/commit/781fb153263feb3fcb68cb7a530db23ba89784c7))

## [0.2.1](https://github.com/magne4000/universal-handler/compare/@universal-middleware/core@0.2.0...@universal-middleware/core@0.2.1) (2024-08-19)

### Features

- h3 ([#18](https://github.com/magne4000/universal-handler/issues/18)) ([74a774d](https://github.com/magne4000/universal-handler/commit/74a774deaf56e60ee6be13d2e78f132bdcbe7b9c))

# 0.2.0 (2024-08-18)

- `universal-middleware` ([8ed60e7](https://github.com/magne4000/universal-handler/commit/8ed60e7f5441e657c60faa6a0a630667b9a8258e))

### Features

- hono adapter ([#10](https://github.com/magne4000/universal-handler/issues/10)) ([044bc66](https://github.com/magne4000/universal-handler/commit/044bc6608851c3f3d3a68dc413e3c769fa22647c))

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
