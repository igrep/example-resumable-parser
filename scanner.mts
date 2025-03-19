import type { FilePath, Location, ReaderInput } from "./types.mts";

export type TokenKind = string;

export type EOF = null;

export const EOF: EOF = null;

export interface TokenAndRE {
  token: TokenKind;
  regexp: RegExp;
}

export interface MatchedToken extends Location {
  tokenKind: TokenKind;
  matched: RegExpExecArray;
}

export const UNKNOWN_TOKEN: TokenAndRE = {
  token: "unknown",
  regexp: /\S+/y,
};

export class SpaceSkippingScanner {
  readonly #res: TokenAndRE[];
  readonly #path: FilePath;
  #contents: string;
  #position = 0;

  #line = 1;
  // Last position of linebreak.
  #lastLinebreakAt = 0;

  #lastToken: MatchedToken | EOF;

  constructor(res: TokenAndRE[], input: ReaderInput) {
    for (const { token: t, regexp: r } of res) {
      if (!r.sticky) {
        throw new Error(
          `Assertion failed: RegExp for token ${t} must enable the sticky flag`,
        );
      }
    }

    this.#res = res;
    this.#path = input.path;
    this.#contents = input.contents;
    this.#lastToken = this.#next();
  }

  next(): MatchedToken | EOF {
    const lastToken = this.#lastToken;
    this.#lastToken = this.#next();
    return lastToken;
  }

  #next(): MatchedToken | EOF {
    // Skip spaces and record linebreak positions.
    const spacesMd = this.#scan(/\s*/y);
    if (spacesMd === EOF) {
      return EOF;
    }
    const spaces = spacesMd.matched[0];
    let i = spaces.length - 1;
    for (const c of spaces) {
      if (c === "\n") {
        // After this.#scan(/\s*/y)!, this.#position points to the next position,
        // which is at the end of the spaces. So we need to subtract i from this.#position.
        this.#lastLinebreakAt = this.#position - i;
        ++this.#line;
      }
      --i;
    }

    for (const { token: t, regexp: r } of this.#res) {
      const v = this.#scan(r);
      if (v !== EOF) {
        return { tokenKind: t, ...v };
      }
    }

    const unknown = this.#scan(UNKNOWN_TOKEN.regexp);
    if (unknown !== EOF) {
      return {
        tokenKind: UNKNOWN_TOKEN.token,
        ...unknown,
      };
    }
    return EOF;
  }

  peek(): MatchedToken | EOF {
    return this.#lastToken;
  }

  isAtEof(): boolean {
    return this.#lastToken === EOF;
  }


  #scan(r: RegExp): Omit<MatchedToken, "tokenKind"> | EOF {
    if (this.#position >= this.#contents.length) {
      return EOF;
    }

    r.lastIndex = this.#position;
    const md = r.exec(this.#contents);
    if (md === null) {
      return null;
    }
    this.#position = r.lastIndex;
    return {
      matched: md,
      line: this.#line,
      column: md.index - this.#lastLinebreakAt + 1,
      file: this.#path,
    };
  }

  feed(contents: string): void {
    // When the scanner reaches the end of the input,
    // the string fed next should start from the beginning of the line.
    this.#lastLinebreakAt = 0;
    this.#position = 0;
    ++this.#line;

    this.#contents = contents;
  }
}
