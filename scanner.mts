import type { FilePath, Location, ReaderInput } from "./types.mts";

export type TokenKind = string;

export interface Eof extends Location {
  tokenKind: "EOF";
}

export function eof(l: Location): Eof {
  return { tokenKind: "EOF", ...l };
}

export function isEof(v: Omit<MatchedToken, "tokenKind"> | Eof): v is Eof {
  return "tokenKind" in v && v.tokenKind === "EOF";
}

export interface TokenAndRE {
  token: TokenKind;
  regexp: RegExp;
}

export interface MatchedToken extends Location {
  tokenKind: TokenKind;
  matched: RegExpExecArray;
}

export class SpaceSkippingScanner {
  readonly #res: TokenAndRE[];
  readonly #path: FilePath;
  #contents: string;
  #position = 0;

  #line = 1;
  // Last position of linebreak.
  #lastLinebreakAt = 0;

  #lastToken: MatchedToken | Eof;

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

  next(): MatchedToken | Eof {
    const lastToken = this.#lastToken;
    this.#lastToken = this.#next();
    return lastToken;
  }

  #next(): MatchedToken | Eof {
    // Skip spaces and record linebreak positions.
    const spacesMd = this.#scan(/\s*/y);
    if (isEof(spacesMd as Omit<MatchedToken, "tokenKind"> | Eof)) {
      return spacesMd as Eof;
    }
    const spaces = (spacesMd as Omit<MatchedToken, "tokenKind">).matched[0];
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
      if (v === null) {
        continue;
      }
      if (isEof(v)) {
        return v;
      }
      return { tokenKind: t, ...v };
    }
    throw new Error(`No token found at ${this.#position}. You must give token definitions matching any characters.`);
  }

  peek(): MatchedToken | Eof {
    return this.#lastToken;
  }

  isAtEof(): boolean {
    return this.#lastToken.tokenKind === "EOF";
  }


  #scan(r: RegExp): Omit<MatchedToken, "tokenKind"> | Eof | null {
    if (this.#position >= this.#contents.length) {
      return eof({
        line: this.#line,
        column: this.#position - this.#lastLinebreakAt + 1,
        file: this.#path
      });
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
