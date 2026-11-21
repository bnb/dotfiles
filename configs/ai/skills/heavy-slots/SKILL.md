---
name: heavy-slots
description: How sessions share one Mac for heavy runs (Rust builds, coverage, Docker, Playwright and e2e, full Storybook, fuzzing, mutation, release builds, screenshot proofs) through a small number of slots a coordinator hands out. Use it when you're about to start a heavy run while other sessions are working, when a session asks for a slot, when you're coordinating several builders, when the disk is filling or the machine is crawling, and when resuming after a shutdown killed queued jobs. Not for CI runners, which have their own capacity.
---

# heavy slots

lots of sessions build at once on one Mac. light work (reading, writing code, single tests, type checks) runs freely. heavy work runs in slots: at most two at a time, because three filled the disk twice in one day and starved timing-sensitive tests.

## what counts as heavy

Rust builds and test suites, coverage, Docker and CI-image runs, Playwright and e2e, full Storybook runs, Lighthouse, fuzzing, mutation testing, release or dist builds, and screenshot runs. if it takes more than a few minutes of CPU or writes gigabytes, it's heavy.

## as a builder

- don't start a heavy run without a slot. ask the coordinator (MARVIN or whoever briefed you) for one, saying what you'll run, in what order, and about how long.
- until you have it, do the light work: read, design, write code and tests, run single files.
- run heavy jobs through the lane (`web-lane.sh` on my Mac), never bare, so its memory, power and pressure gates apply and the watchdog can see them.
- when you're done, say the slot is free and report the results in the same message: counts, pass or fail, and links.
- delete your own build output you no longer need (`llvm-cov-target`, base builds, intermediates) before you give the slot back. never touch another session's.
- a slot doesn't cover a push or a commit: those still wait for my approval.

## as the coordinator

- two heavy slots at once. builders can outnumber them, since most of a builder's time is light work.
- give slots in this order:
  1. a fix for an open PR that's failing (it blocks the merge queue)
  2. the PR closest to landing
  3. the rest, by the plan's priority
- some runs need the lane to themselves: screenshot proofs, repeat-N stability runs, budget measurements. CPU starvation makes them fail for no real reason. grant those as exclusive: hold every other heavy grant until they finish, and have them run last in their session's sequence.
- track who holds each slot and who's waiting, in the ledger. when a slot frees up, tell the next session by name in the same turn.
- under 30 GiB free, run repo-cleanup and ask the slot holders to clean up after themselves. a slot isn't granted while the disk is short.
- a session's slot ends when it reports done, dies, or stops. reassign it then; don't wait.

## shutdowns and restarts

- before a shutdown: pause every lane group, kill running lane jobs, and record which sessions held slots.
- after: start the groups again (`pueue start --group <g>` for each). jobs killed at shutdown don't come back by themselves, so their sessions requeue them. re-grant the slots in the same order as before.
- a killed run proves nothing. rerun it before any result from it counts.
