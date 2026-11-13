# away

I've said something like "I'm going to bed, keep everyone moving" or "I'm walking away, knock out the backlog". the goal is as much finished work as possible with no blocking prompts, and a morning where I approve everything in one sitting.

## before I leave

if I'm still here, ask everything that would otherwise block you, in one list: grants (writing to an issue tracker, opening PRs), repos that are off limits, and permission to cancel CI runs on PRs whose head is about to change. asking that last one late once let 200+ runs queue and nothing merged for 1.5 hours.

## the message each session gets

one message per session, with its own pending questions answered where you can:

- take the recommended option on your open questions for now, and keep it easy to undo. tell me which ones you took.
- hold commits, pushes, opening PRs, writes to external services, and deletions until Tierney is back and approves them in your own session. (skip whatever their own user explicitly allowed them.)
- stage held work as the 1password-retry skill's "while I'm away" section says, with a `--check` mode on the replay script, kept somewhere durable (the repo's `.claude/` or the ledger's folder), not in a job tmp dir.
- if a prompt blocks you, note it and move on to the next thing.
- end with a morning report: done, held (each one reply away), and questions (numbered, lettered, recommended first).

## while I'm gone

- spot-check staged work before it goes on my list: read the diff, `bash -n` the replay script, run its `--check`, run one test. numbers you didn't reproduce are the session's.
- nothing gets signed or pushed (the 1password-retry skill).
- main keeps moving. every 30 minutes or so, `git merge-tree` each staged head against `origin/main` and tell the owner only about real conflicts.
- a stalled session gets resumed with one message naming its last step and its disk state, not replaced by a new one. after API or auth outages, check every worker, since they tend to stop together.
- keep the machine usable: disk, memory, and load (see SKILL.md). size waves of work by what's free.
- no push notifications while I'm asleep. blocks wait for the morning report. a short walk away still gets the one-hour notification.

## the morning report

1. one line: counts, and the artifact link.
2. **needs you**, numbered. each item is one reply or one command. approvals for other sessions are a "type `X` in session `Y`" list. steps only I can do (logins, dashboards, secrets) are one chained command, run through `bash -n` or a dry run first. say what you'll check once I've run it.
3. **done**, with links, each marked verified or not verified.
4. **held**, each with what replays it.
5. **defaults taken**, with the alternative for each.
6. **questions**, numbered with lettered options.

when I say I'm back: first do everything that needs no answer from me (replays I approved, merges that are ready), then ask the questions. tell every owner I'm back so their held prompts surface while I'm at the Mac.
