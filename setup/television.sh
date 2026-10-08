#!/usr/bin/env bash
# shellcheck shell=bash
#
# Television (https://television.run), the display my agents put things on:
# the `tv` CLI, its agent skills, and its server as a login service, following
# https://television.run/install.md. Normally reached from macos.sh and
# linux.sh, but running this directly sets up (or repairs) just Television.

set -uo pipefail

if [ -z "${DOTFILES_COMMON_SOURCED:-}" ]
then
  DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  export DOTFILES_DIR
  # shellcheck source=setup/lib/common.sh
  . "$DOTFILES_DIR/setup/lib/common.sh"
fi

# The service keeps the PATH it was installed with. fnm's per-shell PATH entry
# disappears when that shell exits, so the service gets the stable entry of
# whichever node manager has a node new enough (22.12): fnm's default alias, or
# asdf's shims. Prints that directory, or returns 1 if there isn't one.
television_node_dir() {
  local dir

  for dir in "${FNM_DIR:-${XDG_DATA_HOME:-$HOME/.local/share}/fnm}/aliases/default/bin" "${ASDF_DATA_DIR:-$HOME/.asdf}/shims"
  do
    [ -x "$dir/node" ] || continue
    if "$dir/node" -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major > 22 || (major === 22 && minor >= 12) ? 0 : 1)' 2>/dev/null
    then
      printf '%s\n' "$dir"
      return 0
    fi
  done
  return 1
}

setup_television() {
  local node_dir service_path tv installed running skill link

  log_step "setting up Television"

  if ! node_dir="$(television_node_dir)"
  then
    record_failure "Television needs node 22.12 or later as fnm's default or from asdf - install one and re-run"
    return 1
  fi

  # a pnpm global, like PNPM_GLOBALS, so it survives switching node versions
  local -x PATH="$node_dir:$PATH"
  pnpm_global_install_batch @telepath-computer/television
  tv="${PNPM_HOME:-}/bin/tv"
  if [ ! -x "$tv" ]
  then
    record_failure "tv isn't installed - skipping the Television skills and service"
    return 1
  fi
  service_path="$PNPM_HOME/bin:$node_dir:/usr/bin:/bin:/usr/sbin:/sbin"

  # Reinstalled every run, since they change with each release. Codex reads
  # ~/.agents/skills as is, and Claude Code gets the same relative symlinks the
  # Skills CLI makes.
  if ! "$tv" skills install "$HOME/.agents/skills"
  then
    record_failure "tv skills install"
  fi
  mkdir -p "$HOME/.claude/skills"
  for skill in "$HOME/.agents/skills/television" "$HOME/.agents/skills"/tv-*
  do
    [ -d "$skill" ] || continue
    link="$HOME/.claude/skills/$(basename "$skill")"
    if [ -e "$link" ] && [ ! -L "$link" ]
    then
      log_warn "$link isn't a symlink - leaving it alone"
      continue
    fi
    ln -sfn "../../.agents/skills/$(basename "$skill")" "$link"
  done

  # `tv serve --persist` replaces and restarts the service, so it only runs
  # when the service isn't already healthy on the installed version.
  installed="$("$tv" --version | cut -d' ' -f1)"
  running="$("$tv" status 2>/dev/null | node -p 'const s = JSON.parse(require("fs").readFileSync(0, "utf8")); s.healthy && s.daemon.running ? s.version : ""' 2>/dev/null || true)"
  if [ "$running" = "$installed" ]
  then
    log_info "the Television service is already running $installed"
    return 0
  fi

  if ! PATH="$service_path" "$tv" serve --persist
  then
    record_failure "couldn't start the Television service - see ~/.television/logs/tv.log"
    return 1
  fi
  log_info "the Television service is running - \`tv links\` prints the link for the app or a browser"
}

setup_television || true
