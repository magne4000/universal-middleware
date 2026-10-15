import { createReadStream } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { enhance, type Get, type UniversalHandler } from "@universal-middleware/core";

const _dirname = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));

export const sendBigFile: Get<[], UniversalHandler> = () =>
  enhance(
    () => {
      const webStream = Readable.toWeb(createReadStream(join(_dirname, "..", "big-file.txt"), "utf-8"), {
        // Avoids error "The argument 'size' is invalid. Received NaN"
        // See https://github.com/nodejs/node/issues/58397#issuecomment-2896460105
        strategy: new CountQueuingStrategy({ highWaterMark: 16 }),
      }) as unknown as ReadableStream<Uint8Array>;

      return new Response(webStream, {
        headers: {
          "content-type": "text/plain; charset=utf-8",
        },
        status: 200,
      });
    },
    {
      path: "/big-file",
      method: "GET",
    },
  );

/** POSTs `body` to `listener` on a Node server that reads it into `req.rawBody` first, as Google Cloud Functions do */
export async function postWithRawBody(listener: (req: IncomingMessage, res: ServerResponse) => unknown, body: string) {
  const server = createServer((req: IncomingMessage & { rawBody?: Buffer }, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      req.rawBody = Buffer.concat(chunks);
      listener(req, res);
    });
  });
  const { promise, resolve } = Promise.withResolvers<void>();
  server.listen(0, "127.0.0.1", resolve);
  await promise;
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/`, {
      method: "POST",
      body,
    });
    return { status: response.status, body: await response.text() };
  } finally {
    server.closeAllConnections();
    server.close();
  }
}
