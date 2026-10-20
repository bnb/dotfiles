---
name: branch-diff
description: Builds a review page for everything that changed between a repo's current state (commits, staged, unstaged, and untracked files) and its default branch, or another branch, tag, or commit. You group and explain the changes with json-render components, and the page shows every file's real diff with your notes pinned to lines. Use when the user wants to see, review, or walk through what changed on a branch, what's different from main or some ref, or asks for a visual diff.
---

# branch diff

the page is generative UI: you write a [json-render](https://json-render.dev) spec that says how to tell the story of the change (groups, summaries, risks, line notes), and [dist/cli.mjs](dist/cli.mjs) checks it against the real diff and renders it with [@pierre/diffs](https://diffs.com). the data comes from git, never from you, so the page can't show code that isn't there or leave a file out.

`<cli>` below is `node <this skill's dir>/dist/cli.mjs`. only `collect` reads the repo: run it from inside the repo, or pass `--repo <path>`. the other commands read `data.json` and work from anywhere.

## steps

1. **collect.** `<cli> collect [base] [--direct] --out-root <root>`, where `<root>` is `<home>/artifacts` when `tv` is installed (`<home>` is the `home` value from `tv config show`), or your scratchpad otherwise. it writes `<root>/<repo>-<branch>-diff/data.json`; that folder is `<folder>` below, and the same branch always gets the same one, so a rerun replaces the old page. with no base it finds the default branch (upstream's, then origin's, then a local guess). by default it diffs from the merge base, like a PR does; `--direct` diffs against the base itself. it prints the files, line counts, and commits.
2. **check what collect said.** if there are no changes, tell the user and stop. repeat any `note:` line to the user (the base has moved on, or hasn't been fetched lately). the page is a snapshot: if the working tree changes while you work, collect again before rendering.
3. **read the changes.** `<cli> patch --data <folder>/data.json [path...]` prints patches, untracked files included, with each line's old and new line number. read every file that isn't generated closely enough to explain it; skim lockfiles and generated output.
4. **write the spec.** `<cli> prompt` prints the components and the rules. write JSONL patches to `<folder>/spec.jsonl`: a `DiffHeader`, then `ChangeGroup`s in the order a reviewer should read them, each file in exactly one group. add `notes` where a reviewer could miss something. a note's `line` is the number `patch` prints for that side. `CommitList`, `FileList`, `Alert`, and `Markdown` are there when they help.
5. **render.** `<cli> render --data <folder>/data.json --spec <folder>/spec.jsonl --out <folder>/index.html`. if it lists problems, fix the spec and rerun until it writes the page.
6. **show it.** with `tv`: if `tv list-artifacts` already has an artifact for this folder, rerendering updated it and you're done. otherwise pick the channel from `tv list-channels` whose name matches the repo or its org, or create one named after the repo (`tv create-channel --name <repo> --no-focus`), then `tv create-path-artifact --channel <id> --title "<branch> diff" --path <folder> --focus-artifact`. without `tv`: `open <folder>/index.html`. publish it anywhere else (a claude.ai artifact, a gist) only when the user asks, since the page contains the code.
7. **reply** in a few lines: what the change does, anything risky or unfinished you noticed, and where the page is.

## notes

- the page is one self-contained HTML file. it embeds only the syntax grammars its files need; files in languages outside [languages.json](languages.json) show as plain text.
- patches over 1 MB, and binary files, are listed with their counts but not shown.
- changing anything under `src/`, `scripts/`, or `languages.json` means running `pnpm install && pnpm build` here and committing `dist/`. `pnpm check` runs types, lint, format, and tests with coverage. see [README.md](README.md).
