## [0.3.0](https://github.com/magne4000/universal-middleware/compare/webroute-v0.2.9...webroute-v0.3.0) (2024-11-28)


### ⚠ BREAKING CHANGES

* add Context typings to WebrouteHandler and WebrouteMiddleware

### Features

* add the ability to `pipe` adapter middlewares in addition to universal ones ([#66](https://github.com/magne4000/universal-middleware/issues/66)) ([28332e3](https://github.com/magne4000/universal-middleware/commit/28332e3e2bc3c2730191655ae77f56ab6a33d771))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @universal-middleware/core bumped to 0.3.0
  * devDependencies
    * @universal-middleware/hono bumped to 0.3.0

## [0.3.3](https://github.com/magne4000/universal-middleware/compare/webroute-v0.3.2...webroute-v0.3.3) (2024-12-09)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @universal-middleware/core bumped to 0.3.3

## [0.3.2](https://github.com/magne4000/universal-middleware/compare/webroute-v0.3.1...webroute-v0.3.2) (2024-12-09)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @universal-middleware/core bumped to 0.3.2

## [0.3.1](https://github.com/magne4000/universal-middleware/compare/webroute-v0.3.0...webroute-v0.3.1) (2024-12-04)


### Features

* document runtime and add adapter specific properties ([203febf](https://github.com/magne4000/universal-middleware/commit/203febfec402d095a443b21255a8c2d4fa99fcab))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @universal-middleware/core bumped to 0.3.1

## [0.2.9](https://github.com/magne4000/universal-middleware/compare/webroute-v0.2.8...webroute-v0.2.9) (2024-11-27)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @universal-middleware/core bumped to 0.2.14
  * devDependencies
    * @universal-middleware/hono bumped to 0.2.13

## 0.2.8 (2024-10-15)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @universal-middleware/hono bumped to 0.2.12

## [0.2.6](https://github.com/magne4000/universal-handler/compare/@universal-middleware/webroute@0.2.5...@universal-middleware/webroute@0.2.6) (2024-10-08)


### Features

* add env() helper ([#32](https://github.com/magne4000/universal-handler/issues/32)) ([9fc051f](https://github.com/magne4000/universal-handler/commit/9fc051f6423aac20a5a3c676893c88f9813a3069))



## [0.2.5](https://github.com/magne4000/universal-handler/compare/@universal-middleware/webroute@0.2.4...@universal-middleware/webroute@0.2.5) (2024-09-11)


### Features

* access route parameters ([#29](https://github.com/magne4000/universal-handler/issues/29)) ([3a7d500](https://github.com/magne4000/universal-handler/commit/3a7d500abe579f1d2387de038a7a437091be9e0d))



## [0.2.4](https://github.com/magne4000/universal-handler/compare/@universal-middleware/webroute@0.2.3...@universal-middleware/webroute@0.2.4) (2024-09-09)



## [0.2.3](https://github.com/magne4000/universal-handler/compare/@universal-middleware/webroute@0.2.2...@universal-middleware/webroute@0.2.3) (2024-09-09)


### Features

* adapter-cloudflare ([#23](https://github.com/magne4000/universal-handler/issues/23)) ([e6129e3](https://github.com/magne4000/universal-handler/commit/e6129e35bce87af34d45ed361140fb69ed822ffa))



## [0.2.2](https://github.com/magne4000/universal-handler/compare/@universal-middleware/webroute@0.2.1...@universal-middleware/webroute@0.2.2) (2024-08-21)



## [0.2.1](https://github.com/magne4000/universal-handler/compare/@universal-middleware/webroute@0.2.0...@universal-middleware/webroute@0.2.1) (2024-08-19)


### Features

* Add support for Fastify ([#17](https://github.com/magne4000/universal-handler/issues/17)) ([fcd2fdd](https://github.com/magne4000/universal-handler/commit/fcd2fdd14f04022621f997d6655442dc77a4d9b0))



# 0.2.0 (2024-08-18)


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



# 0.1.0 (2024-08-18)


### Features

* complete webroute support ([043298c](https://github.com/magne4000/universal-handler/commit/043298c8a3766159996ed4d02bad538a279a5617))
* initial support for runtime parameter ([c1ac056](https://github.com/magne4000/universal-handler/commit/c1ac0566193b9492beb0ddcc135a7895319cc02c))
* webroute adapter ([1cb1080](https://github.com/magne4000/universal-handler/commit/1cb1080c482b84c2890a6002f6b1166a0ac15005))
