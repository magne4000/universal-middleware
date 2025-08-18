import { createServer } from "@hattip/adapter-node";
import { createRouter } from "@hattip/router";
import handler from "@universal-middleware-examples/tool/dummy-handler-hattip";
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-hattip";
import headersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-hattip";
import paramsHandler from "@universal-middleware-examples/tool/params-handler-hattip";
import compress from "@universal-middleware/compress/hattip";
import { args } from "./utils";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sendBigFile } from "@universal-middleware/tests/utils-node";
import { createHandler } from "@universal-middleware/hattip";

const _dirname = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));

const app = createRouter();

// Now the universal context contains `{ hello: "World!!!" }`.
// See /examples/context-middleware
app.use(contextMiddleware("World!!!"));

// After a Response has been returned by the handler below,
// the `{ "X-Universal-Hello": "World!!!" }` header is appended to it
app.use(headersMiddleware());

app.use(compress());

app.get("/user/:name", paramsHandler());

app.get("/big-file", createHandler(sendBigFile)());

app.get("/", handler());

const hattipHandler = app.buildHandler();

const port = args.port ? Number.parseInt(args.port, 10) : 3000;

createServer(hattipHandler).listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
