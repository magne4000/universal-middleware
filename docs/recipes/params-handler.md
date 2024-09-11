# Using route parameters

Most adapters natively support route parameters (also called _parametric path_ or _path parameters_) such as `/hello/:name`.
`@universal-middleware/core` provides the `params` helper to universally retrieve those.

We recommend to follow this next example when using route parameters:

```ts twoslash
import { params, type UniversalHandler } from "@universal-middleware/core";

interface Options {
  route?: string;
}

const myHandler = ((options?) => (request, ctx, runtime) => {
  const myParams = params(request, runtime, options?.route);
    
  if (myParams === null || !myParams.name) {
    // Provide a useful error message to the user
    throw new Error("A route parameter named `:name` is required. " +
    "You can set your server route as `/user/:name`, or use the `route` option of this middleware " +
    "to achieve the same purpose.");
  }
  
  // ...
  return new Response(`User name is: ${myParams.name}`);
}) satisfies ((options?: Options) => UniversalHandler);

export default myHandler;
```

> [!NOTE]
> For servers supporting route parameters (`app.get("/user/:name", myHandler())`), the parameters are available under `runtime.params`.
> 
> For other adapters (`app.get("/user/*", myHandler({ route: "/user/:name" }))`), the 3rd argument of `params` helper must be present and not _undefined_.
> Then parameters are extracted with [regexparam](https://github.com/lukeed/regexparam).
