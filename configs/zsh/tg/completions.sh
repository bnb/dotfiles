# set up tg completions

# tg (the Tangled CLI) prints its own zsh completion script, but the brew
# formula doesn't install it anywhere. Running `tg completion zsh` on every
# shell would add a fork to startup, so it's generated into a cache file once
# and only regenerated when tg itself changes - an upgrade.
#
# No flag: it does nothing if tg isn't installed.
if (( ! $+commands[tg] ))
then
  __personal_debug "skipping tg completions: tg isn't installed"
  return 0
fi

# __personal_cache only re-runs `tg completion zsh` when the tg binary changes.
if __personal_cache tg-completion "$commands[tg]" -- tg completion zsh
then
  __personal_debug "sourcing tg completions"
  source "$REPLY"
fi
