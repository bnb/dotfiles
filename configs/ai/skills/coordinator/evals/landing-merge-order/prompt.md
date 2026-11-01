---
tags: [coordinator]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Bash]
---

there's a lot of PRs open from different agents right now on localnetwork. Can you please coordinate the merge order and ensure everything goes smoothly - ensure agents address CI failures and bot feedback, and then merge in the order you decide

(Dry run for testing: files/prs.json is the forge state, files/merge-plan.txt is merge-plan output you already ran, files/census.json is the session census. Don't run git, gh, ListAgents or SendMessage, and don't contact any real session. Write everything you would send, run and say into outputs/plan.md: each message to each session verbatim, the merge order with a reason per step, the commands you'd run, and your message to me.)

Input files: prs.json, merge-plan.txt, census.json
