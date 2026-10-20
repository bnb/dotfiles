import { spawnSync } from "node:child_process";
import { lstatSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import type {
  BaseSource,
  ChangeSource,
  ChangedFile,
  Commit,
  DiffData,
  FileStatus,
} from "./data.ts";
import { countPatchLines } from "./patch.ts";

/** Patches bigger than this are dropped. The viewer says the file was too large to show. */
export const MAX_PATCH_BYTES = 1_000_000;

// Same output whatever the user's diff config says: prefixes on, no external
// tools or textconv filters, paths relative to the repo root.
const DIFF_FLAGS = [
  "--no-color",
  "--no-ext-diff",
  "--no-textconv",
  "--no-relative",
  "--src-prefix=a/",
  "--dst-prefix=b/",
  "-M",
];

const LOCKFILES = new Set([
  "bun.lock",
  "bun.lockb",
  "Cargo.lock",
  "composer.lock",
  "flake.lock",
  "Gemfile.lock",
  "go.sum",
  "package-lock.json",
  "pnpm-lock.yaml",
  "poetry.lock",
  "uv.lock",
  "yarn.lock",
]);

const STATUS_LETTERS: Record<string, FileStatus> = {
  A: "added",
  M: "modified",
  D: "deleted",
  R: "renamed",
  C: "copied",
  T: "type-changed",
  U: "unmerged",
};

export interface CollectOptions {
  /** Any path inside the repo. */
  cwd: string;
  /** Branch, tag, or commit to compare against. Defaults to the default branch. */
  base?: string;
  /** Diff against the base itself instead of the merge base. */
  direct?: boolean;
}

export class GitError extends Error {}

function git(cwd: string, args: string[], okCodes = [0]): string {
  const result = spawnSync("git", ["-c", "core.quotePath=false", ...args], {
    cwd,
    encoding: "utf8",
    maxBuffer: 1 << 30,
  });
  if (result.error) throw result.error;
  if (!okCodes.includes(result.status ?? -1)) {
    throw new GitError(`git ${args.join(" ")} failed: ${result.stderr.trim()}`);
  }
  return result.stdout;
}

function tryGit(cwd: string, args: string[]): string | null {
  try {
    return git(cwd, args).trim() || null;
  } catch {
    return null;
  }
}

const nulFields = (output: string) => output.split("\0").filter((field) => field !== "");

function revParse(cwd: string, ref: string): string | null {
  return tryGit(cwd, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]);
}

export function resolveBase(
  cwd: string,
  requested?: string,
): { ref: string; sha: string; source: BaseSource } {
  if (requested) {
    const sha = revParse(cwd, requested);
    if (!sha) throw new GitError(`"${requested}" isn't a branch, tag, or commit in this repo`);
    return { ref: requested, sha, source: "argument" };
  }

  // A fork's upstream is the branch PRs go to, so it beats origin.
  for (const remote of ["upstream", "origin"]) {
    const ref = tryGit(cwd, ["symbolic-ref", "--quiet", "--short", `refs/remotes/${remote}/HEAD`]);
    const sha = ref && revParse(cwd, ref);
    if (ref && sha) return { ref, sha, source: "remote-head" };
  }

  const names = [tryGit(cwd, ["config", "init.defaultBranch"]), "main", "master", "trunk"];
  for (const name of names.filter((name): name is string => name !== null)) {
    for (const ref of [`origin/${name}`, name]) {
      const sha = revParse(cwd, ref);
      if (sha) return { ref, sha, source: "default-branch" };
    }
  }
  throw new GitError("couldn't find the default branch. pass a base branch or commit");
}

/** Undoes git's C-style quoting of paths with special characters. */
export function unquotePath(raw: string): string {
  if (!raw.startsWith('"')) return raw;
  const escapes: Record<string, number> = { a: 7, b: 8, f: 12, n: 10, r: 13, t: 9, v: 11 };
  const bytes: number[] = [];
  const body = Buffer.from(raw.slice(1, -1), "utf8");
  for (let i = 0; i < body.length; i++) {
    const byte = body[i]!;
    if (byte !== 0x5c) {
      bytes.push(byte);
      continue;
    }
    const next = String.fromCharCode(body[++i]!);
    if (/[0-7]/.test(next)) {
      bytes.push(parseInt(body.subarray(i, i + 3).toString(), 8));
      i += 2;
    } else {
      bytes.push(escapes[next] ?? next.charCodeAt(0));
    }
  }
  return Buffer.from(bytes).toString("utf8");
}

