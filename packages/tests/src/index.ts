import { kill } from "zx";
import { type ChildProcess, spawn } from "node:child_process";
import waitPort from "wait-port";
import type {
  Get,
  UniversalHandler,
  UniversalMiddleware,
} from "@universal-middleware/core";
import { getContext, setContext } from "@universal-middleware/core";
import mri from "mri";

export interface Run {
  name: string;
  command: string;
  port: number;
}

export interface Options {
  vitest: typeof import("vitest");
  test?: (response: Response) => void | Promise<void>;
}

interface Context {
  something?: Record<string, unknown>;
  somethingElse?: Record<string, unknown>;
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
        const text = await response.text();
        options.vitest.expect(response.status).toBe(200);
        options.vitest.expect(JSON.parse(text)).toEqual({
          something: {
            a: 1,
          },
          somethingElse: {
            b: 2,
          },
        });
        options.vitest
          .expect(response.headers.get("x-test-value"))
          .toBe("universal-middleware");
        options.vitest
          .expect(response.headers.has("x-should-be-removed"))
          .toBe(false);
        await options?.test?.(response);
      },
      30_000,
    );
  });
}

export const middlewares: Get<[], UniversalMiddleware<Context>>[] = [
  // universal middleware that updates the context synchronously
  () => (request) => {
    setContext(request, "something", {
      a: 1,
      c: 3,
    });
  },
  // universal middleware that update the response headers asynchronously
  () => (_request) => {
    return async (response) => {
      response.headers.set("x-test-value", "universal-middleware");
      response.headers.delete("x-should-be-removed");

      await new Promise((resolve) => setTimeout(resolve, 1000));

      return response;
    };
  },
  // universal middleware that updates the context asynchronously
  () => async (request) => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    setContext(request, "somethingElse", {
      b: 2,
    });

    delete getContext(request).something!.c;
  },
];

export const handler: Get<[], UniversalHandler> = () => (request) => {
  return new Response(JSON.stringify(getContext(request), null, 2), {
    headers: {
      "x-should-be-removed": "universal-middleware",
    },
  });
};

export const args = mri<{ port: string }>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).Deno?.args ?? globalThis.process.argv.slice(2),
);

// @ts-ignore
export const deno = typeof Deno !== "undefined";
// @ts-ignore
export const bun = typeof Bun !== "undefined";
