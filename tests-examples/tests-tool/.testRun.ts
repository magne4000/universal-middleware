import { expect, fetch, getServerUrl, run, test } from "@brillout/test-e2e";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const _dirname = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));

type RunOptions = Parameters<typeof run>[1] & {
  portCommand?: string;
  prefix?: string;
  noMiddleware?: boolean;
  noCompression?: boolean;
};

export function testRun(
  cmd: `pnpm run ${"dev" | "prod"}:${"hono" | "express" | "fastify" | "hattip" | "h3" | "pages" | "worker" | "elysia" | "vercel"}${string}`,
  port: number,
  options?: RunOptions,
) {
  run(`${cmd} ${options?.portCommand ?? "--port"} ${port}`, {
    doNotFailOnWarning: true,
    serverUrl: `http://localhost:${port}`,
    ...options,
    serverIsReadyMessage: options?.serverIsReadyMessage ?? "Server listening",
  });

  test("/", async () => {
    const response = await fetch(`${getServerUrl()}${options?.prefix ?? ""}/`);

    const content = await response.text();

    if (!options?.noMiddleware) {
      expect(content).toContain('"World!!!"');
      expect(response.headers.has("x-universal-hello")).toBe(true);
    }

    if (!options?.noMiddleware && !options?.noCompression) {
      expect(response.headers.get("content-encoding")).toMatch(/gzip|deflate/);
    }
  });

  test("/user/:name", async () => {
    const response = await fetch(`${getServerUrl()}${options?.prefix ?? ""}/user/magne4000`);

    const content = await response.text();

    expect(content).toBe("User name is: magne4000");
  });

  if (!options?.noMiddleware && !options?.noCompression) {
    test("/big-file", async () => {
      const response = await fetch(`${getServerUrl()}${options?.prefix ?? ""}/big-file`);

      expect(response.headers.get("content-encoding")).toMatch(/gzip|deflate/);
      const content = await response.text();
      expect(content).toBe(readFileSync(join(_dirname, '..', '..', 'packages', 'tests', 'src', 'big-file.txt'), 'utf-8'));
    });
  }
}
