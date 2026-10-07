# shellcheck shell=bash
#
# Where 1Password's pieces live. Shared by setup/lib/common.sh and
# configs/ai/automation-accounts.sh, so the two can't disagree about whether
# 1Password is installed. Definitions only - sourcing it does nothing else -
# and it has to work under bash 3.2 and `set -u`.

# Where ssh looks for 1Password's agent. The linux app puts its socket here. The
# mac app buries it in a group container (with a space in the path), so on macOS
# setup.sh's write_ssh_config symlinks it here - 1Password's own docs suggest
# the same - and the one ssh config line works on both.
# shellcheck disable=SC2034 # read by the files that source this
OP_SSH_AGENT_SOCK="$HOME/.1password/agent.sock"
OP_SSH_AGENT_SOCK_MACOS="$HOME/Library/Group Containers/2BUA8C4S2C.com.1password/t/agent.sock"

# Prints the path to 1Password's op-ssh-sign on stdout, or returns 1 if there
# isn't one. It ships inside the desktop app, so this doubles as the check for
# "is 1Password installed here".
resolve_op_ssh_sign() {
  local candidate

  for candidate in \
    "${OP_SSH_SIGN:-}" \
    "/Applications/1Password.app/Contents/MacOS/op-ssh-sign" \
    "$HOME/Applications/1Password.app/Contents/MacOS/op-ssh-sign" \
    "/opt/1Password/op-ssh-sign" \
    "/usr/bin/op-ssh-sign" \
    "/usr/local/bin/op-ssh-sign"
  do
    if [ -n "$candidate" ] && [ -x "$candidate" ]
    then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  if command -v op-ssh-sign >/dev/null 2>&1
  then
    command -v op-ssh-sign
    return 0
  fi

  return 1
}
