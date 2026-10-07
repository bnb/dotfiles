# set up clauth completions

# `clauth completions install` writes its zsh completion to this path and
# appends a line to ~/.zshrc that sources it. That line lives here instead, so
# ~/.zshrc stays the stub setup.sh writes.
#
# No flag: it does nothing if clauth hasn't written the file.
__personal_clauth_completions="$HOME/.clauth/completions/clauth.zsh"

if [ ! -f "$__personal_clauth_completions" ]
then
  __personal_debug "skipping clauth completions: $__personal_clauth_completions doesn't exist"
  unset __personal_clauth_completions
  return 0
fi

# Sourcing the file only defines _clauth. Its `#compdef clauth` tag is read by
# compinit, and only from files on $fpath named `_*` - which clauth.zsh isn't -
# so it has to be registered by hand.
__personal_debug "sourcing clauth completions"
source "$__personal_clauth_completions"
compdef _clauth clauth
unset __personal_clauth_completions
