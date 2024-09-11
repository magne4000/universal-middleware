# Using route parameters

Most adapters natively support route parameters (also called _parametric path_ or _path parameters_) such as `/hello/:name`.
`@universal-middleware/core` provides the `params` helper to universally retrieve those.

We recommend to follow this next example when using route parameters:

```ts twoslash
import { params, type UniversalHandler } from "@universal-middleware/core";

interface Options {
  route?: string;
}

const myMiddleware = ((options?) => (request, ctx, runtime) => {
  const myParams = params(request, runtime, options?.route);
    
  if (myParams === null) {
    // Provide a useful error message to the user
    throw new Error("A route parameter named `:name` is required. " +
    "You can set your server route as `/user/:name`, or use the `route` option of this middleware " +
    "to achieve the same purpose.");
  }
  
  // ...
  return new Response("OK");
}) satisfies ((options?: Options) => UniversalHandler);

export default myMiddleware;
```

> [!NOTE]
> For servers supporting route parameters (`app.get("/user/:name", myMiddleware())`), the parameters are available under `runtime.params`.
> 
> For other adapters (`app.get("/user/*", myMiddleware({ route: "/user/:name" }))`), the 3rd argument of `params` helper must be present and not _undefined_.
> Then parameters are extracted with [regexparam](https://github.com/lukeed/regexparam).
