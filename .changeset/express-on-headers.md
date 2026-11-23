---
"@universal-middleware/express": patch
---

`connectToWeb()`: the first `res.write()` or `res.end()` goes through `res.writeHead()`, as on Node's server, so `on-headers` hooks run (`express-session` and `cookie-session` set their cookie, morgan logs `:response-time`), and `res.headersSent` turns `true`.
