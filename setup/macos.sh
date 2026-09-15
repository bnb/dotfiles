#!/usr/bin/env bash
# shellcheck shell=bash
#
# macOS setup. Normally reached via ../setup.sh, but running this directly
# works too.

set -uo pipefail

if [ -z "${DOTFILES_COMMON_SOURCED:-}" ]
then
  _macos_self="${BASH_SOURCE[0]}"
  DOTFILES_REPO_ROOT="$(cd "$(dirname "$_macos_self")/.." && pwd)"
  export DOTFILES_REPO_ROOT
  [ -d "$DOTFILES_REPO_ROOT/.git" ] && export DOTFILES_DIR="$DOTFILES_REPO_ROOT"
  # shellcheck source=lib/common.sh
  . "$DOTFILES_REPO_ROOT/setup/lib/common.sh"
fi

# -----------------------------------------------------------------------------
# Xcode Command Line Tools
#
# `xcode-select --install` returns IMMEDIATELY and spawns an async GUI
# installer. The old script chained straight into `brew install` from there, so
# homebrew ran against a machine that was still downloading its toolchain. This
# blocks until the tools are actually on disk.
# -----------------------------------------------------------------------------
clt_installed() {
  xcode-select -p >/dev/null 2>&1 &&
    pkgutil --pkg-info=com.apple.pkg.CLTools_Executables >/dev/null 2>&1
}

ensure_xcode_clt() {
  local waited=0
  local timeout=1800   # 30 minutes; a slow connection really can take this long

  log_step "checking for the Xcode Command Line Tools"

  # A full Xcode install satisfies the toolchain even without the standalone
  # CLT package, so accept either.
  if clt_installed || [ -d "$(xcode-select -p 2>/dev/null)/usr/bin" ]
  then
    log_info "already installed ($(xcode-select -p 2>/dev/null))"
    return 0
  fi

  log_info "not installed - triggering the installer"
  log_info "a GUI dialog will open; accept it and this script waits for it to finish"
  xcode-select --install >/dev/null 2>&1 || true

  while ! clt_installed
  do
    if [ "$waited" -ge "$timeout" ]
    then
      record_failure "the Command Line Tools didn't finish installing within $((timeout / 60)) minutes - finish the installer and re-run this script"
      return 1
    fi
    if [ $((waited % 60)) -eq 0 ]
    then
      log_info "still waiting for the Command Line Tools... ($((waited / 60))m)"
    fi
    sleep 10
    waited=$((waited + 10))
  done

  log_info "Command Line Tools are installed"
  return 0
}

# -----------------------------------------------------------------------------
# The Xcode licence
#
# When xcode-select points at a full Xcode.app, every toolchain command -
# including everything homebrew shells out to - refuses to run until the
# licence has been accepted. This is not hypothetical: it is the exact state
# the machine this was written on was in, and `brew info` was dead because of
# it.
# -----------------------------------------------------------------------------
ensure_xcode_license() {
  local developer_dir

  log_step "checking the Xcode licence"

  developer_dir="$(xcode-select -p 2>/dev/null || true)"

  case "$developer_dir" in
    *Xcode.app*) : ;;
    *)
      log_info "using the standalone Command Line Tools - no licence to accept"
      return 0
      ;;
  esac

  if /usr/bin/xcodebuild -checkFirstLaunchStatus >/dev/null 2>&1
  then
    log_info "already accepted"
    return 0
  fi

  log_info "not accepted yet - accepting it (needs root)"
  if ! sudo_run /usr/bin/xcodebuild -license accept
  then
    record_failure "couldn't accept the Xcode licence - run: sudo xcodebuild -license accept"
    return 1
  fi

  # first launch also installs the bundled packages brew's builds expect
  sudo_run /usr/bin/xcodebuild -runFirstLaunch >/dev/null 2>&1 || true

  log_info "accepted"
  return 0
}

# -----------------------------------------------------------------------------
# macOS defaults
# -----------------------------------------------------------------------------
apply_macos_defaults() {
  log_step "applying macOS defaults"

  # Note: this only stops .DS_Store files on NETWORK volumes. The old comment
  # claimed it disabled them everywhere, which it never did - there is no
  # supported switch for local volumes.
  log_info "no .DS_Store on network volumes"
  defaults write com.apple.desktopservices DSDontWriteNetworkStores -bool true || true
}

run_software_update() {
  log_step "running softwareupdate"

  if [ -n "${DOTFILES_SKIP_SOFTWAREUPDATE:-}" ]
  then
    log_info "skipped (\$DOTFILES_SKIP_SOFTWAREUPDATE is set)"
    return 0
  fi

  # This can take a long time and can want a reboot. It must never be the thing
  # that fails the run, so its exit status is noted and swallowed.
  log_info "this can take a while, and may ask for a restart afterwards"
  log_info "(set DOTFILES_SKIP_SOFTWAREUPDATE=1 to skip this next time)"

  if ! sudo_run softwareupdate --all --install --force
  then
    log_warn "softwareupdate didn't exit cleanly - carrying on"
  fi
  return 0
}

# -----------------------------------------------------------------------------
# Packages
#
# --formula and --cask are passed explicitly rather than letting brew guess.
# Guessing is how `brew install docker` quietly installed the docker CLI
# formula instead of Docker Desktop for years.
# -----------------------------------------------------------------------------
MACOS_FORMULAE="git gh nvm fnm asdf starship python3 bash shellcheck"

# Verified against the Homebrew API. Three of these used to be wrong:
#   google-chrome-canary        -> 404, it is google-chrome@canary
#   visual-studio-code-insiders -> 404, it is visual-studio-code@insiders
#   docker                      -> a formula (the CLI); the app is docker-desktop
# The first two 404'd silently for who knows how long because the old script
# had no `set -e` and never checked an exit status.
MACOS_CASKS="1password alfred appcleaner arc discord docker-desktop karabiner-elements slack spotify zoom google-chrome@canary visual-studio-code@insiders font-cascadia-code font-cascadia-code-pl font-cascadia-mono font-cascadia-mono-pl"

install_macos_packages() {
  log_step "installing packages"

  # word splitting is the point here
  # shellcheck disable=SC2086
  brew_install_batch --formula $MACOS_FORMULAE
  # shellcheck disable=SC2086
  brew_install_batch --cask $MACOS_CASKS
}

# -----------------------------------------------------------------------------
main_macos() {
  request_sudo || true

  ensure_xcode_clt || true
  ensure_xcode_license || true

  ensure_directory_invariant
  apply_macos_defaults
  run_software_update

  if ensure_homebrew
  then
    install_macos_packages
  else
    log_warn "skipping packages - homebrew isn't usable"
  fi

  finalize_shell_config \
    PERSONAL_SETUP_MACOS \
    PERSONAL_SETUP_MACOSBREW \
    PERSONAL_SETUP_ASDF \
    PERSONAL_SETUP_STARSHIP
}

main_macos
