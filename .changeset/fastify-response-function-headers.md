---
"@universal-middleware/fastify": patch
---

Under a response function, the headers a route or a hook set on the reply are sent once. Each cookie was sent twice, and a header a response function deleted, or every header of a Response it replaced, was still sent.
