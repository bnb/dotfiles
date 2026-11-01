---
name: pr-feedback
description: How I want review comments, review bots, CI failures, and chained or stacked PRs handled on a PR that's already open. Use when I say "address feedback", "make the bots happy", "make CI happy", "fix conflicts", or "make it mergeable", when a bot (CodeRabbit, Copilot, Greptile, Claude) has commented, when CI failed on an open PR, or when working on PRs that build on each other or a gh stack. Not for drafting a new PR or reviewing a diff before a PR exists.
---

# PR feedback

CI and review bots cost money on every push, so the point of all of this is fewer, better pushes.

## review comments

- "address feedback" means every review comment on the PRs, human and bot. lean toward the suggested change, and tell me what you declined and why.
- triage each bot comment as blocking or not before touching code.
- confirm a fix by replying with a GitHub suggestion block before pushing. replies come back to me as paste-ready markdown unless I asked you to post them.
- batch every real fix into one push.

## push rounds

after two push rounds on a PR, hand it back to me. the exception is "make the bots/CI happy" (often a /goal): then keep going, one batched push per round, until checks are green and no bot comment blocks. calls only an owner can make still come back to me.

## chains and stacks

a PR that builds on another one targets the branch below it, and gets its base merged in, never rebased. a merge leaves the PR's head alone, so its green checks still count once the PR below merges and it's retargeted to main. merge bottom-up, with merge commits.

- fix a bug on the lowest branch that has it, then merge that branch up through each one above.
- only the next PR to merge and the one after it run CI. merge fixes up the chain locally, and push an upper branch only once it enters that window. open PRs outside it as drafts when the repo's CI skips drafts, and cancel runs on PRs outside it.
- where main requires a CodeQL default-setup scan, push a chained branch only once it targets main. default setup scans only PRs into the default branch, so a PR whose checks ran against another base stays blocked after the retarget until something pushes to it.
- "fix conflicts" or "make it mergeable" means merging each base in, bottom-up, with local checks on each branch. it's done when GitHub shows every PR in the chain as mergeable.

[gh stack](https://github.com/github/gh-stack) is only for when I say "rebase" or "restack". `gh stack view --short` shows the stack and which branches need a rebase, and `gh stack sync` rebases each branch onto its parent and pushes them all with `--force-with-lease`. when it stops on a conflict, resolve it bottom-up, run local checks on each branch, then sync again.
