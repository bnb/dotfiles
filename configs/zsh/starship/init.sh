# setup starship

if (( ! $+commands[starship] ))
then
  __personal_debug "skipping starship: it isn't installed"
  return 0
fi

__personal_debug "exporting starship config env var"
export STARSHIP_CONFIG="$PERSONAL_ZSH_DIR/starship/starship.toml"

# `eval "$(starship init zsh)"` is three forks of starship on every shell: init
# prints `source <(starship init zsh --print-full-init)`, and the full init
# sets PROMPT2 from `starship prompt --continuation`. This caches the full init
# with PROMPT2's value baked in, so a shell runs none of them. It's regenerated
# when starship or its config changes, the config because of PROMPT2.
__personal_starship_init() {
  local __personal_starship_full __personal_starship_line
  __personal_starship_full="$(starship init zsh --print-full-init)" || return 1

  for __personal_starship_line in "${(@f)__personal_starship_full}"
  do
    [[ "$__personal_starship_line" == PROMPT2=* ]] || print -r -- "$__personal_starship_line"
  done

  print -r -- "PROMPT2=${(qqqq)$(starship prompt --continuation)}"
}

if __personal_cache starship-init "$commands[starship]" "$STARSHIP_CONFIG" -- __personal_starship_init
then
  __personal_debug "sourcing starship init"
  source "$REPLY"
fi

unfunction __personal_starship_init
