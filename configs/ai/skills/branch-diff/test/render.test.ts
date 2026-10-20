import type { Spec, UIElement } from "@json-render/core";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { collect } from "../src/collect.ts";
import type { DiffData } from "../src/data.ts";
import {
  checkSpec,
  parseSpec,
  PAYLOAD_MARKER,
  pickGrammars,
  renderHtml,
  SpecError,
  type Grammars,
} from "../src/render.ts";
import {
  createFixtureRepo,
  fixtureSpec,
  makeData,
  makeFile,
  removeTempDirs,
  SCRIPT_BREAKOUT,
  toJsonl,
} from "./helpers.ts";

let data: DiffData;
beforeAll(() => {
  data = collect({ cwd: createFixtureRepo().root });
});
afterAll(removeTempDirs);

/** The fixture spec with some elements replaced, added, or (as undefined) removed. */
function specWith(elements: Record<string, UIElement | undefined>, children?: string[]): Spec {
  const spec = fixtureSpec();
  for (const [key, element] of Object.entries(elements)) {
    if (element) spec.elements[key] = element;
    else delete spec.elements[key];
  }
  if (children) spec.elements[spec.root]!.children = children;
  return spec;
}

const group = (paths: unknown[], extra: Record<string, unknown> = {}): UIElement => ({
  type: "ChangeGroup",
  props: { title: "Group", paths, ...extra },
  children: [],
});

describe("parseSpec", () => {
  test("reports every line that isn't valid JSON instead of skipping it", () => {
    const lines = toJsonl(fixtureSpec()).split("\n");
    lines.splice(2, 0, '{"op":"add","path":"/elements/x","value":{"type":"Text",');
    lines.push("not json");
    expect(() => parseSpec(lines.join("\n"))).toThrow(
      new SpecError([`spec line 3 isn't valid JSON`, `spec line ${lines.length} isn't valid JSON`]),
    );
  });

  test("reports a truncated one-line spec", () => {
    expect(() => parseSpec('{"root":"page","elements":{')).toThrow(
      new SpecError(["spec line 1 isn't valid JSON"]),
    );
  });

  test("accepts the stream or a whole spec in a code fence", () => {
    expect(parseSpec(`\`\`\`jsonl\n${toJsonl(fixtureSpec())}\n\`\`\`\n`)).toEqual(fixtureSpec());
    expect(parseSpec(`\`\`\`json\n${JSON.stringify(fixtureSpec(), null, 2)}\n\`\`\``)).toEqual(
      fixtureSpec(),
    );
  });

  test("reads the JSONL patch stream", () => {
    expect(parseSpec(toJsonl(fixtureSpec()))).toEqual(fixtureSpec());
  });

  test("reads JSONL with CRLF line endings", () => {
    expect(parseSpec(toJsonl(fixtureSpec()).replaceAll("\n", "\r\n"))).toEqual(fixtureSpec());
  });

  test("reads a whole spec as JSON, compact or indented", () => {
    expect(parseSpec(JSON.stringify(fixtureSpec()))).toEqual(fixtureSpec());
    expect(parseSpec(`\n${JSON.stringify(fixtureSpec(), null, 2)}\n`)).toEqual(fixtureSpec());
  });
});

