## [0.2.11](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hono@0.2.10...@universal-middleware/hono@0.2.11) (2024-10-10)


### Features

* add req and res to hono runtime ([c441d95](https://github.com/magne4000/universal-handler/commit/c441d954c2dcf6a37a1f6865f7c0df27dcff5325))



## [0.2.13](https://github.com/magne4000/universal-middleware/compare/hono-v0.2.12...hono-v0.2.13) (2024-11-19)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @universal-middleware/core bumped to 1.0.0

## 0.2.12 (2024-10-15)


### Features

* @universal-middleware/compress package ([#41](https://github.com/magne4000/universal-middleware/issues/41)) ([97fd518](https://github.com/magne4000/universal-middleware/commit/97fd51819192a1d8b1d6659995b197ae8ddeb163))

## [0.2.10](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hono@0.2.9...@universal-middleware/hono@0.2.10) (2024-10-09)



## [0.2.9](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hono@0.2.8...@universal-middleware/hono@0.2.9) (2024-10-08)


### Features

* add env() helper ([#32](https://github.com/magne4000/universal-handler/issues/32)) ([9fc051f](https://github.com/magne4000/universal-handler/commit/9fc051f6423aac20a5a3c676893c88f9813a3069))



## [0.2.8](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hono@0.2.7...@universal-middleware/hono@0.2.8) (2024-09-11)


### Features

* access route parameters ([#29](https://github.com/magne4000/universal-handler/issues/29)) ([3a7d500](https://github.com/magne4000/universal-handler/commit/3a7d500abe579f1d2387de038a7a437091be9e0d))



## [0.2.7](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hono@0.2.6...@universal-middleware/hono@0.2.7) (2024-09-09)



## [0.2.6](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hono@0.2.5...@universal-middleware/hono@0.2.6) (2024-09-09)


### Features

* getContext returns Context without undefined ([f3f0977](https://github.com/magne4000/universal-handler/commit/f3f0977781da43131ad6b60bc63a25d913d8758c))



## [0.2.5](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hono@0.2.4...@universal-middleware/hono@0.2.5) (2024-08-29)


### Features

* **hono:** add getRuntime helper ([99ba12d](https://github.com/magne4000/universal-handler/commit/99ba12d86f89bd6ac1b651f3fa7092aabc9e3474))



## [0.2.4](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hono@0.2.3...@universal-middleware/hono@0.2.4) (2024-08-29)


### Features

* adapter-cloudflare ([#23](https://github.com/magne4000/universal-handler/issues/23)) ([e6129e3](https://github.com/magne4000/universal-handler/commit/e6129e35bce87af34d45ed361140fb69ed822ffa))



## [0.2.3](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hono@0.2.2...@universal-middleware/hono@0.2.3) (2024-08-22)


### Bug Fixes

* **hono:** content-type could be removed in middlewares ([460d7d5](https://github.com/magne4000/universal-handler/commit/460d7d5972d86e77781027207d7feff368290476))



## [0.2.2](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hono@0.2.1...@universal-middleware/hono@0.2.2) (2024-08-21)



## [0.2.1](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hono@0.2.0...@universal-middleware/hono@0.2.1) (2024-08-19)


### Features

* Add support for Fastify ([#17](https://github.com/magne4000/universal-handler/issues/17)) ([fcd2fdd](https://github.com/magne4000/universal-handler/commit/fcd2fdd14f04022621f997d6655442dc77a4d9b0))



# [0.2.0](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hono@0.1.1...@universal-middleware/hono@0.2.0) (2024-08-18)


* `universal-middleware` ([8ed60e7](https://github.com/magne4000/universal-handler/commit/8ed60e7f5441e657c60faa6a0a630667b9a8258e))


### BREAKING CHANGES

* All utils now accepts Handler and Middleware factories instead of direct Handler or Middleware

* feat: support for In and Out Context

* feat: webroute adapter

* chore: deno.lock

* fixes

* fix: typings

* feat: initial support for runtime parameter

* chore: update package.sjon

* chore: update package.sjon

* chore: dedupe webroute

* chore: return context update

* feat: complete webroute support

* chore: better TS types for webroute generated exports

* refactor: dts generation

* tests: auto generated exports typings

* chore: deps

* release: @universal-middleware/webroute@0.1.0

* chore: prepare files for release

* chore: update deno lock files

* chore: deno lock false

* chore: deno --unstable-byonm

* doc(universal-middleware): readme

* doc: symlink global README to universal-middleware package

* doc: intro to universal-middleware usage

* doc: README



## 0.1.1 (2024-07-12)


### Features

* hono adapter ([#10](https://github.com/magne4000/universal-handler/issues/10)) ([044bc66](https://github.com/magne4000/universal-handler/commit/044bc6608851c3f3d3a68dc413e3c769fa22647c))
