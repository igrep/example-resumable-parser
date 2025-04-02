#!/usr/bin/env node

import * as readline from "node:readline";
import { stdin as input, stdout as output } from "node:process";

import { readResumably } from "./reader.mts";
import { type ParseError, ParseErrorSkipping, ParseErrorWantingMore } from "./grammar.mts";
import { toJsValue } from "./utils.mts";
import { type Result } from "./types.mts";

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

function cliLoop(position: Position = {line: 1, column: 1, file: "(REPL)"}) {
  try {
    ask(position, ">>>", (answer) => {
      let r = readResumably({ path: position.file, contents: answer });
      function handleResult(r: Result | ParseError<Result>) {
        if (r instanceof ParseErrorSkipping) {
          console.log("ParseErrorSkipping", r.message);
          return handleResult(r.resume());
        }
        if (r instanceof ParseErrorWantingMore) {
          position.column = r.location.column;
          position.line = r.location.line;
          return ask(position, "...", (more) => {
            return handleResult(r.resume(more));
          });
        }

        console.log(toJsValue(r));
      }
      handleResult(r);
      position.column = r.location.column;
      position.line = r.location.line;

      cliLoop(position);
    });
  } catch (err) {
    finalize();
    throw err;
  }
}

function ask(
  position: Position,
  promptPrefix: string,
  k: (answer: string) => void,
): void {
  rl.question(
    `${position.file}:${position.line},${position.column}:${promptPrefix} `,
    (answer) => {
      if (answer === "") {
        finalize();
        return;
      }
      k(answer);
    });
}

cliLoop();
