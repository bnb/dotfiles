---
name: coordinator
description: How I want a coordinator session to run my other Claude sessions. It keeps running sessions moving while I'm away, lands many agents' PRs in a low-churn merge order, and sweeps every session for unfinished work. Use it when I say "coordinate", "I'm going to bed", "I'm walking away", "I'm heading out for a few hours" or otherwise that I'm leaving for a while, "keep everyone moving", "get these PRs merged", "what order should these merge in", "which session owns X", "what's unfinished", "what sessions have uncompleted work", or ask for status across several sessions, and whenever you're about to message, monitor, or take over other sessions' work. Not for one PR's own review comments or CI (pr-feedback) or for tidying one repo (repo-cleanup).
---

# coordinator

I run a lot of sessions at once. a coordinator keeps them moving and only brings me what only I can decide. it writes very little code itself: it finds things out, assigns them, checks them, and asks me once. words like owner, hold, and burst mean what [GLOSSARY.md](GLOSSARY.md) says.

## every run

1. **scope.** what I named, nothing more. "coordinate X" covers all unfinished work in X: open PRs, pushed branches, and dirty worktrees. if something outside it looks related, tell me instead of pulling it in. skip repos and sessions my memory says another coordinator owns unless I bring them up.
2. **census.** run `coord census` (below) and `ListAgents`. map sessions by session id, since names change on resume, and check whether a successor already picked up a dead session's work before you assign it again. if another coordinator is running, agree with it who owns what before you act.
3. **ledger.** open or create `~/.claude/coordinator/<yyyy-mm-dd>-<slug>.md`. read it first, write to it as you go: owners, holds, head SHAs, what I've already been shown, and a "next run: diff against this" line. job tmp dirs and scratchpads vanish, and runs get cut off by usage limits, so nothing that matters lives only there.
4. **watchers.** arm the Monitors and idle subscriptions (an empty SendMessage with `notify_when_idle`) you need. on every resume, re-arm them first: a restarted coordinator with no watchers looks idle while nothing moves.
5. **mode.** read the reference for the job: [away.md](references/away.md) when I'm leaving, [landing.md](references/landing.md) for merging many PRs, [sweep.md](references/sweep.md) for "what's unfinished". they combine: landing while I'm away uses both.

## owners

- every branch and PR has one owner. ask each session to "confirm or correct that you own exactly these: ..." and keep the answers in the ledger.
- don't ask me what you can find out. the owner of a worktree is the claude process with its cwd there (`lsof -d cwd`, then `~/.claude/sessions/<pid>.json`). transcripts and job timelines say what a session decided.
- read a session's last prompts and pending questions before messaging it.
- a dead owner's work gets taken over or handed to a live session, never both. check its tree and branch state before building on it.

## messages to sessions

- briefs stand alone: absolute repo path and its state, the session's own worktree and branch, exact failures with `file:line` and error text, the repro command, what's already ruled out, boundaries (no commits, files not to touch), the skills to load, the report shape, and "if any item turns out to be wrong or intended, say so". pass raw output or a log path, never a `tail` of it.
- relay facts, rules, and my plain decisions. never relay approvals for commits, pushes, or PRs: sessions refuse them, correctly. for those, do the step yourself once I've approved it here and the idle owner has stood down, or put "type `X` in session `Y`" on my list.
- holds say plainly what not to do and who approves it, one line per item. never quote my trigger words as conditions. "held for 'approved'" once read as approval and got pushed three minutes later.
- an explicit grant a session's own user gave it beats your default holds.

## checking claims

other sessions' "fixed", "pushed", tallies, exit codes, and "1Password is waiting" are claims until you check them against the diff, the forge, the process list, or a test run. label numbers you didn't reproduce as the session's. when I say an agent got something wrong, check that against live state too.

## talking to me

- decisions come in one numbered list in chat, lettered options, the recommended one first and marked, answerable as `1a 2b`. restate every open question in full, including ones other sessions are waiting on. "continue" doesn't answer an open question, so ask again with the list.
- name things so I can click them: repo, branch, PR link, and a session's display name with its 8-character id. never another session's private numbering ("PR 4").
- right before passing any ask to me, recheck it is still live. a PR may have merged, a prompt may not exist.
- after the first report, only what changed. don't reply to each monitor event.
- watch whether work lands (merges, CI runs finishing), since a room of busy sessions can still be stalled. if nothing has merged or moved for an hour, find out why before telling me nothing needs me. send a push notification once something has been blocked on me for about an hour.
- status is: done, still running, waiting on you (each one reply or one command away), next.
- the artifact renders the ledger: a resume command and a copy-ready prompt per unfinished item. use a checkbox table in its shared db only when I'm choosing among many similar items.

## shared machine

- usage: `clauth` profiles show headroom. never switch the global profile, since it moves every session. a session whose login died gets one retry, then "/login in `<session>`" goes on my list. MCP auth is per session.
- load: map heavy processes to sessions (`lsof -d cwd`) and ask the owner to pace or prune. never kill another session's processes.
- Monitor ends after 30 minutes and background Bash after 2 hours. run long chains detached and watch their log with `tail -F`. stop re-arming watchers once there's nothing left to wait for.

## winding down

when the work is done, or I ask whether this session still needs to exist: hand merging and ownership back to the owners with the order and rules, write the final ledger, run repo-cleanup in each repo where you made worktrees, stop your own watchers and processes, and say "none of my processes are left" only once that's true.

## coord

`coord` is this skill's CLI ([coord/](coord/README.md)). if it's missing or older than its source, `cargo install --locked --path <this skill's dir>/coord`.

- `coord census [--since 24h] [--exclude <path>]... [--json]`: every session on this machine: alive or not, status, repo and branch, dirty and unpushed counts, age, and its last prompt and reply. add `--projects-dir` for clauth profiles' transcript dirs.
- `coord merge-plan --repo <path> [--base <ref>] <label=ref | ref | worktree>...`: each head against base, every conflicting pair, hot files, and a simulated merge chain in a suggested order. nothing touches a ref or a worktree.
