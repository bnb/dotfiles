# setup starship

__personal_debug "eval'ing starship init zsh"

eval "$(starship init zsh)"

__personal_debug "exporting starship config env var"

export STARSHIP_CONFIG=$pathToGitHubDirectory/bnb/dotfiles/configs/zsh/starship/starship.toml
