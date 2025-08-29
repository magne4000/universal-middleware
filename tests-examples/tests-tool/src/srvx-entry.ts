import compress from "@universal-middleware/compress/srvx";
import { enhance } from "@universal-middleware/core";
import { apply, createHandler } from "@universal-middleware/srvx";
import { sendBigFile } from "@universal-middleware/tests/utils-node";
import handler from "@universal-middleware-examples/tool/dummy-handler-srvx";
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-srvx";
import headersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-srvx";
import paramsHandler from "@universal-middleware-examples/tool/params-handler-srvx";

import { serve } from "srvx";
import { args } from "./utils";

const port = args.port ? Number.parseInt(args.port, 10) : 3000;

const server = serve({
  port,
  fetch: apply([
    contextMiddleware("World!!!"),
    headersMiddleware(),
    compress(),
    enhance(paramsHandler(), {
      name: "paramsHandler",
      path: "/user/:name",
      method: "GET",
    }),
    enhance(createHandler(sendBigFile)(), {
      name: "sendBigFile",
      path: "/big-file",
      method: "GET",
    }),
    enhance(handler(), {
      name: "handler",
      path: "/",
      method: "GET",
    }),
  ]),
  error() {
    return new Response("Internal Server Error", {
      status: 500,
    });
  },
});

await server.ready();
console.log(`Server listening on http://localhost:${port}`);