describe("checkSpec", () => {
  test("passes a spec that shows every file once", () => {
    expect(checkSpec(fixtureSpec(), data)).toEqual([]);
  });

  test("reports props the catalog rejects", () => {
    const problems = checkSpec(
      specWith({ header: { type: "DiffHeader", props: { title: 3 }, children: [] } }),
      data,
    );
    expect(problems).toEqual([expect.stringMatching(/^header: title: .*expected string/)]);
  });

  test("reports a ChangeGroup without paths instead of crashing", () => {
    const problems = checkSpec(
      specWith({ app: { type: "ChangeGroup", props: { title: "App" }, children: [] } }),
      data,
    );
    expect(problems).toEqual([expect.stringMatching(/^app: paths: .*expected array/)]);
  });

  test.each([
    ["an unknown prop", { color: "red" }, /^app: Unrecognized key: "color"$/],
    ["a risk outside the scale", { risk: "severe" }, /^app: risk: Invalid option/],
    [
      "a note on both sides",
      { notes: [{ path: "src/app.ts", line: 10, side: "both", text: "x" }] },
      /^app: notes\.0\.side: /,
    ],
    [
      "a line number as a string",
      { notes: [{ path: "src/app.ts", line: "10", side: "new", text: "x" }] },
      /^app: notes\.0\.line: .*expected number/,
    ],
  ])("reports %s", (_, props, problem) => {
    const spec = fixtureSpec();
    Object.assign(spec.elements.app!.props, props);
    expect(checkSpec(spec, data)).toEqual([expect.stringMatching(problem)]);
  });

  test("reports structure and prop problems together", () => {
    const children = [...fixtureSpec().elements.page!.children!, "ghost"];
    const spec = specWith(
      { header: { type: "DiffHeader", props: { title: 3 }, children: [] } },
      children,
    );
    expect(checkSpec(spec, data)).toEqual([
      expect.stringMatching(/^page: .*"ghost"/),
      expect.stringMatching(/^header: title: /),
    ]);
  });

  test("lets optional props be left out", () => {
    const spec = specWith({
      header: { type: "DiffHeader", props: { title: "Short" }, children: [] },
    });
    expect(checkSpec(spec, data)).toEqual([]);
  });

  test("reports unknown component types", () => {
    const problems = checkSpec(
      specWith({ header: { type: "Banner", props: {}, children: [] } }),
      data,
    );
    expect(problems).toEqual([expect.stringMatching(/^header: type: /)]);
  });

  test("reports an element the root can't reach, since its files wouldn't render", () => {
    const children = fixtureSpec().elements.page!.children!.filter((key) => key !== "generated");
    expect(checkSpec(specWith({}, children), data)).toEqual([
      'generated: Element "generated" is not reachable from root "page".',
    ]);
  });

  test("reports a missing child", () => {
    const children = [...fixtureSpec().elements.page!.children!, "ghost"];
    expect(checkSpec(specWith({}, children), data)).toEqual([
      'page: Element "page" references child "ghost" which does not exist in the elements map.',
    ]);
  });

  test("reports a path that isn't a changed file", () => {
    const problems = checkSpec(specWith({ removed: group(["removed.txt", "nope.ts"]) }), data);
    expect(problems).toEqual(["removed: nope.ts isn't a changed file"]);
  });

  test("reports a file shown twice", () => {
    const problems = checkSpec(specWith({ removed: group(["removed.txt", "src/app.ts"]) }), data);
    expect(problems).toEqual(["removed: src/app.ts is already shown by app"]);
  });

  test("reports files left out", () => {
    const children = ["header", "files", "commits", "app", "rename", "assets"];
    const problems = checkSpec(
      specWith({ removed: undefined, generated: undefined }, children),
      data,
    );
    expect(problems).toEqual(["not shown anywhere: pnpm-lock.yaml, removed.txt"]);
  });

  test.each([
    ["new", "src/app.ts line 2 (new) isn't in the diff (new side shows 7-13, 18-21)"],
    ["old", "src/app.ts line 2 (old) isn't in the diff (old side shows 7-13, 18-20)"],
  ] as const)("reports a note on a %s line outside the diff", (side, message) => {
    const spec = fixtureSpec();
    spec.elements.app!.props.notes = [{ path: "src/app.ts", line: 2, side, text: "far away" }];
    expect(checkSpec(spec, data)).toEqual([`app: ${message}`]);
  });

  test("accepts a note on a removed line by its old number", () => {
    const spec = fixtureSpec();
    spec.elements.app!.props.notes = [
      { path: "src/app.ts", line: 10, side: "old", text: "was 10" },
    ];
    expect(checkSpec(spec, data)).toEqual([]);
  });

  test("reports a FileDiff note outside the diff", () => {
    const spec = fixtureSpec();
    spec.elements.rename!.props.notes = [{ line: 40, side: "new", text: "nope" }];
    expect(checkSpec(spec, data)).toEqual([
      "rename: new-name.txt line 40 (new) isn't in the diff (new side shows 8-11)",
    ]);
  });

  test("reports a note on the new side of a deleted file", () => {
    const spec = fixtureSpec();
    spec.elements.removed!.props.notes = [{ line: 1, side: "new", text: "gone" }];
    expect(checkSpec(spec, data)).toEqual([
      "removed: removed.txt line 1 (new) isn't in the diff (new side shows no lines)",
    ]);
  });

  test.each([
    ["no root", { elements: fixtureSpec().elements }, /^root: /],
    [
      "a root that isn't an element",
      { ...fixtureSpec(), root: "nope" },
      /^Root element "nope" not found/,
    ],
  ])("reports a spec with %s", (_, spec, problem) => {
    expect(checkSpec(spec as Spec, data)).toContainEqual(expect.stringMatching(problem));
  });

  test("reports a note whose path isn't in its group", () => {
    const spec = fixtureSpec();
    spec.elements.app!.props.notes = [
      { path: "removed.txt", line: 1, side: "old", text: "wrong group" },
    ];
    expect(checkSpec(spec, data)).toEqual(["app: note path removed.txt isn't in this group"]);
  });

  test("reports notes on files with no text diff", () => {
    const big = makeFile({ path: "big.txt", patch: null });
    const binary = makeFile({
      path: "logo.png",
      binary: true,
      patch: "diff --git a/logo.png b/logo.png\nBinary files /dev/null and b/logo.png differ\n",
    });
    const note = (path: string) => ({ path, line: 1, side: "new", text: "?" });
    const spec: Spec = {
      root: "files",
      elements: {
        files: group(["big.txt", "logo.png"], { notes: [note("big.txt"), note("logo.png")] }),
      },
    };
    expect(checkSpec(spec, makeData([big, binary]))).toEqual([
      "files: note on big.txt, which has no text diff to pin it to",
      "files: note on logo.png, which has no text diff to pin it to",
    ]);
  });

  test.each([
    ["one path", [{ $state: "/path" }], "paths.0"],
    ["the whole list", { $state: "/paths" }, "paths"],
  ])("requires literal paths, not an expression for %s", (_, paths, field) => {
    const spec = specWith({ removed: group([]) });
    spec.elements.removed!.props.paths = paths;
    spec.state = { path: "removed.txt", paths: ["removed.txt"] };
    expect(checkSpec(spec, data)).toEqual([
      expect.stringMatching(new RegExp(`^removed: ${field}: `)),
    ]);
  });

  test("allows expressions in props that don't name files", () => {
    const spec = specWith(
      {
        tabs: {
          type: "Tabs",
          props: { tabs: [{ label: "A", value: "a" }], value: { $bindState: "/tab" } },
          children: [],
        },
      },
      [...fixtureSpec().elements.page!.children!, "tabs"],
    );
    spec.state = { tab: "a" };
    expect(checkSpec(spec, data)).toEqual([]);
  });

  test("reports a FileList path that isn't a changed file", () => {
    const spec = specWith({
      files: {
        type: "FileList",
        props: { title: null, paths: ["src/app.ts", "ghost.ts"] },
        children: [],
      },
    });
    expect(checkSpec(spec, data)).toEqual(["files: ghost.ts isn't a changed file"]);
  });
});

