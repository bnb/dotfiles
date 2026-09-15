# Shared helpers for the rest of this repo's configs.
#
# Every $PERSONAL_SETUP_* flag is documented as "set to `true`", so check the
# *value* rather than just "does this variable exist?" — otherwise
# `PERSONAL_SETUP_FOO=false` turns the block on instead of off.

# usage: __personal_enabled "$PERSONAL_SETUP_MACOS"
__personal_enabled() {
  case "$1" in
    true|TRUE|True|1|yes|YES|Yes|on|ON|On) return 0 ;;
    *) return 1 ;;
  esac
}

# usage: __personal_debug "setting up macOS"
__personal_debug() {
  if __personal_enabled "$PERSONAL_SETUP_DEBUG"
  then
    echo "$@"
  fi
  return 0
}

# usage: if __personal_brew_prefix; then eval "$("$__PERSONAL_BREW_PREFIX/bin/brew" shellenv)"; fi
#
# homebrew's prefix moves: /opt/homebrew on apple silicon, /usr/local on intel,
# /home/linuxbrew/.linuxbrew on linux. Hardcoding one of them is why an intel
# mac used to get no brew at all.
#
# `brew --prefix` would answer this authoritatively but costs a fork on every
# shell, so this walks the known locations with the test builtin instead and
# leaves the answer in $__PERSONAL_BREW_PREFIX for the next caller.
__personal_brew_prefix() {
  if [ -n "$__PERSONAL_BREW_PREFIX" ] && [ -x "$__PERSONAL_BREW_PREFIX/bin/brew" ]
  then
    return 0
  fi

  local __personal_brew_candidate
  for __personal_brew_candidate in \
    "$HOMEBREW_PREFIX" \
    /opt/homebrew \
    /usr/local \
    /home/linuxbrew/.linuxbrew
  do
    if [ -n "$__personal_brew_candidate" ] && [ -x "$__personal_brew_candidate/bin/brew" ]
    then
      __PERSONAL_BREW_PREFIX="$__personal_brew_candidate"
      return 0
    fi
  done

  __PERSONAL_BREW_PREFIX=""
  return 1
}

# usage: __personal_warn "nvm is enabled but isn't installed"
#
# unlike __personal_debug this always prints, on stderr - it's for a flag that
# was deliberately turned on and then couldn't be honoured, which is worth
# knowing about even when $PERSONAL_SETUP_DEBUG is off
__personal_warn() {
  printf 'dotfiles: %s\n' "$*" >&2
  return 0
}
