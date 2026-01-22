import { optionsToSymbols } from "./const";
import type { UniversalOptions, UniversalOptionsArg } from "./types";

/**
 * @experimental
 */
export function compileEnhance(middleware: string, options: Omit<UniversalOptionsArg, "immutable">): string {
  let code = "";
  for (const [key, value] of Object.entries(options)) {
    if (key in optionsToSymbols) {
      const symbolKey = Symbol.keyFor(optionsToSymbols[key as keyof UniversalOptions]);
      code += `${middleware}[Symbol.for(${JSON.stringify(symbolKey)})]=${JSON.stringify(value)};`;
    }
  }
  return code;
}
