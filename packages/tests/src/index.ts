import { type ChildProcess, spawn } from "node:child_process";
import mri from "mri";
import { kill, retry } from "zx";
import type { TestOptions } from "vitest";

export interface Run {
  name: string;
  command: string;
  port: number;
  portOption?: string;
  waitUntilType?: "undefined" | "function";
  delay?: number;
  env?: Record<string, string>;
  staticContext?: boolean;
  tests?: {
    throwLate?: {
      expectedBody?: string;
    };
    throwEarly?: {
      expectedBody?: string;
    };
    throwEarlyAndLate?: {
      expectedBody?: string;
    };
  };
}

export interface Options extends TestOptions {
  vitest: typeof import("vitest");
  test?: (response: Response, body: Record<string, unknown>, run: Run) => void | Promise<void>;
  testPost?: boolean;
  prefix?: string;
}

declare global {
  namespace Universal {
    interface Context {
      something?: Record<string, unknown>;
      somethingElse?: Record<string, unknown>;
    }
  }
}

export function runTests(runs: Run[], options: Options) {
  const { vitest, test, testPost, prefix, ...testOptions } = options;
  if (typeof testOptions.concurrent !== "boolean") {
    testOptions.concurrent = true;
  }
  vitest.describe.each(runs)("$name", testOptions, (run) => {
    let server: ChildProcess | undefined = undefined;
    const { command, port, delay, env, portOption } = run;
    const staticContext =
      typeof run.staticContext === "boolean"
        ? run.staticContext
        : env?.TEST_CASE === "router" || env?.TEST_CASE === "router_enhanced";
    let host = `http://localhost:${port}`;

    vitest.beforeAll(async () => {
      server = spawn(`${command} ${portOption ?? "--port"} ${port}`, {
        shell: true,
        stdio: "inherit",
        env: {
          ...process.env,
          ...env,
        },
      });

      // Wait until server is ready
      await new Promise((resolve, reject) => {
        server?.on("error", (error) => {
          server = undefined;
          reject(error);
        });

        server?.on("exit", (code) => {
          if (code !== 0) {
            server = undefined;
            reject(new Error(`Process exited with code ${code}`));
          }
        });

        retry(40, process.env.CI ? 500 : 250, async () => {
          try {
            await fetch(host);
          } catch {
            await fetch(`http://127.0.0.1:${port}`);
            host = `http://127.0.0.1:${port}`;
          }
        })
          .then(resolve)
          .catch(reject);
      });

      if (delay) {
        await new Promise((r) => setTimeout(r, delay));
      }
    }, 30_000);

    vitest.afterAll(async () => {
      const pid = server?.pid;
      if (typeof pid === "number") {
        await kill(pid, "SIGKILL").finally(() => {
          server = undefined;
        });
      }
    }, 30_000);

    vitest.test("middlewares", { retry: 3, timeout: 30_000 }, async () => {
      const response = await fetch(`${host}${prefix ?? ""}`);
      const body = JSON.parse(await response.text());
      vitest.expect(response.status).toBe(200);
      const expectedBody = {
        long: "a".repeat(1024),
        something: {
          a: 1,
        },
        somethingElse: {
          b: 2,
        },
        waitUntil: run.waitUntilType ?? "undefined",
      };
      if (staticContext) {
        Object.assign(expectedBody, { staticContext: "staticContext" });
      }
      vitest.expect(body).toEqual(expectedBody);
      vitest.expect(response.headers.get("x-test-value")).toBe("universal-middleware");
      vitest.expect(response.headers.has("x-should-be-removed")).toBe(false);
      vitest.expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
      await test?.(response, body, run);
    });

    vitest.test("guarded route", { retry: 3, timeout: 30_000 }, async () => {
      const response = await fetch(`${host}${prefix ?? ""}/guarded`);
      const body = await response.text();
      vitest.expect(response.status).toBe(401);
      vitest.expect(body).toBe("Unauthorized");
    });

    vitest.test("throw early route", { retry: 3, timeout: 30_000 }, async () => {
      const response = await fetch(`${host}${prefix ?? ""}/throw-early`);
      const body = await response.text();
      vitest.expect(response.status).toBe(500);
      vitest.expect(body).toContain(run?.tests?.throwEarly?.expectedBody ?? "universal-middleware throw early test");
    });

    vitest.test("throw late route", { retry: 3, timeout: 30_000 }, async () => {
      const response = await fetch(`${host}${prefix ?? ""}/throw-late`);
      const body = await response.text();
      vitest.expect(response.status).toBe(500);
      vitest.expect(body).toContain(run?.tests?.throwLate?.expectedBody ?? "universal-middleware throw late test");
    });

    vitest.test("throw early and late route", { retry: 3, timeout: 30_000 }, async () => {
      const response = await fetch(`${host}${prefix ?? ""}/throw-early-and-late`);
      const body = await response.text();
      vitest.expect(response.status).toBe(500);
      vitest
        .expect(body)
        .toContain(run?.tests?.throwEarlyAndLate?.expectedBody ?? "universal-middleware throw early test");
    });

    vitest.test("route param handler", { retry: 3, timeout: 30_000 }, async () => {
      const response = await fetch(`${host}${prefix ?? ""}/user/magne4000`);
      const body = await response.text();
      vitest.expect(response.status).toBe(200);
      vitest.expect(body).toBe("User name is: magne4000");
    });

    vitest.test("404", { retry: 3, timeout: 30_000 }, async () => {
      const response = await fetch(`${host}${prefix ?? ""}/404`);
      vitest.expect(response.status).toBe(404);
    });

    if (testPost) {
      vitest.test("post", { retry: 3, timeout: 30_000 }, async () => {
        const response = await fetch(`${host}${prefix ?? ""}/post`, {
          method: "POST",
          body: JSON.stringify({ something: true }),
        });
        const body = JSON.parse(await response.text());
        vitest.expect(response.status).toBe(200);
        vitest.expect(body).toEqual({
          ok: true,
        });
      });
    }
  });
}

export const args = mri<{ port: string }>(
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  (globalThis as any).Deno?.args ?? globalThis.process.argv.slice(2),
);

// @ts-ignore
export const deno = typeof Deno !== "undefined";
// @ts-ignore
export const bun = typeof Bun !== "undefined";
