# Creating a New Server Adapter

This guide documents all the files and configurations that need to be updated when creating a new server adapter for universal-middleware.

## 1. Create the Adapter Package

### Package Structure
Create a new package in `packages/adapter-{server-name}/` with the following structure:
```
packages/adapter-{server-name}/
├── src/
│   ├── common.ts      # Core adapter implementation
│   ├── index.ts       # Public exports
│   └── router.ts      # Router implementation (if applicable)
├── tests/
│   ├── entry-{server-name}.ts    # Test entry point
│   └── {server-name}.spec.ts     # Test specifications
├── deno.json          # Deno configuration for testing
├── package.json
├── readme.md
├── tsconfig.json
├── tsup.config.ts
├── turbo.json         # Turbo build configuration
├── vitest.config.ts
└── wrangler.toml      # Cloudflare configuration (if applicable)
```

### Required Files

#### `package.json`
- Set name to `@universal-middleware/{server-name}`
- Include test scripts for different runtimes (node, bun, deno)
- Add dependencies on `@universal-middleware/core` and the target server framework
- Include appropriate keywords for discoverability
- Set version to `0.0.0` initially

#### `src/common.ts`
- Implement `createHandler` and `createMiddleware` functions
- Define server-specific types (e.g., `{ServerName}Handler`, `{ServerName}Middleware`)
- Implement `getRuntime` function that calls `getAdapterRuntime`
- Handle context management (get/set context functions)
- Follow the pattern of existing adapters for consistent API

#### `src/router.ts` (if applicable)
- Implement `apply` function for middleware application
- May include server-specific router class extending `UniversalRouter`
- Handle server-specific routing patterns

#### `src/index.ts`
- Export all public functions and types from common.ts and router.ts

#### `tsconfig.json`
- Extend from the root tsconfig: `{"extends": "../../tsconfig.json"}`

#### `tsup.config.ts`
- Configure build settings for ESM output
- Set platform to "neutral" and target to "es2022"
- Enable DTS generation and clean builds

#### `turbo.json`
- Configure build dependencies: `{"extends": ["//"], "tasks": {"build": {"outputs": ["dist/**"], "dependsOn": ["^build", "@universal-middleware/core#build"]}}}`

#### `deno.json`
- Configure Deno imports for testing
- Map test dependencies to local dist folders

#### `wrangler.toml` (if Cloudflare compatible)
- Configure Cloudflare Workers/Pages deployment
- Set compatibility date and flags

#### `vitest.config.ts`
- Configure Vitest for testing
- Extend from root configuration if needed

## 2. Update Core Package

### `packages/core/src/types.ts`
1. Add import for server-specific types at the top of the file
2. Create a new adapter interface following the pattern:
   ```typescript
   export interface {ServerName}Adapter {
     adapter: "{server-name}";
     params: Record<string, string> | undefined;

     req?: IncomingMessage;  // Optional Node.js request
     res?: ServerResponse;   // Optional Node.js response

     {server-name}: {ServerSpecificContext};
   }
   ```
3. Add the new adapter to the `Adapter` union type
4. Ensure the adapter is placed in the correct alphabetical order within the union type

## 3. Update Universal Middleware Plugin

### `packages/universal-middleware/src/plugin.ts`
1. Add server name to `defaultWrappers` array
2. Add entry to `typesByServer` object:
   ```typescript
   "{server-name}": {
     middleware: "{ServerName}Middleware",
     handler: "{ServerName}Handler",
   },
   ```
3. Add `@universal-middleware/{server-name}` to `maybeExternals` array

### `packages/universal-middleware/tsup.config.ts`
Add entry point in the `entry` object:
```typescript
"adapters/{server-name}": "src/adapters/{server-name}.ts",
```

### `packages/universal-middleware/src/adapters/{server-name}.ts`
Create file with:
```typescript
export * from "@universal-middleware/{server-name}";
```

## 4. Update Build and Test Configuration

### `vitest.workspace.ts`
Add the new adapter's vitest config:
```typescript
"./packages/adapter-{server-name}/vitest.config.ts",
```

