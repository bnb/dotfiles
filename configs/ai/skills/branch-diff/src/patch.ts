// Walks the lines of a git patch with their line numbers. Shared by collect
// (line counts), render (which lines a note can pin to), and the CLI's
// numbered `patch` output.

export interface PatchLine {
  text: string;
  /** "+", "-", or " " inside a hunk, "\\" for "\ No newline at end of file", null for headers. */
  kind: "+" | "-" | " " | "\\" | null;
  /** The line's number on each side. Null on a side it isn't on. */
  old: number | null;
  new: number | null;
}

const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

export function* patchLines(patch: string): Generator<PatchLine> {
  // Each hunk header says how many lines it covers, so file headers that look
  // like changes ("--- a/x") are never mistaken for them.
  let oldLine = 0;
  let newLine = 0;
  let oldLeft = 0;
  let newLeft = 0;
  for (const text of patch.split("\n")) {
    const hunk = HUNK_HEADER.exec(text);
    if (hunk) {
      oldLine = Number(hunk[1]);
      oldLeft = Number(hunk[2] ?? 1);
      newLine = Number(hunk[3]);
      newLeft = Number(hunk[4] ?? 1);
    }
    const kind = text[0];
    if (!hunk && kind === "-" && oldLeft > 0) {
      oldLeft--;
      yield { text, kind, old: oldLine++, new: null };
    } else if (!hunk && kind === "+" && newLeft > 0) {
      newLeft--;
      yield { text, kind, old: null, new: newLine++ };
    } else if (!hunk && kind === " " && oldLeft > 0 && newLeft > 0) {
      oldLeft--;
      newLeft--;
      yield { text, kind, old: oldLine++, new: newLine++ };
    } else if (kind === "\\") {
      yield { text, kind, old: null, new: null };
    } else {
      yield { text, kind: null, old: null, new: null };
    }
  }
}

/** Counts added and removed lines in a patch. */
export function countPatchLines(patch: string): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  for (const line of patchLines(patch)) {
    if (line.kind === "+") additions++;
    else if (line.kind === "-") deletions++;
  }
  return { additions, deletions };
}

/** Line numbers visible in a file's diff, per side. Context lines count on both. */
export function visibleLines(patch: string): { new: Set<number>; old: Set<number> } {
  const lines = { new: new Set<number>(), old: new Set<number>() };
  for (const line of patchLines(patch)) {
    if (line.old !== null) lines.old.add(line.old);
    if (line.new !== null) lines.new.add(line.new);
  }
  return lines;
}

/** The patch with each hunk line prefixed by its old and new line numbers. Headers stay as they are. */
export function numberPatch(patch: string): string {
  const lines = [...patchLines(patch)];
  const highest = Math.max(0, ...lines.flatMap((line) => [line.old ?? 0, line.new ?? 0]));
  const width = Math.max(2, String(highest).length) + 2;
  const column = (n: number | null) => (n === null ? "" : String(n)).padStart(width);
  return lines
    .map((line) =>
      line.kind === null ? line.text : `${column(line.old)}${column(line.new)}  │ ${line.text}`,
    )
    .join("\n");
}
