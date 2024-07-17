import { createHandler, createMiddleware } from "../src/index.js";
import { cors } from "@hattip/cors";
import {
  args,
  bun,
  deno,
  handler,
  middlewares,
} from "@universal-middleware/tests";
import { createRouter } from "@hattip/router";

const app = createRouter();

// standard hattip middleware
app.use(cors());

middlewares.forEach((middleware) => app.use(createMiddleware(middleware)()));

// universal handler
app.get("/", createHandler(handler)());

const hattipHandler = app.buildHandler();

const port = args.port ? parseInt(args.port) : 3000;

let bunHandler: unknown;
if (deno) {
  const { createServeHandler } = await import("@hattip/adapter-deno");
  // @ts-ignore
  Deno.serve(
    {
      port,
      onListen() {
        console.log(`Server listening on http://localhost:${port}`);
      },
    },
    createServeHandler(hattipHandler),
  );
} else if (!bun) {
  const { createServer } = await import("@hattip/adapter-node");
  createServer(hattipHandler).listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
} else {
  const bunAdapter = await import("@hattip/adapter-bun");
  bunHandler = bunAdapter.default(hattipHandler, {
    port,
  });
}

// Bun
export default bunHandler;
