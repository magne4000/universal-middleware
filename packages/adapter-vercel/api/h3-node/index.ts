import { createHandler, createMiddleware } from "@universal-middleware/h3";
import { handler, middlewares } from "@universal-middleware/tests/utils";
import { H3 } from "h3";
import { createNodeHandler } from "../../src/h3.js";

const app = new H3();

app.use(createMiddleware(() => middlewares.contextSync)());
app.use(createMiddleware(() => middlewares.updateHeaders)());
app.use(createMiddleware(() => middlewares.contextAsync)());
app.use(createHandler(handler)());

export default createNodeHandler(app);
