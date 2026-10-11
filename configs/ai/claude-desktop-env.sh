# Claude's desktop app runs some git of its own, outside any Claude Code
# session: it fetches each project's base branch when a session opens, and
# fetches, merges and pushes for its sync and PR buttons. Those spawns never see
# the `env` block in ~/.claude/settings.json, so in a repo with an SSH remote
# they authenticated with my personal key, and anything they committed was
# signed with it.
#
# What they do get is the environment of a login shell, which the app reads
# once at startup with CLAUDE_DESKTOP_RESOLVING_ENVIRONMENT=1 set. So when that
# variable is there, export the same env block its sessions get. It comes from
# the settings file rather than a fixed list, so it follows `clauth switch`,
# `toggle:ai-github` and `toggle:ai-tangled` (after an app restart). Nothing
# else ever has that variable set: terminals, the app's own terminal panel,
# and Claude Code's shells skip this.

if [[ -n "$CLAUDE_DESKTOP_RESOLVING_ENVIRONMENT" && -r "$HOME/.claude/settings.json" ]] && (( $+commands[jq] ))
then
  eval "$(jq -r '.env // {} | to_entries[]
    | select(.key | test("^[A-Za-z_][A-Za-z0-9_]*$"))
    | "export \(.key)=\(.value | tostring | @sh)"' "$HOME/.claude/settings.json")"
fi
