#!/usr/bin/env node

import { ParseError, resultP, tokens } from "./grammar.mts";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { SpaceSkippingScanner } from "./scanner.mts";
import { readResumably } from "./reader.mts";

/* eslint-disable @typescript-eslint/no-explicit-any */

const rl = readline.createInterface({ input, output });

function finalize(): void {
  rl.close();
  input.destroy();
}

async function loop(): Promise<void> {
  try {
    const position = { line: 1, column: 1, file: "(REPL)" };
    const p = readResumably(position.file);
    while (true) {
      const answer = await rl.question(
        `${position.file}:${position.line},${position.column}:> `
      );
      if (answer === "") {
        finalize();
        break;
      }
      const { value } = p.next(answer);
      console.log(value);
      if (!(value instanceof ParseError)) {
        position.column = value.location.column;
        position.line = value.location.line;
      }
    }
  } catch (err) {
    finalize();
    throw err;
  }
}

export function assertNonError<T>(v: T | Error): T {
  if (v instanceof Error) {
    throw v;
  }
  return v;
}

loop();
