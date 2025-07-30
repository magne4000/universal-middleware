// package: @universal-middleware-examples/tool
// file: src/middlewares/guard.middleware.ts

import type { Get, UniversalMiddleware } from "@universal-middleware/core";

interface User {
  id: string;
  email: string;
}

// This middleware will return an early Response for unauthenticated users
const guardMiddleware = (() => (_request, ctx, _runtime) => {
  if (!ctx?.user) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }
  // Using `satisfies` to not lose return type
}) satisfies Get<[], UniversalMiddleware<{ user?: User }>>;

// export default is mandatory
export default guardMiddleware;
