# Path to your oh-my-zsh installation.
export ZSH="$HOME/.oh-my-zsh"

# Theme I want to uses
ZSH_THEME="amuse"

# Uncomment the following line to enable command auto-correction.
ENABLE_CORRECTION="true"

# Uncomment the following line to disable auto-setting terminal title.
DISABLE_AUTO_TITLE="true"

# Plugins I'm using
# Standard plugins can be found in ~/.oh-my-zsh/plugins/*
# Custom plugins may be added to ~/.oh-my-zsh/custom/plugins/
# Example format: plugins=(rails git textmate ruby lighthouse)
# Add wisely, as too many plugins slow down shell startup.
plugins=(
  git
  brew
  command-not-found
  emoji
  zsh-completions
)

autoload -U compinit && compinit

source $ZSH/oh-my-zsh.sh

# Update the title to... the current user?
function precmd () {
  window_title="\033]0;${PWD##*/}\007"
  echo -ne "$window_title"    
}

precmd

# User configuration

# You may need to manually set your language environment
export LANG=en_US.UTF-8

# export the ssh keys I use locally for git and other things
export SSH_KEY_PATH="~/.ssh/rsa_id"

# personal aliases
alias r="code-insiders -r" # open the passed path in the current VS Code Insiders window, replacing the current contents
alias a="code-insiders -a" # open the passed path in the current VS Code Insiders workspace
alias i="npx covgen hello@bnb.im && npx license mit > LICENSE && npx gitignore node" # init new project files that can't be init'd by an init command
alias idweb='kdestroy --all; kinit --keychain ticyren@NORTHAMERICA.CORP.MICROSOFT.COM; open http://idweb -a Safari.app' # Hack to make Microsoft's internal tool IDWeb work on macOS. This is a horrible hack. Also the alias included in it is not really confidential since you could figure it out pretty easily – I prefer not to use security through obscurity, especially if it makes my life easier not to do so.

# set up nvm
export NVM_DIR="$HOME/.nvm"
[ -s "/usr/local/opt/nvm/nvm.sh" ] && . "/usr/local/opt/nvm/nvm.sh"  # This loads nvm

# automatically initiate nvm's default Node.js version silently
nvm use default --silent

# Custom platform-specific / private stuff goes below here
