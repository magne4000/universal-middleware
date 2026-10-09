---
"@universal-middleware/fastify": patch
---

The middlewares registered in the same Fastify instance share one `onSend` hook, which runs their response functions, instead of adding one hook each that every request went through.
