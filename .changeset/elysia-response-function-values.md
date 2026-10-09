---
"@universal-middleware/elysia": minor
---

A route that returns something other than a `Response` (a string, an object, `status(201, …)`, nothing) no longer answers 500 when a middleware returns a response function: the response function gets what Elysia would send for that value, with the status and headers the route set, and what it returns is sent. With `aot: true`, the default, the value is first validated against the route's response schema, so the response function gets it cleaned, and the cookies Elysia sets (signed ones included) are sent once. A route that returns a `Response` now also hands its response functions the status and headers set with `set`.

With `aot: false`, Elysia has no hook after it validates a response: response functions get the value as the route returned it, so a response schema doesn't clean it.

Breaking: the peer dependency is now `elysia@^1.4`. The adapter tells `aot: true` from `aot: false` with `responseValue`, which Elysia sets since 1.4, and uses Elysia's own conversion, which Elysia exports since 1.2.
