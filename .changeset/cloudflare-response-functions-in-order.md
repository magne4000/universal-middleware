---
"@universal-middleware/cloudflare": minor
---

Fix: in Cloudflare Pages functions, response functions apply in the order their middlewares are registered, as everywhere else. They applied in reverse order, so the same list behaved differently than in a Worker built with `apply()`.

An app that relied on the reverse order sees two or more response functions swap. A Pages function registered between them now sees the response before they apply, because they all apply after the rest of the chain.
