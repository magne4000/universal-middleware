import { handler, middlewares } from "@universal-middleware/tests/utils";
import Fastify from "fastify";
import { createHandler, createMiddleware } from "@universal-middleware/fastify";
import { createNodeHandler } from "../../../src/fastify.js";

const app = Fastify();

app.register(createMiddleware(() => middlewares.guard)());
app.register(createMiddleware(() => middlewares.contextSync)());
app.register(createMiddleware(() => middlewares.updateHeaders)());
app.register(createMiddleware(() => middlewares.contextAsync)());
app.get("/*", createHandler(handler)());

export default createNodeHandler(app);
