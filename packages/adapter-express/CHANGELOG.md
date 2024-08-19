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



