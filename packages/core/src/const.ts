export const universalSymbol = Symbol.for("universal");
export const unboundSymbol = Symbol.for("unbound");
export const pathSymbol = Symbol.for("unPath");
export const methodSymbol = Symbol.for("unMethod");
export const orderSymbol = Symbol.for("unOrder");
export const nameSymbol = Symbol.for("unName");
export const urlSymbol = Symbol.for("unUrl");
export const contextSymbol = Symbol.for("unContext");

/**
 * @internal
 */
export const optionsToSymbols = {
  name: nameSymbol,
  method: methodSymbol,
  path: pathSymbol,
  order: orderSymbol,
} as const;

/**
 * @alpha
 */
export enum MiddlewareOrder {
  // Pre-handler Middlewares
  RATE_LIMITING = -1000, // Rate limiting middleware: Prevents excessive requests from a client.
  AUTHENTICATION = -900, // Authentication middleware: Verifies user credentials or tokens.
  AUTHORIZATION = -800, // Authorization middleware: Ensures the user has permissions for the route.
  INPUT_VALIDATION = -700, // Input validation middleware: Validates the request payload or query parameters.
  CORS = -600, // CORS middleware: Handles Cross-Origin Resource Sharing settings.
  PARSING = -500, // Parsing middleware: Parses body payloads (e.g., JSON, URL-encoded, multipart).
  CUSTOM_PRE_PROCESSING = -400, // Custom pre-processing middleware: Any custom logic before the main handler.

  // Main Handler
  HANDLER = 0, // Main handler that generates the response.

  // Post-handler Middlewares
  RESPONSE_TRANSFORM = 100, // Response transformation middleware: Modifies the response payload.
  HEADER_MANAGEMENT = 200, // Header management middleware: Adds or modifies HTTP headers (e.g., caching, content type).
  RESPONSE_COMPRESSION = 300, // Response compression middleware: Compresses the response payload (e.g., gzip, brotli).
  RESPONSE_CACHING = 400, // Response caching middleware: Implements caching strategies (e.g., ETag, cache-control).
  LOGGING = 500, // Logging middleware: Logs request and response information.
  ERROR_HANDLING = 600, // Error handling middleware: Processes errors and returns user-friendly responses.
  CUSTOM_POST_PROCESSING = 700, // Custom post-processing middleware: Any custom logic after the response is generated.
}
