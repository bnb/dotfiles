---
tags: [coordinator]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Bash]
---

what sessions did I do this week that have uncompleted work

(Dry run for testing: files/census.json is what a session census over the last 7 days returns, and files/forge.json is the forge state for those branches. Don't run git, gh, tg, or ListAgents, and don't read real transcripts. Write the report you'd give me into outputs/report.md, and list the commands you would have run to verify anything into outputs/commands.md.)

Input files: census.json, forge.json
