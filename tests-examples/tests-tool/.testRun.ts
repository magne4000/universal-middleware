import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { autoRetry, expect, getServerUrl, run, test } from "@brillout/test-e2e";
// Prefer got over fetch because node implementation can consume a lot of memory
// See https://github.com/nodejs/undici/issues/4058#issuecomment-2661366213
import fetch, { type Response as GotResponse } from "got";

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
    const response = await fetch.get(`${getServerUrl()}${options?.prefix ?? ""}/`);

    const content = response.body;

    if (!options?.noMiddleware) {
      expect(content).toContain('"World!!!"');
      expect(response.headers["x-universal-hello"]).toBe("World!!!");
    }

    if (!options?.noMiddleware && !options?.noCompression) {
      expect(getEncoding(response)).toMatch(/gzip|deflate/);
    }
  });

  test("/user/:name", async () => {
    const content = await fetch.get(`${getServerUrl()}${options?.prefix ?? ""}/user/magne4000`).text();

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
      await autoRetry(
        async () => {
          const response = await fetch.get(`${getServerUrl()}${options?.prefix ?? ""}/big-file`, {
            followRedirect: false,
          });

          expect(getEncoding(response)).toMatch(/gzip|deflate/);
          const content = response.body;
          expect(content).toBe(readFileSync(join(_dirname, "..", "..", "packages", "tests", "big-file.txt"), "utf-8"));
        },
        {
          timeout: 30000,
        },
      );
    });
  }
}

function getEncoding(res: GotResponse) {
  const i = res.rawHeaders.indexOf("content-encoding");
  if (i === -1) return undefined;
  return res.rawHeaders[i + 1];
}
