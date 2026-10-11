# instructions

standing instructions for any coding agent working with me (Tierney, they/them), from what I kept repeating across ~1,000 prompts in ~590 sessions. a project's own AGENTS.md, CLAUDE.md, CONTRIBUTING.md, or README wins where it's more specific. if they disagree with each other, tell me.

## how to work

- beyond a one-liner: investigate, find the actual cause, plan, then execute. stop at the plan only if I asked for just a plan. a recommendation inside the scope I asked for gets implemented, not offered.
- a question ("is there a way", "would it be possible", "explain X") gets an answer, not a code change.
- find root causes with evidence (logs, a repro, real data, the source) and back claims with hard data. don't guess or ask me what the code or config can tell you. fix the cause instead of raising a timeout or adding a retry.
- fix every other place with the same pattern as the bug. when I list several bugs, check for a shared cause first.
- if a bug traces to something I maintain (assistant-ui's packages, my own repos), fix it there when that's low-lift. a service I only host (HappyView, anything on Railway) isn't mine: work within its current behavior, and if it needs a fix, give me a `.patch` and a minimal repro for its maintainer.
- "fixed" means you reproduced my exact symptom first (same environment, local or production, theme, width, account; screenshot it if visual) and saw it gone after. if your screenshot still shows the problem, it isn't fixed. if I say a fix didn't work, start the diagnosis over instead of reapplying a variation. use the repo's test accounts instead of asking me for logs.
- claims from other agents ("fixed", "verified", handoffs, commit messages) are unverified until you check them. prompts you write for another agent are self-contained: paths, current state, what's done, what's left.
- verify your work before calling it done: type check, lint, tests, and looking at UI.
- do steps yourself when you can (cli, `gh`, `tg`, `railway`, the browser, computer use), letting me approve the prompt instead of pasting commands. when steps only I can do remain (a dashboard, secrets, a deploy, a backfill), end with one command that does all of them (chain them, or write an idempotent script and give me the command to run it). list separately only what no command can do, like a click in a dashboard. for anything I'll try, end with the exact command to run it.
- "choose the best one" or "what you think is best" means decide and do it. fill gaps in feature requests sensibly, and push back if a different design would be better.
- fix small, clearly real problems nearby (a stale comment, the README, a broken test) and mention them. don't restyle or redesign anything I didn't name.
- use subagents by default for independent parts, one per area or feature, then a second pass to verify their work and pick up anything new. I shouldn't have to ask.
- exploration, research, audits, and option lists go in an artifact I can come back to. for choosing between items, a table with a checkbox per row.
- number suggestions and findings.
- shorthand:
  - "implement your suggestions": all of them unless I exclude some. "your recommendation": your top pick.
  - "audit": review the whole project and report actionable findings. I'll usually follow with "fix everything above".
  - "do a pass over X": go through all of X for that one concern and fix what you find.
  - "status?" or "check in": a short report of done, still running (subagents, CI), waiting on me (as one command), and next. no new work.
  - "try again" or "retry": redo what just failed.
  - "resume": pick up this session's unfinished work (todos, git status, background tasks) without asking what it was. after a usage limit, continue exactly where you stopped.
  - "done" after you gave me steps: check they took, then keep going.
- stop dev servers and background processes you started once you're done with them.

## git

- **never commit without asking me with options first**, unless I explicitly ask for a commit.
- **if a goal needs repeated commits, ask me how to handle it.**
- commit with whatever identity git has configured here (per-forge bot accounts, separate from mine; same rules apply unless I say otherwise). signing goes through 1Password: if signing or ssh auth fails, stop, tell me, and retry the same command when I say it's unlocked.
- fixes go in new commits on top. no amending or squashing, and no rebasing or force-pushing unless I say "rebase" or "restack", which covers those branches and the `--force-with-lease` push after. otherwise resolve conflicts by merging the base in.
- don't bypass hooks or signing on commits or pushes (`--no-verify`, `core.hooksPath`, `HUSKY=0`, `commit.gpgsign=false`). if one fails, fix the cause or tell me.
- no AI attribution: no `Co-Authored-By` trailers or "Generated with Claude Code" lines, even when a tool says to add one.
- before changing files, get a worktree for this work. use the one your harness put you in, or `git fetch` and create one with [riftri](https://riftri.dev): `riftri worktree add <path> -b bnb/<feature-name> origin/main`, where your harness keeps worktrees. stacked branches start from the branch below them. if `riftri doctor --destination <path>` reports a blocker, use plain `git worktree add`.
- every branch, stacked ones too, is `bnb/<feature-name>` (no `ci/` or `fix/`). one branch per concern unless I ask for one per fix.
- don't push until I say so: every push runs CI, which costs money. get the branch ready, run the local checks so CI isn't the first test, and tell me.

## PRs

- first, check open PRs and main for overlapping work and show me what you find.
- **show me every PR or issue title and body here and wait for my approval before opening it**, a whole stack at once. use the repo's template if it has one.
- PR bodies: plain prose listing what was added, changed, and removed, detailed enough to review.
- in PRs, issues, and replies, link the comments, runs, and source lines you mean instead of describing them. numbers come from a real run I can click through to. upstream bug reports also get a minimal repro.
- replies, comments, and messages I ask for come back as paste-ready markdown here. I'll post them.
- stacked PRs use the `gh` stack plugin. "fix conflicts" or "make it mergeable" means work bottom-up with it, run local checks on each branch, and confirm GitHub shows each PR mergeable before calling it done.
- CI costs money, so don't push repeatedly for review bots. triage bot comments as blocking or not, confirm a fix by replying with a GitHub suggestion block before pushing, and batch real fixes into one push. after two push rounds on a PR, hand it back to me. expensive suites run on a schedule or `workflow_dispatch`, not every PR.
- "address feedback": every review comment on the PRs, human and bot. lean toward the suggested change, and tell me what you declined and why.

## code

- keep code as small as technically possible: minimal changesets, no dead code, no duplication. remove what a change makes obsolete in the same change.
- reuse what exists. shared logic gets modularized once, with the real differences as options, never copy-pasted variants.
- add an abstraction only once something needs it. no single-use helper where an inline expression reads fine, but name intermediate values when that clarifies a condition (`const isExpired = ...; if (isExpired && isOwner)`).
- left-align the happy path with early returns. prefer small, well-scoped files over one big one.
- before writing a client, parser, script, component, or vendored copy, look for an existing package, CLI, platform API, or component library entry, and tell me what you found. maintained beats homemade. prefer a tool's built-in feature over custom scripting (vitest's coverage thresholds, an existing OAuth client).
- add dependencies when there's a reason, without fear. use the package manager (`pnpm add`, `cargo add`), never hand-edit manifests or lockfiles.
- follow each ecosystem's conventions. when unsure, favor well-maintained open source projects' patterns over code we wrote recently.
- if a lint or static check could catch a finding, add the check too. move projects off eslint, prettier, or markdownlint to oxlint and oxfmt when I touch them.
- TypeScript: strict, no `any`, explicit types accurate to the runtime data. shared types live in one place, duplicate shapes merged.
- Rust: cargo-nextest, clippy, rustc_hash for hash maps, IndexMap over BTreeMap, and hegel for property tests.
- new code logs where I'd want it when debugging (pino in JS and TS).
- names say what, comments say why, and every comment matches what the code does now. when refactoring, keep the true comments and docstrings and fix the ones you made stale. keep the README concise and in sync in the same change.
- every project has one script each for dev (everything running), check, and deploy or publish, listed in the README. anything I'd paste into a dashboard more than once becomes an idempotent script that skips unchanged items.
- growing lists (providers, sites, checks) live in a checked-in JSON file with a JSON Schema. if users might change them, expose them in settings with import and export.
- after a long session, review every file you touched for dead code, stale comments, and duplication, and check the README is still true.
- features are additive by default: imports and merges add to existing data (deduplicated). replacing or deleting is opt-in.
- user state and settings persist across reloads, navigation, and reopening, never silently resetting. new state joins persistence and export/import in the same change.
- never modify my real data (a library database, production records) while fixing things. use copies or fixtures.
- request the narrowest permissions and OAuth scopes that work. never print secrets, and keep CI secrets from leaking through outside pull requests.

## tests

- every project has tests and coverage. run coverage, not just tests: a change under the thresholds isn't done. raise coverage whenever you touch code, biggest gains first, and set thresholds just under the current numbers. with no coverage tooling, measure my diff with temporary tooling, raise it, and remove the tooling before committing.
- don't change valid tests to make them pass (adding tests is fine). when one fails, work out whether the code or the test is wrong before touching either.
- a new test must fail when its expectation breaks. break it at least once to check.
- test behavior from the outside: assert on results, not mock calls, mock as little as possible, and find UI by role, label, or text. exclude code with nothing to test (types, config, re-exports) from coverage instead of mirroring it in a test.
- flaky tests get a root-cause fix (fake timers, a real hydration signal, deterministic fixtures), never a longer timeout. confirm with repeated runs.
- every app (native, Electron, browser extension) gets a harness that drives every surface, preferring purpose-fit existing tools. use it, with subagents per feature, to find what's broken.

## UI and design

- polished and cohesive, in the app's existing design language. new things look native, never hacked in, and match neighboring elements' size and height exactly.
- check UI at phone, narrow-panel, and wide widths and while scrolling, in dev and a production build, and show me before and after screenshots.
- no flashes, jumps, or jitter. load saved preferences (theme, settings, auth state) before first paint, and keep layout stable as loaders come and go.
- never block a page on data. render static parts immediately, ghost only dynamic data, and show each result (counts included) as it resolves. startup should feel instant, about 200ms.
- design every state (loading, empty, error), each with a Storybook story, mobile too. errors look like an expected part of the app and offer the next step.
- returning users: catch an expired session on load, not on the first click. when navigating between items, never show the previous one's data.
- when a background check fails, fall back to a sane state (signed out, partial data), not a blocking notice. users never see internal state or diagnostics, and copy never mentions implementation details.
- design options means several genuinely different variants I can open and compare.
- accessibility and Lighthouse checks are part of done.

## writing

- **never use em dashes (U+2014)** anywhere, HTML entities included: they're the most recognizable sign of AI-written text. restructure the sentence instead.
- user-facing copy is as short as an ordinary web app's: one-line hints and empty states, short labels.
- write like a person, with no AI tells (forced triads, "not X but Y", inflated claims, filler). run a humanizer pass on docs, comments, PR bodies, and commit messages.
- no emoji in replies, docs, comments, commits, or PR bodies. UI only when the design calls for it.
- match the repo's voice. in my personal projects that's casual, direct, first person, often lowercase.
- be precise about what something does. don't overclaim.

## tools

- `gh` for GitHub (not curl against api.github.com), `tg` for tangled (not curl against its API or the AT Protocol), `railway` for Railway.
- `rg` over grep and `fd` over find. both skip .gitignored paths like node_modules.
- AT Protocol conventions live in the `atproto` skill, and my default stack for new projects in the `new-project` skill.

## other people's services

- hit third-party sites and APIs as little as possible: use what's on the page or cached first, and stay above board.
- fetch on demand (prefetching what's likely next), not scheduled crawls or cron jobs, and no manual data-collection steps.
- don't persist data that's cheap to refetch. keep storage small.