### `packages/sirv/tsup.config.ts`
Add server name to the `servers` array in the `universalMiddleware` configuration.

### `packages/compress/tsup.config.ts`
Add server name to the `servers` array in the `universalMiddleware` configuration.

### `packages/universal-middleware/test/common.ts`
Add server name to the `adapters` array for testing.

## 5. Update Documentation

### `docs/reference/supported-adapters.md`
Add the new adapter to the list:
```markdown
- [{Server Name}](https://github.com/magne4000/universal-middleware/tree/main/packages/adapter-{server-name})
```

### `docs/index.md`
Add the server name to the feature description list.

### `docs/helpers/enhance.md`
1. Add the server to the adapter support table:
   ```markdown
   | {server-name}     | :heavy_check_mark: |
   ```
2. Add code example in the enhance examples section:
   ```typescript
   ```ts twoslash [{server-name}.ts]
   // @include: handler
   // ---cut---
   import { serve } from "{server-framework}";
   // ---cut-start---
   import guardMiddleware from "@universal-middleware-examples/tool/middlewares/guard-middleware";
   // ---cut-end---
   import { apply } from "@universal-middleware/{server-name}";

   const server = serve({
     port: 3000,
     fetch: apply([
       // Register middleware and handlers in the application
       guardMiddleware(),
       // Each handler requires method and path metadata
       enhancedHandler(),
       // Handlers can be enhanced with different metadata for route variations
       enhance(enhancedHandler(), {
         method: ["GET", "POST"],
         path: "/home"
       })
     ])
   });
   ```
   ```

### `docs/guide/packaging.md`
Update the server list in the `universalMiddleware` configuration example:
```typescript
servers?: ('hono' | 'express' | 'hattip' | 'fastify' | 'h3' | 'webroute' | 'cloudflare-pages' | 'cloudflare-worker' | 'elysia' | 'srvx' | '{server-name}')[];
```

### `docs/reference/runtime-adapter.md`
Add a new runtime adapter example section:
```typescript
```ts twoslash [{server-name}]
// @noErrors
import type { Runtime, {ServerName}Adapter } from "@universal-middleware/core";

export type Explain<A extends any> =
  A extends Function
    ? A
    : {[K in keyof A]: A[K]} & unknown

type RuntimeAdapter = Explain<{ServerName}Adapter>;

// ---cut---
import type { RuntimeAdapter } from "somelib/{server-name}";

const runtime: RuntimeAdapter;

// original {server-name} context
runtime.{server-name};
//      ^^^^^^^^^^^^
```
```

### `docs/recipes/params-handler.md`
Add usage example in the code group:
```typescript
```ts twoslash [{server-name}.ts]
import paramHandler from "@universal-middleware-examples/tool/params-handler-{server-name}";
import { serve } from "{server-framework}";
import { apply } from "@universal-middleware/{server-name}";

const server = serve({
  port: 3000,
  fetch: apply([
    paramHandler()
  ], {
    "/user/:name": { method: "GET" }
  })
});

export default server;
```
```

### `docs/recipes/context-middleware.md`
Add usage example in the code group:
```typescript
```ts twoslash [{server-name}.ts]
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-{server-name}";
import { serve } from "{server-framework}";
import { apply, getContext } from "@universal-middleware/{server-name}";

const server = serve({
  port: 3000,
  fetch: apply([
    contextMiddleware("world"),
    // Handler that uses the context
    () => (request, ctx, runtime) => {
      const universalCtx = getContext<{ hello: string }>(runtime);
      return new Response(`Hello ${universalCtx.hello}`);
    }
  ])
});

export default server;
```
```

## 6. Add Test Examples

### `tests-examples/tests-tool/src/{server-name}-entry.ts`
Create a test entry file following the pattern of existing adapters.

### `tests-examples/tests-tool/package.json`
1. Add dev script:
   ```json
   "dev:{server-name}": "node --import @swc-node/register/esm-register src/{server-name}-entry.ts"
   ```
2. Add prod script:
   ```json
   "prod:{server-name}": "node dist/{server-name}.js"
   ```
