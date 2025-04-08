#!/usr/bin/env node

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { readResumably } from "./reader.mts";
import { ParseErrorSkipping, ParseErrorWantingMore } from "./grammar.mts";
import { toJsValue } from "./utils.mts";

const rl = readline.createInterface({input, output});

function finalize(): void {
  rl.close();
  input.destroy();
}

type Position = {
  line: number;
  column: number;
  file: string
};

async function cliLoop(position: Position = {line: 1, column: 1, file: "(REPL)"}): Promise<void> {
  try {
    while (true) {
      const answer = await ask(position, ">>>");
      if (answer === "") {
        finalize();
        break;
      }
      let r = readResumably({ path: position.file, contents: answer });
      while (true) {
        if (r instanceof ParseErrorSkipping) {
          console.log("ParseErrorSkipping", r.message);
          r = r.resume();
          continue;
        }
        if (r instanceof ParseErrorWantingMore) {
          position.column = r.location.column;
          position.line = r.location.line;
          const more = await ask(position, "...");
          r = r.resume(more);
          continue;
        }
        break;
      }
      console.log(toJsValue(r));
      position.column = r.location.column;
      position.line = r.location.line;
    }
  } catch (err) {
    finalize();
    throw err;
  }
}

async function ask(
  position: Position,
  promptPrefix: string,
): Promise<string> {
  return await rl.question(
    `${position.file}:${position.line},${position.column}:${promptPrefix} `
  );
}

cliLoop();
