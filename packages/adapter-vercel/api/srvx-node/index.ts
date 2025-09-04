import { apply } from "@universal-middleware/srvx";
import { handlerRaw, middlewares } from "@universal-middleware/tests/utils";
import { createNodeHandler } from "../../src/srvx.js";

const app = apply([middlewares.contextSync, middlewares.updateHeaders, middlewares.contextAsync, handlerRaw]);

export default createNodeHandler(app);
