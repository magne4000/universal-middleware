import { args } from "@universal-middleware/tests";
import { app } from "./elysia";

const port = args.port ? Number.parseInt(args.port) : 3000;

app.listen(port);
