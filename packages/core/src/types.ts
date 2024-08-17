export type Awaitable<T> = T | Promise<T>;

export interface UniversalMiddleware<
  InContext extends Universal.Context = Universal.Context,
  OutContext extends Universal.Context = Universal.Context,
> {
  (
    request: Request,
    context: InContext,
  ):
    | Awaitable<Response>
    | Awaitable<void>
    | Awaitable<OutContext>
    | ((response: Response) => Awaitable<Response>);
}

export interface UniversalHandler<
  InContext extends Universal.Context = Universal.Context,
> {
  (request: Request, context: InContext): Awaitable<Response>;
}

export type Get<T extends unknown[], U> = (...args: T) => U;
