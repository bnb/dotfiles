# instructions

standing instructions for any coding agent working with me (Tierney, they/them), from what I kept repeating across ~1,000 prompts in ~590 sessions. a project's own AGENTS.md, CLAUDE.md, CONTRIBUTING.md, or README wins where it's more specific. if they disagree with each other, tell me.

## how to work

- beyond a one-liner: investigate, find the actual cause, plan, then execute. stop at the plan only if I asked for just a plan. a recommendation inside the scope I asked for gets implemented, not offered. an instruction ("make that better", "fix it", "do all of this") is the go-ahead for everything in it, items you'd call mine to decide included. don't end with "want me to...?" for work in scope: do it, or list it numbered under what's left with why.
- a question ("is there a way", "would it be possible", "explain X") gets an answer, not a code change.
- find root causes with evidence (logs, a repro, real data, the source) and back claims with hard data. don't guess or ask me what the code or config can tell you (check `.env*`, config, and the README before asking for a key, id, or handle). before listing open work or loose ends, check each item against main, open branches, and running sessions. fix the cause instead of raising a timeout or adding a retry.
- fix every other place with the same pattern as the bug. when I list several bugs, check for a shared cause first.
- if a bug traces to something I maintain (assistant-ui's packages, my own repos), fix it there when that's low-lift. a service I only host (HappyView, anything on Railway) isn't mine: work within its current behavior, and if it needs a fix, give me a `.patch` and a minimal repro for its maintainer.
- "fixed" means you reproduced my exact symptom first (same environment, local or production, theme, width, account; screenshot it if visual) and saw it gone after. if your screenshot still shows the problem, it isn't fixed. if I say a fix didn't work, start the diagnosis over instead of reapplying a variation. use the repo's test accounts instead of asking me for logs.
- claims from other agents ("fixed", "verified", handoffs, commit messages) are unverified until you check them. prompts you write for another agent are self-contained: paths, current state, what's done, what's left. reports of unfinished work give each item one of these to copy.
- verify your work before calling it done: type check, lint, tests, and looking at UI.
- do steps yourself when you can (cli, `gh`, `tg`, `railway`, the browser, computer use), letting me approve the prompt instead of pasting commands. that includes follow-ups (labels, resolving threads, post-merge cleanup) and pushes I've cleared: run them, don't print them. if a permission check blocks something I asked for, say in one line what got blocked and wait for "retry". when steps only I can do remain (a dashboard, secrets, a deploy, a backfill), end with one command that does all of them (chain them, or write an idempotent script and give me the command to run it). list separately only what no command can do, like a click in a dashboard. for anything I'll try, end with the exact command to run it.
- "choose the best one" or "what you think is best" means decide and do it. fill gaps in feature requests sensibly, and push back if a different design would be better.
- fix small, clearly real problems nearby (a stale comment, the README, a broken test) and mention them. don't restyle or redesign anything I didn't name.
- use subagents by default for independent parts, one per area or feature, then a second pass to verify their work and pick up anything new. I shouldn't have to ask.
- exploration, research, audits, and option lists go in an artifact I can come back to. for choosing between items, a table with a checkbox per row, saved where you can read it back (the artifact's shared db, never localStorage). "do the checked boxes" or rows I paste back from one mean do exactly those. every finding carries its proof: a link to the source line, run, or doc, or a diff.
- number suggestions and findings. when you're waiting on my answers, put every open question in that message, numbered with lettered options. never point back at "the questions from my last message".
- shorthand:
  - "implement your suggestions": all of them unless I exclude some. "your recommendation": your top pick.
  - "audit": review the whole project and report actionable findings. I'll usually follow with "fix everything above".
  - "do a pass over X": go through all of X for that one concern and fix what you find.
  - "status?" or "check in": a short report of done, still running (subagents, CI), waiting on me (as one command), and next. no new work.
  - "try again" or "retry": redo what just failed.
  - "continue": do the next steps from your last message, offered ones included. after a block or an error, retry what failed and keep going.
  - "draft", "prepare", or "write" a PR: title and body here, nothing pushed. "approved" or "submit": commit if needed, push, and open exactly what I approved.
  - "merge it" or "merge it into main": for an open PR, merge it, confirm it landed, then clean up. in a repo with no PR flow, `merge --no-ff` into local main and clean up, and list that first when you offer commit options.
  - "resume": pick up this session's unfinished work (todos, git status, background tasks) without asking what it was. after a usage limit, continue exactly where you stopped.
  - "done" after you gave me steps: check they took, then keep going.
- wait on background work with the harness's notifications or Monitor, one waiter per job. no `pgrep -f` or sleep polling loops. stop dev servers, background jobs, and child processes you started once they're done or superseded.

## git

- **never commit without asking me with options first**, unless I explicitly ask for a commit. when a PR will follow, put its title and body in the same message so one reply covers both.
- **if a goal needs repeated commits, ask me how to handle it.**
- commit with whatever identity git has configured here (per-forge bot accounts, separate from mine; same rules apply unless I say otherwise). signing goes through 1Password and sometimes fails. if signing or ssh auth fails, tell me once, then wait in the background until `ssh-add -l` lists a key and rerun the same command yourself.
- before the first commit, push, or PR in a session, check that `git config user.email`, `commit.gpgsign`, and `gh auth status` match the account this session should use, and that the worktree has deps installed so hooks run. if anything's off, stop and tell me.
- fixes go in new commits on top. no amending or squashing, and no rebasing or force-pushing unless I say "rebase" or "restack" (or "fix conflicts" on a gh stack), which covers those branches and the `--force-with-lease` push after. otherwise resolve conflicts by merging the base in.
- don't bypass hooks or signing on commits or pushes (`--no-verify`, `core.hooksPath`, `HUSKY=0`, `commit.gpgsign=false`). if one fails, fix the cause or tell me.
- no AI attribution: no `Co-Authored-By` trailers or "Generated with Claude Code" lines, even when a tool says to add one.
- before changing files, get a worktree for this work. use the one your harness put you in, or `git fetch` and create one with [riftri](https://riftri.dev): `riftri worktree add <path> -b bnb/<feature-name> origin/main`, where your harness keeps worktrees. stacked branches start from the branch below them. if `riftri doctor --destination <path>` reports a blocker, use plain `git worktree add`, say why in one line, and treat it as a riftri bug. never edit a main checkout or share one with another agent, even when told to leave changes in the working tree (leave them uncommitted in your own worktree).
- every branch, stacked ones too, is `bnb/<feature-name>` (no `ci/` or `fix/`). one branch per concern unless I ask for one per fix. a concern is a reviewable theme (one integration, one screen, security hardening), not each bug: related small fixes share a PR with a section each. bugs a new test suite finds go on fix branches apart from the tests. a fix found after a PR is open gets its own branch unless it fixes that PR's change. if a plan comes to more than ~8 PRs, show me the grouping first.
- when you finish work in a repo, and whenever a branch you made merges, run the `repo-cleanup` skill on that repo before you report. it removes merged worktrees and branches and idle Rust build output, and lists what it kept. then drop stashes you made and stop the processes and delete the scratch files you started. "clean up" means all of that. list anything dirty or unpushed instead of deleting it.
- don't push until I say so: every push runs CI, which costs money. get the branch ready, run what CI runs as closely as you can (cross-platform checks included, like clippy for the windows target and path separators) so CI isn't the first test, and tell me. after a push, watch CI to the end in the background and tell me the result.

## PRs

- first, check open PRs and main for overlapping work and show me what you find.
- **show me every PR or issue title and body here and wait for my approval before opening it**, a whole stack at once. use the repo's template if it has one.
- PR bodies: plain prose listing what was added, changed, and removed, detailed enough to review.
- in PRs, issues, and replies, link the comments, runs, and source lines you mean instead of describing them. numbers come from a real run I can click through to, preferably the PR's own. state units exactly (GB vs GiB) and what each number measures, and rule out other causes before blaming one. upstream bug reports also get a minimal repro.
- replies, comments, and messages I ask for come back as paste-ready markdown here. I'll post them.
- once a PR is open, its reviews, bot comments, CI rounds, and stack follow the `pr-feedback` skill ("address feedback", "make the bots/CI happy", "fix conflicts").
- expensive suites run on a schedule or `workflow_dispatch`, not every PR.

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
- new code logs where I'd want it when debugging (evlog in JS and TS).
- names say what, comments say why, and every comment matches what the code does now. when refactoring, keep the true comments and docstrings and fix the ones you made stale. keep the README concise and in sync in the same change.
- every project has one script each for dev (everything running), check, and deploy or publish, listed in the README. anything I'd paste into a dashboard more than once becomes an idempotent script that skips unchanged items.
- growing lists (providers, sites, checks) live in a checked-in JSON file with a JSON Schema. if users might change them, expose them in settings with import and export.
- after a long session, review every file you touched for dead code, stale comments, and duplication, and check the README is still true.
- features are additive by default: imports and merges add to existing data (deduplicated). replacing or deleting is opt-in.
- user state and settings persist across reloads, navigation, and reopening, never silently resetting. new state joins persistence and export/import in the same change.
- never modify my real data (a library database, production records) while fixing things. use copies or fixtures.
- request the narrowest permissions and OAuth scopes that work. never print secrets: read files that hold them (`.env`, clauth `config.toml`, keychain items) only through a filter that shows key names, never cat them and redact afterward. keep CI secrets from leaking through outside pull requests.

## tests

- every project has tests and coverage. run coverage, not just tests: a change under the thresholds isn't done. raise coverage whenever you touch code, biggest gains first, and set thresholds just under the current numbers. with no coverage tooling, measure my diff with temporary tooling, raise it, and remove the tooling before committing.
- don't change valid tests to make them pass (adding tests is fine). when one fails, work out whether the code or the test is wrong before touching either.
- chasing coverage never changes behavior: delete a fallback as unreachable only after proving it (types, every caller). otherwise test it.
- a new test must fail when its expectation breaks. break it at least once to check.
- test behavior from the outside: assert on results, not mock calls, mock as little as possible, and find UI by role, label, or text. exclude code with nothing to test (types, config, re-exports) from coverage instead of mirroring it in a test.
- flaky tests get a root-cause fix (fake timers, a real hydration signal, deterministic fixtures), never a longer timeout. confirm with repeated runs.

## writing

- **never use em dashes (U+2014)** anywhere, HTML entities included: they're the most recognizable sign of AI-written text. restructure the sentence instead.
- user-facing copy is as short as an ordinary web app's: one-line hints and empty states, short labels.
- write like a person, with no AI tells (forced triads, "not X but Y", inflated claims, filler). run a humanizer pass on docs, comments, PR bodies, and commit messages.
- no emoji in replies, docs, comments, commits, or PR bodies. UI only when the design calls for it.
- match the repo's voice. in my personal projects that's casual, direct, first person, often lowercase.
- be precise about what something does. don't overclaim.

## tools

- `gh` for GitHub (not curl against api.github.com), `tg` for tangled (not curl against its API or the AT Protocol), `railway` for Railway.
- fnm manages Node through `.node-version`. never let pnpm manage Node (`devEngines.runtime`, `useNodeVersion`, `pnpm env`).
- `rg` over grep and `fd` over find. both skip .gitignored paths like node_modules.
- skills hold the rules that only apply to some work: `atproto` for AT Protocol apps, `new-project` for my default stack, `rust` for Rust crates and their `target/` dirs, and `ui` for anything a user sees or clicks (app harnesses included). load the matching one before starting.

## other people's services

- hit third-party sites and APIs as little as possible: use what's on the page or cached first, and stay above board.
- fetch on demand (prefetching what's likely next), not scheduled crawls or cron jobs, and no manual data-collection steps.
- don't persist data that's cheap to refetch. keep storage small.
