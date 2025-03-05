import { Readable } from "node:stream";
import { createReadStream } from "node:fs";
import { dirname, join } from "node:path";
import { enhance, type Get, type UniversalHandler } from "@universal-middleware/core";
import { fileURLToPath } from "node:url";

const _dirname = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));

export const sendBigFile: Get<[], UniversalHandler> = () =>
  enhance(
    () => {
      const webStream = Readable.toWeb(
        createReadStream(join(_dirname, "..", "big-file.txt"), "utf-8"),
      ) as unknown as ReadableStream<Uint8Array>;

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
