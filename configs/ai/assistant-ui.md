# assistant-ui

my instructions for every repo under ~/GitHub/assistant-ui (work), on top of my global ones. a repo's own AGENTS.md or CLAUDE.md wins where it's more specific.

## public and private repos

assistant-ui/assistant-ui is public. the other repos here may not be, and `gh repo view assistant-ui/<repo> --json visibility` says which. don't name, link, or quote anything from a private one (code, issues, PRs, internal tools) in public commits, PRs, issues, or comments. replying to @rupic-app's reviews is fine, since those are already public.

## tracehub

tracehub may be on for these repos. when it is, `assisted-by` git hooks add an `Assisted-by: <id>` trailer to commits made during an agent session, and `git push` uploads the redacted session so maintainers can review the PR through it.

- keep `Assisted-by:` trailers when amending, rebasing, squashing, or rewording a commit. never write or change one yourself.
- don't get around the hooks: no `--no-verify` on a push, no `HUSKY=0` or `ASSISTED_BY=0`, and no `assisted-by` commands. turning tracehub on or off is my call.
- leave the `<!-- assisted-by:start -->` to `<!-- assisted-by:end -->` block in PR descriptions alone.
