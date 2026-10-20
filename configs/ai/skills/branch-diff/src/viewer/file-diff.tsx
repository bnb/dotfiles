import { getFiletypeFromFileName, processFile, setLanguageOverride } from "@pierre/diffs";
import { FileDiff, type DiffLineAnnotation } from "@pierre/diffs/react";
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Markdown from "react-markdown";
import type { ChangedFile } from "../data.ts";
import { fileAnchor, useViewer } from "./context.ts";

export interface Note {
  line: number;
  side: "new" | "old";
  text: string;
}

const STATUS_STYLES: Record<ChangedFile["status"], [label: string, className: string]> = {
  added: ["Added", "text-added"],
  modified: ["Modified", "text-muted-foreground"],
  deleted: ["Deleted", "text-removed"],
  renamed: ["Renamed", "text-renamed"],
  copied: ["Copied", "text-renamed"],
  "type-changed": ["Type changed", "text-muted-foreground"],
  unmerged: ["Conflict", "text-removed"],
};

const SOURCE_LABELS: Record<ChangedFile["sources"][number], string> = {
  committed: "",
  staged: "Staged",
  unstaged: "Unstaged",
  untracked: "Untracked",
};

export function LineCounts({
  additions,
  deletions,
  className = "text-xs",
}: {
  additions: number;
  deletions: number;
  className?: string;
}) {
  return (
    <span className={`shrink-0 font-mono tabular-nums ${className}`}>
      <span className="text-added">+{additions}</span>{" "}
      <span className="text-removed">-{deletions}</span>
    </span>
  );
}

export function StatusMark({ status }: { status: ChangedFile["status"] }) {
  const [label, className] = STATUS_STYLES[status];
  return (
    <span
      className={`w-4 shrink-0 text-center font-mono text-xs font-semibold ${className}`}
      title={label}
    >
      {label[0]}
    </span>
  );
}

const LINE_HEIGHT = 20;

/** Roughly how tall a diff renders: its hunk lines plus a separator per hunk. */
export function estimateHeight(patch: string): number {
  const lines = patch.split("\n");
  const hunks = lines.filter((line) => line.startsWith("@@")).length;
  const body = lines.length - lines.findIndex((line) => line.startsWith("@@"));
  return body * LINE_HEIGHT + hunks * 2 * LINE_HEIGHT;
}

/**
 * On big pages, mounts its children once they come near the viewport, so only
 * what gets read is highlighted. Small pages render everything up front, which
 * keeps find-in-page and printing complete.
 */
function WhenNear({ children, estimate }: { children: ReactNode; estimate: number }) {
  const { lazy } = useViewer();
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(!lazy);
  useEffect(() => {
    const element = ref.current;
    if (!element || near) return;
    const observer = new IntersectionObserver(
      (entries) => entries.some((entry) => entry.isIntersecting) && setNear(true),
      { rootMargin: "1200px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [near]);
  return (
    <div ref={ref} style={near ? undefined : { height: estimate }}>
      {near && children}
    </div>
  );
}

class DiffErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return <Placeholder>This diff couldn't be displayed.</Placeholder>;
    return this.props.children;
  }
}

function Placeholder({ children }: { children: ReactNode }) {
  return <p className="px-4 py-3 text-sm text-muted-foreground">{children}</p>;
}

function NoteBox({ text }: { text: string }) {
  return (
    <div className="md border-l-2 border-amber-500 bg-note px-3 py-2 font-sans">
      <Markdown>{text}</Markdown>
    </div>
  );
}

function DiffBody({ file, notes }: { file: ChangedFile; notes: Note[] }) {
  const { layout, languages } = useViewer();
  const fileDiff = useMemo(() => {
    const parsed = file.patch && processFile(file.patch, { isGitDiff: true });
    if (!parsed) return null;
    // Languages without an embedded grammar would fail to load, so they render as plain text.
    return languages.has(getFiletypeFromFileName(file.path))
      ? parsed
      : setLanguageOverride(parsed, "text");
  }, [file.patch, file.path, languages]);
  const options = useMemo(
    () => ({
      theme: { light: "pierre-light", dark: "pierre-dark" },
      themeType: "system" as const,
      diffStyle: layout,
      disableFileHeader: true,
      // Wrapping splits identifiers mid-word and drops indentation, so long lines scroll.
      overflow: "scroll" as const,
    }),
    [layout],
  );
  const annotations = useMemo<DiffLineAnnotation<string>[]>(
    () =>
      notes.map((note) => ({
        side: note.side === "new" ? "additions" : "deletions",
        lineNumber: note.line,
        metadata: note.text,
      })),
    [notes],
  );

  if (file.binary) return <Placeholder>Binary file, not shown.</Placeholder>;
  if (file.patch === null) return <Placeholder>Too large to show here.</Placeholder>;
  if (!fileDiff || !file.patch.includes("\n@@")) {
    return (
      <Placeholder>
        {file.status === "renamed" ? "Moved without changes." : "No content changes."}
      </Placeholder>
    );
  }
  return (
    <WhenNear estimate={estimateHeight(file.patch)}>
      <DiffErrorBoundary>
        <FileDiff
          fileDiff={fileDiff}
          options={options}
          lineAnnotations={annotations}
          renderAnnotation={(annotation) => <NoteBox text={annotation.metadata ?? ""} />}
          disableWorkerPool
        />
      </DiffErrorBoundary>
    </WhenNear>
  );
}

export function FileDiffView({
  file,
  note,
  notes,
  defaultOpen,
}: {
  file: ChangedFile;
  note?: string | null;
  notes: Note[];
  defaultOpen?: boolean | null;
}) {
  const anchor = fileAnchor(file.path);
  const [open, setOpen] = useState(defaultOpen ?? !file.generated);

  // A file list link opens the diff it points at.
  useEffect(() => {
    const openIfLinked = () => {
      if (decodeURIComponent(location.hash.slice(1)) === anchor) setOpen(true);
    };
    openIfLinked();
    addEventListener("hashchange", openIfLinked);
    return () => removeEventListener("hashchange", openIfLinked);
  }, [anchor]);

  const sources = file.sources.map((source) => SOURCE_LABELS[source]).filter(Boolean);
  return (
    // overflow-clip, not overflow-hidden: a scroll container would pin the sticky header inside it.
    <section
      id={anchor}
      className="w-full min-w-0 scroll-mt-12 overflow-clip rounded-lg border bg-card"
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="sticky top-12 z-10 flex w-full items-center gap-2 border-b bg-card px-3 py-2 text-left hover:bg-accent"
      >
        <svg
          viewBox="0 0 16 16"
          aria-hidden
          className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
        >
          <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <StatusMark status={file.status} />
        <span className="min-w-0 flex-1 truncate font-mono text-[13px]" title={file.path}>
          {file.oldPath && <span className="text-muted-foreground">{file.oldPath} → </span>}
          {file.path}
        </span>
        {file.generated && <Tag>Generated</Tag>}
        {sources.map((source) => (
          <Tag key={source}>{source}</Tag>
        ))}
        <LineCounts additions={file.additions} deletions={file.deletions} />
      </button>
      {note && (
        <div className="md border-b px-4 py-3">
          <Markdown>{note}</Markdown>
        </div>
      )}
      {open && <DiffBody file={file} notes={notes} />}
    </section>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] text-muted-foreground">
      {children}
    </span>
  );
}
