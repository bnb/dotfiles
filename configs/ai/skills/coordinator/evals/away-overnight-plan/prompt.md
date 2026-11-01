---
tags: [coordinator]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Bash]
---

I'm going to bed, coordinate all the agents I've got running to do as much work as possible without triggering blocking prompts. If they do trigger blocking prompts, it's okay - just help guide them to move on and collect those in the morning.

(Dry run for testing: files/census.json is what a session census returns right now and files/environment.md holds the memory, forge, machine and usage state. Don't run git, gh, tg, ListAgents or SendMessage, and don't contact any real session. Write everything you would send, run and say into outputs/plan.md: each message to each session verbatim, the commands you'd run, the files you'd create, and your final message to me before I go to sleep.)

Input files: census.json, environment.md
