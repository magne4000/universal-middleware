import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, getServerUrl, run, test } from "@brillout/test-e2e";
// Prefer ky over fetch because node implementation can consume a lot of memory
// See https://github.com/nodejs/undici/issues/4058#issuecomment-2661366213
import ki from "ky";

const _dirname = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));

type RunOptions = Parameters<typeof run>[1] & {
  portCommand?: string;
  prefix?: string;
  noMiddleware?: boolean;
  noCompression?: boolean;
  fixExit?: boolean;
};

export function testRun(
  cmd: `pnpm run ${"dev" | "prod"}:${"hono" | "express" | "fastify" | "hattip" | "h3" | "pages" | "worker" | "elysia" | "vercel" | "srvx"}${string}`,
  port: number,
  options?: RunOptions,
) {
  run(`${cmd} ${options?.portCommand ?? "--port"} ${port}`, {
    tolerateError: true,
    serverUrl: `http://localhost:${port}`,
    ...options,
    serverIsReadyMessage: options?.serverIsReadyMessage ?? "Server listening",
  });

  test("/", async () => {
    const response = await ki(`${getServerUrl()}${options?.prefix ?? ""}/`, { window: null, redirect: "error" });

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
    const response = await ki(`${getServerUrl()}${options?.prefix ?? ""}/user/magne4000`, {
      window: null,
      redirect: "error",
    });

    const content = await response.text();

    expect(content).toBe("User name is: magne4000");
  });

  if (options?.fixExit) {
    process.on("exit", (code) => {
      process.exit(0);
      console.log({ code });
    });
  }

  if (!options?.noMiddleware && !options?.noCompression) {
    test("/big-file", async () => {
      const response = await ki(`${getServerUrl()}${options?.prefix ?? ""}/big-file`, {
        window: null,
        redirect: "error",
      });

      expect(response.headers.get("content-encoding")).toMatch(/gzip|deflate/);
      const content = await response.text();
      expect(content).toBe(readFileSync(join(_dirname, "..", "..", "packages", "tests", "big-file.txt"), "utf-8"));
    });
  }
}
