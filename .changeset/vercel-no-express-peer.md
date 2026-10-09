---
"@universal-middleware/vercel": patch
---

The Vercel adapter no longer declares `express` as a peer dependency: none of its published files import it, only `@universal-middleware/express`. It required `^5.2.1`, so an Express 4 app got an unmet peer warning, although the adapter works with both.
