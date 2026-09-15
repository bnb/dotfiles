#!/usr/bin/env bash
# shellcheck shell=bash
#
# The one script. Point at this and walk away:
#
#   ./setup.sh
#   curl -fsSL https://raw.githubusercontent.com/bnb/dotfiles/main/setup.sh | bash
#
# It works out which platform it's on, installs everything, and wires up the
# shell. It is safe to run again: every step checks before it acts, and nothing
# the user already had is truncated or deleted (it gets backed up instead).
#
# Compatibility: macOS ships bash 3.2.57 and on a fresh machine that is the
# ONLY bash there is - homebrew's bash 5 doesn't exist until this script has
# already run. Since the documented entry point pipes into `bash`, everything
# here has to work under 3.2. No associative arrays, no mapfile, no ${var,,},
# no &>>, no ;;&, no negative indices, no `wait -n`, no namerefs.

# Deliberately no `-e`: failures are collected by record_failure() and printed
# as a summary at the end, so one broken package doesn't abort the whole run.
set -uo pipefail

DOTFILES_REPO_URL="${DOTFILES_REPO_URL:-https://github.com/bnb/dotfiles.git}"
DOTFILES_DIR="${DOTFILES_DIR:-$HOME/GitHub/bnb/dotfiles}"

# Bootstrap
#
# Piped into bash there is no file on disk to find the rest of the repo from -
# ${BASH_SOURCE[0]} is "bash" or empty, not a path. In that case clone (or
# reuse) the repo and hand over to the real copy on disk.
_self="${BASH_SOURCE[0]:-}"

if [ -z "$_self" ] || [ ! -f "$_self" ]
then
  echo "==> bootstrapping: no local copy of the repo, fetching one"

  if ! command -v git >/dev/null 2>&1
  then
    echo "!!! git isn't installed yet." >&2
    if [ "$(uname -s)" = "Darwin" ]
    then
      echo "    run \`xcode-select --install\`, let it finish, then re-run this." >&2
    else
      echo "    install git (e.g. \`sudo apt install -y git\`) and re-run this." >&2
    fi
    exit 1
  fi

  if [ -d "$DOTFILES_DIR/.git" ]
  then
    echo "==> already cloned at $DOTFILES_DIR"
  else
    mkdir -p "$(dirname "$DOTFILES_DIR")"
    echo "==> cloning $DOTFILES_REPO_URL into $DOTFILES_DIR"
    if ! git clone "$DOTFILES_REPO_URL" "$DOTFILES_DIR"
    then
      echo "!!! clone failed" >&2
      exit 1
    fi
  fi

  echo "==> handing over to $DOTFILES_DIR/setup.sh"
  exec bash "$DOTFILES_DIR/setup.sh" "$@"
fi

DOTFILES_REPO_ROOT="$(cd "$(dirname "$_self")" && pwd)"
export DOTFILES_REPO_ROOT

# Running from a clone somewhere other than the canonical path is fine - use
# the clone we were actually launched from rather than cloning a second copy.
if [ -d "$DOTFILES_REPO_ROOT/.git" ]
then
  DOTFILES_DIR="$DOTFILES_REPO_ROOT"
fi
export DOTFILES_DIR

# shellcheck source=setup/lib/common.sh
. "$DOTFILES_REPO_ROOT/setup/lib/common.sh"


# Dispatch
log_step "dotfiles setup starting"
log_info "repo:  $DOTFILES_REPO_ROOT"
log_info "shell: bash ${BASH_VERSION:-unknown}"

case "$(uname -s)" in
  Darwin)
    log_info "platform: macOS"
    # shellcheck source=setup/macos.sh
    . "$DOTFILES_REPO_ROOT/setup/macos.sh"
    ;;
  Linux)
    if grep -qiE 'microsoft|wsl' /proc/version 2>/dev/null
    then
      log_info "platform: Linux (WSL)"
    else
      log_info "platform: Linux"
    fi
    # shellcheck source=setup/linux.sh
    . "$DOTFILES_REPO_ROOT/setup/linux.sh"
    ;;
  *)
    log_error "unsupported platform: $(uname -s)"
    exit 1
    ;;
esac

log_step "done - open a new shell (or run: exec zsh) to pick everything up"
