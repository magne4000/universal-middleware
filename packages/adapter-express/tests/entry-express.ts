import { createHandler, createMiddleware } from "../src/index.js";
import express from "express";
import mri from "mri";
import helmet from "helmet";

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

const app = express();

// standard express middleware
app.use(helmet());

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
app.use(
  createHandler((_request, context) => {
    return new Response(JSON.stringify(context, null, 2), {
      headers: {
        "x-should-be-removed": "universal-middleware",
      },
    });
  }),
);

const port = args.port ? parseInt(args.port) : 3000;

app.listen(port, "localhost", () => {
  console.log(`Server listening on http://localhost:${port}`);
});
