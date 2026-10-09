import { once } from "node:events";
import type { OutgoingHttpHeader, OutgoingHttpHeaders } from "node:http";
import { cancelReplacedBody } from "@universal-middleware/core";
import { responseAdapter, sendResponse, setResponseHeaders } from "@universal-middleware/node";
import { pendingMiddlewaresSymbol, wrappedResponseSymbol } from "./const.js";
import { setHead } from "./head.js";
import type { DecoratedServerResponse } from "./types.js";

export { responseAdapter, sendResponse };

type WriteCallback = (error?: Error | null) => void;

/** Routes the app's writes to `writer`. As a socket would, `write()` returns false once `writer` is full, then "drain" follows. */
function captureOutput(nodeResponse: DecoratedServerResponse, writer: WritableStreamDefaultWriter<Uint8Array>) {
  let draining = false;

  function capture(chunk: string | Uint8Array | undefined, encoding: BufferEncoding | undefined): Promise<void> {
    // The first write sends the head, whose hold runs the pending middlewares
    if (!nodeResponse.headersSent) nodeResponse.writeHead(nodeResponse.statusCode);
    const bytes = typeof chunk === "string" ? Buffer.from(chunk, encoding) : chunk;
    if (!bytes?.byteLength) return Promise.resolve();
    return writer.write(bytes).catch((error) => {
      // Writes after the capture was cancelled (the response was replaced) are dropped
      if (writer.desiredSize !== null) console.error(error);
    });
  }

  nodeResponse.write = (
    chunk: string | Uint8Array,
    encoding?: BufferEncoding | WriteCallback,
    callback?: WriteCallback,
  ) => {
    if (typeof encoding === "function") {
      callback = encoding;
      encoding = undefined;
    }
    capture(chunk, encoding).then(() => callback?.());
    const room = writer.desiredSize;
    if (room === null || room > 0) return true;
    if (!draining) {
      draining = true;
      const drain = () => {
        draining = false;
        nodeResponse.emit("drain");
      };
      writer.ready.then(drain, drain);
    }
    return false;
  };

  nodeResponse.end = (
    chunk?: string | Uint8Array | (() => void),
    encoding?: BufferEncoding | (() => void),
    callback?: () => void,
  ) => {
    if (typeof chunk === "function") {
      callback = chunk;
      chunk = undefined;
      encoding = undefined;
    } else if (typeof encoding === "function") {
      callback = encoding;
      encoding = undefined;
    }
    void capture(chunk, encoding);
    writer.close().catch(() => {});
    if (callback) nodeResponse.once("finish", callback);
    return nodeResponse;
  };
}

/** Holds the head back: the first call runs `onHead`, later ones no-op while the pending middlewares run */
function holdHead(nodeResponse: DecoratedServerResponse, onHead: () => void) {
  let held = false;

  nodeResponse.writeHead = (
    statusCode: number,
    statusMessage?: string | OutgoingHttpHeaders | OutgoingHttpHeader[],
    headers?: OutgoingHttpHeaders | OutgoingHttpHeader[],
  ) => {
    if (held) return nodeResponse;
    held = true;
    // What this call would have sent is what the pending middlewares get
    setHead(nodeResponse, statusCode, statusMessage, headers);
    onHead();
    return nodeResponse;
  };
}

export function wrapResponse(nodeResponse: DecoratedServerResponse, next?: (err?: unknown) => unknown) {
  if (nodeResponse[wrappedResponseSymbol]) return;
  nodeResponse[wrappedResponseSymbol] = true;

  const original = { write: nodeResponse.write, end: nodeResponse.end, writeHead: nodeResponse.writeHead };
  const send = { write: original.write.bind(nodeResponse), end: original.end.bind(nodeResponse) };
  // The app's output, held for the pending middlewares, fills up like the response's own buffer would
  let capture!: TransformStreamDefaultController<Uint8Array>;
  const captured = new TransformStream<Uint8Array, Uint8Array>(
    {
      start(controller) {
        capture = controller;
      },
    },
    new ByteLengthQueuingStrategy({ highWaterMark: nodeResponse.writableHighWaterMark || 16 * 1024 }),
  );
  const writer = captured.writable.getWriter();

  captureOutput(nodeResponse, writer);
  holdHead(nodeResponse, () => {
    triggerPendingMiddlewares().catch(console.error);
  });

  async function triggerPendingMiddlewares() {
    const middlewares = nodeResponse[pendingMiddlewaresSymbol];
    if (!middlewares) return;
    delete nodeResponse[pendingMiddlewaresSymbol];

    let response: Response;
    try {
      response = responseAdapter(nodeResponse, captured.readable);
      for (const middleware of middlewares) {
        const tmp = await middleware(response);
        cancelReplacedBody(response, tmp);
        // An undefined result keeps the Response
        if (tmp) response = tmp;
      }
    } catch (e) {
      // Errors both sides: aborting the writer would wait on a write that waits for a read nobody makes
      capture.error(e);
      // The app may be sending (its write ran the middlewares): what it already scheduled, such as its `end()`,
      // must reach the errored capture, not the error handler's response
      await new Promise((resolve) => setImmediate(resolve));
      Object.assign(nodeResponse, original);
      if (next) {
        next(e);
        return;
      }
      throw e;
    }

    setResponseHeaders(response, nodeResponse, true);
    nodeResponse.writeHead = original.writeHead;
    nodeResponse.flushHeaders();

    // Node discards a HEAD body, and an endless one (SSE, a proxied stream) would keep the response open
    const body = nodeResponse.req?.method === "HEAD" ? null : response.body;
    if (!body) {
      response.body?.cancel().catch(() => {});
      // The overrides stay, to drop what the app still writes
      if (!captured.readable.locked) captured.readable.cancel().catch(() => {});
      send.end();
      return;
    }

    // The body is cancelled when the client leaves, rather than read on: it may never end
    const gone = new AbortController();
    const onClose = () => gone.abort();
    nodeResponse.once("close", onClose);
    if (nodeResponse.destroyed) gone.abort();
    try {
      await body.pipeTo(
        new WritableStream({
          async write(chunk) {
            // Waits for the socket to drain, as `pipe()` does. Resolves when the client leaves: Node's `pipeTo`
            // doesn't cancel the body while the write it waits on rejects.
            if (!send.write(chunk)) await once(nodeResponse, "drain", { signal: gone.signal }).catch(() => {});
          },
          close() {
            send.end();
          },
          abort() {
            send.end();
          },
        }),
        { signal: gone.signal },
      );
    } catch (error) {
      if (gone.signal.aborted) return;
      throw error;
    } finally {
      nodeResponse.off("close", onClose);
    }
    nodeResponse.write = original.write;
    nodeResponse.end = original.end;
  }
}
