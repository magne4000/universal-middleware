import { nameSymbol, orderSymbol, runsSymbol } from "./const";
import type { Awaitable, EnhancedMiddleware, MiddlewareRuns, RuntimeAdapter, UniversalMiddleware } from "./types";
import { cancelReplacedBody, enhance, getUniversal, getUniversalProp, keepBody, withMutableHeaders } from "./utils";

type ResponseFunction = (response: Response) => Awaitable<Response | undefined>;
/** What a step hands to what runs it: an answer, a response function, a context, or nothing */
type StepResult = Response | ResponseFunction | Universal.Context | undefined;

/** What the middlewares of one list share for one request */
export interface ListState {
  // The Response that answers, once a middleware of the list returned one
  answer?: Response;
  // The list's response functions, in order. What runs the list gets a single function that applies them all
  pending: ResponseFunction[];
  handedOver: boolean;
  // The context an after-response middleware returned, for the after-response ones after it
  context?: Universal.Context;
}

/** A sorted list of middlewares, run one at a time by the rule of `runs` */
export interface MiddlewareList {
  names: (string | undefined)[];
  /**
   * Runs middleware `i` for a request. The step that answers runs the middlewares after it that run once a Response
   * exists (`after-response`, `always`), then returns the answer; the steps after it return nothing. The first step
   * with a response function returns one that applies all of the list's, in order, so that they also apply to the
   * answer of a later step.
   */
  run(
    i: number,
    state: ListState,
    request: Request,
    context: Universal.Context,
    runtime: RuntimeAdapter,
  ): Promise<StepResult>;
}

/** When a middleware runs: its `runs`, else `after-response` for a positive `order` and `until-response` otherwise. */
export function runsOf(middleware: EnhancedMiddleware): MiddlewareRuns {
  return (
    getUniversalProp(middleware, runsSymbol) ??
    (getUniversalProp(middleware, orderSymbol, 0) > 0 ? "after-response" : "until-response")
  );
}

export function newListState(): ListState {
  return { pending: [], handedOver: false };
}

async function applyAll(pending: ResponseFunction[], response: Response) {
  for (const responseFunction of pending) {
    response = withMutableHeaders(response);
    const replacement = await responseFunction(response);
    if (replacement) {
      cancelReplacedBody(response, replacement);
      response = replacement;
    }
  }
  return response;
}

/** The rule shared by `apply()` (through `toSteps`) and `pipe()`, for a list already sorted by `order` */
export function compileList(
  middlewares: EnhancedMiddleware[],
  universalOf: (middleware: EnhancedMiddleware) => UniversalMiddleware,
): MiddlewareList {
  const runs = middlewares.map(runsOf);
  const ums = middlewares.map(universalOf);
  const names = middlewares.map((m) => getUniversalProp(m, nameSymbol) ?? (getUniversal(m).name || undefined));

  // A Response from a middleware that runs once one exists: an `always` one's is ignored
  const lateResponse = (j: number, result: Response, state: ListState) => {
    cancelReplacedBody(result, state.answer);
    if (runs[j] === "after-response") {
      throw new TypeError(
        `The middleware ${names[j] ?? "(unnamed)"} runs once a Response exists (a positive \`order\`, or \`runs: "after-response"\`), so it can't return a Response. Return a response function, or give it a negative \`order\` or \`runs: "until-response"\`.`,
      );
    }
  };

  // The function that applies the list's response functions is handed over once
  const collect = (state: ListState, responseFunction: ResponseFunction) => {
    state.pending.push(responseFunction);
    if (state.handedOver) return undefined;
    state.handedOver = true;
    return (response: Response) => applyAll(state.pending, response);
  };

  // Runs the middlewares after `i` that run once a Response exists, then hands the answer over
  const answer = async (
    i: number,
    response: Response,
    state: ListState,
    request: Request,
    context: Universal.Context,
    runtime: RuntimeAdapter,
  ) => {
    state.answer = response;
    for (let j = i + 1; j < middlewares.length; j++) {
      if (runs[j] === "until-response") continue;
      const result = await ums[j](request, context, runtime);
      if (result instanceof Response) lateResponse(j, result, state);
      else if (typeof result === "function") state.pending.push(result as ResponseFunction);
      else if (result !== null && typeof result === "object") context = result;
    }
    // The function handed over applies to the answer; without one, the response functions apply here
    return state.handedOver ? response : applyAll(state.pending, response);
  };

  return {
    names,
    async run(i, state, request, context, runtime) {
      // The step that answered ran what had to run after it
      if (state.answer) return undefined;
      // Every middleware of the list, and what runs after it, can read the body
      keepBody(request);

      if (runs[i] === "after-response") {
        // Runs once the handler (or what comes after the list) responded
        return collect(state, async (response) => {
          state.answer ??= response;
          const result = await ums[i](request, state.context ?? context, runtime);
          if (typeof result === "function") return (result as ResponseFunction)(response);
          if (result instanceof Response) lateResponse(i, result, state);
          else if (result !== null && typeof result === "object") state.context = result;
          return undefined;
        });
      }

      const result = await ums[i](request, context, runtime);
      if (result instanceof Response) return answer(i, result, state, request, context, runtime);
      if (typeof result === "function") return collect(state, result as ResponseFunction);
      return result as StepResult;
    },
  };
}

/**
 * Turns a sorted list of middlewares that aren't handlers into one middleware per item ("steps"), so that a server
 * registers, names and runs each of them, and the list follows `runs` on every server (see `compileList`).
 *
 * The steps of a request share a state, keyed by the context: a server hands each middleware the context the previous
 * one left, and a step that gets a new context back moves the state to it. The Request can't be the key: a server may
 * build a new one per middleware (Express, once a middleware read the body).
 *
 * The steps have no `order`: `pipe()`, which runs the middlewares of a `UniversalRouter`, would sort its handlers among them.
 */
export function toSteps(
  middlewares: EnhancedMiddleware[],
  universalOf: (middleware: EnhancedMiddleware) => UniversalMiddleware,
): UniversalMiddleware[] {
  const list = compileList(middlewares, universalOf);
  const states = new WeakMap<object, ListState>();

  return middlewares.map((_, i): UniversalMiddleware => {
    const step: UniversalMiddleware = async (request, context, runtime) => {
      const keyed = context !== null && typeof context === "object";
      let state = i === 0 || !keyed ? undefined : states.get(context);
      if (!state) {
        state = newListState();
        if (keyed) states.set(context, state);
      }
      const result = await list.run(i, state, request, context, runtime);
      // A returned context replaces the current one: the state follows it
      if (result !== null && typeof result === "object" && !(result instanceof Response)) states.set(result, state);
      return result;
    };
    const name = list.names[i];
    return name ? enhance(step, { name, immutable: false }) : step;
  });
}
