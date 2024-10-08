import handler from "@universal-middleware-examples/tool/dummy-handler-elysia";
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-elysia";
import headersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-elysia";
import paramsHandler from "@universal-middleware-examples/tool/params-handler-elysia";
import Elysia from "elysia";
import { args } from "./utils";

const port = args.port ? Number.parseInt(args.port) : 3000;

new Elysia()
  .use(contextMiddleware("World!!!"))
  .use(headersMiddleware())
  .get("/user/:name", paramsHandler())
  .get("/", handler())
  .listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
