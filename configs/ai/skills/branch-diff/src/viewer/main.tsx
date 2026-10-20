import "./globals.css";
import { JSONUIProvider, Renderer } from "@json-render/react";
import { registerCustomLanguage } from "@pierre/diffs";
import type { LanguageRegistration } from "shiki";
import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Payload } from "../render.ts";
import { Viewer, type Layout } from "./context.ts";
import { registry } from "./registry.tsx";

const LAYOUT_KEY = "branch-diff:layout";
/** Past this many changed lines, diffs render as they scroll into view. */
const LAZY_AFTER_LINES = 4000;

function savedLayout(): Layout {
  try {
    return localStorage.getItem(LAYOUT_KEY) === "split" ? "split" : "unified";
  } catch {
    return "unified";
  }
}

function LayoutToggle({
  layout,
  onChange,
}: {
  layout: Layout;
  onChange: (layout: Layout) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Diff layout"
      className="flex rounded-md border p-0.5 text-xs"
    >
      {(["unified", "split"] as const).map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={layout === option}
          onClick={() => onChange(option)}
          className={`rounded px-2 py-1 capitalize ${layout === option ? "bg-secondary font-medium" : "text-muted-foreground hover:text-foreground"}`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

/** Hands the embedded grammars to the highlighter. Returns the language ids it can now highlight. */
function registerGrammars({ lookup, grammars }: Payload["grammars"]): ReadonlySet<string> {
  for (const [language, names] of Object.entries(lookup)) {
    const registrations = names.map((name) => grammars[name] as LanguageRegistration);
    registerCustomLanguage(language, () => Promise.resolve({ default: registrations }));
  }
  return new Set(Object.keys(lookup));
}

function App({ payload, languages }: { payload: Payload; languages: ReadonlySet<string> }) {
  const [layout, setLayout] = useState(savedLayout);
  const { totals } = payload.data;
  const lazy = totals.additions + totals.deletions > LAZY_AFTER_LINES;
  const viewer = useMemo(
    () => ({ data: payload.data, layout, languages, lazy }),
    [payload.data, layout, languages, lazy],
  );
  const { head, base, repo } = payload.data;

  const changeLayout = (next: Layout) => {
    setLayout(next);
    try {
      localStorage.setItem(LAYOUT_KEY, next);
    } catch {
      // Storage can be off (private windows, blocked site data); the choice just won't stick.
    }
  };

  return (
    <Viewer.Provider value={viewer}>
      <div className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-6xl items-center gap-3 px-4">
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
            {repo.name} / {head.branch ?? head.sha.slice(0, 7)} vs {base.ref}
          </span>
          <LayoutToggle layout={layout} onChange={changeLayout} />
        </div>
      </div>
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6">
        <JSONUIProvider registry={registry} initialState={payload.spec.state ?? {}}>
          <Renderer spec={payload.spec} registry={registry} />
        </JSONUIProvider>
      </main>
    </Viewer.Provider>
  );
}

const script = document.getElementById("branch-diff-payload");
const root = createRoot(document.getElementById("root")!);
if (script?.textContent) {
  const payload = JSON.parse(script.textContent) as Payload;
  const languages = registerGrammars(payload.grammars);
  root.render(
    <StrictMode>
      <App payload={payload} languages={languages} />
    </StrictMode>,
  );
} else {
  root.render(
    <p className="p-6 text-sm text-muted-foreground">
      No diff here yet. Run the branch-diff skill's render command to fill this page.
    </p>,
  );
}
