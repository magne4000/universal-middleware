/* eslint-disable @typescript-eslint/no-this-alias */
import { DeepProxy } from "proxy-deep";
import onChange, { type Options } from "on-change";

interface ProxyObserver {
  onCall?: (path: string[], prop: PropertyKey, args: unknown[]) => void;
  onSet?: (path: string[], prop: PropertyKey, value: unknown) => void;
  onDelete?: (path: string[], prop: PropertyKey) => void;
  onApply?: (path: string[], argArray: unknown[]) => void;
}

function pathToString(path: (string | symbol)[] | string) {
  if (typeof path === "string") {
    return path;
  }
  return path.map((p) => (typeof p === "symbol" ? p.toString() : p)).join(".");
}

export class LogProxyObserver implements ProxyObserver {
  constructor(public name: string) {}

  protected log(path: (string | symbol)[], rest: string) {
    console.log(`${this.name} [/${pathToString(path)}] ${rest}`);
  }

  onCall(path: (string | symbol)[], prop: PropertyKey, args: unknown[]) {
    this.log(path, `${String(prop)}(${args.map((x) => typeof x).join(", ")})`);
  }

  onSet(path: (string | symbol)[], prop: PropertyKey, value: unknown) {
    this.log(path, `${String(prop)} = ${typeof value}`);
  }

  onDelete(path: (string | symbol)[], prop: PropertyKey) {
    this.log(path, `-${String(prop)}`);
  }

  onApply(path: (string | symbol)[], argArray: unknown[]) {
    this.log(path, `${argArray.map((x) => typeof x).join(", ")}`);
  }
}

function isNestable(value: unknown) {
  return value && (typeof value === "function" || typeof value === "object");
}

export function deepProxy(observer: ProxyObserver) {
  return function proxy<T extends object>(subject: T): T {
    return new DeepProxy(subject, {
      // get(target, prop, receiver) {
      //   const self = this;
      //   const value = Reflect.get(target, prop);
      //   if (value instanceof Function) {
      //     return self.nest(function (...args: unknown[]) {
      //       observer.onCall?.(self.path, prop, args);
      //       return value.apply(receiver, args);
      //     });
      //   }
      //   return isNestable(value)
      //     ? self.nest(value)
      //     : value;
      // },
      set(target, prop, value) {
        observer.onSet?.(this.path, prop, value);
        return Reflect.set(
          target,
          prop,
          isNestable(value) ? this.nest(value) : value,
        );
      },
      deleteProperty(target, prop) {
        observer.onDelete?.(this.path, prop);
        return Reflect.deleteProperty(target, prop);
      },
      apply(target, thisArg, argArray) {
        observer.onApply?.(this.path, argArray);
        return Reflect.apply(target, thisArg, argArray);
      },
    });
  };
}

export function logChange<T>(name: string, o: T, options: Options = {}): T {
  return onChange(
    o,
    function (path, value, previousValue, applyData) {
      console.log(`${name} [${pathToString(path)}]:`, typeof value);
    },
    {
      equals(a, b) {
        return a === b;
      },
      details: true,
      pathAsArray: true,
      ...options,
    },
  );
}
