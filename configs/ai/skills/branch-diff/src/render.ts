import { compileSpecStream, validateSpec, type Spec, type UIElement } from "@json-render/core";
import { getFiletypeFromFileName } from "@pierre/diffs";
import type { z } from "zod";
import { catalog, PATH_COMPONENTS } from "./catalog.ts";
import type { ChangedFile, DiffData } from "./data.ts";
import { visibleLines } from "./patch.ts";

/** Shiki grammars by name, and the grammars each language id or alias needs, in load order. */
export interface Grammars {
  lookup: Record<string, string[]>;
  grammars: Record<string, unknown>;
}

/** What the viewer page reads from its embedded script tag. */
export interface Payload {
  data: DiffData;
  spec: Spec;
  grammars: Grammars;
}

export const PAYLOAD_MARKER = "<!--branch-diff-payload-->";

/** A spec that can't be read. Each problem is one line for the agent to fix. */
export class SpecError extends Error {
  constructor(readonly problems: string[]) {
    super(problems.join("\n"));
  }
}

const isFence = (line: string) => line.trimStart().startsWith("```");

/** Accepts a whole spec as JSON, or the JSONL patch stream `prompt` describes, either one in a code fence. */
export function parseSpec(text: string): Spec {
  const lines = text.split("\n");
  const body = lines
    .map((line) => (isFence(line) ? "" : line))
    .join("\n")
    .trim();
  if (body.startsWith("{") && !body.includes("\n{")) {
    try {
      return JSON.parse(body) as Spec;
    } catch {
      // Could be a one-line stream. The line check below says what's wrong.
    }
  }
  // json-render skips lines it can't parse, which would silently drop elements.
  const problems = lines.flatMap((line, i) => {
    if (line.trim() === "" || isFence(line)) return [];
    try {
      JSON.parse(line);
      return [];
    } catch {
      return [`spec line ${i + 1} isn't valid JSON`];
    }
  });
  if (problems.length > 0) throw new SpecError(problems);
  return compileSpecStream<Spec & Record<string, unknown>>(body);
}

interface Note {
  line: number;
  side: "new" | "old";
  path: string;
}

/** "3-5, 9" for {3, 4, 5, 9}. */
function ranges(lines: Set<number>): string {
  const sorted = [...lines].sort((a, b) => a - b);
  const spans: string[] = [];
  for (let start = 0, end = 0; start < sorted.length; start = ++end) {
    while (sorted[end + 1] === sorted[end]! + 1) end++;
    spans.push(start === end ? `${sorted[start]}` : `${sorted[start]}-${sorted[end]}`);
  }
  return spans.join(", ") || "no lines";
}

function checkNotes(key: string, notes: Note[], files: Map<string, ChangedFile>): string[] {
  return notes.flatMap((note) => {
    const file = files.get(note.path);
    if (!file?.patch || file.binary)
      return [`${key}: note on ${note.path}, which has no text diff to pin it to`];
    const visible = visibleLines(file.patch)[note.side];
    if (visible.has(note.line)) return [];
    return [
      `${key}: ${note.path} line ${note.line} (${note.side}) isn't in the diff (${note.side} side shows ${ranges(visible)})`,
    ];
  });
}

const isExpression = (value: unknown) =>
  typeof value === "object" &&
  value !== null &&
  Object.keys(value).some((name) => name.startsWith("$"));

/** "<element>: <prop path>: <message>", leaving out empty parts. */
const problemAt = (parts: string[], message: string) =>
  [...parts.filter(Boolean), message].join(": ");

/** What's wrong with one element's props. catalog.validate only checks the element types. */
function propProblems(key: string, element: UIElement): string[] {
  const schema = (catalog.data.components as Record<string, { props: z.ZodObject }>)[element.type]!
    .props;
  const props = element.props as Record<string, unknown>;
  // Expressions like {"$state": ...} resolve at render time, except in props that name files.
  const literalOnly = (PATH_COMPONENTS as readonly string[]).includes(element.type);
  return (schema.strict().safeParse(props).error?.issues ?? [])
    .filter((issue) => {
      const value = issue.path.reduce<unknown>(
        (parent, part) => (parent as Record<PropertyKey, unknown> | undefined)?.[part],
        props,
      );
      // The catalog marks optional props nullable, and specs leave them out.
      const isOmittedOptional =
        value === undefined &&
        issue.path.length === 1 &&
        schema.shape[String(issue.path[0])]?.safeParse(null).success;
      return !isOmittedOptional && (literalOnly || !isExpression(value));
    })
    .map((issue) => problemAt([key, issue.path.join(".")], issue.message));
}

