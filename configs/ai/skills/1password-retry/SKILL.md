---
name: 1password-retry
description: What to do when a git commit, merge, cherry-pick, rebase, tag, push, or fetch fails because 1Password's approval prompt went unanswered, with errors like "error: 1Password: failed to fill whole buffer", "error: 1Password: agent returned an error", "fatal: failed to write commit object", "sign_and_send_pubkey: signing failed ... communication with agent failed", "agent refused operation", or "Permission denied (publickey)" after about a minute. Waits until the user is back at the Mac, then reruns the command so the prompt gets seen. Also use when working while the user is away (overnight or unattended), to hold commits and pushes for one approval burst.
---

# 1password retry

commit signing (`op-ssh-sign`) and git over SSH (the `IdentityAgent` in `~/.config/ai-agents/ssh_config`) both ask 1Password, and 1Password shows an approval prompt for an app it hasn't approved lately. if nobody approves it within about 60 seconds, 1Password gives up and git fails with one of the errors above. a quick `agent returned an error` often follows an immediate retry. treat it the same way. usually the user was away, the screen was locked or asleep, or the prompt sat behind other windows. the keys and the vault are fine, so don't go digging.

## steps

1. **tell the user once**, in one line: which command is waiting on 1Password.
2. **wait and retry in the background.** run this with the Bash tool's `run_in_background` and its longest timeout (Codex: run it as a normal command):

   ```sh
   <this skill's dir>/scripts/wait_for_me.py "<repo>: <what's waiting>" && <the command that finishes the job>
   ```

   the script posts a notification, then exits once the screen is unlocked and there's been input since it started, so the new prompt shows up while the user is there. the command that finishes the job is the original one for a commit, tag, push, or fetch. a failed merge, cherry-pick, revert, or rebase has already stopped partway, so use `git commit --no-edit` or `git <cherry-pick|revert|rebase> --continue` instead.
3. **if it fails with a 1Password error again**, do step 2 once more. after a third failure, stop and end with `needs input:` asking the user to approve the 1Password prompt and say "retry".
4. **if it times out**, the user hasn't been back. stop the same way.

## while I'm away

with nobody at the Mac, nothing gets signed or pushed: no commits, merges, tags, or pushes from a local branch. GitHub-side steps (`gh pr merge`, `gh api` calls like update-branch) don't go through 1Password and still work. keep working, and leave the git steps for one burst when I'm back:

1. leave finished work staged in its worktree, with its commit message in a file next to the plan.
2. for a merge, compute the result without committing: run the merge in a scratch worktree with `--no-commit`, resolve and test it there, then `git write-tree` gives the result's tree id.
3. write one script that replays everything in order: `git commit -F <message>` for staged work, and for each merge `git merge --no-ff --no-commit <base>`, `git read-tree -u --reset <tree>`, then `git commit`. hooks and signing run as usual. the script checks each branch hasn't moved since, then pushes.
4. tell me the one command that runs it, and when I'm back run it with the wait from the steps above, so every prompt comes while I'm here.

## don't

- poll `ssh-add -l`. agents' `SSH_AUTH_SOCK` is macOS's own agent, which has no keys, so it never passes. even against 1Password's socket it only shows the keys exist, not that a prompt got approved.
- get around signing or the bot's key: no `-c commit.gpgsign=false`, no switching the remote to HTTPS, no other key.
- say 1Password is locked, or that a key is missing, unless you checked.
