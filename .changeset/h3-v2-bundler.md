---
"universal-middleware": minor
---

The generated `h3` exports target h3 v2 (`h3@^2`), as `@universal-middleware/h3` now does: a package built with this version needs h3 v2 in the apps that use its `h3` export.

The esbuild plugin resolves a `*.handler.*` or `*.middleware.*` import relative to the file importing it. It used to resolve it from the working directory, which broke bundling h3 v2, whose own `./middleware.mjs` matched.
