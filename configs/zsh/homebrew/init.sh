__personal_debug "running the homebrew setup commands"

# Set $HOMEBREW_PREFIX before sourcing if brew lives somewhere unusual.
if __personal_brew_prefix
then
  __personal_debug "found brew at $__PERSONAL_BREW_PREFIX"
  __personal_brew_shellenv
else
  __personal_debug "skipping homebrew: no brew in \$HOMEBREW_PREFIX or ${(j:, :)__PERSONAL_BREW_PREFIXES}"
fi
