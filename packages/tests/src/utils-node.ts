import { createReadStream } from "node:fs";
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
