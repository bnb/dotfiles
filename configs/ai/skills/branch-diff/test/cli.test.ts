import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { diffFolder, main, summarize } from "../src/cli.ts";
import { numberPatch } from "../src/patch.ts";
import type { DiffData } from "../src/data.ts";
import {
  createFixtureRepo,
  fixtureSpec,
  makeData,
  makeFile,
  removeTempDirs,
  tempDir,
  toJsonl,
  type Repo,
} from "./helpers.ts";

// The CLI reads viewer.html and grammars.json from beside itself, which is
// dist/ once bundled. Running from source, point those two reads at dist/.
const built = ["viewer.html", "grammars.json"].every((name) =>
  existsSync(new URL(`../dist/${name}`, import.meta.url)),
);
vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  const fromDist = (path: unknown) =>
    path instanceof URL && /\/src\/(viewer\.html|grammars\.json)$/.test(path.pathname)
      ? new URL(`../dist/${path.pathname.split("/").at(-1)}`, import.meta.url)
      : path;
  const read = fs.readFileSync as (...args: unknown[]) => unknown;
  return {
    ...fs,
    readFileSync: ((path: unknown, ...rest: unknown[]) =>
      read(fromDist(path), ...rest)) as typeof fs.readFileSync,
  };
});

let output: { log: string; error: string };
beforeEach(() => {
  output = { log: "", error: "" };
  vi.spyOn(console, "log").mockImplementation((text: string) => void (output.log += `${text}\n`));
  vi.spyOn(console, "error").mockImplementation(
    (text: string) => void (output.error += `${text}\n`),
  );
  return () => vi.restoreAllMocks();
});

let repo: Repo;
let dir: string;
let dataPath: string;
beforeAll(() => {
  repo = createFixtureRepo();
  dir = tempDir();
  dataPath = join(dir, "out/data.json");
});
afterAll(removeTempDirs);

const readData = () => JSON.parse(readFileSync(dataPath, "utf8")) as DiffData;

describe("collect", () => {
  test("writes the data and prints a summary", () => {
    expect(main(["collect", "--repo", repo.root, "--out", dataPath])).toBe(0);

    const data = readData();
    expect(data.base.ref).toBe("main");
    expect(data.files.map((file) => file.path)).toContain("src/app.ts");
    expect(output.log).toBe(`${summarize(data)}\nwrote ${dataPath}\n`);
  });

  test("--out-root writes into the diff's own folder", () => {
    const root = join(dir, "diffs");
    expect(main(["collect", "--repo", repo.root, "--out-root", root])).toBe(0);

    const path = join(root, "fixture-app-feature-retry-diff", "data.json");
    const data = JSON.parse(readFileSync(path, "utf8")) as DiffData;
    expect(data.repo.root).toBe(repo.root);
    expect(output.log).toMatch(/\nfolder: fixture-app-feature-retry-diff\nwrote (.*)\n$/);
    expect(output.log.endsWith(`wrote ${path}\n`)).toBe(true);
  });

  test.each([[[]], [["--out", "a.json", "--out-root", "b"]]])(
    "needs exactly one of --out and --out-root: %j",
    (flags) => {
      expect(main(["collect", "--repo", repo.root, ...flags])).toBe(2);
      expect(output.error).toMatch(/^usage:/);
    },
  );

  test("takes a base and --direct", () => {
    repo.git("tag", "-f", "base-tag", "main");
    expect(main(["collect", "base-tag", "--direct", "--repo", repo.root, "--out", dataPath])).toBe(
      0,
    );
    expect(readData().base).toMatchObject({ ref: "base-tag", direct: true, source: "argument" });
  });

  test("defaults to the current directory", () => {
    const previous = process.cwd();
    process.chdir(join(repo.root, "src"));
    try {
      expect(main(["collect", "--out", dataPath])).toBe(0);
    } finally {
      process.chdir(previous);
    }
    expect(readData().repo.root).toBe(repo.root);
  });

  test("prints git errors without a stack and exits 1", () => {
    const notRepo = tempDir();
    expect(main(["collect", "--repo", notRepo, "--out", dataPath])).toBe(1);
    expect(output.error).toBe(`${notRepo} isn't inside a git repository\n`);
  });
});

