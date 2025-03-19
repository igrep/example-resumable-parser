#!/usr/bin/env node

import * as readline from "node:readline";
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

function cliLoop(position: Position = {line: 1, column: 1, file: "(REPL)"}) {
  try {
    ask(position, ">", (answer) => {
      readResumably(
        { path: position.file, contents: answer },
        function loop2(r) {
          if (r instanceof ParseErrorSkipping) {
            console.log("ParseErrorSkipping", r.message);
            return r.resume();
          }
          if (r instanceof ParseErrorWantingMore) {
            return ask(position, "|", (more) => {
              return r.resume(more);
            });
          }

          console.log(toJsValue(r));
          // TODO: Set correct position from the result
          position.column = 1;
          position.line += 1;

          cliLoop(position);
        }
      );
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
