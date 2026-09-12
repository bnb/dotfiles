# setup starship

if ! command -v starship > /dev/null
then
  __personal_debug "skipping starship: it isn't installed"
  return 0
fi

__personal_debug "exporting starship config env var"
export STARSHIP_CONFIG="$PERSONAL_ZSH_DIR/starship/starship.toml"

__personal_debug "eval'ing starship init zsh"
eval "$(starship init zsh)"
