// What the agent may put in a spec. Shared by the CLI (prompt and validation)
// and the viewer (registry), so both always agree.
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { shadcnComponentDefinitions as shadcn } from "@json-render/shadcn/catalog";
import { z } from "zod";

const note = z.object({
  line: z
    .number()
    .int()
    .positive()
    .describe("The file's line number on that side, as `patch` prints it"),
  side: z
    .enum(["new", "old"])
    .describe('"old" for removed lines, "new" for added lines, either for unchanged ones'),
  text: z.string().describe("Markdown"),
});

export const catalog = defineCatalog(schema, {
  components: {
    DiffHeader: {
      props: z.object({
        title: z.string().describe("Inline Markdown. What the change does, in a few words"),
        summary: z.string().nullable().describe("Markdown. Why, and what a reviewer should know"),
      }),
      description:
        "Page header: your title and summary over the repo, branch, base, and totals. Use once, first.",
    },
    ChangeGroup: {
      props: z.object({
        title: z.string().describe("Inline Markdown"),
        summary: z.string().nullable().describe("Markdown"),
        risk: z.enum(["low", "medium", "high"]).nullable(),
        paths: z
          .array(z.string())
          .min(1)
          .describe("Changed file paths, exactly as collect printed them"),
        notes: z
          .array(note.extend({ path: z.string().describe("One of this group's paths") }))
          .nullable(),
        defaultOpen: z.boolean().nullable().describe("Expand the diffs on load. Default true"),
      }),
      slots: ["default"],
      description:
        "A set of files that change for one reason. Renders the summary, any children, then every file's diff with your notes pinned to lines.",
    },
    FileDiff: {
      props: z.object({
        path: z.string(),
        note: z.string().nullable().describe("Markdown shown above the diff"),
        notes: z.array(note).nullable(),
        defaultOpen: z.boolean().nullable(),
      }),
      description: "One file's diff on its own, outside any ChangeGroup.",
    },
    FileList: {
      props: z.object({
        title: z.string().nullable(),
        paths: z.array(z.string()).nullable().describe("Defaults to every changed file"),
      }),
      description:
        "Compact list of files with status and line counts. Each entry jumps to its diff.",
    },
    CommitList: {
      props: z.object({ title: z.string().nullable() }),
      description: "The branch's commits since the base.",
    },
    Markdown: {
      props: z.object({ text: z.string() }),
      description: "A block of Markdown prose.",
    },
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
  actions: {},
});

/** The component types whose props name changed files. */
export const PATH_COMPONENTS = ["ChangeGroup", "FileDiff", "FileList"] as const;

const SYSTEM =
  "You describe a code change to the person reviewing it. Output a json-render spec; the branch-diff viewer renders it with every file's real diff.";

// json-render's own example builds a list from sample state, which a diff page
// never needs, so this one shows the shape these specs take.
const OUTPUT_FORMAT = `OUTPUT FORMAT (JSONL, RFC 6902 JSON Patch):
One JSON object per line. Set /root first, then add each element under /elements/<key>:
{"op":"add","path":"/root","value":"page"}
{"op":"add","path":"/elements/page","value":{"type":"Stack","props":{"direction":"vertical","gap":"xl"},"children":["header","core"]}}
{"op":"add","path":"/elements/header","value":{"type":"DiffHeader","props":{"title":"Retry failed uploads","summary":"Uploads that fail with a 5xx now retry twice."},"children":[]}}
{"op":"add","path":"/elements/core","value":{"type":"ChangeGroup","props":{"title":"Retry in the upload client","risk":"medium","summary":"Retries reuse the same request id.","paths":["src/upload.ts"],"notes":[{"path":"src/upload.ts","line":42,"side":"new","text":"No backoff between attempts."}]},"children":[]}}`;

// Sections of json-render's prompt that a static review page uses. The rest
// (sample state, repeat lists, actions, events, watchers) is about apps.
const KEPT_SECTIONS = ["AVAILABLE COMPONENTS", "VISIBILITY CONDITIONS", "DYNAMIC PROPS", "RULES"];
const APP_RULES = /sample data|state patches|"repeat"|FILTERED LISTS|"on" field|data-rich/i;
const SECTION_HEADER = /^[A-Z][A-Z ]+(?: \([^)]*\))?:$/;

const RULES = [
  "Start with one DiffHeader, under a vertical Stack as the root.",
  "Every changed file goes in exactly one ChangeGroup (paths) or FileDiff (path). Rendering fails if a file is missing, unknown, or shown twice.",
  "Group files by why they changed, not by folder. Order groups the way a reviewer should read them, most important first. Lockfiles and generated files go in a last group with defaultOpen false.",
  "Copy paths exactly as collect printed them. Paths must be literal strings, not $state expressions.",
  "Never paste code into the spec. The viewer shows the diffs.",
  "Leave out state unless Tabs or visibility need it, and never add sample data.",
  "Notes are for what a reviewer could miss: behavior changes, risks, missing tests, follow-ups. Don't narrate obvious lines. A note's line is the file's line number on its side, as `patch` prints it: removed lines are old, added lines new, unchanged lines either.",
  "Set risk only when you can say why in the summary.",
  "Keep prose short and plain. No em dashes, no emoji.",
];

/** The catalog's prompt, cut down to what a diff page uses, with this skill's rules. */
export function specPrompt(): string {
  const sections: string[][] = [];
  for (const line of catalog.prompt({ customRules: RULES }).split("\n")) {
    if (SECTION_HEADER.test(line)) sections.push([line]);
    else sections.at(-1)?.push(line);
  }
  const kept = sections.filter(([header]) =>
    KEPT_SECTIONS.some((name) => header!.startsWith(name)),
  );
  if (kept.length !== KEPT_SECTIONS.length) throw new Error("json-render's prompt layout changed");

  const isAppRule = (line: string) =>
    APP_RULES.test(line) && !RULES.some((rule) => line.endsWith(rule));
  const rules = kept
    .at(-1)!
    .slice(1)
    .filter((line) => /^\d+\. /.test(line) && !isAppRule(line));
  const numbered = rules.map((rule, i) => rule.replace(/^\d+\./, `${i + 1}.`));
  const body = kept.slice(0, -1).map((section) => section.join("\n").trimEnd());
  return [SYSTEM, OUTPUT_FORMAT, ...body, ["RULES:", ...numbered].join("\n")].join("\n\n");
}
