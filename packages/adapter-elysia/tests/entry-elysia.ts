import { args } from "@universal-middleware/tests";
import { Elysia } from "elysia";
import { app } from "./elysia";

const port = args.port ? Number.parseInt(args.port, 10) : 3000;

new Elysia({ aot: false }).use(app).listen(port);
