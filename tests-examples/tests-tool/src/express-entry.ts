import handler from "@universal-middleware-examples/tool/dummy-handler-express";
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-express";
import headersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-express";
import paramsHandler from "@universal-middleware-examples/tool/params-handler-express";
import compress from "@universal-middleware/compress/express";
import express from "express";
import { args } from "./utils";
import { sendBigFile } from "@universal-middleware/tests/utils-node";
import { createHandler } from "@universal-middleware/express";

const app = express();

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

const port = args.port ? Number.parseInt(args.port, 10) : 3000;

app.listen(port, "localhost", () => {
  console.log(`Server listening on http://localhost:${port}`);
});
