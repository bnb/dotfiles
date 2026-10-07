__personal_debug "eval'ing fnm env"

# set up fnm
if command -v fnm > /dev/null
then
  # fnm normally works out which shell it's in by walking the process tree,
  # but that fails ("Can't infer shell!") when the shell was started by an
  # app or launcher rather than a terminal. It's always zsh - like its
  # neighbours, this file is only ever sourced from .zshrc - so say so.
  eval "$(fnm env --shell zsh)"
else
  __personal_warn "\$PERSONAL_SETUP_FNM is on but fnm isn't installed"
fi
