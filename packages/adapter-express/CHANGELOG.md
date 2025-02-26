## [0.3.3](https://github.com/magne4000/universal-middleware/compare/express-v0.3.2...express-v0.3.3) (2024-12-09)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @universal-middleware/core bumped to 0.3.3

## [0.4.2](https://github.com/magne4000/universal-middleware/compare/express-v0.4.1...express-v0.4.2) (2025-02-26)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @universal-middleware/core bumped to 0.4.1

## [0.4.1](https://github.com/magne4000/universal-middleware/compare/express-v0.4.0...express-v0.4.1) (2025-02-13)


### Bug Fixes

* Handle redirect when converting node response to standard ([#107](https://github.com/magne4000/universal-middleware/issues/107)) ([7f1afdb](https://github.com/magne4000/universal-middleware/commit/7f1afdb1c5adadfd55a4eac26c8c0da46e8e2305))

## [0.4.0](https://github.com/magne4000/universal-middleware/compare/express-v0.3.3...express-v0.4.0) (2025-01-21)


### ⚠ BREAKING CHANGES

* drop support for Deno v1

### Features

* Default to 404 when a `UniversalHandler` does not return a Response ([cc44c7c](https://github.com/magne4000/universal-middleware/commit/cc44c7cc1ef6f29df278ddabc093b4225b7e7bd5))
* Universal Router support for most adapters ([cc44c7c](https://github.com/magne4000/universal-middleware/commit/cc44c7cc1ef6f29df278ddabc093b4225b7e7bd5))
* update Deno support ([cc44c7c](https://github.com/magne4000/universal-middleware/commit/cc44c7cc1ef6f29df278ddabc093b4225b7e7bd5))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @universal-middleware/core bumped to 0.4.0

## [0.3.2](https://github.com/magne4000/universal-middleware/compare/express-v0.3.1...express-v0.3.2) (2024-12-09)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @universal-middleware/core bumped to 0.3.2

## [0.3.1](https://github.com/magne4000/universal-middleware/compare/express-v0.3.0...express-v0.3.1) (2024-12-04)


### Features

* document runtime and add adapter specific properties ([203febf](https://github.com/magne4000/universal-middleware/commit/203febfec402d095a443b21255a8c2d4fa99fcab))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @universal-middleware/core bumped to 0.3.1

## [0.3.0](https://github.com/magne4000/universal-middleware/compare/express-v0.2.10...express-v0.3.0) (2024-11-28)


### ⚠ BREAKING CHANGES

* add Context typings to NodeHandler and NodeMiddleware

### Features

* add the ability to `pipe` adapter middlewares in addition to universal ones ([#66](https://github.com/magne4000/universal-middleware/issues/66)) ([28332e3](https://github.com/magne4000/universal-middleware/commit/28332e3e2bc3c2730191655ae77f56ab6a33d771))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @universal-middleware/core bumped to 0.3.0

## [0.2.10](https://github.com/magne4000/universal-middleware/compare/express-v0.2.9...express-v0.2.10) (2024-11-27)


### Features

* export are now self-contained bundles by default ([adf9f30](https://github.com/magne4000/universal-middleware/commit/adf9f3007ac7655e6288fef24d418b159c79d8fd))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @universal-middleware/core bumped to 0.2.14

## 0.2.9 (2024-10-15)


### Features

* @universal-middleware/compress package ([#41](https://github.com/magne4000/universal-middleware/issues/41)) ([97fd518](https://github.com/magne4000/universal-middleware/commit/97fd51819192a1d8b1d6659995b197ae8ddeb163))

## [0.2.7](https://github.com/magne4000/universal-handler/compare/@universal-middleware/express@0.2.6...@universal-middleware/express@0.2.7) (2024-10-08)


### Features

* add env() helper ([#32](https://github.com/magne4000/universal-handler/issues/32)) ([9fc051f](https://github.com/magne4000/universal-handler/commit/9fc051f6423aac20a5a3c676893c88f9813a3069))



## [0.2.6](https://github.com/magne4000/universal-handler/compare/@universal-middleware/express@0.2.5...@universal-middleware/express@0.2.6) (2024-09-11)


### Features

* access route parameters ([#29](https://github.com/magne4000/universal-handler/issues/29)) ([3a7d500](https://github.com/magne4000/universal-handler/commit/3a7d500abe579f1d2387de038a7a437091be9e0d))



## [0.2.5](https://github.com/magne4000/universal-handler/compare/@universal-middleware/express@0.2.4...@universal-middleware/express@0.2.5) (2024-09-09)



## [0.2.4](https://github.com/magne4000/universal-handler/compare/@universal-middleware/express@0.2.3...@universal-middleware/express@0.2.4) (2024-09-09)


### Features

* getContext returns Context without undefined ([f3f0977](https://github.com/magne4000/universal-handler/commit/f3f0977781da43131ad6b60bc63a25d913d8758c))



## [0.2.3](https://github.com/magne4000/universal-handler/compare/@universal-middleware/express@0.2.2...@universal-middleware/express@0.2.3) (2024-09-02)


### Bug Fixes

* request path fix with express request adapter ([d0f8cac](https://github.com/magne4000/universal-handler/commit/d0f8cacce296f9c856fdb3c3525ee52d3abded1f))


### Features

* adapter-cloudflare ([#23](https://github.com/magne4000/universal-handler/issues/23)) ([e6129e3](https://github.com/magne4000/universal-handler/commit/e6129e35bce87af34d45ed361140fb69ed822ffa))



## [0.2.2](https://github.com/magne4000/universal-handler/compare/@universal-middleware/express@0.2.1...@universal-middleware/express@0.2.2) (2024-08-21)



## [0.2.1](https://github.com/magne4000/universal-handler/compare/@universal-middleware/express@0.2.0...@universal-middleware/express@0.2.1) (2024-08-19)


### Features

* Add support for Fastify ([#17](https://github.com/magne4000/universal-handler/issues/17)) ([fcd2fdd](https://github.com/magne4000/universal-handler/commit/fcd2fdd14f04022621f997d6655442dc77a4d9b0))
* h3 ([#18](https://github.com/magne4000/universal-handler/issues/18)) ([74a774d](https://github.com/magne4000/universal-handler/commit/74a774deaf56e60ee6be13d2e78f132bdcbe7b9c))



# [0.2.0](https://github.com/magne4000/universal-handler/compare/@universal-middleware/express@0.1.1...@universal-middleware/express@0.2.0) (2024-08-18)


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



## 0.1.1 (2024-07-19)


### Bug Fixes

* **express:** do not crash on null body. fixes [#13](https://github.com/magne4000/universal-handler/issues/13) ([0766257](https://github.com/magne4000/universal-handler/commit/07662575918a0fea26b9f1aa203ee60a8037852d))


### Features

* handler and middleware adapter for connect-like ([ee82abb](https://github.com/magne4000/universal-handler/commit/ee82abbdbd0dd9e077755e9db2f2cf06559c1f93))
* hono adapter ([#10](https://github.com/magne4000/universal-handler/issues/10)) ([044bc66](https://github.com/magne4000/universal-handler/commit/044bc6608851c3f3d3a68dc413e3c769fa22647c))
* working adapter-express ([0c18a2a](https://github.com/magne4000/universal-handler/commit/0c18a2afb7c104a0d5e2b9c6dbff735b30b0bf6b))