describe("pickGrammars", () => {
  const grammar = (name: string) => ({ name, scopeName: `source.${name}` });
  const all: Grammars = {
    lookup: {
      typescript: ["typescript"],
      tsx: ["typescript", "tsx"],
      python: ["python"],
      rust: ["rust"],
      go: ["go"],
    },
    grammars: Object.fromEntries(
      ["typescript", "tsx", "python", "rust", "go"].map((name) => [name, grammar(name)]),
    ),
  };

  test("keeps only languages with a text diff", () => {
    const picked = pickGrammars(
      all,
      makeData([
        makeFile({ path: "a.ts" }),
        makeFile({ path: "b.tsx" }),
        makeFile({ path: "c.py", binary: true }),
        makeFile({ path: "d.rs", patch: null }),
        makeFile({ path: "notes.unknown" }),
      ]),
    );
    expect(picked).toEqual({
      lookup: { typescript: ["typescript"], tsx: ["typescript", "tsx"] },
      grammars: { typescript: grammar("typescript"), tsx: grammar("tsx") },
    });
  });

  test("picks nothing for an empty diff", () => {
    expect(pickGrammars(all, makeData([]))).toEqual({ lookup: {}, grammars: {} });
  });
});

describe("renderHtml", () => {
  const viewer = `<html><head><title>Branch diff</title></head><body>${PAYLOAD_MARKER}</body></html>`;
  const grammars: Grammars = { lookup: {}, grammars: {} };
  const embedded = (html: string) =>
    /<script type="application\/json" id="branch-diff-payload">(.*?)<\/script>/s.exec(html)?.[1];

  test("embeds the payload so file contents can't close the script tag", () => {
    const html = renderHtml(viewer, { data, spec: fixtureSpec(), grammars });
    expect(data.files.some((file) => file.patch?.includes(SCRIPT_BREAKOUT))).toBe(true);
    expect(html).not.toContain(SCRIPT_BREAKOUT);
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    expect(JSON.parse(embedded(html)!)).toEqual({ data, spec: fixtureSpec(), grammars });
  });

  test("keeps replacement patterns in the payload literal", () => {
    const tricky = makeData([makeFile({ path: "a.ts", patch: "$& $' $` $<name> $1" })]);
    const html = renderHtml(viewer, { data: tricky, spec: fixtureSpec(), grammars });
    expect(JSON.parse(embedded(html)!).data).toEqual(tricky);
  });

  test("titles the page with escaped branch names", () => {
    const head = { branch: 'a<b>&"c', sha: "abcdef1234" };
    const html = renderHtml(viewer, {
      data: makeData([], { head }),
      spec: fixtureSpec(),
      grammars,
    });
    expect(html).toContain("<title>a&#60;b&#62;&#38;&#34;c vs main</title>");
  });

  test("titles a detached HEAD by its short sha", () => {
    const head = { branch: null, sha: "abcdef1234" };
    const html = renderHtml(viewer, {
      data: makeData([], { head }),
      spec: fixtureSpec(),
      grammars,
    });
    expect(html).toContain("<title>abcdef1 vs main</title>");
  });

  test("throws without the payload marker", () => {
    expect(() => renderHtml("<html></html>", { data, spec: fixtureSpec(), grammars })).toThrow(
      /no payload marker/,
    );
  });
});
