import { expect, fetch, getServerUrl, run, test } from "@brillout/test-e2e";

type RunOptions = Parameters<typeof run>[1];

export function testRun(
  cmd: `pnpm run dev:${"hono" | "express" | "fastify" | "hattip" | "h3" | "pages" | "worker" | "elysia"}${string}`,
  port: number,
  options?: RunOptions,
) {
  run(`${cmd} --port ${port}`, {
    doNotFailOnWarning: true,
    serverUrl: `http://localhost:${port}`,
    ...options,
    serverIsReadyMessage: options?.serverIsReadyMessage ?? "Server listening",
  });

  test("/", async () => {
    const response = await fetch(`${getServerUrl()}/`);

    const content = await response.text();

    expect(content).toContain('"World!!!"');
    expect(response.headers.has("x-universal-hello")).toBe(true);
    expect(response.headers.get("content-encoding")).toMatch(/gzip|deflate/);
  });

  test("/user/:name", async () => {
    const response = await fetch(`${getServerUrl()}/user/magne4000`);

    const content = await response.text();

    expect(content).toBe("User name is: magne4000");
  });
}
