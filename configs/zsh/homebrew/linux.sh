__personal_debug "running the linuxbrew setup command"

# /home/linuxbrew/.linuxbrew is only linuxbrew's default - an unprivileged
# install lands elsewhere, so resolve it rather than assuming. Set
# $HOMEBREW_PREFIX before sourcing if brew lives somewhere unusual.
if __personal_brew_prefix
then
  __personal_debug "found brew at $__PERSONAL_BREW_PREFIX"
  eval "$("$__PERSONAL_BREW_PREFIX/bin/brew" shellenv)"
else
  __personal_debug "skipping linuxbrew: no brew in \$HOMEBREW_PREFIX or /home/linuxbrew/.linuxbrew"
fi
