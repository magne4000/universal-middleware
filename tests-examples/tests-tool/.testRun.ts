import { expect, fetch, getServerUrl, run, test } from "@brillout/test-e2e";

type RunOptions = Parameters<typeof run>[1] & { portCommand?: string; prefix?: string; noMiddleware?: boolean };

export function testRun(
  cmd: `pnpm run dev:${"hono" | "express" | "fastify" | "hattip" | "h3" | "pages" | "worker" | "elysia" | "vercel"}${string}`,
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

    if (
      !options?.noMiddleware &&
      // Cloudflare already compresses data, so the compress middleware is not built for those targets
      !cmd.startsWith("pnpm run dev:pages") &&
      !cmd.startsWith("pnpm run dev:worker")
    ) {
      expect(response.headers.get("content-encoding")).toMatch(/gzip|deflate/);
    }
  });

  test("/user/:name", async () => {
    const response = await fetch(`${getServerUrl()}${options?.prefix ?? ""}/user/magne4000`);

    const content = await response.text();

    expect(content).toBe("User name is: magne4000");
  });
}
