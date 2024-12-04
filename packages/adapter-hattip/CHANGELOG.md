## [0.3.0](https://github.com/magne4000/universal-middleware/compare/hattip-v0.2.11...hattip-v0.3.0) (2024-11-28)


### ⚠ BREAKING CHANGES

* add Context typings to HattipHandler and HattipMiddleware

### Features

* add the ability to `pipe` adapter middlewares in addition to universal ones ([#66](https://github.com/magne4000/universal-middleware/issues/66)) ([28332e3](https://github.com/magne4000/universal-middleware/commit/28332e3e2bc3c2730191655ae77f56ab6a33d771))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @universal-middleware/core bumped to 0.3.0

## [0.3.1](https://github.com/magne4000/universal-middleware/compare/hattip-v0.3.0...hattip-v0.3.1) (2024-12-04)


### Features

* document runtime and add adapter specific properties ([203febf](https://github.com/magne4000/universal-middleware/commit/203febfec402d095a443b21255a8c2d4fa99fcab))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @universal-middleware/core bumped to 0.3.1

## [0.2.11](https://github.com/magne4000/universal-middleware/compare/hattip-v0.2.10...hattip-v0.2.11) (2024-11-27)


### Features

* export are now self-contained bundles by default ([adf9f30](https://github.com/magne4000/universal-middleware/commit/adf9f3007ac7655e6288fef24d418b159c79d8fd))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @universal-middleware/core bumped to 0.2.14


## [0.2.10](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hattip@0.2.9...@universal-middleware/hattip@0.2.10) (2024-10-10)


### Features

* add req and res to hattip runtime ([5b88b72](https://github.com/magne4000/universal-handler/commit/5b88b72bdd822569f2ec2740fb308b5fd55f6ceb))



## [0.2.9](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hattip@0.2.8...@universal-middleware/hattip@0.2.9) (2024-10-09)



## [0.2.8](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hattip@0.2.7...@universal-middleware/hattip@0.2.8) (2024-10-08)


### Features

* add env() helper ([#32](https://github.com/magne4000/universal-handler/issues/32)) ([9fc051f](https://github.com/magne4000/universal-handler/commit/9fc051f6423aac20a5a3c676893c88f9813a3069))



## [0.2.7](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hattip@0.2.6...@universal-middleware/hattip@0.2.7) (2024-09-11)


### Features

* access route parameters ([#29](https://github.com/magne4000/universal-handler/issues/29)) ([3a7d500](https://github.com/magne4000/universal-handler/commit/3a7d500abe579f1d2387de038a7a437091be9e0d))



## [0.2.6](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hattip@0.2.5...@universal-middleware/hattip@0.2.6) (2024-09-09)



## [0.2.5](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hattip@0.2.4...@universal-middleware/hattip@0.2.5) (2024-09-09)


### Features

* getContext returns Context without undefined ([1ba2692](https://github.com/magne4000/universal-handler/commit/1ba269265d162863cd866f80ee4cd1b190c864ad))



## [0.2.4](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hattip@0.2.3...@universal-middleware/hattip@0.2.4) (2024-08-29)


### Features

* **hattip:** add getRuntime helper ([96a164b](https://github.com/magne4000/universal-handler/commit/96a164b02180b5de2e46f7fef3f6837d67a3a02d))



## [0.2.3](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hattip@0.2.2...@universal-middleware/hattip@0.2.3) (2024-08-29)


### Features

* adapter-cloudflare ([#23](https://github.com/magne4000/universal-handler/issues/23)) ([e6129e3](https://github.com/magne4000/universal-handler/commit/e6129e35bce87af34d45ed361140fb69ed822ffa))



## [0.2.2](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hattip@0.2.1...@universal-middleware/hattip@0.2.2) (2024-08-21)



## [0.2.1](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hattip@0.2.0...@universal-middleware/hattip@0.2.1) (2024-08-19)


### Features

* Add support for Fastify ([#17](https://github.com/magne4000/universal-handler/issues/17)) ([fcd2fdd](https://github.com/magne4000/universal-handler/commit/fcd2fdd14f04022621f997d6655442dc77a4d9b0))



# [0.2.0](https://github.com/magne4000/universal-handler/compare/@universal-middleware/hattip@0.1.0...@universal-middleware/hattip@0.2.0) (2024-08-18)


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



# 0.1.0 (2024-07-15)


### Features

* hattip adapter ([#11](https://github.com/magne4000/universal-handler/issues/11)) ([a8f3aa1](https://github.com/magne4000/universal-handler/commit/a8f3aa1b25f25c6530982866fb7afbbfc5e6ca97))
