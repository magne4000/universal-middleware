import { responseAdapter, sendResponse, setResponseHeaders } from "@universal-middleware/node";
import { pendingMiddlewaresSymbol, wrappedResponseSymbol } from "./const.js";
import type { DecoratedServerResponse } from "./types.js";

export { responseAdapter, sendResponse };

function createTransformStream() {
  const textEncoder = new TextEncoder();
  return new TransformStream<Uint8Array | string | Buffer, Uint8Array>({
    transform(chunk, ctrl) {
      if (typeof chunk === "string") {
        ctrl.enqueue(textEncoder.encode(chunk));
      } else if (chunk instanceof Uint8Array) {
        ctrl.enqueue(chunk);
      } else {
        ctrl.enqueue(new Uint8Array(chunk));
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
    if (args[0] && args[0].length > 0) {
      // console.log("write", args[0]);
      forwardTo.write(args[0]).catch(console.error);
    }
    if (key === "end") {
      // console.log("end");
      forwardTo.close().catch(() => {});
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
  let alreadyCalled = false;

  // Upon first call to `writeHead`, trigger pending middlewares
  // Upon further call while pending middlewares are still running, it should no-op
  nodeResponse.writeHead = () => {
    if (!alreadyCalled) {
      callback().catch(console.error);
      alreadyCalled = true;
    }

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

export function wrapResponse(nodeResponse: DecoratedServerResponse, next?: (err?: unknown) => unknown) {
  if (nodeResponse[wrappedResponseSymbol]) return;
  nodeResponse[wrappedResponseSymbol] = true;

  const body = createTransformStream();
  const writer = body.writable.getWriter();
  const [reader1, reader2] = body.readable.tee();

  const original = {
    write: override(nodeResponse, "write", writer),
    end: override(nodeResponse, "end", writer),
    writeHead: overrideWriteHead(nodeResponse, triggerPendingMiddlewares),
  } as const;

  async function triggerPendingMiddlewares() {
    if (!nodeResponse[pendingMiddlewaresSymbol]) {
      return;
    }
    const middlewares = nodeResponse[pendingMiddlewaresSymbol];
    delete nodeResponse[pendingMiddlewaresSymbol];
    let response: Response | undefined;
    try {
      response = responseAdapter(nodeResponse, reader1);
      for (const middleware of middlewares) {
        const tmp = await middleware(response);
        // Do not hard-fail when encountering an undefined Response
        if (tmp) response = tmp;
      }
    } catch (e) {
      response = undefined;
      await writer.abort();
      original.writeHead.restore();
      original.write.restore();
      original.end.restore();
      if (next) {
        next(e);
      } else {
        throw e;
      }
    }

    if (!response) return;

    const readableToOriginal = response.body ?? reader2;

    setResponseHeaders(response, nodeResponse, true);
    original.writeHead.restore();
    nodeResponse.flushHeaders();

    const wait = readableToOriginal.pipeTo(
      new WritableStream({
        write(chunk) {
          original.write.original(chunk);
        },
        close() {
          original.end.original();
        },
        abort() {
          original.end.original();
        },
      }),
    );

    await wait;
    original.write.restore();
    original.end.restore();
  }
}
