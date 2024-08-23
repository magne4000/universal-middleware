import { expect, fetch, getServerUrl, run, test } from "@brillout/test-e2e";

export function testRun(
  cmd: `pnpm run dev:${"hono" | "express" | "fastify" | "hattip" | "h3"}`,
  port: number,
  serverIsReadyMessage?: string,
) {
  run(`${cmd} --port ${port}`, {
    doNotFailOnWarning: true,
    serverUrl: `http://localhost:${port}`,
    serverIsReadyMessage: serverIsReadyMessage ?? "Server listening",
  });

  test("/", async () => {
    const response = await fetch(getServerUrl() + "/");

    const content = await response.text();

    expect(content).toContain('"something"');
    expect(response.headers.has("x-universal-hello")).toBe(true);
  });
}
