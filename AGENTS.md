# Agent Instructions for universal-middleware

## Repository Overview

This repository provides a framework for writing server middlewares and handlers once and deploying them across multiple server frameworks (Express, Hono, Fastify, h3, Hattip, Elysia, srvx, Vercel, Cloudflare, Webroute). It enables library authors to write framework-agnostic middleware that can be adapted to any supported platform.

**Project Type:** TypeScript monorepo using pnpm workspaces and Turbo for build orchestration  
**Primary Language:** TypeScript (ES Modules)  
**Package Manager:** pnpm 11.5.2 (required)  
**Node Version:** Node.js 22.18 or higher (24.11 or higher on Node 24; tested on 22, 24)  
**Repository Size:** 17 packages under `packages/` + documentation + examples

## Critical Setup Requirements

### Prerequisites
1. **ALWAYS install pnpm first if not available:** `npm install -g pnpm@11.5.2`
2. **Node version:** Must be 22.18 or higher, as tsdown requires (check with `node --version`)
3. **ALWAYS run `pnpm install` before any other command** - dependencies must be installed fresh

### Initial Setup (Run in Order)
```bash
# 1. Install pnpm globally if needed
npm install -g pnpm@11.5.2

# 2. Install all dependencies (REQUIRED - takes ~20-30 seconds, downloads ~174 MB for playwright)
pnpm install

# 3. Build all packages (the root `test` and `test:typecheck` scripts build first; running vitest or tsc in one package needs it)
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
# Does not need a build (Biome runs on the sources)
# Config: biome.json (semicolons: always, indentWidth: 2, lineWidth: 120)
```

### Type Checking
```bash
# Run type checking across all packages
pnpm run test:typecheck
# Takes: ~45 seconds
# Builds what it needs first (turbo `dependsOn: build`)
# Each package has its own tsconfig.json
```

### Testing
```bash
# Run all tests (includes vitest unit tests + integration tests)
pnpm run test
# Takes: Several minutes (includes starting test servers)
# Builds what it needs first (turbo `dependsOn: build`)
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
# Format code, sort imports and apply safe lint fixes (auto-fixes)
pnpm run check
# Uses Biome formatter with 2-space indentation
```

**`pnpm exec biome ci .` must pass** before any change is considered done: it checks
formatting, import order and lint, as CI does (`pnpm run check` fixes most of it).

### Local builds/tests in a mounted checkout

If `node_modules` was installed on a different OS than the one you are running on
(e.g. the repo is mounted from macOS but you run on Linux), the native binaries
(esbuild, rolldown, rollup, swc, workerd, playwright) will not match and builds
fail with `Cannot find module '@rolldown/binding-...'` / `@rollup/rollup-...`.
Do **not** reinstall in place — that clobbers the other machine's `node_modules`.
Instead work in a **git worktree** with its own install:

```bash
git worktree add -b <branch> ../<repo>-wt HEAD
cd ../<repo>-wt
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 pnpm install --store-dir .pnpm-store
```

Build/verify there, then bring the finished changes back to the branch.

## Project Structure

### Root Directory Files
- `package.json` - Workspace root with scripts for build/test/lint/release
- `pnpm-workspace.yaml` - Defines workspace packages, shared catalog dependencies, and pnpm settings (`autoInstallPeers: false`, `linkWorkspacePackages: deep`)
- `turbo.json` - Build orchestration config (defines task dependencies)
- `biome.json` - Linter and formatter configuration
- `tsconfig.json` - Base TypeScript configuration (strict mode, ES2022)

