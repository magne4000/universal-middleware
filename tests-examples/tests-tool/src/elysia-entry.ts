import handler from "@universal-middleware-examples/tool/dummy-handler-elysia";
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-elysia";
import headersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-elysia";
import paramsHandler from "@universal-middleware-examples/tool/params-handler-elysia";
import compress from "@universal-middleware/compress/elysia";
import Elysia from "elysia";
import { args } from "./utils";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sendBigFile } from "@universal-middleware/tests/utils-node";
import { createHandler } from "@universal-middleware/elysia";

const _dirname = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));

const port = args.port ? Number.parseInt(args.port) : 3000;

new Elysia()
  .use(contextMiddleware("World!!!"))
  .use(headersMiddleware())
  .use(compress())
  .get("/user/:name", paramsHandler())
  .get("/big-file", createHandler(sendBigFile)())
  .get("/", handler())
  .listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
