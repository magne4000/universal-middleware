---
"@universal-middleware/fastify": patch
"@universal-middleware/hono": patch
"@universal-middleware/srvx": patch
"@universal-middleware/hattip": patch
"@universal-middleware/cloudflare": patch
"@universal-middleware/webroute": patch
"@universal-middleware/vercel": patch
"@universal-middleware/compress": patch
"@universal-middleware/sirv": patch
---

The packages that the published files import, at runtime or only in their types, are declared as peer dependencies: each adapter's framework (optional for type-only packages such as `@cloudflare/workers-types`), and for compress and sirv the frameworks of their per-server entries, all optional. The Vercel adapter no longer installs `@universal-middleware/express`, which it only needs for types; it and the other adapter packages it references are optional peers.
