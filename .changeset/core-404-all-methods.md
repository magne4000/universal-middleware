---
"@universal-middleware/core": patch
---

With `handle404`, a request no route matches gets a 404 whatever its method. A `PUT`, `DELETE`, `OPTIONS` or other method that was not `GET`, `POST` or `PATCH` threw "No Response found" as soon as a middleware was registered.
