---
name: linear
description: How I plan cutenode/localnetwork's work in Linear (team LOC) and what you may write there without asking. Use when reading, filing or commenting on a LOC issue, picking up LOC work, writing a localnetwork pull request that closes an issue, or running or coordinating a backlog sweep there. For going through LOC's Triage queue, use linear-triage.
---

# linear

localnetwork's issues live in the Localnetwork team (`LOC`) of the `localnetwork` Linear workspace, synced both ways with the issues in [cutenode/localnetwork](https://github.com/cutenode/localnetwork), which is public. the repo's [CONTRIBUTING.md](https://github.com/cutenode/localnetwork/blob/main/.github/CONTRIBUTING.md#issues-and-planning) has the workflow people follow. this adds what you do. use the Linear MCP tools (`get_issue`, `list_issues`, `save_comment`, `save_issue`, `save_document`, `save_status_update`).

## what syncs to GitHub is public

a LOC issue is synced when its attachments include a `github.com/cutenode/localnetwork/issues/…` link (`get_issue` with `attachments`). a synced issue's title, description and labels, and the comment thread whose first comment is from "GitHub", show up on the public GitHub issue. labels sync too: LOC-109's `bug, locallibrary` are #279's.

- never write agent wording (agents, AI, Claude, sessions, skills) in synced issue text or in a GitHub-synced comment thread. no machine paths, account names or secrets there either. write it the way a person working on the project would.
- never apply `bot-ready` to a synced issue. it's for Linear-only issues.

## status moves itself

don't set In Progress, In Review or Done by hand. a pull request that says `Fixes LOC-123` (or `Part of LOC-123`), or a branch named `bnb/loc-123-…`, moves its issue to In Progress when it opens, In Review when a review is requested, and Done when it merges.

## what you write without asking

- **findings on an issue you worked on**: a new top-level comment (`save_comment` with `issueId`, no `parentId`). it stays in Linear. never reply in the thread whose first comment is from "GitHub" ("This comment thread is synced to a corresponding GitHub issue"): replies there are posted on the GitHub issue. I copy over what should be public.
- **a problem you found that isn't your task**: a new issue in Triage (`save_issue`, team `LOC`, no status) with labels from [labels.yml](https://github.com/cutenode/localnetwork/blob/main/.github/labels.yml) and a `relatedTo` link to the issue you were on. a new LOC issue syncs to GitHub, so it follows the rules above.
- **a sweep batch's report**: a document on the `Backlog sweep` project (`save_document`), titled with the branch name. the coordinator posts one project status update (`save_status_update`) when the sweep ends.

anything else waits for me: priority, estimate, project, assignee, labels on an existing issue, closing, cancelling, marking duplicates, and deleting. put those in your report as proposals.

## comment on a fixed issue

```markdown
Fixed on `bnb/<branch>`.

Cause: <one or two sentences> ([path.rs:123](https://github.com/cutenode/localnetwork/blob/<sha>/path.rs#L123)).
Fix: <what changed>.
Test: `<test name>` fails without the fix and passes with it.
```

say "partly fixed" or "not fixable here" plainly, with why (needs hardware, a real account, or a decision).

## picking up work

work comes from the "Bot ready" team view: the `bot-ready` label in Backlog or Todo, which `list_issues` with `team: "LOC"`, `label: "bot-ready"` and each of those states also finds. the label means the issue names the outcome, where in the code, and how to test it, and needs no hardware, real account or decision. skip an issue whose "blocked by" relations aren't Done (`get_issue` with `includeRelations`). when several sessions work LOC at once, give each one area label (`locallibrary: player`, `web: epk`) so their branches don't touch the same files, and start blocked work only after what blocks it merges.

## labels

Linear's labels mirror [labels.yml](https://github.com/cutenode/localnetwork/blob/main/.github/labels.yml). Linear only gets a label when a synced issue first uses it, so if one you need is missing, create it in the LOC team (`save_issue_label` with `teamId`) with the same name, colour and description.

## writing

plain, short sentences. cite code as `path:line` with a GitHub link. no em dashes and no emoji.
