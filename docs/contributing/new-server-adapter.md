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
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
└── readme.md
```

### Required Files

#### `package.json`
- Set name to `@universal-middleware/{server-name}`
- Include test scripts for different runtimes (node, bun, deno)
- Add dependencies on `@universal-middleware/core` and the target server framework

#### `src/common.ts`
- Implement `createHandler` and `createMiddleware` functions
- Define server-specific types (e.g., `{ServerName}Handler`, `{ServerName}Middleware`)
- Implement `getRuntime` function that calls `getAdapterRuntime`
- Handle context management (get/set context functions)

#### `src/router.ts` (if applicable)
- Implement `apply` function for middleware application
- May include server-specific router class extending `UniversalRouter`

#### `src/index.ts`
- Export all public functions and types from common.ts and router.ts

## 2. Update Core Package

### `packages/core/src/types.ts`
1. Add import for server-specific types at the top of the file
2. Create a new adapter interface following the pattern:
   ```typescript
   export interface {ServerName}Adapter {
     adapter: "{server-name}";
     params: Record<string, string> | undefined;
     
     {server-name}: {ServerSpecificContext};
   }
   ```
3. Add the new adapter to the `Adapter` union type

## 3. Update Universal Middleware Plugin

### `packages/universal-middleware/src/plugin.ts`
Add entry to `typesByServer` object:
```typescript
"{server-name}": {
  middleware: "{ServerName}Middleware",
  handler: "{ServerName}Handler",
},
```

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

## 5. Update Documentation

### `docs/reference/supported-adapters.md`
Add the new adapter to the list:
```markdown
- [{Server Name}](https://github.com/magne4000/universal-middleware/tree/main/packages/adapter-{server-name})
```

## 6. Add Test Examples

### `tests-examples/tests-tool/src/{server-name}-entry.ts`
Create a test entry file following the pattern of existing adapters.

### `tests-examples/tests-tool/package.json`
1. Add dev script:
   ```json
   "dev:{server-name}": "node --import @swc-node/register/esm-register src/{server-name}-entry.ts"
   ```
2. Add dependencies:
   ```json
   "@universal-middleware/{server-name}": "workspace:*",
   "{server-framework}": "catalog:",
   ```

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

## 8. Checklist

When creating a new server adapter, ensure you've updated:

- [ ] Created adapter package with all required files
- [ ] Updated `packages/core/src/types.ts` with new adapter interface
- [ ] Updated `packages/universal-middleware/src/plugin.ts` typesByServer
- [ ] Updated `packages/universal-middleware/tsup.config.ts` entry points
- [ ] Created `packages/universal-middleware/src/adapters/{server-name}.ts`
- [ ] Updated `vitest.workspace.ts`
- [ ] Updated `packages/sirv/tsup.config.ts` servers list
- [ ] Updated `docs/reference/supported-adapters.md`
- [ ] Created test entry file in `tests-examples/tests-tool/src/`
- [ ] Updated `tests-examples/tests-tool/package.json` with scripts and dependencies
- [ ] Created comprehensive tests
- [ ] Verified all tests pass across different runtimes

## Example Implementation

Refer to existing adapters like `adapter-express`, `adapter-hono`, or `adapter-srvx` for implementation examples and patterns to follow.
