import { symlinkSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import { afterAll, describe, expect, test } from "vitest";
import {
  chunkPath,
  collect,
  GitError,
  MAX_PATCH_BYTES,
  parseNameStatus,
  parseNumstat,
  splitPatch,
  unquotePath,
} from "../src/collect.ts";
import type { ChangedFile, DiffData } from "../src/data.ts";
import {
  bareClone,
  cloneRepo,
  createRepo,
  lines,
  openRepo,
  PNG_BYTES,
  removeTempDirs,
  tempDir,
  type Repo,
} from "./helpers.ts";

afterAll(removeTempDirs);

const fileAt = (data: DiffData, path: string): ChangedFile => {
  const file = data.files.find((candidate) => candidate.path === path);
  if (!file) throw new Error(`${path} isn't in ${data.files.map((f) => f.path).join(", ")}`);
  return file;
};

/** A repo with one commit on main and a feature branch checked out. */
function branchedRepo(files: Record<string, string> = { "README.md": "hello\n" }): Repo {
  const repo = createRepo();
  for (const [path, contents] of Object.entries(files)) repo.write(path, contents);
  repo.commit("base");
  repo.git("switch", "-q", "-c", "feature");
  return repo;
}

describe("base resolution", () => {
  test("uses origin's default branch", () => {
    const seed = createRepo({ branch: "trunk", name: "seed" });
    seed.write("a.txt", "a\n");
    const baseSha = seed.commit("base");
    const work = cloneRepo(bareClone(seed, "origin.git"), "work");
    work.git("switch", "-q", "-c", "feature");
    work.write("a.txt", "b\n");
    work.commit("change");

    const { base } = collect({ cwd: work.root });
    expect(base).toEqual({
      ref: "origin/trunk",
      sha: baseSha,
      diffFrom: baseSha,
      direct: false,
      source: "remote-head",
      ahead: 0,
      remote: true,
      fetchedAt: null,
    });
  });

  test("records when the repo last fetched", () => {
    const seed = createRepo({ name: "seed" });
    seed.write("a.txt", "a\n");
    seed.commit("base");
    const work = cloneRepo(bareClone(seed, "origin.git"), "work");
    const before = Date.now() - 1000;
    work.git("fetch", "-q");

    const fetchedAt = collect({ cwd: work.root }).base.fetchedAt;
    expect(Date.parse(fetchedAt!)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(fetchedAt!)).toBeLessThanOrEqual(Date.now());
  });

  test("prefers upstream's default branch over origin's", () => {
    const seed = createRepo({ name: "seed" });
    seed.write("a.txt", "a\n");
    seed.commit("base");
    seed.git("switch", "-q", "-c", "develop");
    seed.write("a.txt", "dev\n");
    const developSha = seed.commit("develop");
    const upstream = bareClone(seed, "upstream.git");
    seed.git("switch", "-q", "main");
    const work = cloneRepo(bareClone(seed, "origin.git"), "work");
    work.git("remote", "add", "upstream", upstream);
    work.git("fetch", "-q", "upstream");
    work.git("remote", "set-head", "upstream", "develop");

    const { base } = collect({ cwd: work.root });
    expect(base).toMatchObject({ ref: "upstream/develop", sha: developSha, source: "remote-head" });
  });

  test("falls back to origin/main when origin has no HEAD", () => {
    const seed = createRepo({ name: "seed" });
    seed.write("a.txt", "a\n");
    seed.commit("base");
    const work = cloneRepo(bareClone(seed, "origin.git"), "work");
    work.git("remote", "set-head", "origin", "--delete");
    work.git("switch", "-q", "-c", "feature");

    expect(collect({ cwd: work.root }).base).toMatchObject({
      ref: "origin/main",
      source: "default-branch",
    });
  });

  test.each(["main", "master"])("falls back to a local %s branch", (branch) => {
    const repo = createRepo({ branch });
    repo.write("a.txt", "a\n");
    const sha = repo.commit("base");
    repo.git("switch", "-q", "-c", "feature");

    expect(collect({ cwd: repo.root }).base).toMatchObject({
      ref: branch,
      sha,
      source: "default-branch",
    });
  });

  test("tries init.defaultBranch before the usual names", () => {
    const repo = branchedRepo();
    repo.git("branch", "develop");
    repo.git("config", "init.defaultBranch", "develop");

    expect(collect({ cwd: repo.root }).base).toMatchObject({
      ref: "develop",
      source: "default-branch",
    });
  });

  test("errors when there's no default branch to find", () => {
    const repo = createRepo({ branch: "feature" });
    repo.write("a.txt", "a\n");
    repo.commit("base");

    expect(() => collect({ cwd: repo.root })).toThrow(/couldn't find the default branch/);
  });

  test("uses an explicit ref as given", () => {
    const repo = branchedRepo();
    const tagged = repo.git("rev-parse", "HEAD");
    repo.git("tag", "v1");
    repo.write("README.md", "changed\n");
    repo.commit("change");

    expect(collect({ cwd: repo.root, base: "v1" }).base).toMatchObject({
      ref: "v1",
      sha: tagged,
      source: "argument",
    });
    expect(collect({ cwd: repo.root, base: tagged.slice(0, 8) }).base).toMatchObject({
      sha: tagged,
    });
  });

  test("errors on a ref that doesn't exist", () => {
    const repo = branchedRepo();
    expect(() => collect({ cwd: repo.root, base: "nope" })).toThrow(
      new GitError(`"nope" isn't a branch, tag, or commit in this repo`),
    );
  });

  test("diffs from the merge base, not the base's tip", () => {
    const repo = branchedRepo();
    const forkPoint = repo.git("rev-parse", "HEAD");
    repo.write("feature.txt", "feature\n");
    repo.commit("feature");
    repo.git("switch", "-q", "main");
    repo.write("main-only.txt", "main moved on\n");
    const mainSha = repo.commit("main moves");
    repo.git("switch", "-q", "feature");

    const data = collect({ cwd: repo.root });
    expect(data.base).toMatchObject({
      sha: mainSha,
      diffFrom: forkPoint,
      ahead: 1,
      remote: false,
      fetchedAt: null,
    });
    expect(data.files.map((file) => file.path)).toEqual(["feature.txt"]);
  });

  test("errors on unrelated histories unless --direct", () => {
    const repo = branchedRepo({ "a.txt": "a\n" });
    repo.git("switch", "-q", "--orphan", "other");
    repo.write("b.txt", "b\n");
    repo.commit("unrelated");
    const mainSha = repo.git("rev-parse", "main");

    expect(() => collect({ cwd: repo.root })).toThrow(
      /main and HEAD share no history. use --direct/,
    );
    const data = collect({ cwd: repo.root, direct: true });
    expect(data.base).toMatchObject({
      ref: "main",
      sha: mainSha,
      diffFrom: mainSha,
      direct: true,
      ahead: 0,
    });
    expect(data.files.map((file) => [file.path, file.status])).toEqual([
      ["a.txt", "deleted"],
      ["b.txt", "added"],
    ]);
  });
});

describe("changed files", () => {
  test("tags each file with where its change lives", () => {
    const repo = branchedRepo({
      "committed.txt": "1\n",
      "staged.txt": "1\n",
      "unstaged.txt": "1\n",
      "both.txt": "1\n",
    });
    repo.write("committed.txt", "2\n");
    repo.write("both.txt", "2\n");
    repo.commit("commit");
    repo.write("staged.txt", "2\n");
    repo.git("add", "staged.txt");
    repo.write("unstaged.txt", "2\n");
    repo.write("both.txt", "3\n");
    repo.write("new.txt", "new\n");

    const data = collect({ cwd: repo.root });
    expect(data.files.map((file) => [file.path, file.sources])).toEqual([
      ["both.txt", ["committed", "unstaged"]],
      ["committed.txt", ["committed"]],
      ["new.txt", ["untracked"]],
      ["staged.txt", ["staged"]],
      ["unstaged.txt", ["unstaged"]],
    ]);
    expect(fileAt(data, "both.txt").patch).toContain("-1\n+3\n");
    expect(fileAt(data, "new.txt")).toMatchObject({
      status: "added",
      additions: 1,
      deletions: 0,
      binary: false,
    });
    expect(fileAt(data, "new.txt").patch).toContain("+new\n");
  });

  test("reports renames with the old path", () => {
    const repo = branchedRepo({ "old.txt": lines(10) });
    repo.git("mv", "old.txt", "new.txt");
    repo.write("new.txt", lines(11));
    repo.commit("rename");

    const file = fileAt(collect({ cwd: repo.root }), "new.txt");
    expect(file).toMatchObject({
      oldPath: "old.txt",
      status: "renamed",
      additions: 1,
      deletions: 0,
    });
    expect(file.patch).toMatch(/^rename from old\.txt$/m);
  });

  test("reports deletions", () => {
    const repo = branchedRepo({ "gone.txt": lines(3) });
    repo.git("rm", "-q", "gone.txt");
    repo.commit("delete");

    expect(fileAt(collect({ cwd: repo.root }), "gone.txt")).toMatchObject({
      status: "deleted",
      additions: 0,
      deletions: 3,
      oldPath: null,
    });
  });

  test("keeps both halves of a file that became a symlink as one entry", () => {
    const repo = branchedRepo({ "target.txt": "target\n", link: "one\ntwo\n" });
    unlinkSync(join(repo.root, "link"));
    symlinkSync("target.txt", join(repo.root, "link"));
    repo.commit("symlink");

    const data = collect({ cwd: repo.root });
    expect(data.files).toHaveLength(1);
    const file = fileAt(data, "link");
    expect(file.status).toBe("type-changed");
    expect(file.patch?.match(/^diff --git /gm)).toHaveLength(2);
    expect(file.patch).toContain("deleted file mode 100644");
    expect(file.patch).toContain("new file mode 120000");
  });

  test("handles paths with spaces, tabs, quotes, backslashes, and non-ASCII", () => {
    const paths = [
      "with space.txt",
      "tab\there.txt",
      'quote"d.txt',
      "back\\slash.txt",
      "ünïcode.txt",
    ];
    const repo = branchedRepo(Object.fromEntries(paths.map((path) => [path, lines(5)])));
    for (const path of paths) repo.write(path, lines(6));
    repo.git("mv", "with space.txt", "moved\tto here.txt");
    repo.commit("edit");

    const data = collect({ cwd: repo.root });
    expect(data.files.map((file) => file.path)).toEqual(
      ["back\\slash.txt", "moved\tto here.txt", 'quote"d.txt', "tab\there.txt", "ünïcode.txt"].sort(
        (a, b) => a.localeCompare(b),
      ),
    );
    for (const file of data.files) {
      expect(file.patch, file.path).toContain("+line 6\n");
      expect([file.additions, file.deletions], file.path).toEqual([1, 0]);
    }
    expect(fileAt(data, "moved\tto here.txt").oldPath).toBe("with space.txt");
  });

  test("marks binary files", () => {
    const repo = branchedRepo();
    repo.write("logo.png", PNG_BYTES);
    repo.commit("binary");
    repo.write("untracked.bin", PNG_BYTES);

    const data = collect({ cwd: repo.root });
    for (const path of ["logo.png", "untracked.bin"]) {
      const file = fileAt(data, path);
      expect(file, path).toMatchObject({ binary: true, additions: 0, deletions: 0 });
      expect(file.patch, path).toMatch(/^Binary files /m);
    }
  });

  test("flags lockfiles and linguist-generated files", () => {
    const repo = branchedRepo({
      ".gitattributes":
        "gen/** linguist-generated\nmarked.txt linguist-generated=true\nunmarked.txt linguist-generated=false\n",
    });
    for (const path of [
      "pnpm-lock.yaml",
      "crates/Cargo.lock",
      "gen/out.js",
      "marked.txt",
      "unmarked.txt",
      "src.ts",
    ]) {
      repo.write(path, "x\n");
    }

    const generated = collect({ cwd: repo.root })
      .files.filter((file) => file.generated)
      .map((file) => file.path);
    expect(generated).toEqual(["crates/Cargo.lock", "gen/out.js", "marked.txt", "pnpm-lock.yaml"]);
  });

  test("drops patches over the size limit but keeps their line counts", () => {
    const lineCount = Math.ceil(MAX_PATCH_BYTES / 100) + 10;
    const big = lines(lineCount, (n) => `${n}`.padEnd(99, "x"));
    const repo = branchedRepo();
    repo.write("big-tracked.txt", big);
    repo.commit("big");
    repo.write("big-untracked.txt", big);
    repo.write("big-no-newline.txt", big.slice(0, -1));
    repo.write(
      "big-untracked.bin",
      Buffer.concat([Buffer.from(PNG_BYTES), Buffer.alloc(MAX_PATCH_BYTES)]),
    );

    const data = collect({ cwd: repo.root });
    for (const path of ["big-tracked.txt", "big-untracked.txt", "big-no-newline.txt"]) {
      expect(fileAt(data, path), path).toMatchObject({
        patch: null,
        binary: false,
        additions: lineCount,
        deletions: 0,
      });
    }
    expect(fileAt(data, "big-untracked.bin")).toMatchObject({
      patch: null,
      binary: true,
      additions: 0,
    });
  });

  test("lists the branch's commits, newest first, and totals the files", () => {
    const repo = branchedRepo({ "a.txt": lines(3) });
    repo.write("a.txt", lines(4));
    const first = repo.commit("First change");
    repo.git("rm", "-q", "a.txt");
    repo.write("b.txt", "unrelated\nfile\n");
    const second = repo.commit("Second change");

    const data = collect({ cwd: repo.root });
    expect(data.commits.map(({ sha, subject, author }) => ({ sha, subject, author }))).toEqual([
      { sha: second, subject: "Second change", author: "Test Author" },
      { sha: first, subject: "First change", author: "Test Author" },
    ]);
    expect(Date.parse(data.commits[0]!.date)).not.toBeNaN();
    expect(data.totals).toEqual({ files: 2, additions: 2, deletions: 3 });
    expect(data.head).toEqual({ branch: "feature", sha: second });
    expect(data.repo).toEqual({ name: "repo", root: repo.root });
  });

  test("reports root-relative paths from a subdirectory", () => {
    const repo = branchedRepo({ "src/deep/a.txt": "a\n", "top.txt": "t\n" });
    repo.write("src/deep/a.txt", "b\n");
    repo.write("top.txt", "u\n");

    const data = collect({ cwd: join(repo.root, "src/deep") });
    expect(data.files.map((file) => file.path)).toEqual(["src/deep/a.txt", "top.txt"]);
  });

  test("names the repo, not the worktree's folder", () => {
    const repo = branchedRepo();
    const worktree = join(dirname(repo.root), "some-worktree");
    repo.git("worktree", "add", "-q", "-b", "other", worktree);

    expect(collect({ cwd: worktree }).repo).toEqual({ name: "repo", root: worktree });
  });

  test("falls back to the folder name when the git dir isn't <repo>/.git", () => {
    const dir = tempDir();
    execFileSync("git", [
      "init",
      "-q",
      "-b",
      "main",
      "--separate-git-dir",
      join(dir, "meta.git"),
      join(dir, "work"),
    ]);
    const repo = openRepo(join(dir, "work"));
    repo.write("a.txt", "a\n");
    repo.commit("base");

    expect(collect({ cwd: repo.root }).repo.name).toBe("work");
  });

  test("reports a detached HEAD as having no branch", () => {
    const repo = branchedRepo();
    repo.git("switch", "-q", "--detach");

    expect(collect({ cwd: repo.root }).head.branch).toBeNull();
  });
});

describe("errors", () => {
  test("a repo with no commits", () => {
    const repo = createRepo();
    expect(() => collect({ cwd: repo.root })).toThrow(new GitError("this repo has no commits yet"));
  });

  test.each([
    ["a directory outside any repo", () => tempDir()],
    ["a directory that doesn't exist", () => join(tempDir(), "missing")],
  ])("%s", (_, cwd) => {
    const dir = cwd();
    expect(() => collect({ cwd: dir })).toThrow(
      new GitError(`${dir} isn't inside a git repository`),
    );
  });
});

describe("unquotePath", () => {
  test.each([
    ["plain.txt", "plain.txt"],
    ['"tab\\there"', "tab\there"],
    ['"quote\\"d"', 'quote"d'],
    ['"back\\\\slash"', "back\\slash"],
    ['"line\\nbreak"', "line\nbreak"],
    ['"\\303\\274ber.txt"', "über.txt"],
    ['"\\360\\237\\230\\200 smile"', "😀 smile"],
  ])("%s", (raw, expected) => {
    expect(unquotePath(raw)).toBe(expected);
  });
});

describe("chunkPath", () => {
  test.each([
    ["diff --git a/src/a.ts b/src/a.ts\nindex 1..2\n", "src/a.ts"],
    ["diff --git a/with space b/c.txt b/with space b/c.txt\n", "with space b/c.txt"],
    ['diff --git "a/tab\\there" "b/tab\\there"\n', "tab\there"],
    ['diff --git "a/q\\"uote" "b/q\\"uote"\n', 'q"uote'],
    [
      "diff --git a/old b/new\nsimilarity index 90%\nrename from old\nrename to new\n@@ -1 +1 @@\n",
      "new",
    ],
    ['diff --git a/old "b/new\\tname"\nrename from old\nrename to "new\\tname"\n', "new\tname"],
    ["diff --git a/x b/x\nBinary files a/x and b/x differ\nrename to not-a-header\n", "x"],
  ])("%j", (chunk, expected) => {
    expect(chunkPath(chunk)).toBe(expected);
  });
});

test("splitPatch groups chunks by path, keeping both halves of a type change", () => {
  const a = "diff --git a/a b/a\n--- a/a\n+++ b/a\n@@ -1 +1 @@\n-1\n+2\n";
  const linkGone = "diff --git a/l b/l\ndeleted file mode 100644\n@@ -1 +0,0 @@\n-x\n";
  const linkNew = "diff --git a/l b/l\nnew file mode 120000\n@@ -0,0 +1 @@\n+a\n";
  expect(splitPatch(`warning: ignored\n${a}${linkGone}${linkNew}`)).toEqual(
    new Map([
      ["a", a],
      ["l", linkGone + linkNew],
    ]),
  );
});

test("parseNameStatus reads -z output, with old paths for renames and copies", () => {
  expect(
    parseNameStatus("M\0a.txt\0R087\0old\0new\0C100\0src\0copy\0A\0b\0D\0c\0T\0d\0U\0e\0X\0f\0"),
  ).toEqual([
    { path: "a.txt", oldPath: null, status: "modified" },
    { path: "new", oldPath: "old", status: "renamed" },
    { path: "copy", oldPath: "src", status: "copied" },
    { path: "b", oldPath: null, status: "added" },
    { path: "c", oldPath: null, status: "deleted" },
    { path: "d", oldPath: null, status: "type-changed" },
    { path: "e", oldPath: null, status: "unmerged" },
    { path: "f", oldPath: null, status: "modified" },
  ]);
});

test("parseNumstat reads -z output, keyed by the new path", () => {
  expect(parseNumstat("1\t2\ta.txt\0-\t-\tlogo.png\x003\t0\t\0old\0new\0")).toEqual(
    new Map([
      ["a.txt", { additions: 1, deletions: 2, binary: false }],
      ["logo.png", { additions: 0, deletions: 0, binary: true }],
      ["new", { additions: 3, deletions: 0, binary: false }],
    ]),
  );
});
