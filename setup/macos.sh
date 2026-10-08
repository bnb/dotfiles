#!/usr/bin/env bash
# shellcheck shell=bash
#
# macOS setup. Normally reached via ../setup.sh, but running this directly
# works too.

set -uo pipefail

if [ -z "${DOTFILES_COMMON_SOURCED:-}" ]
then
  DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  export DOTFILES_DIR
  # shellcheck source=setup/lib/common.sh
  . "$DOTFILES_DIR/setup/lib/common.sh"
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
  local developer_dir

  log_step "checking for the Xcode Command Line Tools"

  # A full Xcode install satisfies the toolchain even without the standalone
  # CLT package, so accept either. The -n matters: with nothing installed
  # xcode-select prints nothing, and "$(...)/usr/bin" becomes /usr/bin, which
  # always exists.
  developer_dir="$(xcode-select -p 2>/dev/null || true)"
  if clt_installed || { [ -n "$developer_dir" ] && [ -d "$developer_dir/usr/bin" ]; }
  then
    log_info "already installed ($developer_dir)"
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

  if /usr/bin/xcodebuild -license check >/dev/null 2>&1
  then
    log_info "already accepted"
  else
    log_info "not accepted yet - accepting it (needs root)"
    if ! sudo_run /usr/bin/xcodebuild -license accept
    then
      record_failure "couldn't accept the Xcode licence - run: sudo xcodebuild -license accept"
      return 1
    fi
    log_info "accepted"
  fi

  # Checked separately from the licence: a new Xcode can have it accepted and
  # still have first-launch work outstanding. That work installs the bundled
  # packages brew's builds expect.
  if ! /usr/bin/xcodebuild -checkFirstLaunchStatus >/dev/null 2>&1
  then
    log_info "running Xcode's first-launch tasks"
    sudo_run /usr/bin/xcodebuild -runFirstLaunch >/dev/null 2>&1 || true
  fi

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
# clauth daemon
#
# Only on a machine with my work checkouts. Claude in VS Code starts each
# session with `clauth start work` (configs/ai/vscode-claude.sh), and on macOS
# every one of those gets its own Keychain copy of the login, so the first to
# refresh would sign the rest out. `clauth rolling-token work` hands sessions
# an access token with no refresh token instead, and this daemon is what keeps
# re-stamping it. A launchd agent keeps it running and restarts it if it
# crashes.
# -----------------------------------------------------------------------------
CLAUTH_DAEMON_LABEL="im.bnb.clauth-daemon"

run_clauth_daemon() {
  local clauth="${CARGO_HOME:-$HOME/.cargo}/bin/clauth"
  local plist="$HOME/Library/LaunchAgents/$CLAUTH_DAEMON_LABEL.plist"
  local domain brew_prefix contents

  [ -d "$WORK_DIR" ] || return 0
  log_step "keeping the clauth daemon running"

  if [ ! -x "$clauth" ]
  then
    log_info "clauth isn't installed - skipping"
    return 0
  fi

  domain="gui/$(id -u)"
  # its delegate jobs run `claude`, which brew installs
  brew_prefix="$(resolve_brew_prefix || true)"
  contents="$(cat <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$CLAUTH_DAEMON_LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$clauth</string>
    <string>daemon</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>$(dirname "$clauth")${brew_prefix:+:$brew_prefix/bin}:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
  </dict>
  <key>StandardErrorPath</key>
  <string>$HOME/.clauth/daemon.log</string>
</dict>
</plist>
EOF
)"

  if [ "$(cat "$plist" 2>/dev/null)" = "$contents" ] && launchctl print "$domain/$CLAUTH_DAEMON_LABEL" >/dev/null 2>&1
  then
    log_info "already running under launchd"
    return 0
  fi

  mkdir -p "$(dirname "$plist")"
  printf '%s\n' "$contents" > "$plist"
  launchctl bootout "$domain/$CLAUTH_DAEMON_LABEL" >/dev/null 2>&1 || true
  if ! launchctl bootstrap "$domain" "$plist"
  then
    record_failure "couldn't start the clauth daemon - try: launchctl bootstrap $domain $plist"
    return 1
  fi
  log_info "started ($plist)"
}

# -----------------------------------------------------------------------------
# Packages
# -----------------------------------------------------------------------------

# One node version manager: asdf, the one PERSONAL_SETUP_ASDF below loads.
# git-lfs because the committed .gitconfig sets the lfs filter as required, and
# a required filter with no binary behind it fails every checkout of an LFS repo.
# ripgrep and fd because configs/ai/instructions.md tells agents to use them.
MACOS_FORMULAE="git git-lfs gh opencode asdf pnpm starship python3 bash shellcheck rust ripgrep fd alyraffauf/tap/tg"

# Verified against the Homebrew API. Three of these used to be wrong:
#   google-chrome-canary        -> 404, it is google-chrome@canary
#   visual-studio-code-insiders -> 404, it is visual-studio-code@insiders
#   docker                      -> a formula (the CLI); the app is docker-desktop
# The first two 404'd silently for who knows how long because the old script
# had no `set -e` and never checked an exit status.
MACOS_CASKS="1password alfred appcleaner arc discord docker-desktop karabiner-elements slack spotify zoom google-chrome@canary visual-studio-code@insiders font-cascadia-code font-cascadia-code-pl font-cascadia-mono font-cascadia-mono-pl"

# -----------------------------------------------------------------------------
main_macos() {
  request_sudo || true

  ensure_xcode_clt || true
  ensure_xcode_license || true

  ensure_directory_invariant
  apply_macos_defaults
  run_software_update

  install_packages "$MACOS_FORMULAE" "$MACOS_CASKS"

  finalize_shell_config \
    PERSONAL_SETUP_MACOS \
    PERSONAL_SETUP_MACOSBREW \
    PERSONAL_SETUP_ASDF \
    PERSONAL_SETUP_STARSHIP

  run_clauth_daemon || true

  # shellcheck source=setup/television.sh
  . "$DOTFILES_DIR/setup/television.sh"
}

main_macos