/** The new-side path a `diff --git` chunk belongs to. */
export function chunkPath(chunk: string): string {
  const lines = chunk.split("\n");
  for (const line of lines) {
    const target = /^(?:rename|copy) to (.*)$/.exec(line);
    if (target) return unquotePath(target[1]!);
    if (line.startsWith("@@") || line.startsWith("Binary files")) break;
  }
  const header = lines[0]!.slice("diff --git ".length);
  if (header.startsWith('"')) {
    let end = 1;
    while (header[end] !== '"') end += header[end] === "\\" ? 2 : 1;
    return unquotePath(header.slice(end + 2)).slice(2);
  }
  // Without a rename both sides name the same path: "a/<path> b/<path>".
  return header.slice((header.length + 1) / 2 + 2);
}

/** Splits a multi-file patch by the path each part belongs to. A type change is two parts for one path. */
export function splitPatch(patch: string): Map<string, string> {
  const byPath = new Map<string, string>();
  for (const chunk of patch.split(/^(?=diff --git )/m)) {
    if (!chunk.startsWith("diff --git ")) continue;
    const path = chunkPath(chunk);
    byPath.set(path, (byPath.get(path) ?? "") + chunk);
  }
  return byPath;
}

interface DiffEntry {
  path: string;
  oldPath: string | null;
  status: FileStatus;
}

export function parseNameStatus(output: string): DiffEntry[] {
  const fields = nulFields(output);
  const entries: DiffEntry[] = [];
  for (let i = 0; i < fields.length;) {
    const letter = fields[i++]!;
    const status = STATUS_LETTERS[letter[0]!] ?? "modified";
    const hasOldPath = status === "renamed" || status === "copied";
    const oldPath = hasOldPath ? fields[i++]! : null;
    entries.push({ path: fields[i++]!, oldPath, status });
  }
  return entries;
}

export function parseNumstat(
  output: string,
): Map<string, { additions: number; deletions: number; binary: boolean }> {
  const stats = new Map<string, { additions: number; deletions: number; binary: boolean }>();
  const fields = output.split("\0");
  for (let i = 0; i < fields.length; i++) {
    const match = /^(-|\d+)\t(-|\d+)\t(.*)$/s.exec(fields[i]!);
    if (!match) continue;
    // Renames leave the path empty and put old and new paths in the next two fields.
    const path = match[3] === "" ? fields[(i += 2)]! : match[3]!;
    stats.set(path, {
      additions: match[1] === "-" ? 0 : Number(match[1]),
      deletions: match[2] === "-" ? 0 : Number(match[2]),
      binary: match[1] === "-",
    });
  }
  return stats;
}

function generatedPaths(cwd: string, paths: string[]): Set<string> {
  const generated = new Set(paths.filter((path) => LOCKFILES.has(basename(path))));
  if (paths.length === 0) return generated;
  const result = spawnSync("git", ["check-attr", "-z", "--stdin", "linguist-generated"], {
    cwd,
    encoding: "utf8",
    input: paths.join("\0"),
    maxBuffer: 1 << 30,
  });
  const fields = result.stdout.split("\0");
  for (let i = 0; i + 2 < fields.length; i += 3) {
    if (fields[i + 2] === "set" || fields[i + 2] === "true") generated.add(fields[i]!);
  }
  return generated;
}

function untrackedFile(root: string, path: string): Omit<ChangedFile, "generated" | "sources"> {
  const base = { path, oldPath: null, status: "added" as const };
  if (lstatSync(join(root, path)).size > MAX_PATCH_BYTES) {
    // Too big to keep a patch, but the line count still belongs in the totals.
    const contents = readFileSync(join(root, path));
    // Git's own test: a NUL byte in the first 8000 bytes means binary.
    const binary = contents.subarray(0, 8000).includes(0);
    const lines =
      contents.toString("latin1").split("\n").length - (contents.at(-1) === 0x0a ? 1 : 0);
    return { ...base, additions: binary ? 0 : lines, deletions: 0, binary, patch: null };
  }
  // --no-index exits 1 when the files differ, which they always do here.
  const patch = git(root, ["diff", ...DIFF_FLAGS, "--no-index", "--", "/dev/null", path], [0, 1]);
  const binary = /^Binary files /m.test(patch);
  return { ...base, ...countPatchLines(patch), binary, patch };
}

