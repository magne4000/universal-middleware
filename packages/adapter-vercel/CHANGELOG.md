# Changelog

## [0.4.2](https://github.com/magne4000/universal-middleware/compare/vercel-v0.4.1...vercel-v0.4.2) (2025-02-26)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @universal-middleware/core bumped to 0.4.1
    * @universal-middleware/express bumped to 0.4.2

## [0.4.1](https://github.com/magne4000/universal-middleware/compare/vercel-v0.4.0...vercel-v0.4.1) (2025-02-13)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @universal-middleware/express bumped to 0.4.1

## [0.4.0](https://github.com/magne4000/universal-middleware/compare/vercel-v0.3.3...vercel-v0.4.0) (2025-01-21)


### ⚠ BREAKING CHANGES

* drop support for Deno v1

### Features

* Default to 404 when a `UniversalHandler` does not return a Response ([cc44c7c](https://github.com/magne4000/universal-middleware/commit/cc44c7cc1ef6f29df278ddabc093b4225b7e7bd5))
* Universal Router support for most adapters ([cc44c7c](https://github.com/magne4000/universal-middleware/commit/cc44c7cc1ef6f29df278ddabc093b4225b7e7bd5))
* update Deno support ([cc44c7c](https://github.com/magne4000/universal-middleware/commit/cc44c7cc1ef6f29df278ddabc093b4225b7e7bd5))


### Bug Fixes

* **deps:** update all non-major dependencies ([#88](https://github.com/magne4000/universal-middleware/issues/88)) ([105940c](https://github.com/magne4000/universal-middleware/commit/105940c4f2527370f4ccdd69651a1dee9a8c2a8c))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @universal-middleware/core bumped to 0.4.0
    * @universal-middleware/express bumped to 0.4.0

## [0.3.3](https://github.com/magne4000/universal-middleware/compare/vercel-v0.3.2...vercel-v0.3.3) (2024-12-09)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @universal-middleware/core bumped to 0.3.3
    * @universal-middleware/express bumped to 0.3.3

## [0.3.2](https://github.com/magne4000/universal-middleware/compare/vercel-v0.3.1...vercel-v0.3.2) (2024-12-09)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @universal-middleware/core bumped to 0.3.2
    * @universal-middleware/express bumped to 0.3.2

## [0.3.1](https://github.com/magne4000/universal-middleware/compare/vercel-v0.3.0...vercel-v0.3.1) (2024-12-04)


### Features

* document runtime and add adapter specific properties ([203febf](https://github.com/magne4000/universal-middleware/commit/203febfec402d095a443b21255a8c2d4fa99fcab))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @universal-middleware/core bumped to 0.3.1
    * @universal-middleware/express bumped to 0.3.1

## [0.3.0](https://github.com/magne4000/universal-middleware/compare/vercel-v0.2.0...vercel-v0.3.0) (2024-11-28)


### ⚠ BREAKING CHANGES

* add Context typings to VercelNodeHandler and VercelEdgeHandler

### Features

* add the ability to `pipe` adapter middlewares in addition to universal ones ([#66](https://github.com/magne4000/universal-middleware/issues/66)) ([28332e3](https://github.com/magne4000/universal-middleware/commit/28332e3e2bc3c2730191655ae77f56ab6a33d771))

## [0.2.0-beta](https://github.com/magne4000/universal-middleware/compare/vercel-v0.1.2-beta...vercel-v0.2.0-beta) (2024-11-28)


### ⚠ BREAKING CHANGES

* add Context typings to VercelNodeHandler and VercelEdgeHandler

### Features

* add the ability to `pipe` adapter middlewares in addition to universal ones ([#66](https://github.com/magne4000/universal-middleware/issues/66)) ([28332e3](https://github.com/magne4000/universal-middleware/commit/28332e3e2bc3c2730191655ae77f56ab6a33d771))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @universal-middleware/core bumped to 0.3.0
    * @universal-middleware/express bumped to 0.3.0

## [0.1.2-beta](https://github.com/magne4000/universal-middleware/compare/vercel-v0.1.1-beta...vercel-v0.1.2-beta) (2024-11-27)


### Features

* Add `vercel-edge` and `vercel-node` support ([f0b33f8](https://github.com/magne4000/universal-middleware/commit/f0b33f8fcb751d50f7062f4b450b7a2c30d9a460))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @universal-middleware/core bumped to 0.2.14
    * @universal-middleware/express bumped to 0.2.10

## [0.1.1-beta](https://github.com/magne4000/universal-middleware/compare/vercel-v0.1.0...vercel-v0.1.1-beta) (2024-11-19)


### Features

* extract params from URL ([97674fa](https://github.com/magne4000/universal-middleware/commit/97674fac7360aaff40333df09f6ca13feae6e00a))
* vercel adapter ([fa3932c](https://github.com/magne4000/universal-middleware/commit/fa3932cde779207fa2b72e529470337894062600))
