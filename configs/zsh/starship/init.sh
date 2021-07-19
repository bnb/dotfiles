# setup starship

if [ -n "$PERSONAL_SETUP_DEBUG" ]
then
  echo "eval'ing starship init zsh"
fi

eval "$(starship init zsh)"

if [ -n "$PERSONAL_SETUP_DEBUG" ]
then
  echo "exporting starship config env var"
fi

export STARSHIP_CONFIG=$pathToGitHubDirectory/bnb/dotfiles/configs/zsh/starship/starship.toml