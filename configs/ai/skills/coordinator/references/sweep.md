# sweep

"what's unfinished", "what sessions did I do this week that have uncompleted work", or a scheduled routine that asks the same. the answer is a list I can act on item by item, each checked against what's actually on disk and on the forge.

## find the sessions

- `coord census --since <window> --json` lists every session with its last prompt and reply, git state, and liveness. it reads entry timestamps rather than file mtimes, which lie. pass `--projects-dir` for each clauth profile's runtime `projects` dir, and `--exclude` for what my memory puts out of scope.
- automated runs (security reviews, routine prompts) aren't work I left. drop them by their prompt.
- a dead coordinator's real state is often in its subagents' transcripts (`<session-id>/subagents/`). read their tails too.

## decide what's unfinished

for each session, read the last few prompts and replies, then check them:

- disk: dirty files and commits on no remote (census has both), and processes or containers it left behind.
- forge: list my PRs in one search, then fetch each one's state, review decision, unresolved threads, and failing checks. recheck a PR on its own before reporting it, since list views go stale. don't crawl notifications.
- main: is the branch already merged, or the work superseded by something that landed?
- overlap: two sessions doing the same work, or a PR that duplicates another.

## the report

1. one line: counts, and the artifact link.
2. **needs you first**: blocked on a decision, an approval, or a login.
3. then grouped by state: stopped mid-work, waiting on you, small leftovers.
4. each item: what's left, where it is (session display name and id, worktree, branch, PR link), the one action that moves it, `cd <cwd> && claude --resume <session-id>`, and a self-contained prompt to paste into a fresh session.
5. **not verified**: anything you couldn't check, and why.
6. questions, numbered with lettered options.

## between runs

the ledger keeps a dated "state as of" section per run, with superseded ones marked, plus PR head SHAs and gotchas for next time. on the next run, diff against it. if nothing changed (same heads, same unresolved threads), keep the run short.
