import type { Result } from "./types.mts";

export type ResultToJsValueResult = number | ResultToJsValueResult[];

export function toJsValue(r: Result): ResultToJsValueResult {
  if (r.value instanceof Array) {
    return r.value.map(toJsValue);
  }
  return r.value;
}
