#!/usr/bin/env bash

# set up some dirs that I always want
# (-p: make parents, and don't fail when they already exist)
mkdir -p ~/GitHub/bnb

# disable DS_store file generation
defaults write com.apple.desktopservices DSDontWriteNetworkStores true

# update macos dependencies because they're sometimes out of date despite just having installed them
softwareupdate --all --install --force

# pull homebrew and set it up
# install homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
# use homebrew for the rest of this script
eval "$(/opt/homebrew/bin/brew shellenv)"

# install basics with homebrew
brew install git
brew install gh
brew install nvm
brew install fnm
brew install asdf
brew install starship
brew install python3

# install fonts with homebrew
# (no `brew tap homebrew/cask-fonts` - that tap was archived and folded into
# homebrew/cask, so tapping it now just errors)
brew install font-cascadia-code
brew install font-cascadia-code-pl
brew install font-cascadia-mono
brew install font-cascadia-mono-pl

# install some apps we'll want
brew install 1password
brew install alfred
brew install arc
brew install appcleaner
brew install docker
brew install discord
brew install spotify
brew install slack
brew install zoom

# install the off-brand versions of apps we'll want
# (homebrew/cask-versions was archived and folded into homebrew/cask too - if
# either of these two 404s now, check for an @-suffixed name)
brew install google-chrome-canary
brew install visual-studio-code-insiders
brew install karabiner-elements

# echo a basic config for the personal dotfiles to zshrc
#
# "$HOME/..." and not '~/...': in single quotes the tilde is never expanded,
# which leaves a literal `~` in the variable and breaks every path built from it
{
  echo "export PERSONAL_DOTFILES_PATH=\"$HOME/GitHub/bnb/dotfiles\""
  echo "export PERSONAL_SETUP_MACOS=true"
  echo "export PERSONAL_SETUP_MACOSBREW=true"
  echo "export PERSONAL_SETUP_ASDF=true"
  echo "export PERSONAL_SETUP_STARSHIP=true"
} > ~/.zshrc

# clone my dotfiles repo and set it up
git clone https://github.com/bnb/dotfiles.git ~/GitHub/bnb/dotfiles
echo "source ~/GitHub/bnb/dotfiles/configs/zsh/.zshrc" >> ~/.zshrc

# set `main` to be default git branch
# (this was missing the value, so it *read* the setting instead of writing it)
git config --global init.defaultBranch main

# symlink dotfiles .gitconfig
rm -f ~/.gitconfig
ln -s ~/GitHub/bnb/dotfiles/.gitconfig ~/.gitconfig
