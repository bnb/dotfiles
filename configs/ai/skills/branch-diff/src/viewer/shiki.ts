// Stands in for "shiki" in the viewer build. @pierre/diffs imports the full
// Shiki bundle, which would inline every grammar (about 7 MB) into each page.
// Here no grammar is built in: the page registers the ones its diff needs
// (see grammars.ts), and everything else highlights as plain text.
import { createBundledHighlighter } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

export * from "shiki/core";
export { createJavaScriptRegexEngine };

export const bundledLanguages = {};

export const createHighlighter = createBundledHighlighter({
  langs: {},
  themes: {},
  engine: () => createJavaScriptRegexEngine(),
});

// Only reached with preferredHighlighter "shiki-wasm", which the viewer never sets.
export function createOnigurumaEngine(): never {
  throw new Error("the WebAssembly highlighter isn't bundled");
}

export function codeToHtml(): never {
  throw new Error("codeToHtml isn't bundled");
}
