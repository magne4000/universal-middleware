import { createServer } from "node:http";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import installCrypto from "@hattip/polyfills/crypto";
import installGetSetCookie from "@hattip/polyfills/get-set-cookie";
import installWhatwgNodeFetch from "@hattip/polyfills/whatwg-node";
import {
  createApp,
  createRouter,
  eventHandler,
  fromNodeMiddleware,
  setResponseStatus,
  toNodeListener,
} from "h3";
import serveStatic from "serve-static";

installWhatwgNodeFetch();
installGetSetCookie();
installCrypto();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isProduction = process.env.NODE_ENV === "production";
const root = __dirname;
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
// const hmrPort = process.env.HMR_PORT
//   ? parseInt(process.env.HMR_PORT, 10)
//   : 24678;

startServer();

async function startServer() {
  const app = createApp();

  if (isProduction) {
    app.use("/", fromNodeMiddleware(serveStatic(`${root}/dist/client`)));
  } else {
    // // Instantiate Vite's development server and integrate its middleware to our server.
    // // ⚠️ We should instantiate it *only* in development. (It isn't needed in production
    // // and would unnecessarily bloat our server in production.)
    // const vite = await import("vite");
    // const viteDevMiddleware = (
    //   await vite.createServer({
    //     root,
    //     server: { middlewareMode: true, hmr: { port: hmrPort } },
    //   })
    // ).middlewares;
    // app.use(fromNodeMiddleware(viteDevMiddleware));
  }

  const router = createRouter();

  router.use(
    "/**",
    eventHandler(async (event) => {
      setResponseStatus(event, 200);

      return "OK";
    }),
  );

  app.use(router);

  const server = createServer(toNodeListener(app)).listen(port);

  server.on("listening", () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}
