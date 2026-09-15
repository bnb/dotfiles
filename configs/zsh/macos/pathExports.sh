__personal_debug "exporting a lot of macOS paths"

# zsh keeps the $path array and $PATH in sync; -U makes it drop duplicates as
# they're added, so re-sourcing this file (or `brew shellenv` running after it)
# can't stack the same directory up over and over.
typeset -U path PATH

# Highest priority first.

__personal_path=(
  "$HOME/.local/bin"
  "$HOME/bin"
  "$PERSONAL_GITHUB_DIR/build-tools/src"
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
