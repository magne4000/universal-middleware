import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  "./packages/adapter-fastify/vitest.config.ts",
  "./packages/adapter-webroute/vitest.config.ts",
  "./packages/adapter-hattip/vitest.config.ts",
  "./packages/adapter-hono/vitest.config.ts",
  "./packages/adapter-vercel/vitest.config.ts",
  "./packages/adapter-h3/vitest.config.ts",
  "./packages/adapter-express/vitest.config.ts",
  "./packages/adapter-elysia/vitest.config.ts",
  "./packages/compress/vitest.config.ts",
  "./packages/adapter-cloudflare/vitest.config.ts",
  "./packages/core/vitest.config.ts",
  "./packages/sirv/vitest.config.ts",
  "./packages/universal-middleware/vitest.config.ts",
  "./tests-examples/tests-tool/vitest.config.ts"
])
