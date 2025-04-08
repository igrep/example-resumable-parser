import { strict as assert } from 'node:assert';
import { readResumably } from './reader.mts';
import { assertNonError, toJsValue } from "./utils.mts";
import { ParseErrorSkipping, ParseErrorWantingMore } from "./grammar.mts";

/*
eslint-disable
  @typescript-eslint/no-explicit-any,
  @typescript-eslint/no-unsafe-argument
*/

const path = "test";
let contents = "";
let actual: any;

console.log("Case: readResumably with full input available");
contents = "[[1, [2, 3], [] ], 4]";
//contents = "[[1 [2 3] [] ] 4]";
actual = readResumably({ path, contents });
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
          location: { column: 6, file: 'test', line: 1 },
          value: [
            {
              location: { column: 7, file: 'test', line: 1 },
              value: 2
            },
            {
              location: { column: 10, file: 'test', line: 1 },
              value: 3
            },
          ],
        },
        {
          location: { column: 14, file: 'test', line: 1 },
          value: [],
        },
      ],
    },
    {
      location: { column: 20, file: 'test', line: 1 },
      value: 4,
    },
  ],
};
assert.deepStrictEqual(
  actual,
  expectedWithPosition,
);

console.log("Case: toJsValue");
const expected = [[1, [2, 3], [] ], 4];
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
  const actual1 = readResumably({ path, contents: chunk1 });
  assert.ok(actual1 instanceof ParseErrorWantingMore, `${JSON.stringify(actual1)} is not ParseErrorWantingMore`);
  actual = actual1.resume(chunk2);
  assert.deepStrictEqual(
    toJsValue(assertNonError(actual)),
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
    const actual1 = readResumably({ path, contents: chunk1 });
    assert.ok(actual1 instanceof ParseErrorWantingMore, `actual1: ${JSON.stringify(actual1)} is not ParseErrorWantingMore`);
    const actual2 = actual1.resume(chunk2);
    assert.ok(actual2 instanceof ParseErrorWantingMore, `actual2: ${JSON.stringify(actual2)} is not ParseErrorWantingMore`);
    actual = actual2.resume(chunk3);
    assert.deepStrictEqual(
      toJsValue(assertNonError(actual)),
      expected,
    );
  }
}

console.log("Case: readResumably with full input available, but contains an unkonwn token");
for (let i = 0; i < contents.length; i++) {
  const contentsWithUnknownToken = contents.slice(0, i) + "x" + contents.slice(i);
  console.log(`  - ${i + 1} ${contentsWithUnknownToken}`);

  const actual1 = readResumably({ path, contents: contentsWithUnknownToken });
  assert.ok(actual1 instanceof ParseErrorSkipping, `${JSON.stringify(actual1)} is not ParseErrorSkipping`);
  actual = actual1.resume();
  assert.deepStrictEqual(
    toJsValue(assertNonError(actual)),
    expected,
  );
}

console.log("Case: readResumably when the input contains an EOF and an unkonwn token");
for (
  let chunk1Length = 0;
  chunk1Length < contents.length - 1;
  chunk1Length++
) {
  const chunk1 = contents.slice(0, chunk1Length);
  const chunk2 = contents.slice(chunk1Length);
  for (
    let unknownTokenPosition = 0;
    unknownTokenPosition < chunk2.length;
    unknownTokenPosition++
  ) {
    const chunk2WithUnknownToken =
      chunk2.slice(0, unknownTokenPosition) + "x" + chunk2.slice(unknownTokenPosition);
    console.log(`  - ${chunk1Length + 1} - ${unknownTokenPosition + 1} ${chunk1}\\n${chunk2WithUnknownToken}`);
    const actual1 = readResumably({ path, contents: chunk1 });
    assert.ok(
      actual1 instanceof ParseErrorWantingMore,
      `${JSON.stringify(actual1)} is not ParseErrorWantingMore`,
    );
    const actual2 = actual1.resume(chunk2WithUnknownToken);
    assert.ok(
      actual2 instanceof ParseErrorSkipping,
      `${JSON.stringify(actual2)} is not ParseErrorSkipping`,
    );
    actual = actual2.resume();
    assert.deepStrictEqual(
      toJsValue(assertNonError(actual)),
      expected,
    );
  }
}

console.log("Case: readResumably when the input contains an unknown token and an EOF in the middle");
for (
  let unknownTokenPosition = 0;
  unknownTokenPosition < contents.length;
  unknownTokenPosition++
) {
  const contentsWithUnknownToken =
    contents.slice(0, unknownTokenPosition) + "x" + contents.slice(unknownTokenPosition);
  for (
    let chunk2StartsAt = unknownTokenPosition + 1;
    chunk2StartsAt < contentsWithUnknownToken.length - 1;
    chunk2StartsAt++
  ) {
    const chunk1 = contentsWithUnknownToken.slice(0, chunk2StartsAt);
    const chunk2 = contentsWithUnknownToken.slice(chunk2StartsAt);
    console.log(`  - ${unknownTokenPosition + 1} - ${chunk2StartsAt + 1} ${chunk1}\\n${chunk2}`);
    const actual1 = readResumably({ path, contents: chunk1 });
    assert.ok(
      actual1 instanceof ParseErrorSkipping,
      `${JSON.stringify(actual1)} is not ParseErrorSkipping`,
    );
    const actual2 = actual1.resume();
    assert.ok(
      actual2 instanceof ParseErrorWantingMore,
      `${JSON.stringify(actual2)} is not ParseErrorWantingMore`,
    );
    actual = actual2.resume(chunk2);
    assert.deepStrictEqual(
      toJsValue(assertNonError(actual)),
      expected,
    );
  }
}

console.log("Case: readResumably when the input doesn't contain a comma between two numbers in an array");
actual = readResumably({ path, contents: "[1 2]" });
assert.ok(actual instanceof ParseErrorSkipping, `${JSON.stringify(actual)} is not ParseErrorSkipping`);
assert.deepStrictEqual(
  actual.message,
  `Expected comma, but got number: "2", at line 1, column 4`,
);
actual = readResumably({ path, contents: "[1, 2[]]" });
assert.ok(actual instanceof ParseErrorSkipping, `${JSON.stringify(actual)} is not ParseErrorSkipping`);
assert.deepStrictEqual(
  actual.message,
  `Expected comma, but got open bracket: "[", at line 1, column 6`,
);

console.log("OK");
