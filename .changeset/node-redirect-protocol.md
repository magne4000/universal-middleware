---
"@universal-middleware/node": patch
---

A relative redirect `Location` is made absolute with the same protocol as the request URL: Express's `req.protocol` is used, as `createRequestAdapter` does. Behind a proxy that terminates TLS, with Express's `trust proxy` enabled, a redirect to `/login` was turned into `http://…/login` while the request URL was `https://…`.
