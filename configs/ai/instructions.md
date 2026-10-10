# instructions

standing instructions for any coding agent working with me (Tierney, they/them). these are the things I kept repeating across ~1,000 prompts in ~590 sessions, so you shouldn't need me to say them again. a project's own AGENTS.md, CLAUDE.md, or README wins where it's more specific.

## how to work

- for anything beyond a one-liner: investigate, find the actual cause, make a plan, then execute the plan. don't stop at the plan unless I asked for only a plan.
- find root causes with evidence (logs, a repro, the real data, the source). don't guess, don't ask me what the code or config can tell you, and back claims up with hard data. fix the cause instead of raising a timeout or adding a retry.
- if a bug traces to something I maintain (assistant-ui's packages, my own repos and services), fix it there when that's low-lift instead of working around it.
- if I say a fix didn't work ("still happening", "the issue persists"), don't reapply a variation of the same fix. start the diagnosis over, reproduce it yourself, and look at it (screenshot it if it's visual) until you see what I see.
- verify your own work before calling it done: type check, lint, tests, and for UI, look at it. don't hand me things to check that you could check.
- when there are steps only I can do (a dashboard, secrets, a deploy, a backfill), end with a short, numbered list of exactly what I need to do, with commands in code blocks.
- if I hand you a decision with "choose the best one" or "what you think is best", decide and do it. if I've left something out of a feature request, fill it in sensibly, and push back on my requirements if a different design would be better.
- big or multi-part tasks: use subagents in parallel, one per area or feature, then have a second pass verify their work and pick up anything new it finds.
- exploration, research, audits, and option lists go in an artifact so I can come back to them. when I'll be choosing between items, make it a table with a checkbox per row.
- "audit" means: review the whole project and report numbered, actionable findings. I'll usually follow up with "fix everything above".
- "try again" or "retry" means redo whatever just failed. if I say I hit a usage limit, pick up exactly where you stopped.
- stop any dev servers or background processes you started once you're done with them.

## git

- **never commit without asking me with options first.** If I explicitly ask for a commit, you are allowed to commit.
- **if a goal is explicitly set that requires repetitive commiting, ask me what I want you to do**.
- my commits are signed through 1Password and I make them myself.
- for each git forge, I have bot accounts configured for committing and with different accounts than my own. The same rules apply to them unless I explicitly tell you otherwise.
- when I do ask, fixes go in new commits on top. never amend, squash, or rebase commits, and never force-push (`--force`, `--force-with-lease`), unless I ask for that specifically, and that includes restacking.
- don't get around git hooks or signing on real commits (`--no-verify`, `core.hooksPath`, `HUSKY=0`, `commit.gpgsign=false`). if one fails, fix the cause or tell me.
- don't use git worktrees. I hate them. if work ends up in one, move the changes into a dedicated branch or onto main without committing.
- name branches `bnb/<feature-name>`. one branch per concern, unless I ask for a branch per fix.
- once complete with committing work, end back on main.

## PRs

- before opening a PR or issue, show me the title and body here and wait for me to approve it. use the repo's PR/issue template if it has one.
- PR bodies: humanized, plain prose that lists what was added, changed, and removed, with enough detail to review. no "Generated with Claude Code" line or other AI footer.
- in upstream bug reports, link the exact lines of source instead of describing them, and include a minimal repro.
- when I ask for stacked PRs, use the `gh` stack plugin.
- run the local checks before pushing so CI isn't the first test.
- CI costs money. don't push over and over to satisfy review bots: triage bot comments as blocking or not, reply to the comment with a GitHub suggestion block to confirm a fix before pushing, and batch real fixes into one push. after two push rounds on a PR, stop and hand it back to me. expensive suites belong on a schedule or `workflow_dispatch`, not every PR.

## code

- keep the code as small as is technically possible. minimal changesets, no dead code, no duplication. when a change makes something obsolete, remove it in the same change.
- reuse what exists. when two places need the same logic, modularize it once and expose the real differences as options, never as copy-pasted variants.
- only add an abstraction once something needs it. no single-use helper where an inline expression reads fine, but do name intermediate values when that makes a condition read clearly (`const isExpired = ...; if (isExpired && isOwner)`).
- keep the happy path left-aligned with early returns instead of nesting. prefer small, well-scoped files over growing one big one.
- don't add dependencies without a reason, but don't be scared to add dependencies. add, remove, and upgrade them with the package manager (`pnpm add`, `cargo add`), never by editing the manifest or lockfile by hand. prefer a tool's built-in feature over custom scripting (vitest's coverage thresholds instead of a script, an existing OAuth client instead of writing one).
- follow each ecosystem's best practices and conventions. when unsure, look at how well-maintained open source projects do it, and favor their patterns over code we wrote recently.
- TypeScript: strict, no `any`, explicit types that are accurate to the runtime data.
- names say what code does and comments say why, and every comment must describe what the code actually does now. when you refactor or simplify, keep the comments and docstrings that are still true and update the ones you made stale. keep the README in sync in the same change, and keep it concise.
- after a long session with lots of edits, review every file you touched: remove dead code, fix stale comments, dedupe, and check the README is still true.
- features are additive by default. imports and merges add to existing data (deduplicated), and replacing or deleting is an explicit opt-in.
- user state and settings persist across reloads, navigation, and reopening. nothing should silently reset.
- never modify my real data (a user's library database, production records) while fixing things. work on copies or fixtures.
- request the narrowest permissions and OAuth scopes that work. never print secrets, and make sure CI secrets can't leak through outside pull requests.

## tests

- every project has tests and coverage. raise coverage whenever you touch code, biggest gains first, and set thresholds just under the current numbers.
- don't change existing valid tests to make them pass (adding tests is fine). when a test fails, work out whether the code or the test is wrong before touching either.
- a new test must fail when its expectation is broken. check that by breaking it at least once.
- test behavior from the outside. assert on results instead of which mocks got called, mock as little as you can, and find UI the way a person would (role, label, text). exclude code with nothing worth testing (types, config, re-exports) from coverage instead of writing a test that mirrors it.
- flaky tests get a root-cause fix (fake timers, a real hydration signal, deterministic fixtures), never a longer timeout. confirm with repeated runs.
- for native apps, build a harness that can drive every surface, then use it (with subagents per feature) to find what's broken. If there are existing tools that are purpose-fit, prefer them.

## UI and design

- make it look great and cohesive: polished, consistent with the rest of the app, using the existing design language. new things should look native, never hacked in. match the size and height of neighboring elements exactly.
- no flashes, jumps, or jitter. persist preferences so the first paint is already right (theme, settings, auth state), and keep layout stable when loaders appear and disappear.
- never block a page on data. render the static parts immediately, ghost only the dynamic data, and show each result as soon as it resolves (counts included). startup should feel instant, roughly 200ms.
- design every state: loading, empty, and error. errors should look like an expected part of the app and offer the next step.
- when I ask for design options, make several genuinely different variants I can actually open and compare.
- accessibility and Lighthouse checks are part of done.

## writing

- **never use em dashes (U+2014)**, in anything: UI text, docs, comments, commit messages, PR bodies, or as an HTML entity. restructure the sentence instead.
- user-facing copy should be about as long as what an ordinary web app shows: one-line hints, one-line empty states, short labels. trim anything wordier.
- write like a person. no AI tells (forced triads, "not X but Y", inflated claims, filler). run a humanizer pass on docs, comments, PR bodies, and commit messages.
- no emoji in replies, docs, comments, commits, or PR bodies. UI gets them only when the design calls for it.
- match the voice already in the repo. in my personal projects that's casual, direct, first person, often lowercase.
- be precise about what something does. don't overclaim.

## tools

- use `gh` for anything on GitHub, not curl against api.github.com.
- in the shell, `rg` instead of grep and `fd` instead of find. both skip whatever .gitignore ignores, like node_modules.
- use `tg` for tangled, rather than curl against their API or the AT Protocol
- use `railway` for railway connections

## other people's services

- hit third-party sites and APIs as little as possible. use what's already on the page or in a cache first, and stay above board.
- fetch on demand (prefetching what the user is likely to open next) instead of scheduled crawls or cron jobs, and don't add manual data-collection steps.
- don't persist data that's cheap to fetch again. keep storage small.

## AT Protocol

- prefer `at://` URIs over https links whenever a record exists.
- before inventing a lexicon, check [lexicon.garden](https://lexicon.garden) for an existing one and for conventions. use `knownValues` rather than a closed `enum` for strings that will grow.
- be client-neutral: don't hardcode Bluesky. let people choose which app opens posts.
- in UI, call the account people sign in with an "Atmosphere account".
- keep data in the user's PDS and on the client where possible. when a project uses HappyView as its AppView, data collection lives there (lexicons and Lua), not in app scripts.
- support [at-tags](https://tangled.org/chrisshank.com/at-tags/) and standard.site metadata where they apply.

## default stack for new projects

unless the project already says otherwise: Node.js, TypeScript, SvelteKit with Svelte 5, shadcn-svelte, Vite, Vitest with `@vitest/coverage-v8`, Playwright, Storybook, Lighthouse, oxlint and oxfmt (not eslint or prettier), and pino for logs. Electron apps use Electron Forge. Rust TUIs use ratatui.
