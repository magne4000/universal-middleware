export const universalSymbol = Symbol.for("universal");
export const unboundSymbol = Symbol.for("unbound");
export const pathSymbol = Symbol.for("unPath");
export const methodSymbol = Symbol.for("unMethod");
export const orderSymbol = Symbol.for("unOrder");
export const nameSymbol = Symbol.for("unName");
export const urlSymbol = Symbol.for("unUrl");

/**
 * @internal
 */
export const optionsToSymbols = {
  name: nameSymbol,
  method: methodSymbol,
  path: pathSymbol,
  order: orderSymbol,
} as const;
