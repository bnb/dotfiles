# assistant-ui

my instructions for every repo under ~/GitHub/assistant-ui (work), on top of my global ones.

## public and private repos

assistant-ui/assistant-ui is public. other repos here may not be (`gh repo view assistant-ui/<repo> --json visibility` says). never name, link, or quote anything from a private one (code, issues, PRs, internal tools) in public commits, PRs, issues, or comments. replying to @rupic-app's reviews is fine, since they're already public.

## PRs

- size each PR, stacked ones included, so a human can review it in one sitting. follow-ups go in separate PRs.
- the repo's treeflow skill runs only when I ask for treeflow. when I do, its worktree, push, PR, and branch steps win over my global git and PR rules.

## tracehub

tracehub is on here. its git hooks add an `Assisted-by: <link>` trailer to commits made in agent sessions, and `git push` uploads the redacted session so maintainers can review the PR through it.

- keep `Assisted-by:` trailers through amends, rebases, squashes, and rewords. never write or change one yourself.
- on top of my global hook rules: no `TRACEHUB=0` and no `tracehub` or `config:tracehub` commands. turning tracehub on or off is my call.
- leave the `<!-- tracehub:start -->` to `<!-- tracehub:end -->` block (`assisted-by` on older PRs) in PR descriptions alone.
