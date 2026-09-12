__personal_debug "exporting a lot of macOS paths"

# zsh keeps the $path array and $PATH in sync; -U makes it drop duplicates as
# they're added, so re-sourcing this file (or `brew shellenv` running after it)
# can't stack the same directory up over and over.
typeset -U path PATH

# Highest priority first.

__personal_path=(
  "$HOME/.local/bin"
  "$HOME/bin"
  "$HOME/GitHub/build-tools/src"
  /opt/homebrew/bin
  /opt/homebrew/sbin
  /opt/homebrew/opt/python/libexec/bin # unversioned `python`/`pip`; the old /usr/local path here was Intel-only and never existed on this machine
  /usr/local/bin
)

# (N-/) drops any of the above that isn't a real directory, so a dead entry
# can't sit in front of a live one
path=(${^__personal_path}(N-/) $path)
unset __personal_path
