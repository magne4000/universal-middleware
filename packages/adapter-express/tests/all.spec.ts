import { kill } from "zx";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { type ChildProcess, spawn } from "node:child_process";
import waitPort from "wait-port";

interface Run {
  name: string;
  command: string;
  port: number;
}

const runs: Run[] = [
  {
    name: "adapter-express: node",
    command: "pnpm run test:run-express:node",
    port: 3000,
  },
  {
    name: "adapter-express: bun",
    command: "pnpm run test:run-express:bun",
    port: 3001,
  },
  {
    name: "adapter-express: deno",
    command: "pnpm run test:run-express:deno",
    port: 3002,
  },
];

describe.concurrent.each(runs)("$name", (run) => {
  let server: ChildProcess | undefined = undefined;
  const { command, port } = run;
  let host = `http://localhost:${port}`;

  beforeAll(async () => {
    server = spawn(`${command} --port ${port}`, {
      shell: true,
      stdio: "inherit",
      env: {
        ...process.env,
      },
    });

    // Wait until server is ready
    await new Promise((resolve, reject) => {
      server!.on("error", (error) => {
        server = undefined;
        reject(error);
      });

      server!.on("exit", (code) => {
        if (code !== 0) {
          server = undefined;
          reject(new Error(`Process exited with code ${code}`));
        }
      });

      waitPort({ port, interval: 250, timeout: 10_000 })
        .then((res) => {
          if (res.ipVersion === 4) {
            host = `http://127.0.0.1:${port}`;
          }
          resolve(undefined);
        })
        .catch(reject);
    });
  }, 20_000);

  afterAll(async () => {
    await kill(server!.pid!, "SIGKILL").finally(() => {
      server = undefined;
    });
  });

  test("middlewares", async () => {
    const response = await fetch(host);
    const text = await response.text();
    expect(response.status).toBe(200);
    expect(JSON.parse(text)).toEqual({
      something: {
        a: 1,
      },
      somethingElse: {
        b: 2,
      },
    });
    expect(response.headers.get("x-test-value")).toBe("universal-middleware");
    expect(response.headers.has("x-should-be-removed")).toBe(false);
    // added by helmet
    expect(response.headers.has("content-security-policy")).toBe(true);
    expect(response.headers.has("x-xss-protection")).toBe(true);
  });
});
