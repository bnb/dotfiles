__personal_debug "exporting a lot of macOS paths"

# Highest priority first. .zshrc makes $path drop duplicates, keeping the first,
# and runs `brew shellenv` before this, so the brew entries below move back into
# their place in this list instead of sitting in front of ~/.local/bin.

__personal_path=(
  "$HOME/.local/bin"
  "$HOME/bin"
  "$PERSONAL_GITHUB_DIR/build-tools/src"
  # rust/cargo.sh and pnpm/pnpm.sh, sourced just before this, put these on
  # $PATH; listing them here moves them behind the three above and ahead of
  # brew. A pnpm bin that doesn't exist yet stays where pnpm.sh put it.
  "${CARGO_HOME:-$HOME/.cargo}/bin"
  ${PNPM_HOME:+"$PNPM_HOME/bin"}
)

# brew's prefix differs between apple silicon and intel, so ask rather than
# hardcode - the /opt/homebrew paths that used to be here were dead weight on
# an intel mac
if __personal_brew_prefix
then
  __personal_path+=(
    "$__PERSONAL_BREW_PREFIX/bin"
    "$__PERSONAL_BREW_PREFIX/sbin"
    "$__PERSONAL_BREW_PREFIX/opt/python/libexec/bin" # unversioned `python`/`pip`
  )
fi

__personal_path+=(/usr/local/bin)

# (N-/) drops any of the above that isn't a real directory, so a dead entry
# can't sit in front of a live one
path=(${^__personal_path}(N-/) $path)
unset __personal_path
