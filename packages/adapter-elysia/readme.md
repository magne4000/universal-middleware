# `@universal-middleware/elysia`

[Universal Middleware](https://github.com/magne4000/universal-middleware) adapter for [Elysia](https://elysiajs.com/).

Requires Elysia 1.4 or later.

## Response functions

A response function gets what Elysia would send for the route's value, whatever the route returns. With `aot: true`
(Elysia's default), the value is validated against the route's response schema first. With `aot: false`, Elysia has no
hook after it validates a response, so a response function gets the value as the route returned it: a response schema
doesn't clean it.
