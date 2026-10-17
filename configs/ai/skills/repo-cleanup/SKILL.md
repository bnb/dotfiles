---
name: repo-cleanup
description: Clears out what finished work leaves in a git repo (merged worktrees and their local branches, Rust target dirs nothing is using, records of deleted worktrees) and lists everything it keeps and why (uncommitted, unpushed, in use, locked). Use it before reporting that work in a repo is done, right after a branch merges, whenever the user says "clean up" or asks what all these worktrees, branches, or sibling folders are, and when build output is filling the disk.
---

# repo cleanup

[scripts/cleanup.py](scripts/cleanup.py) does the checking, so the rules are the same every time. you make the calls it can't and write the report.

## steps

1. **survey.** run `<this skill's dir>/scripts/cleanup.py <repo>` (it's executable, so no `python3` in front), where `<repo>` is any path inside it (a worktree works too). it fetches, then groups everything into remove, clean build output, review, and keep, with a reason for each. pass several repos to check them in one go. any other process sitting in a worktree keeps it. your own shell and session don't count, so a merged worktree you're in goes too: run later commands from the main checkout.
2. **review.** items under "review" are merged and clean but have ignored files that aren't build output, like an `.env.local` or a local database. look at what they are (key names only for env files, never values) and whether anything there exists nowhere else. a file marked "same in main checkout" is an identical copy, so losing it costs nothing. if it's all disposable, add `--include <path>` for that worktree.
3. **apply.** rerun with `--apply` and any `--include`s. it checks each item again right before acting, skips anything that changed since the survey, and prints how much it removed.
4. **the rest is yours**, since the script can't tell who made what:
   - stashes it lists: drop the ones you made, mention the others.
   - scratch you started: logs, temp dirs, Docker containers and volumes, background processes. remove them once they're finished.
   - branches it says origin still has: list them. deleting a remote branch is visible to everyone, so only do it when asked.
   - a main checkout behind the default branch: say so. don't pull while sessions are running there.
   - a lock whose pid "isn't running" is probably left over from a dead session. mention it rather than unlocking it yourself.
   - other clones of the same repo aren't worktrees, so the script never sees them. if you know of one, check it by hand.
5. **report.** say what was removed and how much was freed, then everything kept, grouped by reason (uncommitted work, unpushed commits, in use, locked) with each path, so the user can see what's waiting on them. call out unmerged work that's "not on origin", since nobody else can see it.

if you think the script got something wrong, say so instead of deleting the item by hand. its rules exist so that nothing anyone still needs gets lost.

## what counts as safe

- **merged**: a merged PR's head is the branch's head (this covers squash merges, and needs `gh` on a GitHub remote), or the branch was merged into the default branch's history as a side branch.
- **no commits of its own**: the branch points at a commit on the default branch's own line. it's removed once its reflog is 3 days old, since a newer one was probably just made for work that hasn't started.
- **idle build output**: a cargo target dir (marked by cargo's `CACHEDIR.TAG`) in a worktree with no process inside and nothing written in the last hour. this applies to worktrees that are being kept too, because builds are cheap to redo and these dirs reach tens of GB.
- **never touched**: uncommitted or untracked files, commits the default branch doesn't have, a running process inside, a locked worktree, the default branch itself.

after changing the script, run its tests: `python3 -m unittest discover -s <this skill's dir>/scripts`.
