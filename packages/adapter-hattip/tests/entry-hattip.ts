import { args, bun, deno } from "@universal-middleware/tests";
import hattipHandler from "./hattip";

const port = args.port ? Number.parseInt(args.port, 10) : 3000;

let bunHandler: unknown;
if (deno) {
  const { createServeHandler } = await import("@hattip/adapter-deno");
  // @ts-expect-error Deno
  Deno.serve(
    {
      port,
      onListen() {
        console.log(`Server listening on http://localhost:${port}`);
      },
    },
    createServeHandler(hattipHandler),
  );
} else if (!bun) {
  const { createServer } = await import("@hattip/adapter-node");
  createServer(hattipHandler).listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
} else {
  const bunAdapter = await import("@hattip/adapter-bun");
  bunHandler = bunAdapter.default(hattipHandler, {
    port,
  } as import("@hattip/adapter-bun").BunAdapterOptions);
}

// Bun
export default bunHandler;
