---
"@universal-middleware/cloudflare": patch
"@universal-middleware/compress": patch
"@universal-middleware/core": patch
"@universal-middleware/elysia": patch
"@universal-middleware/fastify": patch
"@universal-middleware/h3": patch
"@universal-middleware/hattip": patch
"@universal-middleware/hono": patch
"@universal-middleware/sirv": patch
"@universal-middleware/vercel": patch
"@universal-middleware/webroute": patch
---

Framework peer dependencies accept the whole major version (`hono ^4`, `fastify ^5`, `h3 ^1`, `elysia ^1`, `@webroute/route ^0.8`, `@cloudflare/workers-types ^4 || ^5`) instead of the latest release when the package was built (`hono ^4.13.13`, `@cloudflare/workers-types ^5.20261004.1`, …), which gave apps on an older minor an unmet peer warning.
