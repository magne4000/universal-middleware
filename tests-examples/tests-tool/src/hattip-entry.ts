import { createRouter } from "@hattip/router";
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-hattip";
import headersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-hattip";
import handler from "@universal-middleware-examples/tool/dummy-handler-hattip";
import { createServer } from "@hattip/adapter-node";
import { args } from "./utils";

const app = createRouter();

app.use(contextMiddleware("something"));
app.use(headersMiddleware());
app.get("/", handler());

const hattipHandler = app.buildHandler();

const port = args.port ? parseInt(args.port) : 3000;

createServer(hattipHandler).listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
