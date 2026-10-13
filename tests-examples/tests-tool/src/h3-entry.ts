import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import compress from "@universal-middleware/compress/h3";
import { createHandler } from "@universal-middleware/h3";
import { sendBigFile } from "@universal-middleware/tests/utils-node";
import handler from "@universal-middleware-examples/tool/dummy-handler-h3";
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-h3";
import headersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-h3";
import paramsHandler from "@universal-middleware-examples/tool/params-handler-h3";
import { H3 } from "h3";
import { toNodeHandler } from "h3/node";
import { args } from "./utils";

const _dirname = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));

const app = new H3();

// Now the universal context contains `{ hello: "World!!!" }`.
// See /examples/context-middleware
app.use(contextMiddleware("World!!!"));

// After a Response has been returned by the handler below,
// the `{ "X-Universal-Hello": "World!!!" }` header is appended to it
app.use(headersMiddleware());

app.use(compress());

const router = new H3();

router.get("/user/:name", paramsHandler());

router.get("/big-file", createHandler(sendBigFile)());

router.get("/", handler());

app.use(router);

const port = args.port ? Number.parseInt(args.port, 10) : 3000;

const { createServer } = await import("node:http");
createServer(toNodeHandler(app)).listen(port, "localhost", () => {
  console.log(`Server listening on http://localhost:${port}`);
});
