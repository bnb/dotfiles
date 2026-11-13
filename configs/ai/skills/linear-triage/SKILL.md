---
name: linear-triage
description: Go through the LOC team's Triage queue in Linear (cutenode/localnetwork) and propose status, priority, labels, project and relations for each issue, for my approval before anything changes. Use when I ask to triage LOC, clear its Triage queue, or plan what to pick up next there.
---

# triage the LOC queue

load the `linear` skill first. nothing in Linear changes until I pick rows.

## 1. gather

`list_issues` with `team: "LOC"`, `state: "triage"`. for each issue:

- read it and its comments (`get_issue`, `list_comments`).
- look for duplicates and related work: `list_issues` with `query` on its key terms, `includeArchived: true`, across every status.
- check whether `main` already fixed it: `git -C /Users/cyren/GitHub/cutenode/localnetwork log origin/main`, `gh pr list -R cutenode/localnetwork --state merged --search "<terms>"`, and the code it names.

## 2. propose

one row per issue:

- **status**: Backlog, Todo, Canceled (with why), or Duplicate of LOC-n.
- **priority**: 1 urgent to 4 low. urgent only for data loss, security, or a broken release.
- **estimate**, if the team has estimates on.
- **labels**: a tool or `<tool>: <area>` label plus `bug` or `enhancement`, all from [labels.yml](https://github.com/cutenode/localnetwork/blob/main/.github/labels.yml).
- **project**: `locallibrary v0.1.0` only when the release can't ship without it.
- **relations**: blocked by, related to, or a parent.
- **description**: if it doesn't say the outcome, where in the code, and how to test it, propose the missing sentences. they follow the `linear` skill's rules for synced text.
- **bot-ready**: only for an issue that isn't synced to GitHub (no `github.com/…/issues` link in its attachments), and only when it names the outcome, where in the code, and how to test it, and needs no hardware, real account or decision.

every row carries its evidence: links to the duplicate, the merged pull request, or the code line.

## 3. ask

publish the rows as the checkbox table my instructions describe for choosing among many items, and wait for my picks.

## 4. apply

for the picked rows only, one `save_issue` per issue: `state`, `priority`, `estimate`, `project`, `addLabels` (never `labels`, which replaces the whole set), `blockedBy`, `relatedTo`, `parentId` or `duplicateOf`, the description additions, and `bot-ready` in `addLabels` where proposed (check again that the issue isn't synced first). then list what changed, with LOC ids.
