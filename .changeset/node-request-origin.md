---
"@universal-middleware/node": patch
"@universal-middleware/express": patch
---

A request whose `Host` header, or trusted forwarded host, isn't a host and an optional port is rejected with a `BadRequestError` (400), as is `OPTIONS *`. The header was pasted in front of the path: with `Host: x/admin?`, a request for `/public` got the URL `http://x/admin?/public`, so a universal handler saw the path `/admin` while Express or Fastify routed `/public`. A request whose target is a full URL (`GET http://example.com/path`) takes its host and path from it, instead of failing with a 500. Without `next`, the Express adapter answers a `BadRequestError` with a 400 and doesn't log it.
