import type { uContext } from "./const.js";

export type Awaitable<T> = T | Promise<T>;

export interface UniversalRequest<T extends object> extends Request {
  [uContext]?: T;
}

export interface UniversalMiddleware<T extends object = {}> {
  (
    request: UniversalRequest<T>,
  ):
    | Awaitable<Response>
    | Awaitable<void>
    | ((response: Response) => Awaitable<Response>);
}

export interface UniversalHandler<T extends object = {}> {
  (request: UniversalRequest<T>): Awaitable<Response>;
}

export type Get<T extends unknown[], U> = (...args: T) => U;
