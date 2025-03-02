import type { MatchedToken, SpaceSkippingScanner, TokenAndRE, } from "./scanner.mts";
import { EOF } from "./scanner.mts";
import type { LocatedArray, LocatedNumber, Location, Result } from "./types.mts";

export const tokens: TokenAndRE[] = [
  { token: "open bracket", regexp: /\[/y },
  { token: "close bracket", regexp: /\]/y },
  { token: "number", regexp: /d+/y },
  { token: "comma", regexp: /,/y },
];

export type ParseError = ParseErrorWantingMore | ParseErrorSkipping;

export function isParseError(e: unknown): e is ParseError {
  return e instanceof ParseErrorBase;
}

class ParseErrorBase extends Error {
  override name = "ParseError";

  constructor(messageOrExpected: string, matchedToken?: MatchedToken | EOF) {
    if (matchedToken === undefined) {
      super(messageOrExpected);
      return;
    }
    if (matchedToken === EOF) {
      super(`Expected ${messageOrExpected}, but got end of input`);
      return;
    }
    const { line, column, tokenKind, matched } = matchedToken;
    super(
      `Expected ${messageOrExpected}, but got ${tokenKind}: "${matched[0]}", at line ${line}, column ${column}`,
    );
  }
}

export class ParseErrorWantingMore extends ParseErrorBase {
  wantsMore = true;
  resume: (more: string) => Result | ParseError;

  constructor(messageOrExpected: string, resume: (more: string) => Result | ParseError) {
    super(messageOrExpected, EOF);
    this.resume = resume;
  }
}

export class ParseErrorSkipping extends ParseErrorBase {
  wantsMore = false;
  resume: () => Result | ParseError;

  constructor(messageOrExpected: string, resume: () => Result | ParseError, matchedToken?: MatchedToken) {
    super(messageOrExpected, matchedToken);
    this.resume = resume;
  }
}

export function resultP(s: SpaceSkippingScanner): Result | ParseError {
  while (true) {
    const token = s.peek();
    if (token === EOF) {
      return new ParseErrorWantingMore("form", (more) => feedMoreToResume(s, resultP, more));
    }

    const { line, column, file } = token;
    switch (token.tokenKind) {
      case "open bracket":
        return arrayP(s, { line, column, file });
      case "number":
        s.next(); // Drop the peeked token
        return numberP(token);
      default:
        s.next(); // Drop the peeked token
        // NOTE: To reduce the number of recursive calls, I shouldn't return
        //       a ParseError without a continuation here if this call of the
        //       `resultP` is the entrypoint. But omitted for simplicity.
        return new ParseErrorSkipping("form", () => resultP(s), token);
    }
  }
}

function numberP(token: MatchedToken): LocatedNumber {
  const { line, column, file } = token;
  const { matched } = token;
  return { location: { line, column, file }, value: parseInt(matched[0]) };
}

function arrayP(
  s: SpaceSkippingScanner,
  location: Location,
  results: Result[] = [],
): LocatedArray | ParseError {
  const close = "close bracket";

  s.next(); // drop open paren

  while (true) {
    const next = s.peek();
    if (next === EOF) {
      return new ParseErrorWantingMore(
        `form or ${close}`,
        (more) => {
          s.feed(more);
          return arrayP(s, location, results);
        }
      );
    }
    if (next.tokenKind === close) {
      s.next(); // drop close paren
      break;
    }

    // TODO: Parse comma

    const nextValue = resultP(s);
    if (isParseError(nextValue)) {
      return nextValue;
    }
    results.push(nextValue);
  }

  return { location, value: results };
}

function feedMoreToResume<T>(s: SpaceSkippingScanner, p: (s: SpaceSkippingScanner) => T | ParseError, more: string): T | ParseError {
  s.feed(more);
  return p(s);
}
