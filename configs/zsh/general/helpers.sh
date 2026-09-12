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

# usage: __personal_warn "nvm is enabled but isn't installed"
#
# unlike __personal_debug this always prints, on stderr - it's for a flag that
# was deliberately turned on and then couldn't be honoured, which is worth
# knowing about even when $PERSONAL_SETUP_DEBUG is off
__personal_warn() {
  printf 'dotfiles: %s\n' "$*" >&2
  return 0
}