3. Add dependencies:
   ```json
   "@universal-middleware/{server-name}": "workspace:*",
   "{server-framework}": "catalog:",
   ```

### `tests-examples/tests-tool/tsup.config.ts`
Add entry point for the server in the `entry` object.

### `tests-examples/tests-tool/.test-{server-name}-dev.test.ts`
Create a test file following the pattern of existing adapters.

## 7. Testing

### Create Test Files
- `tests/entry-{server-name}.ts` - Test entry point with different test cases
- `tests/{server-name}.spec.ts` - Test specifications using the universal test runner

### Test Cases to Include
- Basic handler functionality
- Middleware chaining
- Router functionality (if applicable)
- Enhanced middleware support
- Error handling
- Different runtime environments (Node.js, Bun, Deno)

## 8. Additional Integrations

### Vercel Adapter Integration (if applicable)
If the server adapter should be available through Vercel:

#### `packages/adapter-vercel/package.json`
1. Add export: `"./{server-name}": "./dist/{server-name}.js"`
2. Add dev dependency: `"@universal-middleware/{server-name}": "workspace:^"`
3. Add peer dependency: `"{server-framework}": "catalog:"`
4. Add peer dependency meta for optional usage

#### `packages/adapter-vercel/tsup.config.ts`
Add entry point: `{server-name}: "./src/{server-name}.ts"`

#### `packages/adapter-vercel/src/{server-name}.ts`
Create export file: `export * from "@universal-middleware/{server-name}";`

## 9. Checklist

When creating a new server adapter, ensure you've updated:

### Core Package
- [ ] Created adapter package with all required files (src/, tests/, configs)
- [ ] Updated `packages/core/src/types.ts` with new adapter interface
- [ ] Added server to `packages/core/src/types.ts` Adapter union type

### Universal Middleware Plugin
- [ ] Added server to `packages/universal-middleware/src/plugin.ts` defaultWrappers
- [ ] Updated `packages/universal-middleware/src/plugin.ts` typesByServer
- [ ] Added server to `packages/universal-middleware/src/plugin.ts` maybeExternals
- [ ] Updated `packages/universal-middleware/tsup.config.ts` entry points
- [ ] Created `packages/universal-middleware/src/adapters/{server-name}.ts`
- [ ] Updated `packages/universal-middleware/test/common.ts` adapters array

### Build & Test Configuration
- [ ] Updated `vitest.workspace.ts`
- [ ] Updated `packages/sirv/tsup.config.ts` servers list
- [ ] Updated `packages/compress/tsup.config.ts` servers list

### Documentation
- [ ] Updated `docs/reference/supported-adapters.md`
- [ ] Updated `docs/index.md` feature description
- [ ] Updated `docs/helpers/enhance.md` adapter support table and code examples
- [ ] Updated `docs/guide/packaging.md` server list example
- [ ] Updated `docs/reference/runtime-adapter.md` with runtime adapter example
- [ ] Updated `docs/recipes/params-handler.md` with usage example
- [ ] Updated `docs/recipes/context-middleware.md` with usage example

### Test Examples
- [ ] Created test entry file in `tests-examples/tests-tool/src/`
- [ ] Updated `tests-examples/tests-tool/package.json` with dev/prod scripts and dependencies
- [ ] Updated `tests-examples/tests-tool/tsup.config.ts` entry points
- [ ] Created `tests-examples/tests-tool/.test-{server-name}-dev.test.ts`

### Testing
- [ ] Created comprehensive tests in adapter package
- [ ] Verified all tests pass across different runtimes (Node.js, Bun, Deno)
- [ ] Tested middleware and handler functionality
- [ ] Tested router functionality (if applicable)
- [ ] Tested enhanced middleware support
- [ ] Tested error handling

### Optional Integrations
- [ ] Added Vercel adapter integration (if applicable)
- [ ] Ensured server framework is in `pnpm-workspace.yaml` catalog

## Example Implementation

Refer to existing adapters like `adapter-express`, `adapter-hono`, or `adapter-srvx` for implementation examples and patterns to follow.