/** Everything wrong with a spec for this data. Empty means it renders. */
export function checkSpec(spec: Spec, data: DiffData): string[] {
  const parsed = catalog.validate(spec);
  if (!parsed.success) {
    return (parsed.error?.issues ?? []).map(({ path, message }) =>
      path[0] === "elements"
        ? problemAt([String(path[1]), path.slice(2).join(".")], message)
        : problemAt([path.join(".")], message),
    );
  }
  // json-render only warns about orphans, but an unreachable group hides its files.
  const problems = validateSpec(spec, { checkOrphans: true }).issues.map(
    ({ elementKey, message }) => problemAt([elementKey ?? ""], message),
  );
  const propErrors = Object.entries(spec.elements).flatMap(([key, element]) =>
    propProblems(key, element),
  );
  // The checks below read props as the catalog types them.
  if (propErrors.length > 0) return [...problems, ...propErrors];

  const files = new Map(data.files.map((file) => [file.path, file]));
  const shown = new Map<string, string>();
  const show = (key: string, path: string) => {
    if (!files.has(path)) return problems.push(`${key}: ${path} isn't a changed file`);
    const previous = shown.get(path);
    if (previous) return problems.push(`${key}: ${path} is already shown by ${previous}`);
    shown.set(path, key);
  };

  for (const [key, element] of Object.entries(spec.elements)) {
    const props = element.props as Record<string, unknown>;
    if (element.type === "ChangeGroup") {
      const paths = props.paths as string[];
      paths.forEach((path) => show(key, path));
      const notes = (props.notes ?? []) as Note[];
      const strays = notes.filter((note) => !paths.includes(note.path));
      problems.push(...strays.map((note) => `${key}: note path ${note.path} isn't in this group`));
      problems.push(
        ...checkNotes(
          key,
          notes.filter((note) => !strays.includes(note)),
          files,
        ),
      );
    } else if (element.type === "FileDiff") {
      show(key, props.path as string);
      const notes = ((props.notes ?? []) as Note[]).map((note) => ({
        ...note,
        path: props.path as string,
      }));
      problems.push(...checkNotes(key, notes, files));
    } else if (element.type === "FileList" && Array.isArray(props.paths)) {
      for (const path of props.paths) {
        if (!files.has(path as string))
          problems.push(`${key}: ${String(path)} isn't a changed file`);
      }
    }
  }

  const missing = data.files.filter((file) => !shown.has(file.path)).map((file) => file.path);
  if (missing.length > 0) problems.push(`not shown anywhere: ${missing.join(", ")}`);
  return problems;
}

/** The grammars for the languages in this diff. Files in other languages show as plain text. */
export function pickGrammars(all: Grammars, data: DiffData): Grammars {
  const picked: Grammars = { lookup: {}, grammars: {} };
  for (const file of data.files) {
    const language = getFiletypeFromFileName(file.path);
    const names = all.lookup[language];
    if (!names || file.patch === null || file.binary) continue;
    picked.lookup[language] = names;
    for (const name of names) picked.grammars[name] = all.grammars[name];
  }
  return picked;
}

/** Embeds the payload in the viewer page. Escaped so file contents can't close the script tag. */
export function renderHtml(viewerHtml: string, payload: Payload): string {
  if (!viewerHtml.includes(PAYLOAD_MARKER)) throw new Error("viewer.html has no payload marker");
  // JSON.parse reads it back, so escaping "<" is all the script tag needs.
  const json = JSON.stringify(payload).replace(/</g, "\\u003c");
  const { head, base } = payload.data;
  const title = `${head.branch ?? head.sha.slice(0, 7)} vs ${base.ref}`.replace(
    /[&<>"]/g,
    (c) => `&#${c.charCodeAt(0)};`,
  );
  return viewerHtml
    .replace(/<title>[^<]*<\/title>/, () => `<title>${title}</title>`)
    .replace(
      PAYLOAD_MARKER,
      () => `<script type="application/json" id="branch-diff-payload">${json}</script>`,
    );
}