describe("patch", () => {
  test("prints every patch, or a note for ones too large to keep", () => {
    const data = makeData([makeFile({ path: "a.ts" }), makeFile({ path: "big.ts", patch: null })]);
    const path = join(dir, "patch-data.json");
    writeFileSync(path, JSON.stringify(data));

    expect(main(["patch", "--data", path])).toBe(0);
    expect(output.log).toBe(`${numberPatch(data.files[0]!.patch!)}\n(big.ts: too large to show)\n`);
  });

  test("prints only the paths asked for", () => {
    expect(main(["collect", "--repo", repo.root, "--out", dataPath])).toBe(0);
    output.log = "";
    expect(main(["patch", "--data", dataPath, "removed.txt", "new-name.txt"])).toBe(0);
    expect(output.log).toMatch(/^diff --git a\/old-name\.txt b\/new-name\.txt\n/);
    expect(output.log).toContain("deleted file mode");
    expect(output.log).not.toContain("src/app.ts");
    expect(output.log).toContain("      11  │ +line 11\n");
    expect(output.log).toContain("   1      │ -goodbye\n");
  });

  test("names paths that aren't changed files and exits 1", () => {
    expect(main(["patch", "--data", dataPath, "src/app.ts", "nope.ts", "also-nope.ts"])).toBe(1);
    expect(output.error).toBe("nope.ts isn't a changed file\nalso-nope.ts isn't a changed file\n");
    expect(output.log).toBe("");
  });

  test("lets unexpected errors through with their stack", () => {
    const wrongShape = join(dir, "wrong-shape.json");
    writeFileSync(wrongShape, "{}");
    expect(() => main(["patch", "--data", wrongShape])).toThrow(TypeError);
  });

  test("says when it can't read the data", () => {
    const missing = join(dir, "missing.json");
    expect(main(["patch", "--data", missing])).toBe(1);
    expect(output.error).toBe(`can't read ${missing}\n`);

    const garbage = join(dir, "garbage.json");
    writeFileSync(garbage, "{not json");
    expect(main(["patch", "--data", garbage])).toBe(1);
    expect(output.error).toContain(`${garbage} isn't valid JSON\n`);
  });
});

test("prompt prints the catalog prompt", () => {
  expect(main(["prompt"])).toBe(0);
  expect(output.log).toContain("AVAILABLE COMPONENTS");
  expect(output.log).toContain("ChangeGroup");
  expect(output.log).toContain("never add sample data");
  expect(output.log).not.toContain("Include realistic sample data");
});

describe("render", () => {
  let specPath: string;
  let pagePath: string;
  beforeAll(() => {
    expect(main(["collect", "--repo", repo.root, "--out", dataPath])).toBe(0);
    specPath = join(dir, "spec.jsonl");
    pagePath = join(dir, "page/index.html");
  });

  test("lists the spec's problems and writes nothing", () => {
    const spec = fixtureSpec();
    spec.elements.removed!.props.path = "nope.txt";
    writeFileSync(specPath, toJsonl(spec));

    expect(main(["render", "--data", dataPath, "--spec", specPath, "--out", pagePath])).toBe(1);
    expect(output.error).toBe(
      "the spec needs fixing:\n- removed: nope.txt isn't a changed file\n- not shown anywhere: removed.txt\n",
    );
    expect(existsSync(pagePath)).toBe(false);
  });

  test("reports a truncated spec line instead of rendering without it", () => {
    writeFileSync(
      specPath,
      `${toJsonl(fixtureSpec())}\n{"op":"add","path":"/elements/x","value":{"type":"Text",`,
    );
    expect(main(["render", "--data", dataPath, "--spec", specPath, "--out", pagePath])).toBe(1);
    expect(output.error).toBe(
      `the spec needs fixing:\n- spec line ${Object.keys(fixtureSpec().elements).length + 2} isn't valid JSON\n`,
    );
    expect(existsSync(pagePath)).toBe(false);
  });

  test("says when it can't read the spec", () => {
    const missing = join(dir, "missing.jsonl");
    expect(main(["render", "--data", dataPath, "--spec", missing, "--out", pagePath])).toBe(1);
    expect(output.error).toBe(`can't read ${missing}\n`);
  });

  test.skipIf(!built)("writes the viewer page with the payload (needs pnpm build)", () => {
    writeFileSync(specPath, toJsonl(fixtureSpec()));

    expect(main(["render", "--data", dataPath, "--spec", specPath, "--out", pagePath])).toBe(0);
    expect(output.log).toBe(`wrote ${pagePath}\n`);
    const html = readFileSync(pagePath, "utf8");
    expect(html).toContain("<title>feature/retry vs main</title>");
    const payload =
      /<script type="application\/json" id="branch-diff-payload">(.*?)<\/script>/s.exec(html)?.[1];
    expect(JSON.parse(payload!)).toMatchObject({ data: readData(), spec: fixtureSpec() });
  });
});

