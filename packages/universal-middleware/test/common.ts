import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { packageUp } from "package-up";
import { type TestOptions, vi } from "vitest";

export const adapters = [
  "hono",
  "express",
  "hattip",
  "webroute",
  "fastify",
  "h3",
  "cloudflare-pages",
  "cloudflare-worker",
  "vercel-edge",
  "vercel-node",
  "elysia",
  "srvx",
] as const;

export const noMiddlewaresSupport = ["cloudflare-worker", "vercel-edge", "vercel-node"];

// flaky tests on Windows
export const options: TestOptions = {
  timeout: 60000,
  retry: process.platform === "win32" ? 3 : 0,
};

export function expectNbOutput(nbHandlers = 0, nbMiddlewares = 0) {
  return nbHandlers * (adapters.length + 1) + nbMiddlewares * (adapters.length + 1 - noMiddlewaresSupport.length);
}

export interface PackageJson {
  dependencies?: Record<string, string>;
  exports: Record<string, { types?: string; import: string }>;
}

// The plugin edits the package.json found by `packageUp`. A test file that mocks `package-up` gets it pointed at a
// temporary one, rather than this package's own.
export async function buildInTempPackage(build: () => Promise<unknown>): Promise<PackageJson> {
  const path = join(await mkdtemp(join(tmpdir(), "universal-middleware-")), "package.json");
  await writeFile(path, `${JSON.stringify({ name: "tmp" })}\n`);
  vi.mocked(packageUp).mockResolvedValueOnce(path);
  await build();
  return JSON.parse(await readFile(path, "utf8"));
}