### Package Structure
```
packages/
├── core/                    # Core utilities and types (@universal-middleware/core)
├── node/                    # Node request/response conversion shared by the Express, Fastify and Vercel adapters
├── adapter-*/              # Framework adapters (express, hono, fastify, h3, etc.)
│   ├── src/               # TypeScript source
│   ├── tests/             # Vitest tests
│   ├── tsdown.config.ts   # Build configuration
│   └── vitest.config.ts   # Test configuration
├── compress/              # Compression middleware
├── sirv/                  # Static file serving middleware
├── tests/                 # Shared test utilities
├── tsdown-config/         # Shared tsdown configuration (private)
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
- Each package uses `tsdown` (Rolldown-based) for building (config in `tsdown.config.ts`)
- Target: ES2022 for runtime-neutral packages; the Node packages (core, node, express, fastify) get a Node target from `packages/tsdown-config`
- Output: ESM format to `dist/` directory
- Type definitions generated automatically

**TypeScript:**
- Base config: `tsconfig.json` (strict mode, ESNext modules, bundler resolution)
- Each package extends base config with `{ "extends": "../../tsconfig.json" }`
- No emit from tsconfig - build handled by tsdown

**Linting (Biome):**
- Config: `biome.json`
- Rules: All recommended rules enabled
- Formatter: 2-space indent, semicolons always, 120 char line width
- Overrides: `noExplicitAny` disabled for test files and specific files (see biome.json)

## CI/CD Pipeline

The CI has been split into two separate workflows that run on every PR and push to main:

### Lint and Types Workflow (.github/workflows/lint-and-types.yml)
Runs linting, type checking, and documentation build on Ubuntu with Node 22:
1. Install Deno (v2.9.6) - required for type checking
2. Install Bun (latest) - required for Elysia adapter types
3. Install pnpm
4. Install dependencies: `pnpm install`
5. Build: `pnpm run build`
6. Biome: `pnpm exec biome ci .` (formatting, import order and lint)
7. Typecheck: `pnpm run test:typecheck`
8. Build docs: `cd docs && pnpm run build-doc`

### Tests Workflow (.github/workflows/tests.yml)
Runs tests with a matrix approach for comprehensive coverage:
1. Install Deno (v2.9.6) - required for some tests
2. Install Bun (latest) - required for Elysia adapter tests
3. Install pnpm
4. Install dependencies: `pnpm install`
5. Build: `pnpm run build`
6. Install Playwright (only for tests-examples/tests-tool): `pnpm exec playwright install chromium`, run in `tests-examples/tests-tool`
7. Run tests in specific package: `pnpm run test` (working directory: matrix.cwd)

**Test Matrix:** 
- **OS:** ubuntu-latest, windows-latest
- **Node versions:** 22, 24
- **Packages tested:** the 14 packages listed in `matrix.cwd` (adapters, core, sirv, compress, universal-middleware) and tests-tool; `packages/node` is tested through the Express and Fastify adapters
- **Exclusions:** Windows only tests on Node 24; sirv and adapter-vercel skip Windows; tests-tool only runs on Node 24
- **Environment:** Requires VERCEL_TOKEN secret for Vercel adapter tests; without it (pull requests from forks) the adapter-vercel test step is skipped with a notice

## Common Pitfalls and Workarounds

### Build Order Issues
**Problem:** Running vitest or tsc directly in one package before building fails, because packages import each other's `dist/`  
**Solution:** Run `pnpm run build` after installing dependencies (the root `test` and `test:typecheck` scripts build first)

### Dependency Installation
**Problem:** Missing dependencies or version mismatches  
**Solution:** Delete `node_modules`, then run `pnpm install --frozen-lockfile`. Only update `pnpm-lock.yaml` on purpose, with `pnpm install`

### Test Failures in CI
- **Bun not available:** Elysia tests will fail with "bun: not found" - this is expected in environments without Bun
- **Deno not available:** Some runtime tests require Deno
- **Vercel tests:** Require VERCEL_TOKEN, or a `vercel login` session locally; CI skips them when the secret is unavailable
- **Windows Build step timed out:** since turbo 2.11.4, `turbo run build` sometimes never exits on Windows after all tasks succeed; the step fails after 10 minutes, so re-run the failed job

### Cache Issues
**Problem:** Turbo cache causes stale builds  
**Solution:** Run `turbo run build --force` to bypass cache, or delete `.turbo` directory

### Playwright Installation
**Problem:** Chromium not installed for tests  
**Solution:** Run `pnpm exec playwright install chromium` in `tests-examples/tests-tool` (downloads ~174 MB)

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
4. **Lint:** `pnpm exec biome ci .` (auto-fix with `pnpm run check`)
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
- Include: `package.json`, `tsconfig.json`, `tsdown.config.ts`, `vitest.config.ts`
- `pnpm-workspace.yaml` globs `packages/*`, so a new package there is picked up automatically
- If it has tests, add it to `matrix.cwd` in `.github/workflows/tests.yml`

## Trust These Instructions

These instructions were validated by running all commands successfully in the repository:
- ✅ `pnpm install` completed successfully
- ✅ `pnpm run build` completed in ~56 seconds
- ✅ `pnpm run lint` passed with no errors
- ✅ `pnpm run test:typecheck` passed
- ✅ `pnpm run test` runs (some tests require Bun/Deno)
- ✅ `cd docs && pnpm run build-doc` completed successfully

**If you encounter issues not documented here, it likely indicates an environment-specific problem or the repository has changed since these instructions were written. Search the codebase for recent changes before assuming these instructions are incorrect.**