describe("usage", () => {
  test.each([
    [["--help"]],
    [["render", "--data", "x.json", "-h"]],
    [["collect", "--bogus", "--help"]],
  ])("%j prints usage and exits 0", (argv) => {
    expect(main(argv)).toBe(0);
    expect(output.log).toMatch(/^usage:\n/);
    expect(output.error).toBe("");
  });

  test("an unknown option says which, then prints usage and exits 2", () => {
    expect(main(["collect", "--base", "main", "--out", "x.json"])).toBe(2);
    expect(output.error).toMatch(/^Unknown option '--base'.*\nusage:\n/s);
  });

  test.each([[[]], [["help"]], [["collect"]], [["patch"]], [["render", "--data", "x.json"]]])(
    "%j prints usage and exits 2",
    (argv) => {
      expect(main(argv)).toBe(2);
      expect(output.error).toMatch(/^usage:\n {2}cli\.mjs collect/);
    },
  );
});

describe("summarize", () => {
  test("lists commits and flags each file", () => {
    const data = makeData(
      [
        makeFile({
          path: "src/new.ts",
          oldPath: "src/old.ts",
          status: "renamed",
          additions: 2,
          deletions: 1,
        }),
        makeFile({ path: "pnpm-lock.yaml", generated: true, sources: ["committed", "unstaged"] }),
        makeFile({
          path: "logo.png",
          status: "added",
          binary: true,
          additions: 0,
          sources: ["untracked"],
        }),
        makeFile({ path: "huge.sql", status: "type-changed", patch: null, sources: ["staged"] }),
      ],
      {
        commits: [
          {
            sha: "abcdef0123456789",
            subject: "Do the thing",
            author: "A",
            date: "2026-01-01T00:00:00Z",
          },
        ],
      },
    );
    expect(summarize(data)).toBe(
      [
        "demo: feature (1111111) vs main (2222222, remote default branch)",
        "diff from merge base 3333333: 1 commits, 4 files, +4 -1",
        "",
        "commits:",
        "  abcdef0 Do the thing",
        "",
        "files:",
        "  R src/old.ts -> src/new.ts +2 -1 [committed]",
        "  M pnpm-lock.yaml +1 -0 [committed,unstaged; generated]",
        "  A logo.png +0 -0 [untracked; binary]",
        "  T huge.sql +1 -0 [staged; too large to show]",
        "",
        "folder: demo-feature-diff",
      ].join("\n"),
    );
  });

  test("covers a detached HEAD diffed against the base itself, with nothing changed", () => {
    const data = makeData([], {
      head: { branch: null, sha: "9999999fffffff" },
      base: {
        ref: "v1.0",
        sha: "2222222bbbbbbb",
        diffFrom: "2222222bbbbbbb",
        direct: true,
        source: "argument",
        ahead: 0,
        remote: false,
        fetchedAt: null,
      },
    });
    expect(summarize(data)).toBe(
      [
        "demo: detached HEAD (9999999) vs v1.0 (2222222, as given)",
        "diff from the base itself: 0 commits, 0 files, +0 -0",
        "",
        "folder: demo-9999999-diff",
      ].join("\n"),
    );
  });

  test("turns slashes in the branch into dashes for the folder", () => {
    const data = makeData([], { head: { branch: "bnb/deep/name", sha: "1111111aaaaaaa" } });
    expect(diffFolder(data)).toBe("demo-bnb-deep-name-diff");
    expect(summarize(data).split("\n").at(-1)).toBe("folder: demo-bnb-deep-name-diff");
  });

  test.each([
    ["the base moved on", { ahead: 3 }, ["note: main is 3 commits past the merge base"]],
    [
      "a stale fetch",
      { remote: true, fetchedAt: "2025-12-29T23:00:00.000Z" },
      ["note: last fetched 2 days ago"],
    ],
    [
      "a fetch a day ago",
      { fetchedAt: "2025-12-31T00:00:00.000Z" },
      ["note: last fetched 1 day ago"],
    ],
    ["a fresh fetch", { remote: true, fetchedAt: "2025-12-31T12:00:00.000Z" }, []],
    ["a remote base never fetched", { remote: true, fetchedAt: null }, ["note: never fetched"]],
    ["a local base never fetched", { remote: false, fetchedAt: null }, []],
  ])("notes %s", (_, base, notes) => {
    const data = makeData([]);
    Object.assign(data.base, base);
    expect(
      summarize(data)
        .split("\n")
        .filter((line) => line.startsWith("note: ")),
    ).toEqual(notes);
  });

  test("says when the base was guessed", () => {
    const data = makeData([]);
    data.base.source = "default-branch";
    expect(summarize(data)).toContain("guessed default branch");
  });
});