/** The repository's name, the same from any of its worktrees. */
function repoName(root: string, commonDir: string): string {
  // A standard layout keeps the shared git dir in <repo>/.git.
  return basename(commonDir) === ".git" ? basename(dirname(commonDir)) : basename(root);
}

/** When the repo last fetched, from FETCH_HEAD's mtime. */
function fetchedAt(commonDir: string): string | null {
  try {
    return statSync(join(commonDir, "FETCH_HEAD")).mtime.toISOString();
  } catch {
    return null;
  }
}

export function collect({ cwd, base: requested, direct = false }: CollectOptions): DiffData {
  const root = tryGit(cwd, ["rev-parse", "--show-toplevel"]);
  if (!root) throw new GitError(`${cwd} isn't inside a git repository`);
  const headSha = revParse(root, "HEAD");
  if (!headSha) throw new GitError("this repo has no commits yet");

  const base = resolveBase(root, requested);
  const mergeBase = direct ? base.sha : tryGit(root, ["merge-base", base.sha, headSha]);
  if (!mergeBase) {
    throw new GitError(
      `${base.ref} and HEAD share no history. use --direct to compare them anyway`,
    );
  }

  // Working tree against the base: commits, staged and unstaged edits in one diff.
  const entries = parseNameStatus(
    git(root, ["diff", ...DIFF_FLAGS, "--name-status", "-z", mergeBase]),
  );
  const stats = parseNumstat(git(root, ["diff", ...DIFF_FLAGS, "--numstat", "-z", mergeBase]));
  const patches = splitPatch(git(root, ["diff", ...DIFF_FLAGS, mergeBase]));

  const changedIn = (args: string[]) =>
    new Set(nulFields(git(root, ["diff", ...DIFF_FLAGS, "--name-only", "-z", ...args])));
  const sourceSets: [ChangeSource, Set<string>][] = [
    ["committed", changedIn([mergeBase, headSha])],
    ["staged", changedIn(["--cached", headSha])],
    ["unstaged", changedIn([])],
  ];

  const tracked = entries.map((entry) => {
    const stat = stats.get(entry.path) ?? { additions: 0, deletions: 0, binary: false };
    const patch = patches.get(entry.path) ?? null;
    const sources = sourceSets.filter(([, paths]) => paths.has(entry.path)).map(([name]) => name);
    return {
      ...entry,
      ...stat,
      sources,
      patch: patch !== null && patch.length > MAX_PATCH_BYTES ? null : patch,
    };
  });
  const untracked = nulFields(git(root, ["ls-files", "-z", "--others", "--exclude-standard"])).map(
    (path) => ({ ...untrackedFile(root, path), sources: ["untracked" as const] }),
  );

  const all = [...tracked, ...untracked].sort((a, b) => a.path.localeCompare(b.path));
  const generated = generatedPaths(
    root,
    all.map((file) => file.path),
  );
  const files: ChangedFile[] = all.map((file) => ({
    ...file,
    generated: generated.has(file.path),
  }));

  const commits: Commit[] = nulFields(
    git(root, ["log", "-z", "--format=%H%x1f%s%x1f%an%x1f%aI", `${mergeBase}..${headSha}`]),
  ).map((record) => {
    const [sha, subject, author, date] = record.split("\x1f") as [string, string, string, string];
    return { sha, subject, author, date };
  });

  const commonDir = git(root, ["rev-parse", "--path-format=absolute", "--git-common-dir"]).trim();
  // With --direct the merge base is the base, so this is 0.
  const ahead = Number(git(root, ["rev-list", "--count", `${mergeBase}..${base.sha}`]));
  const remote =
    tryGit(root, ["rev-parse", "--symbolic-full-name", base.ref])?.startsWith("refs/remotes/") ??
    false;

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    repo: { name: repoName(root, commonDir), root },
    head: { branch: tryGit(root, ["symbolic-ref", "--quiet", "--short", "HEAD"]), sha: headSha },
    base: { ...base, diffFrom: mergeBase, direct, ahead, remote, fetchedAt: fetchedAt(commonDir) },
    commits,
    files,
    totals: {
      files: files.length,
      additions: files.reduce((sum, file) => sum + file.additions, 0),
      deletions: files.reduce((sum, file) => sum + file.deletions, 0),
    },
  };
}
