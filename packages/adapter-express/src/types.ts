export type Awaitable<T> = T | Promise<T>;

export interface UniversalContext
  extends Record<string | number | symbol, unknown> {}

export interface UniversalMiddleware {
  (
    request: Request,
    context: UniversalContext,
  ):
    | Awaitable<Response>
    | Awaitable<void>
    | ((response: Response) => Awaitable<Response>);
}

export interface UniversalHandler {
  (request: Request, context: UniversalContext): Awaitable<Response>;
}
