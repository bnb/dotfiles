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

  # macOS ships /usr/bin/git as a stub that only works once the Command Line
  # Tools are installed, so `command -v git` passing there proves nothing - the
  # clone would just pop up the installer and fail. Install them first and
  # wait, the same way setup/macos.sh does.
  if [ "$(uname -s)" = "Darwin" ] && ! xcode-select -p >/dev/null 2>&1
  then
    echo "==> installing the Xcode Command Line Tools - accept the dialog that opens, and this waits for it"
    xcode-select --install >/dev/null 2>&1 || true
    _waited=0
    until pkgutil --pkg-info=com.apple.pkg.CLTools_Executables >/dev/null 2>&1
    do
      if [ "$_waited" -ge 1800 ]
      then
        echo "!!! the Command Line Tools didn't finish installing within 30 minutes - finish the installer and re-run this" >&2
        exit 1
      fi
      if [ $((_waited % 60)) -eq 0 ]
      then
        echo "    still waiting for the Command Line Tools... ($((_waited / 60))m)"
      fi
      sleep 10
      _waited=$((_waited + 10))
    done
  fi

  if ! command -v git >/dev/null 2>&1
  then
    echo "!!! git isn't installed yet." >&2
    echo "    install git (e.g. \`sudo apt install -y git\`) and re-run this." >&2
    exit 1
  fi

  if [ -d "$DOTFILES_DIR/.git" ]
  then
    # Nothing is running from this clone yet - unlike a ./setup.sh run - so
    # it's safe to bring it up to date before handing over. Without this the
    # one-liner would keep running whatever was last pulled.
    if [ -n "$(git -C "$DOTFILES_DIR" status --porcelain 2>/dev/null)" ]
    then
      echo "==> already cloned at $DOTFILES_DIR, with uncommitted changes - not pulling"
    else
      echo "==> already cloned at $DOTFILES_DIR - pulling"
      git -C "$DOTFILES_DIR" pull --ff-only ||
        echo "!!! git pull failed - carrying on with the clone as it is" >&2
    fi
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

# From here on, everything uses the copy of the repo this was launched from,
# wherever it is, rather than cloning a second one.
DOTFILES_DIR="$(cd "$(dirname "$_self")" && pwd)"
export DOTFILES_DIR

# shellcheck source=setup/lib/common.sh
. "$DOTFILES_DIR/setup/lib/common.sh"


# Dispatch
log_step "dotfiles setup starting"
log_info "repo:  $DOTFILES_DIR"
log_info "shell: bash ${BASH_VERSION:-unknown}"

case "$(uname -s)" in
  Darwin)
    log_info "platform: macOS"
    # shellcheck source=setup/macos.sh
    . "$DOTFILES_DIR/setup/macos.sh"
    ;;
  Linux)
    if grep -qiE 'microsoft|wsl' /proc/version 2>/dev/null
    then
      log_info "platform: Linux (WSL)"
    else
      log_info "platform: Linux"
    fi
    # shellcheck source=setup/linux.sh
    . "$DOTFILES_DIR/setup/linux.sh"
    ;;
  *)
    log_error "unsupported platform: $(uname -s)"
    exit 1
    ;;
esac

log_step "done - open a new shell (or run: exec zsh) to pick everything up"
