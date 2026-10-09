---
"universal-middleware": patch
---

The types the bundler plugin generates for each server no longer fail a type check with `skipLibCheck: false` (`Type 'unknown' does not satisfy the constraint 'Context'`). As a result, a generated middleware's type now carries the context the middleware reads, for example `HonoMiddleware<{ hello?: string }, Universal.Context>`, where every middleware had `Universal.Context` before.
