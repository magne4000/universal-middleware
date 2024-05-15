/* eslint-disable @typescript-eslint/no-this-alias */
import { DeepProxy } from "proxy-deep";

interface ProxyObserver {
  onCall?: (path: string[], prop: PropertyKey, args: unknown[]) => void;
  onSet?: (path: string[], prop: PropertyKey, value: unknown) => void;
  onDelete?: (path: string[], prop: PropertyKey) => void;
}

export class LogProxyObserver implements ProxyObserver {
  constructor(public name: string) {}

  protected log(path: string[], rest: string) {
    console.log(`${this.name} [/${path.join(".")}] ${rest}`);
  }

  onCall(path: string[], prop: PropertyKey, args: unknown[]) {
    this.log(path, `${String(prop)}(${JSON.stringify(args)})`);
  }

  onSet(path: string[], prop: PropertyKey, value: unknown) {
    this.log(path, `${String(prop)} = ${JSON.stringify(value)}`);
  }

  onDelete(path: string[], prop: PropertyKey) {
    this.log(path, `-${String(prop)}`);
  }
}

export class RequestProxyObserver implements ProxyObserver {
  constructor(public name: string) {}

  protected log(path: string[], rest: string) {
    console.log(`${this.name} [/${path.join(".")}] ${rest})`);
  }

  onCall(path: string[], prop: PropertyKey, args: unknown[]) {
    this.log(path, `${String(prop)}(${JSON.stringify(args)})`);
  }

  onSet(path: string[], prop: PropertyKey, value: unknown) {
    this.log(path, `${String(prop)} = ${JSON.stringify(value)}`);
  }

  onDelete(path: string[], prop: PropertyKey) {
    this.log(path, `-${String(prop)}`);
  }
}

export function deepProxy(observer: ProxyObserver) {
  return function proxy<T extends object>(subject: T): T {
    return new DeepProxy(subject, {
      get(target, prop, receiver) {
        const self = this;
        const value = Reflect.get(target, prop);
        if (value instanceof Function) {
          return function (...args: unknown[]) {
            observer.onCall?.(self.path, prop, args);
            return value.apply(receiver, args);
          };
        }
        return value;
      },
      set(target, prop, value) {
        observer.onSet?.(this.path, prop, value);
        return Reflect.set(target, prop, value);
      },
      deleteProperty(target, prop) {
        observer.onDelete?.(this.path, prop);
        return Reflect.deleteProperty(target, prop);
      },
      apply(target, thisArg, argArray) {
        return Reflect.apply(target, thisArg, argArray);
      },
    });
  };
}
