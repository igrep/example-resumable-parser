import { ParseError, type Parser, resultP, tokens } from "./grammar.mts";
import { EOF, SpaceSkippingScanner } from "./scanner.mts";
import type { FilePath, ReaderInput, Result } from "./types.mts";

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

export function* readResumably(
  path: FilePath,
): Parser<Result> {
  const s = new SpaceSkippingScanner(tokens, path);
  const p = resultP(s);
  let value: Result | ParseError = new ParseError("form", EOF);
  while (true) {
    ({ value } = p.next(yield value));
  }
}
