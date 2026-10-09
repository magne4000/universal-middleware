---
"@universal-middleware/core": patch
---

`getAdapterRuntime`, which adapters call for every middleware of every request, builds the runtime object directly instead of merging three intermediate ones. Its declared return type is `RuntimeAdapter`.
