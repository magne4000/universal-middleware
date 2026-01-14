# Agent Instructions for universal-middleware

## Repository Overview

This repository provides a framework for writing server middlewares and handlers once and deploying them across multiple server frameworks (Express, Hono, Fastify, h3, Hattip, Elysia, srvx, Vercel, Cloudflare, Webroute). It enables library authors to write framework-agnostic middleware that can be adapted to any supported platform.

**Project Type:** TypeScript monorepo using pnpm workspaces and Turbo for build orchestration  
**Primary Language:** TypeScript (ES Modules)  
**Package Manager:** pnpm 10.11.0 (required)  
**Node Version:** Node.js 20.0.0 or higher (tested on 20, 22, 24)  
**Repository Size:** 15 packages + documentation + examples

## Critical Setup Requirements

### Prerequisites
1. **ALWAYS install pnpm first if not available:** `npm install -g pnpm@10.11.0`
2. **Node version:** Must be 20.0.0 or higher (check with `node --version`)
3. **ALWAYS run `pnpm install` before any other command** - dependencies must be installed fresh

### Initial Setup (Run in Order)
```bash
# 1. Install pnpm globally if needed
npm install -g pnpm@10.11.0

# 2. Install all dependencies (REQUIRED - takes ~20-30 seconds, downloads ~174 MB for playwright)
pnpm install

# 3. Build all packages (REQUIRED before testing/linting - takes ~60 seconds)
pnpm run build
```

**NOTE:** The build step is mandatory before running tests, linting, or typechecking due to turbo.json dependencies.

## Build, Test, and Validation Commands

### Building
```bash
# Build all packages (ALWAYS run this first after install)
pnpm run build
# Takes: ~55-60 seconds on first run, faster with cache
# Builds 18 packages in topological order using Turbo
```

### Linting
```bash
# Run linter (uses Biome)
pnpm run lint
# Takes: ~5 seconds
# Must run AFTER build due to turbo.json dependencies
# Config: biome.json (semicolons: always, indentWidth: 2, lineWidth: 120)
```

### Type Checking
```bash
# Run type checking across all packages
pnpm run test:typecheck
# Takes: ~45 seconds
# Must run AFTER build due to turbo.json dependencies
# Each package has its own tsconfig.json
```

### Testing
```bash
# Run all tests (includes vitest unit tests + integration tests)
pnpm run test
# Takes: Several minutes (includes starting test servers)
# Must run AFTER build due to turbo.json dependencies
# Note: Some tests require Bun and Deno which may not be in all environments
```

### Documentation Build
```bash
# Build documentation site
cd docs && pnpm run build-doc
# Takes: ~50-60 seconds
# Uses VitePress
# Warning: Large chunks (>500kB) are expected - this is normal
```

### Formatting
```bash
# Format code (auto-fixes)
pnpm run format
# Uses Biome formatter with 2-space indentation
```

## Project Structure

### Root Directory Files
- `package.json` - Workspace root with scripts for build/test/lint/release
- `pnpm-workspace.yaml` - Defines workspace packages and shared catalog dependencies
- `turbo.json` - Build orchestration config (defines task dependencies)
- `biome.json` - Linter and formatter configuration
- `tsconfig.json` - Base TypeScript configuration (strict mode, ES2022)
- `vitest.workspace.ts` - Test configuration workspace
- `.npmrc` - pnpm configuration (link-workspace-packages: deep)

### Package Structure
```
packages/
├── core/                    # Core utilities and types (@universal-middleware/core)
├── adapter-*/              # Framework adapters (express, hono, fastify, h3, etc.)
│   ├── src/               # TypeScript source
│   ├── test/              # Vitest tests
│   ├── tsup.config.ts     # Build configuration
│   └── vitest.config.ts   # Test configuration
├── compress/              # Compression middleware
├── sirv/                  # Static file serving middleware
├── tests/                 # Shared test utilities
└── universal-middleware/  # Main package with bundler plugins

examples/
└── tool/                  # Example middleware implementations

tests-examples/
└── tests-tool/           # Integration test suites

docs/                     # VitePress documentation site
├── .vitepress/          # VitePress configuration
├── guide/               # User guides
├── reference/           # API reference
├── recipes/             # Code examples
└── package.json         # Has build-doc script
```

### Key Configuration Files

**Build Configuration:**
- Each package uses `tsup` for building (config in `tsup.config.ts`)
- Target: ES2022 for adapters, Node 20 for core/express/fastify
- Output: ESM format to `dist/` directory
- Type definitions generated automatically

**TypeScript:**
- Base config: `tsconfig.json` (strict mode, ESNext modules, bundler resolution)
- Each package extends base config with `{ "extends": "../../tsconfig.json" }`
- No emit from tsconfig - build handled by tsup

**Linting (Biome):**
- Config: `biome.json`
- Rules: All recommended rules enabled
- Formatter: 2-space indent, semicolons always, 120 char line width
- Overrides: `noExplicitAny` disabled for test files and specific files (see biome.json)

