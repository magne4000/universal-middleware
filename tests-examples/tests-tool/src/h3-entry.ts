import handler from "@universal-middleware-examples/tool/dummy-handler-h3";
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-h3";
import headersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-h3";
import paramsHandler from "@universal-middleware-examples/tool/params-handler-h3";
import { universalOnBeforeResponse } from "@universal-middleware/h3";
import { createApp, createRouter, toNodeListener } from "h3";
import { args } from "./utils";

const app = createApp({
  // /!\ This is required for universal-middleware to operate properly
  onBeforeResponse: universalOnBeforeResponse,
});

// Now the universal context contains `{ hello: "World!!!" }`.
// See /examples/context-middleware
app.use(contextMiddleware("World!!!"));

// After a Response has been returned by the handler below,
// the `{ "X-Universal-Hello": "World!!!" }` header is appended to it
app.use(headersMiddleware());

const router = createRouter();

router.get("/user/:name", paramsHandler());

router.get("/", handler());

app.use(router);

const port = args.port ? Number.parseInt(args.port) : 3000;

const { createServer } = await import("node:http");
createServer(toNodeListener(app)).listen(port, "localhost", () => {
  console.log(`Server listening on http://localhost:${port}`);
});
