import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-express";
import headersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-express";
import handler from "@universal-middleware-examples/tool/dummy-handler-express";
import express from "express";
import { args } from "./utils";

const app = express();

app.use(contextMiddleware("something"));
app.use(headersMiddleware());
app.get("/", handler());

const port = args.port ? parseInt(args.port) : 3000;

app.listen(port, "localhost", () => {
  console.log(`Server listening on http://localhost:${port}`);
});
