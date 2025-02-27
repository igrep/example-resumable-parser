#!/usr/bin/env node

import { resultP, tokens } from "./grammar.mts";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { SpaceSkippingScanner } from "./scanner.mts";

/* eslint-disable @typescript-eslint/no-explicit-any */

const rl = readline.createInterface({ input, output });

function finalize(): void {
  rl.close();
  input.destroy();
}

async function loop(): Promise<void> {
  try {
    const position = { line: 1, column: 1, file: "(REPL)" };
    const s = new SpaceSkippingScanner(tokens, position.file);
    const p = resultP(s);
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
      position.column = s.peek().column;
      position.line = s.peek().line;
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
