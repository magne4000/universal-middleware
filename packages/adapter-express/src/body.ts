import type { ServerResponse } from "node:http";
import { requestSymbol } from "./const.js";
import type { DecoratedRequest } from "./types.js";

// A body bigger than this isn't handed back: a middleware may stream a large upload,
// and keeping it would hold all of it in memory. Body parsers refuse bodies this size by default.
const MAX_LENT_BYTES = 1024 * 1024;

// The lend is kept on the request, so a request whose body nobody reads costs no map entry
const lentSymbol = Symbol("universal-middleware.lentBody");
type LentRequest = DecoratedRequest & { [lentSymbol]?: LentBody };

/**
 * Create the `Request` for `req`, whose body reads the Node request lazily and without ending it,
 * so that `handBodyBack` can put the bytes the middleware read back for the next Express handler.
 */
export function adaptLendingBody(
  adapt: (req: DecoratedRequest, res: ServerResponse) => Request,
  req: LentRequest,
  res: ServerResponse,
): Request {
  // GET and HEAD have no body, as in `convertBody` of `@universal-middleware/node`
  if (req.method === "GET" || req.method === "HEAD") return adapt(req, res);
  // the body is already in `rawBody` (set by environments that parse it before Express, e.g. Google Cloud Functions)
  // `readableEnded`: a body parser such as `express.json()` consumed the stream, so a lend would read an empty body
  if (req.rawBody !== undefined || req.readableEnded) {
    // the same goes for a lend an earlier middleware left unread: the next `Request` gets the parsed body instead
    if (req[lentSymbol]) {
      req[lentSymbol] = undefined;
      delete req[requestSymbol];
    }
    return adapt(req, res);
  }
  // an earlier middleware left its lend unread: keep its `Request`
  if (req[lentSymbol]) return adapt(req, res);

  const lend = new LentBody(req);
  req[lentSymbol] = lend;
  req.rawBody = new ReadableStream<Uint8Array>(lend, { highWaterMark: 0 });
  try {
    return adapt(req, res);
  } finally {
    req.rawBody = undefined;
  }
}

/** Make the bytes a middleware read readable again on the Node request. */
export function handBodyBack(req: LentRequest): void {
  req[lentSymbol]?.handBack();
}

// `complete` is only set by Node's HTTP parser, not on the synthetic request of `connectToWeb`
// biome-ignore lint/suspicious/noExplicitAny: Node's own flag, also read by common.ts
const hasEnded = (req: DecoratedRequest) => req.complete || (req as any)._readableState?.ended === true;

// It is the underlying source of the body stream: one object per request with methods on the prototype
class LentBody implements UnderlyingDefaultSource<Uint8Array> {
  private held: Buffer[] = [];
  private heldBytes = 0;
  private touched = false;
  private cancelled = false;
  private wanted = false;
  private controller!: ReadableStreamDefaultController<Uint8Array>;
  // bound when the body is first read: most requests never read it
  private drain!: () => void;
  private onError!: (err: Error) => void;

  constructor(private readonly req: LentRequest) {}

  start(controller: ReadableStreamDefaultController<Uint8Array>) {
    this.controller = controller;
  }

  pull() {
    this.wanted = true;
    if (!this.touched) {
      this.touched = true;
      this.drain = () => this.read();
      this.onError = (err) => this.controller.error(err);
      this.req.on("readable", this.drain);
      this.req.on("error", this.onError);
    }
    this.read();
  }

  // a cancelled body can't be read again: the next middleware needs a new `Request`
  cancel() {
    this.cancelled = true;
    this.wanted = false;
  }

  // Reads with `read(n)` and never past the last byte, so Node doesn't emit "end" and the data can go back.
  // `n` stays within `readableHighWaterMark`: Node raises it to any larger `n`, and the buffer then grows with the sender.
  private read() {
    const { req, controller } = this;
    if (!this.wanted) return;
    if (req.readableLength > 0) {
      const chunk = req.read(Math.min(req.readableLength, req.readableHighWaterMark)) as Buffer;
      this.heldBytes += chunk.byteLength;
      if (this.heldBytes > MAX_LENT_BYTES) this.held.length = 0;
      else this.held.push(chunk);
      this.wanted = false;
      controller.enqueue(chunk);
    } else if (hasEnded(req)) {
      this.wanted = false;
      controller.close();
    }
  }

  handBack() {
    if (!this.touched && !this.cancelled) return;
    const { req } = this;
    req[lentSymbol] = undefined;
    if (this.touched) {
      req.off("readable", this.drain);
      req.off("error", this.onError);
    }
    // the next middleware gets a new `Request` over the restored body
    delete req[requestSymbol];
    if (this.held.length > 0) req.unshift(Buffer.concat(this.held));
    // a read still pending or started later would never settle: the bytes are no longer fed to it
    this.controller.error(new Error("The request body must be read before the middleware returns."));
  }
}
