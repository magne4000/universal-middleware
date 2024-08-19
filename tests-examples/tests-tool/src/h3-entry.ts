import { createApp, createRouter, toNodeListener } from "h3";
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-h3";
import headersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-h3";
import handler from "@universal-middleware-examples/tool/dummy-handler-h3";
import { universalOnBeforeResponse } from "@universal-middleware/h3";
import { args } from "./utils";

const app = createApp({
  onBeforeResponse: universalOnBeforeResponse,
});

app.use(contextMiddleware("something"));
app.use(headersMiddleware());

const router = createRouter();

router.get("/", handler());

app.use(router);

const port = args.port ? parseInt(args.port) : 3000;

const { createServer } = await import("node:http");
createServer(toNodeListener(app)).listen(port, "localhost", () => {
  console.log(`Server listening on http://localhost:${port}`);
});
