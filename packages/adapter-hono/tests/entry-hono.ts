import { createHandler, createMiddleware } from "../src/index.js";
import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import mri from "mri";

// @ts-ignore
const deno = typeof Deno !== "undefined";
// @ts-ignore
const bun = typeof Bun !== "undefined";

declare global {
  namespace Universal {
    interface Context {
      something?: Record<string, unknown>;
      somethingElse?: Record<string, unknown>;
    }
  }
}

const args = mri<{ port: string }>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).Deno?.args ?? globalThis.process.argv.slice(2),
);

const app = new Hono();

// standard Hono middleware
app.use(secureHeaders());

// universal middleware that updates the context synchronously
app.use(
  createMiddleware((_request, context) => {
    context.something = {
      a: 1,
      c: 3,
    };
  }),
);

// universal middleware that update the response headers asynchronously
app.use(
  createMiddleware((_request, _context) => {
    return async (response) => {
      response.headers.set("x-test-value", "universal-middleware");
      response.headers.delete("x-should-be-removed");

      await new Promise((resolve) => setTimeout(resolve, 1000));

      return response;
    };
  }),
);

// universal middleware that updates the context asynchronously
app.use(
  createMiddleware(async (_request, context) => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    context.somethingElse = {
      b: 2,
    };
    delete context.something!.c;
  }),
);

// universal handler
app.get(
  "/",
  createHandler((_request, context) => {
    return new Response(JSON.stringify(context, null, 2), {
      headers: {
        "x-should-be-removed": "universal-middleware",
      },
    });
  }),
);

const port = args.port ? parseInt(args.port) : 3000;

if (deno) {
  // @ts-ignore
  Deno.serve(
    {
      port,
      onListen() {
        console.log(`Server listening on http://localhost:${port}`);
      },
    },
    app.fetch,
  );
} else if (!bun) {
  const { serve } = await import("@hono/node-server");
  serve(
    {
      fetch: app.fetch,
      port,
    },
    () => {
      console.log(`Server listening on http://localhost:${port}`);
    },
  );
}

// Bun
export default {
  port,
  fetch: app.fetch,
};
