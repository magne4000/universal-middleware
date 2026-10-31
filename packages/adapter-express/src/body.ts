import type { ServerResponse } from "node:http";
import { requestSymbol } from "./const.js";
import type { DecoratedRequest } from "./types.js";

// A bigger body isn't handed back, so that a streamed upload isn't held in memory. Body parsers refuse it by default.
const MAX_LENT_BYTES = 1024 * 1024;

// On the request rather than in a map: a request whose body nobody reads costs nothing
const lentSymbol = Symbol("universal-middleware.lentBody");
type LentRequest = DecoratedRequest & { [lentSymbol]?: LentBody };

/**
 * Create the `Request` for `req`. Its body reads the Node request lazily and without ending it, so that
 * `handBodyBack` can put what the middleware read back for the next Express handler.
 */
export function adaptLendingBody(
  adapt: (req: DecoratedRequest, res: ServerResponse) => Request,
  req: LentRequest,
  res: ServerResponse,
): Request {
  // No body, as in `@universal-middleware/node`'s `convertBody`
  if (req.method === "GET" || req.method === "HEAD") return adapt(req, res);
  // Already parsed: into `rawBody` before Express (Google Cloud Functions), or by a body parser such as `express.json()`
  if (req.rawBody !== undefined || req.readableEnded) {
    // A lend left unread would read an empty body: the next `Request` gets the parsed one instead
    if (req[lentSymbol]) {
      req[lentSymbol] = undefined;
      delete req[requestSymbol];
    }
    return adapt(req, res);
  }
  // An earlier middleware left its lend unread: its `Request` still applies
  if (req[lentSymbol]) return adapt(req, res);

  const lend = new LentBody(req, res);
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

const readerEvents = ["data", "readable", "end"] as const;

// Every way to read a Node stream (`data`, `readable`, `pipe`, `for await`) goes through `read()`
function failNextRead(req: LentRequest, res: ServerResponse) {
  // Listeners added before the next handler, such as `on-finished`'s or an error logger's, aren't the reader's
  const earlier = new Set([...readerEvents, "error"].flatMap((event) => req.rawListeners(event)));
  req.read = (size) => {
    delete (req as Partial<LentRequest>).read;
    // Node emits its own request errors only to a listener too: an "error" event with none throws
    if (req.rawListeners("error").some((listener) => !earlier.has(listener))) {
      // The reader's listeners go, so that none of them runs after the error
      for (const event of readerEvents) {
        for (const listener of req.rawListeners(event)) {
          if (!earlier.has(listener)) req.removeListener(event, listener as () => void);
        }
      }
      const error = new Error(`The request body is larger than ${MAX_LENT_BYTES} bytes and was read by a middleware`);
      req.emit("error", Object.assign(error, { status: 413, statusCode: 413, type: "entity.too.large" }));
      // A reader that destroys the request on the error, as `for await` does, leaves the rest unread on the connection
      if (!hasEnded(req)) res.shouldKeepAlive = false;
    }
    return req.read(size);
  };
}

// `complete` is only set by Node's HTTP parser, not on `connectToWeb`'s synthetic request
// biome-ignore lint/suspicious/noExplicitAny: Node's own flag, also read by common.ts
const hasEnded = (req: DecoratedRequest) => req.complete || (req as any)._readableState?.ended === true;

// The underlying source of the body stream: one object per request, its methods on the prototype
class LentBody implements UnderlyingDefaultSource<Uint8Array> {
  private held: Buffer[] = [];
  private heldBytes = 0;
  private touched = false;
  private cancelled = false;
  private wanted = false;
  private controller!: ReadableStreamDefaultController<Uint8Array>;
  // Bound on the first read: most requests never read the body
  private drain!: () => void;
  private onError!: (err: Error) => void;

  constructor(
    private readonly req: LentRequest,
    private readonly res: ServerResponse,
  ) {}

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

  // A cancelled body can't be read again: the next middleware needs a new `Request`
  cancel() {
    this.cancelled = true;
    this.wanted = false;
  }

  // `read(n)` never reads past the last byte, so Node doesn't emit "end" and the data can go back. `n` stays within
  // `readableHighWaterMark`, which Node would otherwise raise, letting the buffer grow with the sender.
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
    // The next middleware gets a new `Request` over the restored body
    delete req[requestSymbol];
    if (this.held.length > 0) req.unshift(Buffer.concat(this.held));
    else if (this.heldBytes > MAX_LENT_BYTES) failNextRead(req, this.res);
    // A read pending or started later would never settle: no bytes feed it anymore
    this.controller.error(new Error("The request body must be read before the middleware returns."));
  }
}
