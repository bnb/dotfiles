import { defineRegistry } from "@json-render/react";
import { shadcnComponents as shadcn } from "@json-render/shadcn";
import type { ReactNode } from "react";
import Markdown from "react-markdown";
import { catalog } from "../catalog.ts";
import type { ChangedFile } from "../data.ts";
import { fileHref, useViewer } from "./context.ts";
import { FileDiffView, LineCounts, StatusMark } from "./file-diff.tsx";

const RISK_STYLES = {
  low: "border-added/40 text-added",
  medium: "border-amber-500/50 text-amber-600 dark:text-amber-400",
  high: "border-removed/50 text-removed",
};

const short = (sha: string) => sha.slice(0, 7);

function useFiles(paths: string[]): ChangedFile[] {
  const { data } = useViewer();
  return paths.flatMap((path) => data.files.find((file) => file.path === path) ?? []);
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-mono text-lg font-semibold tabular-nums">{children}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="text-base font-semibold">
      <InlineMarkdown>{children}</InlineMarkdown>
    </h2>
  );
}

/** Markdown for one-line text: code spans and emphasis, no paragraphs or blocks. */
function InlineMarkdown({ children }: { children: string }) {
  return (
    <span className="md-inline">
      <Markdown allowedElements={["code", "em", "strong"]} unwrapDisallowed>
        {children}
      </Markdown>
    </span>
  );
}

export const { registry } = defineRegistry(catalog, {
  components: {
    DiffHeader: ({ props }) => {
      const { data } = useViewer();
      const pending = data.files.filter((file) => !file.sources.includes("committed")).length;
      return (
        <header className="flex w-full min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-balance">
              <InlineMarkdown>{props.title}</InlineMarkdown>
            </h1>
            <p className="font-mono text-xs text-muted-foreground">
              {data.head.sha === data.base.sha
                ? `${short(data.head.sha)}, the same commit as the base`
                : `${short(data.head.sha)} vs ${short(data.base.sha)}`}
              {data.base.diffFrom !== data.base.sha &&
                `, from merge base ${short(data.base.diffFrom)}`}
              {data.base.ahead > 0 &&
                `. ${data.base.ref} has ${data.base.ahead} ${data.base.ahead === 1 ? "commit" : "commits"} since`}
            </p>
          </div>
          {props.summary && (
            <div className="md max-w-prose">
              <Markdown>{props.summary}</Markdown>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Files">{data.totals.files}</Stat>
            <Stat label="Lines">
              <LineCounts
                additions={data.totals.additions}
                deletions={data.totals.deletions}
                className="text-lg"
              />
            </Stat>
            <Stat label="Commits">{data.commits.length}</Stat>
            <Stat label="Not committed">{pending}</Stat>
          </div>
        </header>
      );
    },

    ChangeGroup: ({ props, children }) => {
      const files = useFiles(props.paths);
      const additions = files.reduce((sum, file) => sum + file.additions, 0);
      const deletions = files.reduce((sum, file) => sum + file.deletions, 0);
      return (
        <section className="flex w-full min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <SectionTitle>{props.title}</SectionTitle>
            {props.risk && (
              <span
                className={`rounded-md border px-1.5 py-0.5 text-xs font-medium ${RISK_STYLES[props.risk]}`}
              >
                {props.risk[0]!.toUpperCase() + props.risk.slice(1)} risk
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {files.length} {files.length === 1 ? "file" : "files"}
            </span>
            <LineCounts additions={additions} deletions={deletions} />
          </div>
          {props.summary && (
            <div className="md max-w-prose">
              <Markdown>{props.summary}</Markdown>
            </div>
          )}
          {children}
          {files.map((file) => (
            <FileDiffView
              key={file.path}
              file={file}
              notes={(props.notes ?? []).filter((note) => note.path === file.path)}
              defaultOpen={props.defaultOpen}
            />
          ))}
        </section>
      );
    },

    FileDiff: ({ props }) => {
      const [file] = useFiles([props.path]);
      if (!file) return null;
      return (
        <FileDiffView
          file={file}
          note={props.note}
          notes={props.notes ?? []}
          defaultOpen={props.defaultOpen}
        />
      );
    },

    FileList: ({ props }) => {
      const { data } = useViewer();
      const files = useFiles(props.paths ?? data.files.map((file) => file.path));
      return (
        <nav
          className="flex w-full min-w-0 flex-col gap-2"
          aria-label={props.title ?? "Changed files"}
        >
          {props.title && <SectionTitle>{props.title}</SectionTitle>}
          <ul className="divide-y rounded-lg border bg-card">
            {files.map((file) => (
              <li key={file.path}>
                <a
                  href={fileHref(file.path)}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent"
                >
                  <StatusMark status={file.status} />
                  <span className="min-w-0 flex-1 truncate font-mono text-[13px]" title={file.path}>
                    {file.path}
                  </span>
                  <LineCounts additions={file.additions} deletions={file.deletions} />
                </a>
              </li>
            ))}
          </ul>
        </nav>
      );
    },

    CommitList: ({ props }) => {
      const { data } = useViewer();
      if (data.commits.length === 0) return null;
      return (
        <section className="flex w-full min-w-0 flex-col gap-2">
          {props.title && <SectionTitle>{props.title}</SectionTitle>}
          <ol className="divide-y rounded-lg border bg-card">
            {data.commits.map((commit) => (
              <li key={commit.sha} className="flex items-baseline gap-3 px-3 py-1.5 text-sm">
                <code className="shrink-0 font-mono text-xs text-muted-foreground">
                  {short(commit.sha)}
                </code>
                <span className="min-w-0 flex-1">{commit.subject}</span>
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                  {commit.author}
                </span>
                <time className="shrink-0 text-xs text-muted-foreground" dateTime={commit.date}>
                  {new Date(commit.date).toLocaleDateString()}
                </time>
              </li>
            ))}
          </ol>
        </section>
      );
    },

    Markdown: ({ props }) => (
      <div className="md w-full max-w-prose">
        <Markdown>{props.text}</Markdown>
      </div>
    ),

    Stack: shadcn.Stack,
    Grid: shadcn.Grid,
    Card: shadcn.Card,
    Heading: shadcn.Heading,
    Text: shadcn.Text,
    Badge: shadcn.Badge,
    Alert: shadcn.Alert,
    Tabs: shadcn.Tabs,
    Collapsible: shadcn.Collapsible,
    Separator: shadcn.Separator,
    Table: shadcn.Table,
  },
});
