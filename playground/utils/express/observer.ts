import type {
  NextFunction,
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";
import { logChange } from "../proxy.js";
import onChange from "on-change";

export function observer(
  name: string,
  handler: (
    req: ExpressRequest,
    res: ExpressResponse,
    next: NextFunction,
  ) => void,
) {
  return async (
    req: ExpressRequest,
    res: ExpressResponse,
    next: NextFunction,
  ) => {
    const loggedReq = logChange(`${name}:req`, req, {
      ignoreKeys: ["socket"],
    });
    const loggedRes = logChange(`${name}:res`, res, {
      ignoreKeys: ["socket"],
    });
    await handler(loggedReq, loggedRes, next);
    onChange.unsubscribe(loggedReq);
    onChange.unsubscribe(loggedRes);
  };
}
