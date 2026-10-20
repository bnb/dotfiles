import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { Spec, UIElement } from "@json-render/core";
import type { ChangedFile, DiffData } from "../src/data.ts";

// Fixture repos must not pick up the user's git config (diff tools, signing,
// init.defaultBranch), or a hook's GIT_DIR when the tests run inside one.
process.env.GIT_CONFIG_GLOBAL = "/dev/null";
process.env.GIT_CONFIG_NOSYSTEM = "1";
for (const name of [
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_OBJECT_DIRECTORY",
  "GIT_COMMON_DIR",
]) {
  delete process.env[name];
}

const tempDirs: string[] = [];

/** A fresh directory under the OS temp dir, removed by removeTempDirs. Real path, as git reports it. */
export function tempDir(): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "branch-diff-test-")));
  tempDirs.push(dir);
  return dir;
}

export function removeTempDirs(): void {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
}

export interface Repo {
  root: string;
  git: (...args: string[]) => string;
  write: (path: string, contents: string | Uint8Array) => void;
  /** Stages everything and commits. Returns the new commit's sha. */
  commit: (message: string) => string;
}

export function openRepo(root: string): Repo {
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  git("config", "user.name", "Test Author");
  git("config", "user.email", "test@example.com");
  git("config", "commit.gpgsign", "false");
  return {
    root,
    git,
    write(path, contents) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), contents);
    },
    commit(message) {
      git("add", "-A");
      git("commit", "-q", "-m", message);
      return git("rev-parse", "HEAD");
    },
  };
}

export function createRepo({ branch = "main", name = "repo" } = {}): Repo {
  const root = join(tempDir(), name);
  mkdirSync(root);
  execFileSync("git", ["init", "-q", "-b", branch], { cwd: root });
  return openRepo(root);
}

/** Bare-clones a repo into a sibling directory, to serve as a remote. Returns its path. */
export function bareClone(source: Repo, name: string): string {
  const path = join(dirname(source.root), name);
  execFileSync("git", ["clone", "-q", "--bare", source.root, path]);
  return path;
}

/** Clones a repo (a path) into a sibling directory. */
export function cloneRepo(source: string, name: string): Repo {
  const root = join(dirname(source), name);
  execFileSync("git", ["clone", "-q", source, root]);
  return openRepo(root);
}

/** `count` numbered lines, each ending in a newline. */
export const lines = (count: number, text = (n: number) => `line ${n}`) =>
  Array.from({ length: count }, (_, i) => `${text(i + 1)}\n`).join("");

/** Starts with PNG's signature, and its NUL bytes make git treat it as binary. */
export const PNG_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48,
]);

export const SCRIPT_BREAKOUT = '</script><script>document.title = "pwned"</script>';
export const NOTE_TEXT = "Check the **retry** count here";

/**
 * The repo the render, CLI, and viewer tests share: one branch with a
 * modification, a rename, a deletion, a binary, a lockfile, a file whose
 * contents try to close the payload's script tag, an unstaged edit, and an
 * untracked file.
 */
export function createFixtureRepo(): Repo {
  const repo = createRepo({ name: "fixture-app" });
  repo.write(
    "src/app.ts",
    lines(20, (n) => `export const line${n} = ${n};`),
  );
  repo.write("old-name.txt", lines(10));
  repo.write("removed.txt", "goodbye\n");
  repo.write("pnpm-lock.yaml", "lockfileVersion: '9.0'\n");
  repo.commit("base");

  repo.git("switch", "-q", "-c", "feature/retry");
  repo.write(
    "src/app.ts",
    lines(20, (n) =>
      n === 10 ? 'export const line10 = "retry";' : `export const line${n} = ${n};`,
    ),
  );
  repo.git("mv", "old-name.txt", "new-name.txt");
  repo.write("new-name.txt", lines(11));
  repo.git("rm", "-q", "removed.txt");
  repo.write("pnpm-lock.yaml", "lockfileVersion: '9.0'\nsettings: {}\n");
  repo.write("logo.png", PNG_BYTES);
  repo.write("src/inject.html", `<p>hi</p>\n${SCRIPT_BREAKOUT}\n`);
  repo.commit("Retry the app");

  repo.write(
    "src/app.ts",
    `${lines(20, (n) => (n === 10 ? 'export const line10 = "retry";' : `export const line${n} = ${n};`))}export const line21 = 21;\n`,
  );
  repo.write("notes/todo.md", "- [ ] ship it\n");
  return repo;
}

const element = (
  type: string,
  props: Record<string, unknown>,
  children: string[] = [],
): UIElement => ({
  type,
  props,
  children,
});

/** A spec that shows every file in the fixture repo exactly once. */
export function fixtureSpec(): Spec {
  return {
    root: "page",
    elements: {
      page: element("Stack", { direction: "vertical", gap: "lg" }, [
        "header",
        "files",
        "commits",
        "app",
        "rename",
        "removed",
        "assets",
        "generated",
      ]),
      header: element("DiffHeader", {
        title: "Retry the fixture app",
        summary: "Adds a **retry** value.",
      }),
      files: element("FileList", { title: "Files", paths: null }),
      commits: element("CommitList", { title: "Commits" }),
      app: element("ChangeGroup", {
        title: "App code",
        summary: "The retry change.",
        risk: "medium",
        paths: ["src/app.ts", "src/inject.html"],
        notes: [{ path: "src/app.ts", line: 10, side: "new", text: NOTE_TEXT }],
      }),
      rename: element("FileDiff", { path: "new-name.txt", note: "Renamed for clarity." }),
      removed: element("FileDiff", { path: "removed.txt" }),
      assets: element("ChangeGroup", { title: "Assets", paths: ["logo.png", "notes/todo.md"] }),
      generated: element("ChangeGroup", {
        title: "Generated",
        paths: ["pnpm-lock.yaml"],
        defaultOpen: null,
      }),
    },
  };
}

/** The spec as the JSONL patch stream `prompt` asks agents for. */
export function toJsonl(spec: Spec): string {
  const ops = [
    { op: "add", path: "/root", value: spec.root },
    ...Object.entries(spec.elements).map(([key, value]) => ({
      op: "add",
      path: `/elements/${key}`,
      value,
    })),
  ];
  return ops.map((op) => JSON.stringify(op)).join("\n");
}

export function makeFile(overrides: Partial<ChangedFile> & { path: string }): ChangedFile {
  return {
    oldPath: null,
    status: "modified",
    additions: 1,
    deletions: 0,
    binary: false,
    generated: false,
    sources: ["committed"],
    patch: `diff --git a/${overrides.path} b/${overrides.path}\n--- a/${overrides.path}\n+++ b/${overrides.path}\n@@ -1 +1,2 @@\n one\n+two\n`,
    ...overrides,
  };
}

export function makeData(files: ChangedFile[], overrides: Partial<DiffData> = {}): DiffData {
  return {
    version: 1,
    generatedAt: "2026-01-01T00:00:00.000Z",
    repo: { name: "demo", root: "/tmp/demo" },
    head: { branch: "feature", sha: "1111111aaaaaaa" },
    base: {
      ref: "main",
      sha: "2222222bbbbbbb",
      diffFrom: "3333333ccccccc",
      direct: false,
      source: "remote-head",
      ahead: 0,
      remote: false,
      fetchedAt: null,
    },
    commits: [],
    files,
    totals: {
      files: files.length,
      additions: files.reduce((sum, file) => sum + file.additions, 0),
      deletions: files.reduce((sum, file) => sum + file.deletions, 0),
    },
    ...overrides,
  };
}
