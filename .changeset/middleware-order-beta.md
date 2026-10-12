---
"@universal-middleware/core": minor
---

`MiddlewareOrder` moves from alpha to beta, and its slots follow the order in which they must run:

- `CORS` is now first (-1100, was -600), so that a preflight isn't refused by authentication and an early 401 or 429 still gets CORS headers.
- `PARSING` (-600, was -500) now comes before `INPUT_VALIDATION` (-500, was -700), which validates the parsed body.
- New `CACHING` (-700), for a cache that answers hits. Its response function stores what comes back before the response transforms, which also run on hits.
- `RESPONSE_CACHING` is renamed `CONDITIONAL_REQUESTS` (400): ETag or Last-Modified, and 304 answers, on the body as sent. A cache that answers hits can't run at a positive order.
- `ERROR_HANDLING` is now 50 (was 600), so the error page it produces is transformed, compressed and logged. A thrown error goes to the server's own error handling.
- `LOGGING` is now last (800, was 500), so it logs the response as sent.
