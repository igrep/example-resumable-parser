import {
    eof,
    isEof,
  type Eof,
  type MatchedToken,
  type SpaceSkippingScanner,
  type TokenAndRE,
} from "./scanner.mts";
import type {
  LocatedArray,
  LocatedNumber,
  Location,
  Result
} from "./types.mts";

export const tokens: TokenAndRE[] = [
  { token: "open bracket", regexp: /\[/y },
  { token: "close bracket", regexp: /\]/y },
  { token: "number", regexp: /\d+/y },
  { token: "comma", regexp: /,/y },
  { token: "UNKNOWN", regexp: /[^\[\]\d,]+/y },
];

export type ParseError<R> =
  | ParseErrorWantingMore<R>
  | ParseErrorSkipping<R>;

class ParseErrorBase extends Error {
  override name = "ParseErrorBase";
  location: Location;

  constructor(messageOrExpected: string, matchedToken: MatchedToken | Eof) {
    const { file, line, column } = matchedToken;
    if (isEof(matchedToken)) {
      super(`Expected ${messageOrExpected}, but got end of input, at line ${line}, column ${column}`);
    } else {
      const { tokenKind, matched } = matchedToken;
      super(
        `Expected ${messageOrExpected}, but got ${tokenKind}: "${matched[0]}", at line ${line}, column ${column}`,
      );
    }
    this.location = { line, column, file };
  }
}

export class ParseErrorWantingMore<R> extends ParseErrorBase {
  override name = "ParseErrorWantingMore";
  resume: (more: string) => R | ParseError<R>;

  constructor(messageOrExpected: string, eof: Eof, resume: (more: string) => R | ParseError<R>) {
    super(messageOrExpected, eof);
    this.resume = resume;
  }
}

export class ParseErrorSkipping<R> extends ParseErrorBase {
  override name = "ParseErrorSkipping";
  resume: () => R | ParseError<R>;

  constructor(messageOrExpected: string, matchedToken: MatchedToken | Eof, resume: () => R | ParseError<R>) {
    super(messageOrExpected, matchedToken);
    this.resume = resume;
  }
}

export function resultP<R>(
  s: SpaceSkippingScanner,
  k: (r: Result | ParseError<Result>) => R | ParseError<R>,
): R | ParseError<R> {
  const token = s.peek();
  if (isEof(token)) {
    return new ParseErrorWantingMore("form", token, function resultPEof(more) {
      s.feed(more);
      s.next(); // go to next token
      return resultP(s, k);
    });
  }

  const {line, column, file} = token;
  switch (token.tokenKind) {
    case "open bracket":
      return arrayP(s, {line, column, file}, k);
    case "number":
      s.next(); // Drop the peeked token
      return numberP(token, k);
    default:
      s.next(); // Drop the peeked token
      // NOTE: To reduce the number of recursive calls, I shouldn't return
      //       a ParseError without a continuation here if this call of the
      //       `resultP` is the entrypoint. But omitted for simplicity.
      return new ParseErrorSkipping(
        "form",
        token,
        () => resultP(s, k),
      );
  }
}

function numberP<R>(
  token: MatchedToken,
  k: (r: LocatedNumber) => R | ParseError<R>
): R | ParseError<R> {
  const {line, column, file} = token;
  const {matched} = token;
  return k({location: {line, column, file}, value: parseInt(matched[0])});
}

function arrayP<R>(
  s: SpaceSkippingScanner,
  location: Location,
  k: (r: LocatedArray | ParseError<LocatedArray>) => R | ParseError<R>,
): R | ParseError<R> {
  const close = "close bracket";

  s.next(); // drop open paren
  const results: Result[] = [];
  return (function arrayPLoop(): R | ParseError<R> {
    const next = s.peek();
    if (isEof(next)) {
      return new ParseErrorWantingMore(
        `form or ${close}`,
        next,
        (more) => {
          s.feed(more);
          s.next(); // go to next token
          return arrayPLoop();
        }
      );
    }
    if (next.tokenKind === "UNKNOWN") {
      return new ParseErrorSkipping(
        "form",
        next,
        () => {
          s.next(); // drop close paren
          return arrayPLoop();
        },
      );
    }
    if (next.tokenKind === close) {
      s.next(); // drop close paren
      return k({location, value: results});
    }

    // TODO: Parse comma

    return resultP(s, function arrayPNext(r): R | ParseError<R> {
      if (r instanceof ParseErrorWantingMore) {
        return new ParseErrorWantingMore(
          "form",
          eof(r.location),
          (more) => {
            s.feed(more);
            s.next(); // go to next token
            return arrayPLoop();
          },
        );
      }
      if (r instanceof ParseErrorSkipping) {
        return new ParseErrorSkipping(
          "form",
          next,
          () => arrayPLoop(),
        );
      }
      results.push(r);
      return arrayPLoop();
    });
  })();
}
