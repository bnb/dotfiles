# Shared helpers for the rest of this repo's configs.
#
# Every $PERSONAL_SETUP_* flag is documented as "set to `true`", so check the
# *value* rather than just whether the variable exists. Otherwise
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

# __PERSONAL_BREW_PREFIXES, shared with setup.sh
source "$PERSONAL_ZSH_DIR/homebrew/prefixes.sh"

# usage: if __personal_brew_prefix; then __personal_brew_shellenv; fi
#
# homebrew's prefix moves between apple silicon, intel and linux, and
# hardcoding one of them is why an intel mac used to get no brew at all.
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
  for __personal_brew_candidate in "$HOMEBREW_PREFIX" "${__PERSONAL_BREW_PREFIXES[@]}"
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

# usage: if __personal_brew_prefix; then __personal_brew_shellenv; fi
#
# what `eval "$(brew shellenv)"` does, without running brew: that cost ~20ms on
# every shell, plus a `ps` for brew to work out which shell it was talking to.
# Mirrors the zsh branch of brew's Library/Homebrew/cmd/shellenv.sh, including
# doing nothing when $PATH already starts with brew's bin and sbin. Caching
# brew's output instead isn't safe for exactly that reason: what it prints
# depends on the $PATH it was run from.
__personal_brew_shellenv() {
  if [[ "$PATH:" == "$__PERSONAL_BREW_PREFIX/bin:$__PERSONAL_BREW_PREFIX/sbin:"* ]]
  then
    return 0
  fi

  export HOMEBREW_PREFIX="$__PERSONAL_BREW_PREFIX"
  export HOMEBREW_CELLAR="$HOMEBREW_PREFIX/Cellar"
  # the checkout bin/brew lives in. On intel /usr/local/bin/brew is a symlink
  # into /usr/local/Homebrew, which :A follows
  export HOMEBREW_REPOSITORY="${${:-$HOMEBREW_PREFIX/bin/brew}:A:h:h}"
  fpath[1,0]="$HOMEBREW_PREFIX/share/zsh/site-functions"
  export FPATH
  export PATH="$HOMEBREW_PREFIX/bin:$HOMEBREW_PREFIX/sbin${PATH+:$PATH}"
  [ -z "${MANPATH-}" ] || { export MANPATH="${MANPATH%"${MANPATH##*[!:]}"}"; export MANPATH=":${MANPATH#"${MANPATH%%[!:]*}"}"; }
  export INFOPATH="$HOMEBREW_PREFIX/share/info:${INFOPATH:-}"
}

# usage: if __personal_cache <name> <file>... -- <command>...; then source "$REPLY"; fi
#
# For tools that hand over their shell setup as a script to eval or source:
# running them costs a fork (often several) on every shell. This keeps the
# script in ~/.cache/dotfiles/<name>.zsh and only re-runs <command> when one of
# the <file>s - the tool's binary, usually, plus any config the output bakes in
# - changes path or mtime. A brew upgrade lands in a new versioned Cellar
# directory, which :A sees through the bin/ symlink.
#
# The key is the cache's first line, so checking it costs a `read` and a
# `zstat`, both builtins. Equality rather than -nt because brew bottles keep
# their build-time mtimes, which can predate a cache made from the last version.
#
# Leaves the cache's path in $REPLY for the caller to source - sourcing it in
# here would make any `typeset` in the script local to this function. Returns
# 1, after a warning, if <command> fails.
__personal_cache() {
  local __personal_cache_name="$1" __personal_cache_key="#" __personal_cache_line="" __personal_cache_file
  local -a __personal_cache_mtime
  shift

  zmodload -F zsh/stat b:zstat 2> /dev/null
  while (( $# )) && [ "$1" != "--" ]
  do
    __personal_cache_file="$1"
    __personal_cache_mtime=()
    zstat -A __personal_cache_mtime +mtime -- "${__personal_cache_file:A}" 2> /dev/null
    __personal_cache_key+=" $__personal_cache_file:${__personal_cache_file:A}:${__personal_cache_mtime[1]}"
    shift
  done
  shift # the --

  REPLY="${XDG_CACHE_HOME:-$HOME/.cache}/dotfiles/$__personal_cache_name.zsh"

  if [ -s "$REPLY" ]
  then
    IFS= read -r __personal_cache_line < "$REPLY"
  fi

  if [ "$__personal_cache_line" = "$__personal_cache_key" ]
  then
    return 0
  fi

  __personal_debug "regenerating $REPLY"
  mkdir -p "${REPLY:h}"
  # into a temp file first, so a failed run doesn't leave a half-written cache
  if { print -r -- "$__personal_cache_key"; "$@" } > "$REPLY.tmp" 2> /dev/null
  then
    mv "$REPLY.tmp" "$REPLY"
  else
    rm -f "$REPLY.tmp"
    __personal_warn "\`$*\` failed - no $__personal_cache_name this shell"
    return 1
  fi
}
