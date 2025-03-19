/* TODO
export function readStr(input: ReaderInput): Result | ParseError {
  const s = new SpaceSkippingScanner(tokens, input);
  const parsed = resultP(s).next().value;
  if (ParseError.is(parsed)) {
    return parsed;
  }
  const left = s.next();
  if (left !== EOF) {
    return new ParseError(`Unexpected token left!: ${left.tokenKind}: "${left.matched[0]}"`);
  }
  return parsed;
}

export function readBlock(input: ReaderInput): Result[] | ParseError {
  const s = new SpaceSkippingScanner(tokens, input);
  const result = [];
  let f: Result | ParseError;
  while (!s.isAtEof()) {
    f = resultP(s).next().value;
    if (ParseError.is(f)) {
      return f;
    }
    result.push(f);
  }
  return result;
}
*/

import {
  type ParseError,
  resultP,
  tokens
} from "./grammar.mts";
import { SpaceSkippingScanner } from "./scanner.mts";
import type { ReaderInput, Result } from "./types.mts";

export function readResumably<R>(
  input: ReaderInput,
  handle: (r: Result | ParseError<R>) => R,
): R {
  const s = new SpaceSkippingScanner(tokens, input);
  return resultP(s, handle);
}
