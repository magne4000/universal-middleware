export type Awaitable<T> = T | Promise<T>;

export interface UniversalMiddleware {
  (
    request: Request,
    context: Universal.Context,
  ):
    | Awaitable<Response>
    | Awaitable<void>
    | ((response: Response) => Awaitable<Response>);
}

export interface UniversalHandler {
  (request: Request, context: Universal.Context): Awaitable<Response>;
}
