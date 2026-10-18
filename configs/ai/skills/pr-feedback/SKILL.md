---
name: pr-feedback
description: How I want review comments, review bots, CI failures, and stacked PRs handled on a PR that's already open. Use when I say "address feedback", "make the bots happy", "make CI happy", "fix conflicts", or "make it mergeable", when a bot (CodeRabbit, Copilot, Greptile, Claude) has commented, when CI failed on an open PR, or when working on a gh stack. Not for drafting a new PR or reviewing a diff before a PR exists.
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

## stacks

stacked PRs use the [gh stack](https://github.com/github/gh-stack) extension. `gh stack view --short` shows the stack and which branches need a rebase.

"fix conflicts" or "make it mergeable" covers rebasing the stack: run `gh stack sync`, which rebases each branch onto its parent and pushes them all with `--force-with-lease`. when it stops on a conflict, resolve it bottom-up, run local checks on each branch, then sync again. it's done when GitHub shows every PR in the stack as mergeable.
