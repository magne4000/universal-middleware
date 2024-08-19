import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-fastify";
import headersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-fastify";
import handler from "@universal-middleware-examples/tool/dummy-handler-fastify";
import fastify from "fastify";
import { args } from "./utils";

const app = fastify();

app.register(contextMiddleware("something"));
app.register(headersMiddleware());
app.get("/", handler());

const port = args.port ? parseInt(args.port) : 3000;

app.listen(
  {
    port,
    host: "localhost",
  },
  () => {
    console.log(`Server listening on http://localhost:${port}`);
  },
);
