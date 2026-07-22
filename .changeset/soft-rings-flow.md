---
"@universal-middleware/express": patch
---

fix(express): make the synthetic request socket a real EventEmitter

`connectToWeb`'s synthetic `IncomingMessage` used a bare-object socket stub. On a
body parser's drain path (e.g. an oversized body → 413), `on-finished` attaches
an `error`/`close` listener to the socket, which threw `ee.on is not a function`
and crashed the request instead of returning the error status. The stub is now an
`EventEmitter`.
