---
"universal-middleware": patch
---

The bundler plugin applies its `dts`, `externalDependencies` and `ignoreRecommendations` options where they were ignored: with `dts: false`, package.json no longer gets `types` entries for files that are not generated; with `externalDependencies: true`, the `@universal-middleware/*` packages left external are added to `dependencies`; with esbuild, `ignoreRecommendations` silences the warning about array entry points.
