import { strict as assert } from 'node:assert';
import { readResumably } from './reader.mts';
import { toJsValue } from "./utils.mts";
import { ParseErrorSkipping, ParseErrorWantingMore } from "./grammar.mts";


const path = "test";
let contents = "";
/*
eslint-disable
  @typescript-eslint/no-explicit-any,
  @typescript-eslint/no-unsafe-assignment,
  @typescript-eslint/no-unsafe-argument,
  @typescript-eslint/no-unsafe-return
*/
let actual: any;

console.log("Case: readResumably with full input available");
contents = "[[1 [2 3] [] ] 4]";
actual = readResumably({ path, contents }, (r) => r);
const expectedWithPosition = {
  location: { column: 1, file: 'test', line: 1 },
  value: [
    {
      location: { column: 2, file: 'test', line: 1 },
      value: [
        {
          location: { column: 3, file: 'test', line: 1 },
          value: 1
        },
        {
          location: { column: 5, file: 'test', line: 1 },
          value: [
            {
              location: { column: 6, file: 'test', line: 1 },
              value: 2
            },
            {
              location: { column: 8, file: 'test', line: 1 },
              value: 3
            },
          ],
        },
        {
          location: { column: 11, file: 'test', line: 1 },
          value: [],
        },
      ],
    },
    {
      location: { column: 16, file: 'test', line: 1 },
      value: 4,
    },
  ],
};
assert.deepStrictEqual(
  actual,
  expectedWithPosition,
);

console.log("Case: toJsValue");
const expected = [[1, [2, 3], [], ], 4];
assert.deepStrictEqual(
  toJsValue(expectedWithPosition),
  expected,
)

console.log("Case: readResumably when the input is split into two parts");

for (
  let chunk1Length = 0;
  chunk1Length < contents.length - 1;
  chunk1Length++
) {
  console.log(`  - ${chunk1Length + 1}`);
  const chunk1 = contents.slice(0, chunk1Length);
  const chunk2 = contents.slice(chunk1Length);
  let first = true;
  actual = readResumably({ path, contents: chunk1 }, (r) => {
    if (first) {
      first = false;
      if (r instanceof ParseErrorWantingMore) {
        return r.resume(chunk2);
      }
      assert.fail(`${JSON.stringify(r)} is not ParseErrorWantingMore`);
    }
    return r;
  });
  assert.deepStrictEqual(
    toJsValue(actual),
    expected,
  );
}

console.log("Case: readResumably when the input is split into three parts");

for (
  let chunk1Length = 0;
  chunk1Length < contents.length - 2;
  chunk1Length++
) {
  for (
    let chunk2Length = chunk1Length + 1;
    chunk2Length < contents.length - 1;
    chunk2Length++
  ) {
    console.log(`  - ${chunk1Length + 1} - ${chunk2Length + 1}`);
    const chunk1 = contents.slice(0, chunk1Length);
    const chunk2 = contents.slice(chunk1Length, chunk2Length);
    const chunk3 = contents.slice(chunk2Length);
    let count = 0;
    actual = readResumably({ path, contents: chunk1 }, (r) => {
      switch (count) {
        case 0:
          if (r instanceof ParseErrorWantingMore) {
            count++;
            return r.resume(chunk2);
          }
          assert.fail(`${JSON.stringify(r)} is not ParseErrorWantingMore`);
        case 1:
          if (r instanceof ParseErrorWantingMore) {
            count++;
            return r.resume(chunk3);
          }
          assert.fail(`${JSON.stringify(r)} is not ParseErrorWantingMore`);
        default:
          return r;
      }
    });
    assert.deepStrictEqual(
      toJsValue(actual),
      expected,
    );
  }
}

console.log("Case: readResumably with full input available, but contains unkonwn tokens");
contents = "[[1 [2 x 3] [] ] 4]";
let first = true;
actual = readResumably({ path, contents }, (r) => {
  console.log(r);
  if (first) {
    first = false;
    if (r instanceof ParseErrorSkipping) {
      return r.resume();
    }
    assert.fail(`${JSON.stringify(r)} is not ParseErrorSkipping`);
  }
  return r;
});
assert.deepStrictEqual(
  toJsValue(actual),
  expected,
);

// TODO

console.log("OK");
