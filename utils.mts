import type { Result } from "./types.mts";

export type ResultToJsValueResult = number | ResultToJsValueResult[];

export function toJsValue(r: Result): ResultToJsValueResult {
  if (r.value instanceof Array) {
    return r.value.map(toJsValue);
  }
  return r.value;
}

export function assertNonError<T>(x: T | Error): T {
  if (x instanceof Error) {
    throw x;
  }
  return x;
}
