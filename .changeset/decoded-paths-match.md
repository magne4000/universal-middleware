---
"@universal-middleware/core": patch
---

fix(core): the router matches the decoded pathname, the way Hono does, so `/%64ash` reaches a route or middleware on `/dash` and `/caf%C3%A9` reaches `/café`; path parameters are decoded once with `decodeURIComponent`, so `/users/a%2Fb` gives `a/b` where it gave `a%2Fb`
