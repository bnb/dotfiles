# branch-diff

the code behind the [branch-diff skill](SKILL.md). agents run the built CLI in `dist/`, so it has to work without `node_modules`: `dist/` is committed and nothing in it needs installing.

- `src/collect.ts` reads the diff from git: the working tree against the merge base with the base branch, untracked files included.
- `src/catalog.ts` is the [json-render](https://json-render.dev) catalog: the components a spec can use, picked from `@json-render/shadcn` plus the diff ones. `prompt` prints it for the agent.
- `src/patch.ts` walks a patch's hunks: line counts, the lines a note can pin to, and the numbered output of `patch`.
- `src/render.ts` checks a spec against the collected data and writes it into the viewer page.
- `src/viewer/` is the page: React, json-render's renderer, and [@pierre/diffs](https://diffs.com) for the diffs, built into one HTML file.
- `languages.json` lists the languages with syntax highlighting. `scripts/build-grammars.ts` turns it into `dist/grammars.json`, and each page embeds only the grammars it needs.

## scripts

- `pnpm build`: rebuilds everything in `dist/`. run it after any change and commit the result.
- `pnpm check`: types, oxlint, oxfmt, and the tests with coverage. the viewer tests drive the built page in Chromium, so they skip until `pnpm build` has run, and the viewer's own code isn't in the coverage numbers.
- `pnpm screenshot <page.html> <dir>`: screenshots a rendered page at phone, narrow, and wide widths in light and dark, and prints console errors.

there's no dev server: render a page with the CLI and open it.
