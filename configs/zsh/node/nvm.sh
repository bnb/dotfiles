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

if [ -s "$NVM_DIR/nvm.sh" ]
then
  __personal_nvm_home="$NVM_DIR"
elif [ -s "${HOMEBREW_PREFIX:-/opt/homebrew}/opt/nvm/nvm.sh" ]
then
  __personal_nvm_home="${HOMEBREW_PREFIX:-/opt/homebrew}/opt/nvm"
else
  __personal_nvm_home=""
fi

if [ -n "$__personal_nvm_home" ]
then
  # homebrew's nvm won't run without this directory and doesn't make it itself
  [ -d "$NVM_DIR" ] || mkdir -p "$NVM_DIR"

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
  __personal_warn "\$PERSONAL_SETUP_NVM is on but nvm isn't installed - looked in $NVM_DIR and ${HOMEBREW_PREFIX:-/opt/homebrew}/opt/nvm"
fi

unset __personal_nvm_home
