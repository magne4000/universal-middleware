import type { Get, UniversalMiddleware } from "universal-middleware";

interface User {
  id: string;
  email: string;
}

// This middleware will return an early Response for unauthenticated users
const guardMiddleware = (() => (request, ctx) => {
  if (!ctx?.user) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }
  // Using `satisfies` to not lose return type
}) satisfies Get<[], UniversalMiddleware<{ user?: User }>>;

// export default is mandatory
export default guardMiddleware;
