---
"@universal-middleware/fastify": patch
---

Under a response function, a Fastify route's response reaches the client whatever it was sent with:

- a Node stream (`reply.send(fs.createReadStream(…))`) failed with a 500, "Payload is not a Response or BodyInit compatible";
- a universal handler's Response with immutable headers (`Response.redirect()`, a `fetch()` response) failed with a 500, "immutable", when the reply had a header to merge into it;
- a header set as a list (`reply.header("link", [a, b])`) kept only its last value, and logged a warning on every request. All its values are sent.
