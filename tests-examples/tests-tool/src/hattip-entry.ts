import { createRouter } from "@hattip/router";
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-hattip";
import headersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-hattip";
import handler from "@universal-middleware-examples/tool/dummy-handler-hattip";
import { createServer } from "@hattip/adapter-node";
import { args } from "./utils";

const app = createRouter();

// Now the universal context contains `{ hello: "World!!!" }`.
// See /examples/context-middleware
app.use(contextMiddleware("World!!!"));

// After a Response has been returned by the handler below,
// the `{ "X-Universal-Hello": "World!!!" }` header is appended to it
app.use(headersMiddleware());

app.get("/", handler());

const hattipHandler = app.buildHandler();

const port = args.port ? Number.parseInt(args.port) : 3000;

createServer(hattipHandler).listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
