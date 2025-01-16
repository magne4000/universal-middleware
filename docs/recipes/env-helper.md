# Using env variables

The `env()` function helps to retrieve environment variables across all supported runtimes.

```ts twoslash
import { env, type Get, type UniversalMiddleware } from "@universal-middleware/core";

const handler = (() => (request, context, runtime) => {
  // process.env.DATABASE_URL on supported environment
  // Deno.env.get("DATABASE_URL") for Deno
  // runtime.env.DATABASE_URL for Cloudflare
  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(runtime);
  
  // ...
}) satisfies Get<[], UniversalMiddleware>;
```

> [!INFO]
> `env()` supports the following:
> 
> | Runtime    | Supports                                                                           |
> |------------|:-----------------------------------------------------------------------------------|
> | Cloudflare | `wrangler.toml`                                                                    |
> | Deno       | [Deno.env](https://docs.deno.com/runtime/reference/env_variables/), `process.env`  |
> | Bun        | [Bun.env](https://bun.sh/guides/runtime/set-env), `process.env`, `import.meta.env` |
> | Node.js    | `process.env`                                                                      |
