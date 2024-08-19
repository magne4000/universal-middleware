import {
  createHandler,
  createMiddleware,
  universalOnBeforeResponse,
} from "../src/index.js";
import { createApp, createRouter, toNodeListener, toWebHandler } from "h3";
import {
  args,
  bun,
  deno,
  handler,
  middlewares,
} from "@universal-middleware/tests";
import type { Get, UniversalMiddleware } from "@universal-middleware/core";

const app = createApp({
  onBeforeResponse: universalOnBeforeResponse,
});

middlewares.forEach((middleware) =>
  app.use(createMiddleware(middleware as Get<[], UniversalMiddleware>)()),
);

const router = createRouter();

router.get("/", createHandler(handler)());

app.use(router);

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
    toWebHandler(app),
  );
} else if (!bun) {
  const { createServer } = await import("node:http");
  createServer(toNodeListener(app)).listen(port, "localhost", () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

// Bun
export default {
  port,
  fetch: toWebHandler(app),
};