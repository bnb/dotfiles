# coord

a small cli for the coordinator skill. it answers two questions I keep asking when several Claude Code sessions run at once: who's running where, and in what order can their branches land.

```sh
cargo install --path .   # or: cargo run --release -- <command>
coord census
coord merge-plan --base origin/main '#12=origin/fix-ci' ../wt-feature feature-b
```

## `coord census`

lists the Claude Code sessions on this machine: live ones, plus stopped ones active within `--since` (default `24h`; takes things like `90m` or `3d`).

it only reads, and from:

- `~/.claude/sessions/*.json`: one per running process (pid, cwd, kind, name, status). a session counts as alive when its pid answers signal 0.
- `~/.claude/jobs/*/state.json`: background jobs, which outlive their process. a job that died while `working` shows up as not alive with that state, which is how stalled ones surface.
- the transcript `<projects-dir>/*/<sessionId>.jsonl`, last 2 MiB only: the last prompt you typed (mid-turn messages included), the last assistant text, and the newest timestamp.
- git in the session's worktree or cwd: branch, dirty file count, commits not on any remote.

`--projects-dir` is repeatable for clauth profiles, which keep transcripts under `~/.clauth/profiles/*/runtime-*/projects`. `--exclude PATH` drops sessions working under a path. `--json` prints every field untruncated, including the transcript and messaging socket paths.

## `coord merge-plan`

plans a landing order for parallel branches without touching a ref, the index, or a worktree. each head is a ref, `label=ref`, or a worktree directory (its uncommitted tracked changes get snapshotted with `git stash create`, which writes a commit but no ref). the base defaults to `origin/HEAD`, else `origin/main`.

everything runs through `git merge-tree --write-tree`, so it needs git 2.38 or newer. it reports:

- whether each head merges into the base cleanly, and which files conflict
- every pair of heads that conflicts, and on what
- hot files: paths that conflict in the most pairs, the ones a refactor should take away first
- a simulated chain: each head that merges cleanly onto the tip so far becomes the new tip (as a dangling, unsigned commit nobody references), and each one that doesn't is listed as needing main merged in after the last one that landed

`--order auto` (the default) lands, at each step, the clean head that conflicts with the fewest remaining heads, with ties going to the order you gave. `--order given` keeps your order. conflicts are results, so it exits 0; usage errors and git failures exit 2 with git's message.

## development

```sh
cargo nextest run
cargo clippy --all-targets --locked -- -D warnings
cargo coverage         # every test, with the thresholds in .cargo/config.toml
cargo coverage-hegel   # the hegel properties in tests/props.rs alone, same thresholds
```

the tests build throwaway repos with your global and system git config switched off, so nothing signs or prompts.
