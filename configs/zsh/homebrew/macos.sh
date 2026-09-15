__personal_debug "running the homebrew macos setup commands"

if __personal_brew_prefix
then
  __personal_debug "found brew at $__PERSONAL_BREW_PREFIX"
  eval "$("$__PERSONAL_BREW_PREFIX/bin/brew" shellenv)"
else
  __personal_debug "skipping homebrew: no brew in \$HOMEBREW_PREFIX, /opt/homebrew, or /usr/local"
fi
