import type { MatchedToken, SpaceSkippingScanner, TokenAndRE, } from "./scanner.mts";
import { EOF } from "./scanner.mts";
import type { LocatedArray, LocatedNumber, Location, Result } from "./types.mts";

export const tokens: TokenAndRE[] = [
  { token: "open bracket", regexp: /\[/y },
  { token: "close bracket", regexp: /\]/y },
  { token: "number", regexp: /\d+/y },
  { token: "comma", regexp: /,/y },
];

export type ParseError<R> = ParseErrorWantingMore<R> | ParseErrorSkipping<R>;

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

export class ParseErrorWantingMore<R> extends ParseErrorBase {
  resume: (more: string) => R;

  constructor(messageOrExpected: string, resume: (more: string) => R) {
    super(messageOrExpected, EOF);
    this.resume = resume;
  }
}

export class ParseErrorSkipping<R> extends ParseErrorBase {
  resume: () => R;

  constructor(messageOrExpected: string, resume: () => R, matchedToken?: MatchedToken) {
    super(messageOrExpected, matchedToken);
    this.resume = resume;
  }
}

export function resultP<R>(s: SpaceSkippingScanner, k: (r: Result | ParseError<R>) => R): R {
  const token = s.peek();
  if (token === EOF) {
    return k(new ParseErrorWantingMore("form", function resultPEof(more) {
      s.feed(more);
      s.next(); // go to next token
      return resultP(s, k);
    }));
  }

  const { line, column, file } = token;
  switch (token.tokenKind) {
    case "open bracket":
      return arrayP(s, { line, column, file }, k);
    case "number":
      s.next(); // Drop the peeked token
      return numberP(token, k);
    default:
      s.next(); // Drop the peeked token
      // NOTE: To reduce the number of recursive calls, I shouldn't return
      //       a ParseError without a continuation here if this call of the
      //       `resultP` is the entrypoint. But omitted for simplicity.
      return k(
        new ParseErrorSkipping(
          "form",
          () => resultP(s, k),
          token,
        ),
      );
  }
}

function numberP<R>(token: MatchedToken, k: (r: LocatedNumber) => R): R {
  const { line, column, file } = token;
  const { matched } = token;
  return k({ location: { line, column, file }, value: parseInt(matched[0]) });
}

function arrayP<R>(
  s: SpaceSkippingScanner,
  location: Location,
  k: (r: LocatedArray | ParseError<R>) => R,
): R {
  const close = "close bracket";

  s.next(); // drop open paren
  const results: Result[] = [];
  return (function arrayPLoop(): R {
    const next = s.peek();
    if (next === EOF) {
      return k(new ParseErrorWantingMore(
        `form or ${close}`,
        (more) => {
          s.feed(more);
          s.next(); // go to next token
          return arrayPLoop();
        }
      ));
    }
    if (next.tokenKind === close) {
      s.next(); // drop close paren
      return k({ location, value: results });
    }

    // TODO: Parse comma

    return resultP(s, function arrayPNext(r): R {
      if (r instanceof ParseErrorSkipping) {
        return k(
          new ParseErrorSkipping(
            "form",
            () => {
              s.next(); // go to next token
              return arrayPLoop();
            },
            next,
          ),
        );
      }
      if (r instanceof ParseErrorBase) {
        s.next(); // go to next token
        return k(r);
      }
      results.push(r);
      return arrayPLoop();
    });
  })();
}
