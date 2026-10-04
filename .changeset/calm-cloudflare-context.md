---
"@universal-middleware/cloudflare": minor
---

fix(cloudflare): keep the context per request instead of on the shared env. Breaking: `getContext()` takes the Pages function context (`getContext(context)`), not `env`
