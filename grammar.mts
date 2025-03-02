import type {
  MatchedToken,
  SpaceSkippingScanner,
  TokenAndRE,
} from "./scanner.mts";
import { EOF } from "./scanner.mts";
import type {
  LocatedArray,
  LocatedNumber,
  Location,
  Result
} from "./types.mts";

export const tokens: TokenAndRE[] = [
  { token: "open bracket", regexp: /\[/y },
  { token: "close bracket", regexp: /\]/y },
  { token: "number", regexp: /d+/y },
  { token: "comma", regexp: /,/y },
];

export class ParseError extends Error {
  override name = "ParseError";
  readonly wantsMore: boolean = false;

  constructor(messageOrExpected: string, matchedToken?: MatchedToken | EOF) {
    if (matchedToken === undefined) {
      super(messageOrExpected);
      return;
    }
    if (matchedToken === EOF) {
      super(`Expected ${messageOrExpected}, but got end of input`);
      this.wantsMore = true;
      return;
    }
    const { line, column, tokenKind, matched } = matchedToken;
    super(
      `Expected ${messageOrExpected}, but got ${tokenKind}: "${matched[0]}", at line ${line}, column ${column}`,
    );
  }
}

export type Parser<T> = Generator<T | ParseError, T | ParseError, string>;

export function* resultP(s: SpaceSkippingScanner): Parser<Result> {
  while (true) {
    const token = s.peek();
    if (token === EOF) {
      return new ParseError("form", EOF);
    }

    const {line, column, file} = token;
    switch (token.tokenKind) {
      case "open bracket":
        const p = arrayP(s, { line, column, file });
        let { value } = p.next();
        while (true) {
          if (value instanceof ParseError) {
            const moreContents = yield(value);
            if (value.wantsMore) {
              ({ value } = p.next(moreContents));
            }
            continue;
          }
          yield value;
          ({ value } = p.next());
        }
      case "number":
        s.next(); // Drop the peeked token
        yield numberP(token);
        break;
      default:
        yield new ParseError("form", token);
        break;
    }
  }
}

function numberP(token: MatchedToken): LocatedNumber {
  const { line, column, file } = token;
  const { matched } = token;
  return { location: { line, column, file }, value: parseInt(matched[0]) };
}

function* arrayP(
  s: SpaceSkippingScanner,
  location: Location,
): Parser<LocatedArray> {
  const close = "close bracket";

  s.next(); // drop open paren

  const p = resultP(s);
  const value: Result[] = [];
  while (true) {
    const next = s.peek();
    if (next === EOF) {
      const moreContents = yield(new ParseError(`form or ${close}`, EOF));
      s.feed(moreContents);
      continue;
    }
    if (next.tokenKind === close) {
      s.next(); // drop close paren
      break;
    }

    // TODO: Parse comma

    let { value: nextValue } = p.next();
    if (nextValue instanceof ParseError) {
      const moreContents = yield(nextValue);
      if (nextValue.wantsMore) {
        ({ value: nextValue } = p.next(moreContents));
      }
      continue;
    }
    value.push(nextValue);
  }

  return { location, value };
}
