# Plugins I'm using
# Standard plugins can be found in ~/.oh-my-zsh/plugins/*
# Custom plugins may be added to ~/.oh-my-zsh/custom/plugins/
# Example format: plugins=(rails git textmate ruby lighthouse)
# Add wisely, as too many plugins slow down shell startup.

if [ -n "$PERSONAL_SETUP_DEBUG" ]
then
  echo "defining zsh plugins"
fi

plugins=(
  git
  emoji
  zsh-autosuggestions
  zsh-syntax-highlighting
)