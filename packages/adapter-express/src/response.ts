import type { ServerResponse } from "node:http";
import { Readable } from "node:stream";
import type { ReadableStream as ReadableStreamNode } from "node:stream/web";
import { nodeHeadersToWeb } from "@universal-middleware/core";
import {
  type DecoratedServerResponse,
  pendingMiddlewaresSymbol,
  pendingWritesSymbol,
  wrappedResponseSymbol,
} from "./common.js";

// @ts-ignore
const deno = typeof Deno !== "undefined";

/**
 * Send a fetch API Response into a Node.js HTTP response stream.
 */
export async function sendResponse(fetchResponse: Response, nodeResponse: DecoratedServerResponse): Promise<void> {
  const fetchBody: unknown = fetchResponse.body;

  let body: Readable | null = null;
  if (!fetchBody) {
    body = null;
  } else if (typeof (fetchBody as any).pipe === "function") {
    body = fetchBody as Readable;
  } else if (typeof (fetchBody as any).pipeTo === "function") {
    if (!deno && Readable.fromWeb) {
      body = Readable.fromWeb(fetchBody as ReadableStreamNode);
    } else {
      const reader = (fetchBody as ReadableStream).getReader();
      body = new Readable({
        async read() {
          const { done, value } = await reader.read();
          this.push(done ? null : value);
        },
      });
    }
  } else if (fetchBody) {
    body = Readable.from(fetchBody as any);
  }

  setHeaders(fetchResponse, nodeResponse);

  if (body) {
    body.pipe(nodeResponse);
    await new Promise((resolve, reject) => {
      body.on("error", reject);
      nodeResponse.on("finish", resolve);
      nodeResponse.on("error", reject);
    });
  } else {
    nodeResponse.setHeader("content-length", "0");
    nodeResponse.end();
  }
}

function createTransformStream(): TransformStream<Uint8Array | string | Buffer, Uint8Array> {
  const textEncoder = new TextEncoder();
  return new TransformStream({
    transform(chunk, controller) {
      if (typeof chunk === "string") {
        controller.enqueue(textEncoder.encode(chunk));
      } else if (chunk instanceof Uint8Array) {
        controller.enqueue(chunk);
      } else {
        controller.enqueue(new Uint8Array(chunk));
      }
    },
  });
}

function override<T extends DecoratedServerResponse>(
  nodeResponse: T,
  key: keyof T,
  forwardTo: WritableStreamDefaultWriter<Uint8Array | string | Buffer>,
) {
  const original: any = nodeResponse[key];

  (nodeResponse as any)[key] = (...args: any) => {
    // console.log("called", key, args);
    if (!nodeResponse.headersSent) {
      nodeResponse.writeHead(nodeResponse.statusCode);
    }
    // if (forwardTo?.closed) return original.apply(nodeResponse, args);
    if (args[0] && args[0].length > 0) {
      // console.log("write", args[0]);
      forwardTo.write(args[0]).catch(console.error);
    }
    if (key === "end" && !forwardTo.closed) {
      // console.log("end");
      forwardTo.close().catch(console.error);
    }
    return true;
  };

  return {
    original(...args: any[]) {
      // console.log("original", key, args);
      original.apply(nodeResponse, args);
    },
    restore() {
      nodeResponse[key] = original;
    },
  };
}

function overrideWriteHead<T extends DecoratedServerResponse>(nodeResponse: T, callback: () => Promise<unknown>) {
  const original = nodeResponse.writeHead;

  nodeResponse.writeHead = (...args) => {
    // console.log("called", "writeHead", args);
    const p = callback();
    nodeResponse[pendingWritesSymbol] ??= [];
    nodeResponse[pendingWritesSymbol].push(p);
    p.then(() => {
      if (nodeResponse.headersSent) {
        // console.log("writeHead", args);
        return nodeResponse;
      }
      original.apply(nodeResponse, args as any);
    });

    return nodeResponse;
  };

  return {
    original(...args: any) {
      // console.log("original writeHead", args);
      original.apply(nodeResponse, args);
    },
    restore() {
      nodeResponse.writeHead = original;
    },
  };
}

export function wrapResponse(nodeResponse: DecoratedServerResponse) {
  if (nodeResponse[wrappedResponseSymbol]) return;
  nodeResponse[wrappedResponseSymbol] = true;

  const body = createTransformStream();
  const writer = body.writable.getWriter();
  const [reader1, reader2] = body.readable.tee();

  let readableToOriginal = reader2;

  const restore = [
    override(nodeResponse, "write", writer),
    override(nodeResponse, "end", writer),
    overrideWriteHead(nodeResponse, triggerPendingMiddlewares),
  ] as const;
  let resolve: () => void;
  // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
  const pendingResponse: Promise<void> = new Promise((r) => (resolve = r));

  async function triggerPendingMiddlewares() {
    if (nodeResponse[pendingMiddlewaresSymbol]) {
      const middlewares = nodeResponse[pendingMiddlewaresSymbol];
      delete nodeResponse[pendingMiddlewaresSymbol];
      let response = await middlewares.reduce(
        async (prev, curr) => curr(await prev),
        Promise.resolve(
          new Response(reader1, {
            status: nodeResponse.statusCode,
            statusText: nodeResponse.statusMessage,
            headers: nodeHeadersToWeb(nodeResponse.getHeaders()),
          }),
        ),
      );

      if (response.body && response.body !== reader1) {
        // console.log("tee");
        const [body1, body2] = response.body.tee();
        response = new Response(body1, response);
        readableToOriginal = body2;
      }

      setHeaders(response, nodeResponse, true);

      nodeResponse.flushHeaders();

      const wait = readableToOriginal.pipeTo(
        new WritableStream({
          write(chunk) {
            Promise.all(nodeResponse[pendingWritesSymbol] ?? []).then(() => {
              restore[0].original(chunk);
            });
          },
          close() {
            Promise.all(nodeResponse[pendingWritesSymbol] ?? []).then(() => {
              restore[1].original();
            });
          },
        }),
      );

      // console.log("close");
      await Promise.all([wait, writer.close()]);
      // console.log("closed");

      resolve();
      // biome-ignore lint/complexity/noForEach: <explanation>
      restore.forEach((r) => r.restore());
    } else {
      // console.log("pendingResponse");
      await pendingResponse;
      // console.log("pendingResponse DONE");
    }
  }
}

function setHeaders(fetchResponse: Response, nodeResponse: ServerResponse, mirror = false) {
  nodeResponse.statusCode = fetchResponse.status;
  if (fetchResponse.statusText) {
    nodeResponse.statusMessage = fetchResponse.statusText;
  }

  const nodeResponseHeaders = new Set(Object.keys(nodeResponse.getHeaders()));

  const setCookie = fetchResponse.headers.getSetCookie();
  for (const cookie of setCookie) {
    nodeResponse.appendHeader("set-cookie", cookie);
  }

  fetchResponse.headers.forEach((value, key) => {
    nodeResponseHeaders.delete(key);
    if (key === "set-cookie") return;
    nodeResponse.setHeader(key, value);
  });

  if (mirror) {
    // delete remaining node headers
    // biome-ignore lint/complexity/noForEach: <explanation>
    nodeResponseHeaders.forEach((key) => nodeResponse.removeHeader(key));
  }
}
