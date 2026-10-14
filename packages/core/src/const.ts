export const universalSymbol = Symbol.for("universal");
export const unboundSymbol = Symbol.for("unbound");
export const contextSymbol = Symbol.for("unContext");
export const pathSymbol = Symbol.for("unPath");
export const methodSymbol = Symbol.for("unMethod");
export const orderSymbol = Symbol.for("unOrder");
export const nameSymbol = Symbol.for("unName");
export const urlSymbol = Symbol.for("unUrl");
export const keepBodySymbol = Symbol.for("universal-middleware.keepBody");
export const runsSymbol = Symbol.for("unRuns");

/**
 * @internal
 */
export const optionsToSymbols = {
  name: nameSymbol,
  method: methodSymbol,
  path: pathSymbol,
  order: orderSymbol,
  context: contextSymbol,
  runs: runsSymbol,
} as const;

/**
 * Usual `order` values, in the order the middlewares run.
 *
 * A middleware with a negative `order` (or none) runs before the handler, and not once a Response exists. One with a
 * positive `order` runs once a Response exists: after the handler, or right after an earlier middleware answered. It
 * acts through a response function: returning a Response from it throws. `runs` overrides this.
 *
 * @beta
 */
export enum MiddlewareOrder {
  // Before the handler: they stop once a Response exists
  CORS = -1100, // Cross-Origin Resource Sharing: answers preflights, and its response function also reaches an early answer (401, 429).
  RATE_LIMITING = -1000, // Rate limiting: prevents excessive requests from a client.
  AUTHENTICATION = -900, // Authentication: verifies user credentials or tokens.
  AUTHORIZATION = -800, // Authorization: ensures the user has permissions for the route.
  CACHING = -700, // Response cache: answers hits. Its response function stores what comes back, before the response transforms, which also run on hits.
  PARSING = -600, // Parsing: parses body payloads (e.g., JSON, URL-encoded, multipart).
  INPUT_VALIDATION = -500, // Input validation: validates the parsed payload or the query parameters.
  CUSTOM_PRE_PROCESSING = -400, // Any custom logic before the handler.

  HANDLER = 0, // The handler, which generates the response.

  // Once a Response exists: after the handler, or right after an earlier middleware answered
  ERROR_HANDLING = 50, // Turns an error Response (4xx, 5xx) into the one users see, before it is transformed and compressed. A thrown error goes to the server's own error handling.
  RESPONSE_TRANSFORM = 100, // Response transformation: modifies the response payload.
  HEADER_MANAGEMENT = 200, // Header management: adds or modifies HTTP headers (e.g., cache-control, content type).
  RESPONSE_COMPRESSION = 300, // Response compression: compresses the response payload (e.g., gzip, brotli).
  CONDITIONAL_REQUESTS = 400, // Conditional requests: ETag or Last-Modified, and 304 answers, on the body as sent.
  CUSTOM_POST_PROCESSING = 700, // Any custom logic after the response is generated.
  LOGGING = 800, // Logging: logs the request and the response as sent. Timing the handler needs a negative order.
}
