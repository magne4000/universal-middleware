import { nameSymbol, orderSymbol, runsSymbol } from "./const";
import type { Awaitable, EnhancedMiddleware, MiddlewareRuns, RuntimeAdapter, UniversalMiddleware } from "./types";
import { cancelReplacedBody, enhance, getUniversal, getUniversalProp } from "./utils";

type ResponseFunction = (response: Response) => Awaitable<Response | undefined>;

// What the middlewares of one list share for one request
interface ListState {
  // The Response that answers, once a middleware of the list returned one
  answer?: Response;
  // The list's response functions, in order. The server gets a single function that applies them all
  pending: ResponseFunction[];
  handedOver: boolean;
  // The context an after-response middleware returned, for the after-response ones after it
  context?: Universal.Context;
}

/** When a middleware runs: its `runs`, else `after-response` for a positive `order` and `until-response` otherwise. */
export function runsOf(middleware: EnhancedMiddleware): MiddlewareRuns {
  return (
    getUniversalProp(middleware, runsSymbol) ??
    (getUniversalProp(middleware, orderSymbol, 0) > 0 ? "after-response" : "until-response")
  );
}

async function applyAll(pending: ResponseFunction[], response: Response) {
  for (const responseFunction of pending) {
    const replacement = await responseFunction(response);
    if (replacement) {
      cancelReplacedBody(response, replacement);
      response = replacement;
    }
  }
  return response;
}

/**
 * Turns a sorted list of middlewares that aren't handlers into one middleware per item ("steps"), so that a server
 * registers, names and runs each of them, and the list follows `runs` on every server:
 * - The step whose middleware answers runs the ones after it that run once a Response exists (`after-response`,
 *   `always`), then returns the answer, which ends the server's chain as any answer does. The steps after it do nothing.
 * - An `after-response` step that runs before any answer returns a response function, which runs the middleware once
 *   the handler (or what comes after the list) responded.
 * - The list's response functions apply in order: the server gets one function that applies them all, from the first
 *   step that has one, so that they also apply to an answer of a later step.
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
  const states = new WeakMap<object, ListState>();
  const runs = middlewares.map(runsOf);
  const ums = middlewares.map(universalOf);
  const names = middlewares.map((m) => getUniversalProp(m, nameSymbol) ?? getUniversal(m).name);

  // A Response from a middleware that runs once one exists: an `always` one's is ignored
  const lateResponse = (j: number, result: Response, state: ListState) => {
    cancelReplacedBody(result, state.answer);
    if (runs[j] === "after-response") {
      throw new TypeError(
        `The middleware ${names[j] || "(unnamed)"} runs once a Response exists (a positive \`order\`, or \`runs: "after-response"\`), so it can't return a Response. Return a response function, or give it a negative \`order\` or \`runs: "until-response"\`.`,
      );
    }
  };

  // The function that applies the list's response functions goes to the server once
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
    // The server applies the list's function to the answer; without one, the response functions apply here
    return state.handedOver ? response : applyAll(state.pending, response);
  };

  return middlewares.map((_, i): UniversalMiddleware => {
    const step: UniversalMiddleware = async (request, context, runtime) => {
      const keyed = context !== null && typeof context === "object";
      let state = i === 0 || !keyed ? undefined : states.get(context);
      if (!state) {
        state = { pending: [], handedOver: false };
        if (keyed) states.set(context, state);
      }
      // The step that answered ran what had to run after it
      if (state.answer) return;

      if (runs[i] === "after-response") {
        const s = state;
        return collect(s, async (response) => {
          s.answer ??= response;
          const result = await ums[i](request, s.context ?? context, runtime);
          if (typeof result === "function") return (result as ResponseFunction)(response);
          if (result instanceof Response) lateResponse(i, result, s);
          else if (result !== null && typeof result === "object") s.context = result;
          return undefined;
        });
      }

      const result = await ums[i](request, context, runtime);
      if (result instanceof Response) return answer(i, result, state, request, context, runtime);
      if (typeof result === "function") return collect(state, result as ResponseFunction);
      // A returned context replaces the current one: the state follows it
      if (result !== null && typeof result === "object") states.set(result, state);
      return result;
    };
    return names[i] ? enhance(step, { name: names[i], immutable: false }) : step;
  });
}
