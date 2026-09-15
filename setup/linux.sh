#!/usr/bin/env bash
# shellcheck shell=bash
#
# Linux / WSL setup. Normally reached via ../setup.sh, but running this
# directly works too.

set -uo pipefail

if [ -z "${DOTFILES_COMMON_SOURCED:-}" ]
then
  _linux_self="${BASH_SOURCE[0]}"
  DOTFILES_REPO_ROOT="$(cd "$(dirname "$_linux_self")/.." && pwd)"
  export DOTFILES_REPO_ROOT
  [ -d "$DOTFILES_REPO_ROOT/.git" ] && export DOTFILES_DIR="$DOTFILES_REPO_ROOT"
  # shellcheck source=lib/common.sh
  . "$DOTFILES_REPO_ROOT/setup/lib/common.sh"
fi

# Everything homebrew-on-linux needs to build, plus zsh itself. curl/file/procps
# are homebrew's own documented prerequisites.
APT_PACKAGES="build-essential curl file git procps zsh"

install_apt_packages() {
  log_step "installing apt packages: $APT_PACKAGES"

  if ! command -v apt-get >/dev/null 2>&1
  then
    log_warn "no apt-get on this machine - install these by hand: $APT_PACKAGES"
    return 0
  fi

  # noninteractive so a package with a config prompt can't park the run forever
  export DEBIAN_FRONTEND=noninteractive

  sudo_run apt-get update -y || record_failure "apt-get update"
  sudo_run apt-get upgrade -y || log_warn "apt-get upgrade didn't exit cleanly - carrying on"

  # shellcheck disable=SC2086
  if ! sudo_run apt-get install -y $APT_PACKAGES
  then
    record_failure "apt-get install $APT_PACKAGES"
  fi
}

LINUX_FORMULAE="gh nvm fnm asdf starship shellcheck"

install_linux_packages() {
  log_step "installing packages"

  # linuxbrew's zsh completions ship group-writable, which zsh's compaudit
  # refuses to load from. brew's own docs tell you to do exactly this.
  local share
  share="$(brew --prefix 2>/dev/null)/share/zsh"
  if [ -d "$share" ]
  then
    chmod -R go-w "$share" 2>/dev/null || true
  fi

  # shellcheck disable=SC2086
  brew_install_batch --formula $LINUX_FORMULAE
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

  if ensure_homebrew
  then
    install_linux_packages
  else
    log_warn "skipping packages - homebrew isn't usable"
  fi

  finalize_shell_config \
    PERSONAL_SETUP_LINUXBREW \
    PERSONAL_SETUP_FNM \
    PERSONAL_SETUP_STARSHIP \
    PERSONAL_SETUP_ZSHPLUGINS

  ensure_zsh_login_shell || true
}

main_linux
