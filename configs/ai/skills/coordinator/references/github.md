# github

the `gh` specifics behind [landing.md](landing.md).

- **rules**: `gh api repos/{owner}/{repo}/rulesets` and `gh api repos/{owner}/{repo}/branches/main/protection` show required checks (a CodeQL gate counts), up to date before merging, stale approvals dismissed on push (`dismiss_stale_reviews_on_push`), approval of the latest push (`require_last_push_approval`), code owner review, and a merge queue. with only the second, an approval isn't removed, but any push by someone else (a bot account) still needs my approval again before the PR can merge.
- **state in bulk**: run `gh search prs --author @me --state open` (or `--review-requested @me`) once. then run `gh pr view <n> --json mergeStateStatus,reviewDecision,statusCheckRollup,headRefOid` per PR. `gh pr list` can say BLOCKED while `gh pr view` says CLEAN, so trust the single view.
- **after pushes that need re-approval**: run `gh pr merge <n> --auto --merge --match-head-commit <sha>` for each right away. then, once the burst of pushes is done, give me every PR whose `reviewDecision` is `REVIEW_REQUIRED` as links in one message, not one at a time. a PR opened by a bot account needs approval from my own account.
- **lost runs**: a job counts as lost once it has been queued 20+ minutes while newer jobs have started. wait the full 20 minutes. then `gh api -X POST repos/{owner}/{repo}/actions/runs/<id>/force-cancel` and `gh run rerun <id> --failed`.
- **retrigger without pushing**: close and reopen the PR, or use `gh pr update-branch`. both avoid a 1Password prompt. update-branch merges on the server, though, so skip it when a check depends on what the local merge produces (a size budget, generated files).
- **drafts**: where workflows skip drafts, park PRs outside the CI window as drafts.
- **watch the pushed commit**: use `gh run list --commit <sha>`, not the PR's latest run.
- **after merging**: check `delete_branch_on_merge` before deleting remote branches yourself.
