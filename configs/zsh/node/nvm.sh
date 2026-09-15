__personal_debug "exporting NVM_DIR and sourcing nvm"

# nvm lives in one of two places depending on how it got installed:
#
#   - the upstream install script puts it in $NVM_DIR (~/.nvm by default)
#   - homebrew puts it under $HOMEBREW_PREFIX/opt/nvm and leaves $NVM_DIR to you
#
# this file only ever checked the homebrew location, so any machine set up with
# the upstream installer - the way nvm.sh's own README tells you to - ended up
# with a shell that had silently loaded no version manager at all.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

__personal_nvm_home=""

if [ -s "$NVM_DIR/nvm.sh" ]
then
  # the upstream installer made $NVM_DIR itself, so there's nothing to create
  __personal_nvm_home="$NVM_DIR"
elif __personal_brew_prefix && [ -s "$__PERSONAL_BREW_PREFIX/opt/nvm/nvm.sh" ]
then
  __personal_nvm_home="$__PERSONAL_BREW_PREFIX/opt/nvm"

  # homebrew's nvm won't run without this directory and doesn't make it itself.
  # Scoped to this branch on purpose: merely sourcing these configs shouldn't
  # leave a stray ~/.nvm behind on a machine that has no nvm at all.
  [ -d "$NVM_DIR" ] || mkdir -p "$NVM_DIR"
fi

if [ -n "$__personal_nvm_home" ]
then
  \. "$__personal_nvm_home/nvm.sh" # This loads nvm

  # completions, if this install ships them (nvm's bash_completion is written
  # to work under zsh too - its README tells zsh users to source it)
  for __personal_nvm_completion in \
    "$__personal_nvm_home/bash_completion" \
    "$__personal_nvm_home/etc/bash_completion.d/nvm"
  do
    if [ -s "$__personal_nvm_completion" ]
    then
      \. "$__personal_nvm_completion"
      break
    fi
  done
  unset __personal_nvm_completion
else
  __personal_warn "\$PERSONAL_SETUP_NVM is on but nvm isn't installed - looked in $NVM_DIR${__PERSONAL_BREW_PREFIX:+ and $__PERSONAL_BREW_PREFIX/opt/nvm}"
fi

unset __personal_nvm_home