## CI/CD Pipeline (.github/workflows/ci.yml)

The CI runs on every PR and push to main. Key steps:
1. Install Deno (v2.6.3) - required for some tests
2. Install Bun (latest) - required for Elysia adapter tests
3. Install pnpm
4. Install dependencies: `pnpm install`
5. Install Playwright: `pnpm playwright install chromium`
6. Build: `pnpm run build`
7. Lint: `pnpm run lint` (skipped on Windows)
8. Typecheck: `pnpm run test:typecheck` (skipped on Windows)
9. Test: `pnpm run test` (skipped on Windows, requires VERCEL_TOKEN secret)
10. Build docs: `cd docs && pnpm run build-doc` (skipped on Windows)

**Matrix:** Tests run on Ubuntu (Node 20, 22, 24) and Windows (Node 20)

## Common Pitfalls and Workarounds

### Build Order Issues
**Problem:** Running `pnpm run test` or `pnpm run lint` without building first fails  
**Solution:** ALWAYS run `pnpm run build` after installing dependencies

### Dependency Installation
**Problem:** Missing dependencies or version mismatches  
**Solution:** Delete `node_modules` and `pnpm-lock.yaml`, then run `pnpm install`

### Test Failures in CI
- **Bun not available:** Elysia tests will fail with "bun: not found" - this is expected in environments without Bun
- **Deno not available:** Some runtime tests require Deno
- **Vercel tests:** Require VERCEL_TOKEN environment variable

### Cache Issues
**Problem:** Turbo cache causes stale builds  
**Solution:** Run `turbo run build --force` to bypass cache, or delete `.turbo` directory

### Playwright Installation
**Problem:** Chromium not installed for tests  
**Solution:** Run `pnpm playwright install chromium` (downloads ~174 MB)

### Type Definition Files
**Problem:** Type errors in imports from workspace packages  
**Solution:** Ensure `pnpm run build` completed successfully - types are generated during build

## Architecture Details

### Adapter Pattern
Each adapter package (`adapter-*`) converts the universal middleware format to framework-specific middleware:
- Universal format: `(request: Request, context: Context) => Response | void | Promise<...>`
- Adapters transform to: Express `(req, res, next)`, Fastify `(request, reply)`, Hono middleware, etc.

### Core Package (@universal-middleware/core)
- Location: `packages/core/`
- Exports: `./dist/index.js` (main utilities), `./dist/cookie.js` (cookie helpers)
- Key types: `UniversalMiddleware`, `UniversalHandler`, `Get` type helper
- Core utilities: `pipe()`, route parameters, context handling, cookies

### Build Plugin (universal-middleware)
- Location: `packages/universal-middleware/`
- Provides: Vite/Rollup/esbuild plugins for automatic adapter imports
- Enables: `import middleware from 'some-lib/middleware-hono'` syntax

### Middleware Packages
- `compress/` - Compression middleware (gzip/brotli)
- `sirv/` - Static file serving middleware
- Both generate per-adapter builds: `universal-{adapter}-middleware-middleware.js`

## Code Conventions

1. **Module System:** ES Modules only (`"type": "module"` in all package.json)
2. **Formatting:** Use semicolons, 2-space indents, 120 char lines (enforced by Biome)
3. **Exports:** Use named exports for utilities, default export for middleware/handlers
4. **File Extensions:** Always use `.ts` for TypeScript, `.js` for output
5. **Import Extensions:** Omit extensions in imports (handled by bundler)
6. **Any Type:** Avoid except in test files and explicitly allowed files (see biome.json overrides)

## Making Code Changes

1. **Install and Build First:** Always `pnpm install && pnpm run build`
2. **Make Changes:** Edit source in `packages/*/src/`
3. **Rebuild:** `pnpm run build` (or `turbo run build` in specific package)
4. **Lint:** `pnpm run lint` (auto-fix with `pnpm run format`)
5. **Type Check:** `pnpm run test:typecheck`
6. **Test:** `pnpm run test`
7. **Validate:** Ensure CI steps pass locally before committing

### Adding New Dependencies
- Add to appropriate package's `package.json`
- Consider adding to `pnpm-workspace.yaml` catalog if shared
- Run `pnpm install` to update lockfile
- Rebuild affected packages

### Creating New Packages
- Follow existing adapter structure (see `packages/adapter-hono/` as example)
- Include: `package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`
- Add to `vitest.workspace.ts` if includes tests
- Add to `pnpm-workspace.yaml` packages list

## Trust These Instructions

These instructions were validated by running all commands successfully in the repository:
- ✅ `pnpm install` completed successfully
- ✅ `pnpm run build` completed in ~56 seconds
- ✅ `pnpm run lint` passed with no errors
- ✅ `pnpm run test:typecheck` passed
- ✅ `pnpm run test` runs (some tests require Bun/Deno)
- ✅ `cd docs && pnpm run build-doc` completed successfully

**If you encounter issues not documented here, it likely indicates an environment-specific problem or the repository has changed since these instructions were written. Search the codebase for recent changes before assuming these instructions are incorrect.**
