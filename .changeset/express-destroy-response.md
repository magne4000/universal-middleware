---
"@universal-middleware/express": patch
---

`connectToWeb()` no longer leaves a response hanging when it fails: `res.destroy(error)`, which `pipeline()` calls when its source fails, and `next(error)` after the response started fail the `Response` body with the error, and a response destroyed before it started rejects with it. `createServerResponse()`'s `onReadable` takes an `onError` callback for the latter.
