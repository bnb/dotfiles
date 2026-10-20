import { describe, expect, test } from "vitest";
import { countPatchLines, numberPatch, patchLines, visibleLines } from "../src/patch.ts";

const PATCH = [
  "diff --git a/f b/f",
  "index 1..2 100644",
  "--- a/f",
  "+++ b/f",
  "@@ -12,3 +13,3 @@ function f() {",
  " keep",
  "-gone",
  "+came",
  " keep",
  "\\ No newline at end of file",
  "",
].join("\n");

// The same lines in a second file that git doesn't count: no hunk header.
const TYPE_CHANGE = [
  "diff --git a/l b/l",
  "deleted file mode 100644",
  "--- a/l",
  "+++ /dev/null",
  "@@ -1,2 +0,0 @@",
  "-one",
  "-two",
  "diff --git a/l b/l",
  "new file mode 120000",
  "--- /dev/null",
  "+++ b/l",
  "@@ -0,0 +1 @@",
  "+target",
].join("\n");

describe("patchLines", () => {
  test("numbers hunk lines on each side and leaves headers alone", () => {
    expect([...patchLines(PATCH)].map(({ kind, old, new: next }) => [kind, old, next])).toEqual([
      [null, null, null],
      [null, null, null],
      [null, null, null],
      [null, null, null],
      [null, null, null],
      [" ", 12, 13],
      ["-", 13, null],
      ["+", null, 14],
      [" ", 14, 15],
      ["\\", null, null],
      [null, null, null],
    ]);
  });

  test("doesn't count file headers that look like changes", () => {
    const kinds = [...patchLines(TYPE_CHANGE)].map((line) => line.kind);
    expect(kinds.filter((kind) => kind === "-")).toHaveLength(2);
    expect(kinds.filter((kind) => kind === "+")).toHaveLength(1);
  });
});

test("countPatchLines counts hunk lines across files", () => {
  expect(countPatchLines(PATCH)).toEqual({ additions: 1, deletions: 1 });
  expect(countPatchLines(TYPE_CHANGE)).toEqual({ additions: 1, deletions: 2 });
  expect(countPatchLines("Binary files /dev/null and b/x differ\n")).toEqual({
    additions: 0,
    deletions: 0,
  });
});

test("visibleLines counts context lines on both sides", () => {
  expect(visibleLines(PATCH)).toEqual({ old: new Set([12, 13, 14]), new: new Set([13, 14, 15]) });
  expect(visibleLines(TYPE_CHANGE)).toEqual({ old: new Set([1, 2]), new: new Set([1]) });
});

describe("numberPatch", () => {
  test("prefixes hunk lines with old and new numbers", () => {
    expect(numberPatch(PATCH)).toBe(
      [
        "diff --git a/f b/f",
        "index 1..2 100644",
        "--- a/f",
        "+++ b/f",
        "@@ -12,3 +13,3 @@ function f() {",
        "  12  13  │  keep",
        "  13      │ -gone",
        "      14  │ +came",
        "  14  15  │  keep",
        "          │ \\ No newline at end of file",
        "",
      ].join("\n"),
    );
  });

  test("widens the columns for long files", () => {
    const patch = "@@ -9999 +10000 @@\n-a\n+b";
    expect(numberPatch(patch).split("\n").slice(1)).toEqual([
      "   9999         │ -a",
      "         10000  │ +b",
    ]);
  });
});
