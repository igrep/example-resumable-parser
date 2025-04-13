# example-resumable-parser

Example resumable recursive descent parser using Continuation Passing Style written in TypeScript.

# Introduction

Recursive descent parsers are a common way to parse structured text. While people who learn creating interpreters/compilers often choose their first choice as the parser, even industrial language processors adopt them (e.g., [JavaScriptCore](https://docs.webkit.org/Deep%20Dive/JSC/JavaScriptCore.html)). However, their naive implementations are not suitable for the use cases below:

- REPL: Modern REPL can suspend parsing given an incomplete input. For example, the user presses the Enter before closing the array.
- Error recovery: When a naive parser encounters an invalid token, it immediately aborts there.

As a solution of the problem above, this repository provides an example parser that its caller can decide when to stop parsing and what to do, when it encounters an invalid token or an end of input with its resumable feature. The resumable feature is implemented using Continuation Passing Style (CPS). CPS enables the parser to return the continuation of the parsing process, which contains the current state of the parser as the stack frame.

# Example

See [cli.mts](./cli.mts) or [test.ts](./test.ts) for usage examples. Both applications, parse an array of integers from a string:


```bash
> node cli.mts
(REPL):1,1:>>> [1,
(REPL):1,4:...   [2, 3
(REPL):2,8:... ], 4
(REPL):3,5:... ]
[ 1, [ 2, 3 ], 4 ]
```

⚠️NOTE: Both applications depend on Node.js' type stripping feature, which is available since Node.js v22.7. I haven't tested with non-Node.js runtimes (e.g., Deno and Bun), and perhaps they can't run because the applications depend on `node:readline/promises`, `node:process`, and `node:assert`. Forgive me, this is just a demo!

# References

- [parsing - How to write an *interruptible* recursive(?) descent parser - Stack Overflow](https://stackoverflow.com/questions/23131150/how-to-write-an-interruptible-recursive-descent-parser)
- [The source code of attoparsec](https://github.com/haskell/attoparsec).
