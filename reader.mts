
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

export {}
