#!/usr/bin/env bash
sudo apt update -y
sudo apt upgrade -y
sudo apt install build-essential -y
sudo apt install git -y
sudo apt install zsh -y

# pull homebrew and set it up
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
brew update --force --quiet
chmod -R go-w "$(brew --prefix)/share/zsh"

# install a bunch of developer tools I need
brew install gh
brew install nvm
brew install fnm
brew install asdf
brew install starship

# clone my dotfiles repo
git clone https://github.com/bnb/dotfiles.git ~/GitHub/bnb/dotfiles

# setup our dotfiles config

{
  echo "export PERSONAL_DOTFILES_PATH=\"$HOME/GitHub/bnb/dotfiles\""
  echo "export PERSONAL_SETUP_LINUXBREW=true"
  echo "export PERSONAL_SETUP_FNM=true"
  echo "export PERSONAL_SETUP_STARSHIP=true"
  echo "export PERSONAL_SETUP_ZSHPLUGINS=true"
  echo "source \"\$PERSONAL_DOTFILES_PATH/configs/zsh/.zshrc\""
} > ~/.zshrc

chsh -s /bin/zsh
