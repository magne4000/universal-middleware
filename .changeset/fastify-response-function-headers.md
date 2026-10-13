---
"@universal-middleware/fastify": patch
---

Under a response function, the headers a route (or a hook before it) set on the reply are sent once: Fastify added the headers of the final Response to the reply's, so each of the route's cookies was sent twice, a header a response function deleted was still sent, and so was every header of a Response a response function replaced. This holds for every payload (a string, an object, a Buffer, a stream, a `Response`, none) and for HEAD.
