# variables - edit these for your system if things don't work as they should
user="cyren" # the username of your account that's used in paths
pathToGitHubDirectory="$HOME/GitHub" # path to the GitHub directory

# Custom platform-specific / private stuff goes below here
export PATH="/Users/$user/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/share/dotnet:~/.dotnet/tools:/Users/$user/GitHub/build-tools/src"

# Path to your oh-my-zsh installation.
export ZSH="/Users/$user/.oh-my-zsh"

# Theme I want to use
ZSH_THEME="amuse"

# Uncomment the following line to enable command auto-correction.
ENABLE_CORRECTION="false"

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
alias i="npx covgen hello@bnb.im && npx license mit && npx gitignore node &&  echo \"package-lock=false\" > .npmrc" # init new project files that can't be init'd by an init command
alias pub=`npm publish --otp=`
alias idweb='kdestroy --all; kinit --keychain ticyren@NORTHAMERICA.CORP.MICROSOFT.COM; open http://idweb -a Safari.app' # Hack to make Microsoft's internal tool IDWeb work on macOS. This is a horrible hack. Also the alias included in it is not really confidential since you could figure it out pretty easily – I prefer not to use security through obscurity, especially if it makes my life easier not to do so.
alias log=`git log --color --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit`

# set up nvm
export NVM_DIR="$HOME/.nvm"
[ -s "/usr/local/opt/nvm/nvm.sh" ] && . "/usr/local/opt/nvm/nvm.sh"  # This loads nvm


# set up gh command
repo () {
	local repo=$1
	local target="$pathToGitHubDirectory/$1"
	local url="git@github.com:$repo.git"
	if [[ ! -d "$target" ]]
	then
		git clone "$url" "$target"
	fi
	cd "$target"
}

# place this after nvm initialization!
autoload -U add-zsh-hook
load-nvmrc() {
  local node_version="$(nvm version)"
  local nvmrc_path="$(nvm_find_nvmrc)"

  if [ -n "$nvmrc_path" ]; then
    local nvmrc_node_version=$(nvm version "$(cat "${nvmrc_path}")")

    if [ "$nvmrc_node_version" = "N/A" ]; then
      nvm install
    elif [ "$nvmrc_node_version" != "$node_version" ]; then
      nvm use
    fi
  elif [ "$node_version" != "$(nvm version default)" ]; then
    echo "Reverting to nvm default version"
    nvm use default
  fi
}
add-zsh-hook chpwd load-nvmrc
load-nvmrc
