import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { specPrompt } from "./catalog.ts";
import type { Spec } from "@json-render/core";
import { collect, GitError } from "./collect.ts";
import type { ChangedFile, DiffData } from "./data.ts";
import { numberPatch } from "./patch.ts";
import {
  checkSpec,
  parseSpec,
  pickGrammars,
  renderHtml,
  SpecError,
  type Grammars,
} from "./render.ts";

const USAGE = `usage:
  cli.mjs collect [base] [--direct] [--repo <path>] (--out <data.json> | --out-root <dir>)
  cli.mjs patch --data <data.json> [path...]
  cli.mjs prompt
  cli.mjs render --data <data.json> --spec <spec.jsonl> --out <page.html>`;

const STATUS_CODES: Record<ChangedFile["status"], string> = {
  added: "A",
  modified: "M",
  deleted: "D",
  renamed: "R",
  copied: "C",
  "type-changed": "T",
  unmerged: "U",
};

const BASE_SOURCES: Record<DiffData["base"]["source"], string> = {
  argument: "as given",
  "remote-head": "remote default branch",
  "default-branch": "guessed default branch",
};

const short = (sha: string) => sha.slice(0, 7);
const DAY_MS = 86_400_000;

/** A problem to print without a stack trace, and the exit code to leave with. */
class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode = 1,
  ) {
    super(message);
  }
}

/** The folder this diff's files go in: <repo>-<branch>-diff. */
export function diffFolder({ repo, head }: DiffData): string {
  return `${repo.name}-${(head.branch ?? short(head.sha)).replaceAll("/", "-")}-diff`;
}

/** Things about the base worth a second look before trusting the diff. */
function baseNotes({ base, generatedAt }: DiffData): string[] {
  const notes = [];
  if (base.ahead > 0) notes.push(`${base.ref} is ${base.ahead} commits past the merge base`);
  if (base.fetchedAt === null) {
    if (base.remote) notes.push("never fetched");
  } else {
    const days = Math.floor((Date.parse(generatedAt) - Date.parse(base.fetchedAt)) / DAY_MS);
    if (days >= 1) notes.push(`last fetched ${days} ${days === 1 ? "day" : "days"} ago`);
  }
  return notes.map((note) => `note: ${note}`);
}

export function summarize(data: DiffData): string {
  const { repo, head, base, totals } = data;
  const from = base.direct ? "the base itself" : `merge base ${short(base.diffFrom)}`;
  const lines = [
    `${repo.name}: ${head.branch ?? "detached HEAD"} (${short(head.sha)}) vs ${base.ref} (${short(base.sha)}, ${BASE_SOURCES[base.source]})`,
    `diff from ${from}: ${data.commits.length} commits, ${totals.files} files, +${totals.additions} -${totals.deletions}`,
    ...baseNotes(data),
  ];
  if (data.commits.length > 0) lines.push("", "commits:");
  for (const commit of data.commits) lines.push(`  ${short(commit.sha)} ${commit.subject}`);
  if (data.files.length > 0) lines.push("", "files:");
  for (const file of data.files) {
    const path = file.oldPath ? `${file.oldPath} -> ${file.path}` : file.path;
    const flags = [
      file.sources.join(","),
      file.generated && "generated",
      file.binary && "binary",
      file.patch === null && "too large to show",
    ].filter(Boolean);
    lines.push(
      `  ${STATUS_CODES[file.status]} ${path} +${file.additions} -${file.deletions} [${flags.join("; ")}]`,
    );
  }
  lines.push("", `folder: ${diffFolder(data)}`);
  return lines.join("\n");
}

function read(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    throw new CliError(`can't read ${path}`);
  }
}

function readData(path: string): DiffData {
  try {
    return JSON.parse(read(path)) as DiffData;
  } catch (error) {
    throw error instanceof SyntaxError ? new CliError(`${path} isn't valid JSON`) : error;
  }
}

const needsFixing = (problems: string[]) =>
  new CliError(`the spec needs fixing:\n${problems.map((problem) => `- ${problem}`).join("\n")}`);

function write(path: string, contents: string) {
  mkdirSync(dirname(resolve(path)), { recursive: true });
  writeFileSync(path, contents);
}

function parse(args: string[]) {
  try {
    return parseArgs({
      args,
      allowPositionals: true,
      options: {
        data: { type: "string" },
        direct: { type: "boolean" },
        out: { type: "string" },
        "out-root": { type: "string" },
        repo: { type: "string" },
        spec: { type: "string" },
      },
    });
  } catch (error) {
    throw new CliError(`${(error as Error).message}\n${USAGE}`, 2);
  }
}

function run(argv: string[]): number {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(USAGE);
    return 0;
  }
  const [command, ...rest] = argv;
  const { values, positionals } = parse(rest);
  const outRoot = values["out-root"];

  if (command === "collect" && (values.out === undefined) !== (outRoot === undefined)) {
    const data = collect({
      cwd: values.repo ?? process.cwd(),
      base: positionals[0],
      direct: values.direct,
    });
    const out = values.out ?? join(outRoot!, diffFolder(data), "data.json");
    write(out, JSON.stringify(data));
    console.log(`${summarize(data)}\nwrote ${resolve(out)}`);
    return 0;
  }
  if (command === "patch" && values.data) {
    const { files } = readData(values.data);
    const unknown = positionals.filter((path) => !files.some((file) => file.path === path));
    if (unknown.length > 0)
      throw new CliError(unknown.map((path) => `${path} isn't a changed file`).join("\n"));
    for (const file of files) {
      if (positionals.length > 0 && !positionals.includes(file.path)) continue;
      console.log(
        file.patch === null ? `(${file.path}: too large to show)` : numberPatch(file.patch),
      );
    }
    return 0;
  }
  if (command === "prompt") {
    console.log(specPrompt());
    return 0;
  }
  if (command === "render" && values.data && values.spec && values.out) {
    const data = readData(values.data);
    let spec: Spec;
    try {
      spec = parseSpec(read(values.spec));
    } catch (error) {
      throw error instanceof SpecError ? needsFixing(error.problems) : error;
    }
    const problems = checkSpec(spec, data);
    if (problems.length > 0) throw needsFixing(problems);
    const viewer = readFileSync(new URL("./viewer.html", import.meta.url), "utf8");
    const grammars = JSON.parse(
      readFileSync(new URL("./grammars.json", import.meta.url), "utf8"),
    ) as Grammars;
    write(values.out, renderHtml(viewer, { data, spec, grammars: pickGrammars(grammars, data) }));
    console.log(`wrote ${resolve(values.out)}`);
    return 0;
  }
  console.error(USAGE);
  return 2;
}

/** Runs a command and returns its exit code. Problems the user can fix print as plain messages. */
export function main(argv: string[]): number {
  try {
    return run(argv);
  } catch (error) {
    if (!(error instanceof CliError || error instanceof GitError)) throw error;
    console.error(error.message);
    return error instanceof CliError ? error.exitCode : 1;
  }
}
