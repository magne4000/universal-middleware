import { kill } from "zx";
import { type ChildProcess, spawn } from "node:child_process";
import waitPort from "wait-port";
import mri from "mri";

export interface Run {
  name: string;
  command: string;
  port: number;
  waitUntilType?: "undefined" | "function";
}

export interface Options {
  vitest: typeof import("vitest");
  test?: (
    response: Response,
    body: Record<string, unknown>,
    run: Run,
  ) => void | Promise<void>;
  testPost?: boolean;
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
  options.vitest.describe.concurrent.each(runs)("$name", (run) => {
    let server: ChildProcess | undefined = undefined;
    const { command, port } = run;
    let host = `http://localhost:${port}`;

    options.vitest.beforeAll(async () => {
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
    }, 30_000);

    options.vitest.afterAll(async () => {
      const pid = server?.pid;
      if (typeof pid === "number") {
        await kill(pid, "SIGKILL").finally(() => {
          server = undefined;
        });
      }
    }, 30_000);

    options.vitest.test(
      "middlewares",
      async () => {
        const response = await fetch(host);
        const body = JSON.parse(await response.text());
        options.vitest.expect(response.status).toBe(200);
        options.vitest.expect(body).toEqual({
          something: {
            a: 1,
          },
          somethingElse: {
            b: 2,
          },
          waitUntil: run.waitUntilType ?? "undefined",
        });
        options.vitest
          .expect(response.headers.get("x-test-value"))
          .toBe("universal-middleware");
        options.vitest
          .expect(response.headers.has("x-should-be-removed"))
          .toBe(false);
        options.vitest
          .expect(response.headers.get("content-type"))
          .toBe("application/json; charset=utf-8");
        await options?.test?.(response, body, run);
      },
      30_000,
    );

    if (options?.testPost) {
      options.vitest.test(
        "post",
        async () => {
          const response = await fetch(`${host}/post`, {
            method: "POST",
            body: JSON.stringify({ something: true }),
          });
          const body = JSON.parse(await response.text());
          options.vitest.expect(response.status).toBe(200);
          options.vitest.expect(body).toEqual({
            ok: true,
          });
        },
        30_000,
      );
    }
  });
}

export const args = mri<{ port: string }>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).Deno?.args ?? globalThis.process.argv.slice(2),
);

// @ts-ignore
export const deno = typeof Deno !== "undefined";
// @ts-ignore
export const bun = typeof Bun !== "undefined";
