---
"@universal-middleware/express": patch
"@universal-middleware/node": patch
---

The request URL takes its host, like its protocol, from Express's `trust proxy` setting: the first `X-Forwarded-Host` when the setting trusts the peer, with Express 4 and 5. Behind a proxy that terminates TLS, the URL was `https://<internal host>/…`. A relative redirect `Location` read by `responseAdapter` is made absolute with the origin of the request URL, so it follows `trust proxy` and the `origin` option too.

`createRequestAdapter`'s adapter takes an optional third argument, the protocol and host the server framework resolved for the request (`RequestOrigin`).
