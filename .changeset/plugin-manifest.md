---
"universal-middleware": patch
---

The `Options` and `Report` types are exported. `@rollup/plugin-commonjs` and `@rollup/plugin-node-resolve` are no longer listed as peer dependencies: the plugin does not use them, and the declared range (`^28`) caused peer warnings with the current major.
