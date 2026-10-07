#!/usr/bin/env bash
# shellcheck shell=bash
#
# Linux / WSL setup. Normally reached via ../setup.sh, but running this
# directly works too.

set -uo pipefail

if [ -z "${DOTFILES_COMMON_SOURCED:-}" ]
then
  DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  export DOTFILES_DIR
  # shellcheck source=setup/lib/common.sh
  . "$DOTFILES_DIR/setup/lib/common.sh"
fi

# Everything homebrew-on-linux needs to build, plus zsh itself. curl/file/procps
# are homebrew's own documented prerequisites. git-lfs because the committed
# .gitconfig sets the lfs filter as required.
APT_PACKAGES="build-essential curl file git git-lfs procps zsh"

# usage: apt_get install -y zsh
#
# noninteractive so a package with a config prompt can't park the run forever,
# and passed through `env` because sudo resets the environment - an exported
# DEBIAN_FRONTEND never reaches apt. The dpkg options keep an existing config
# file on upgrade instead of asking which one to use.
apt_get() {
  sudo_run env DEBIAN_FRONTEND=noninteractive apt-get \
    -o Dpkg::Options::=--force-confdef \
    -o Dpkg::Options::=--force-confold \
    "$@"
}

install_apt_packages() {
  log_step "installing apt packages: $APT_PACKAGES"

  if ! command -v apt-get >/dev/null 2>&1
  then
    log_warn "no apt-get on this machine - install these by hand: $APT_PACKAGES"
    return 0
  fi

  apt_get update -y || record_failure "apt-get update"
  apt_get upgrade -y || log_warn "apt-get upgrade didn't exit cleanly - carrying on"

  # shellcheck disable=SC2086
  if ! apt_get install -y $APT_PACKAGES
  then
    record_failure "apt-get install $APT_PACKAGES"
  fi
}

# One node version manager: fnm, the one PERSONAL_SETUP_FNM below loads.
# ripgrep and fd because configs/ai/instructions.md tells agents to use them.
LINUX_FORMULAE="gh opencode fnm pnpm starship shellcheck rust ripgrep fd alyraffauf/tap/tg"

# linuxbrew's zsh completions ship group-writable, which zsh's compaudit
# refuses to load from. brew's own docs tell you to do exactly this. Run after
# the packages, so it covers whatever they just added.
fix_linuxbrew_completion_permissions() {
  local share="${HOMEBREW_PREFIX:-}/share/zsh"

  if [ -n "${HOMEBREW_PREFIX:-}" ] && [ -d "$share" ]
  then
    chmod -R go-w "$share" 2>/dev/null || true
  fi
}

# -----------------------------------------------------------------------------
# Login shell
#
# The old script ran `chsh -s /bin/zsh` unconditionally: it hardcoded a path
# that isn't right everywhere, prompted for a password every single run, and
# did it even when zsh was already the shell.
# -----------------------------------------------------------------------------
ensure_zsh_login_shell() {
  local zsh_path

  log_step "making zsh the login shell"

  zsh_path="$(command -v zsh 2>/dev/null || true)"
  if [ -z "$zsh_path" ]
  then
    record_failure "zsh isn't installed - can't make it the login shell"
    return 1
  fi

  case "${SHELL:-}" in
    *zsh)
      log_info "already zsh ($SHELL)"
      return 0
      ;;
  esac

  # chsh refuses a shell that isn't listed in /etc/shells
  if [ -f /etc/shells ] && ! grep -Fxq "$zsh_path" /etc/shells
  then
    log_info "adding $zsh_path to /etc/shells"
    if ! printf '%s\n' "$zsh_path" | sudo_run tee -a /etc/shells >/dev/null
    then
      record_failure "couldn't add $zsh_path to /etc/shells"
      return 1
    fi
  fi

  if ! sudo_run chsh -s "$zsh_path" "${USER:-$(id -un)}"
  then
    record_failure "chsh to $zsh_path failed - run it by hand: chsh -s $zsh_path"
    return 1
  fi

  log_info "login shell is now $zsh_path"
  return 0
}

# -----------------------------------------------------------------------------
main_linux() {
  request_sudo || true

  install_apt_packages
  ensure_directory_invariant

  install_packages "$LINUX_FORMULAE"
  fix_linuxbrew_completion_permissions

  finalize_shell_config \
    PERSONAL_SETUP_LINUXBREW \
    PERSONAL_SETUP_FNM \
    PERSONAL_SETUP_STARSHIP

  ensure_zsh_login_shell || true
}

main_linux
