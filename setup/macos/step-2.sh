# set up some dirs that I always want
mkdir ~/GitHub
mkdir ~/GitHub/bnb/

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
brew install starship
brew install python3

# install fonts with homebrew
brew tap homebrew/cask-fonts
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
brew tap homebrew/cask-versions
brew install google-chrome-canary
brew install visual-studio-code-insiders
brew install appcleaner
brew install karabiner-elements

# install ohmyzsh
sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

# echo a basic config for the personal dotfiles to zshrc
echo "export PERSONAL_DOTFILES_PATH='~/GitHub/bnb/dotfiles'" > ~/.zshrc
echo "export PERSONAL_SETUP_MACOS=true" >> ~/.zshrc
echo "export PERSONAL_SETUP_MACOSBREW=true" >> ~/.zshrc
echo "export PERSONAL_SETUP_FNM=true" >> ~/.zshrc
echo "export PERSONAL_SETUP_STARSHIP=true" >> ~/.zshrc

# clone my dotfiles repo and set it up
git clone https://github.com/bnb/dotfiles.git ~/GitHub/bnb/dotfiles
echo "source ~/GitHub/bnb/dotfiles/configs/zsh/.zshrc" >> ~/.zshrc

# set `main` to be default git branch
git config --global init.defaultBranch

# symlink dotfiles .gitconfig
rm ~/.gitconfig
ln -s ~/GitHub/bnb/dotfiles/.gitconfig ~/.gitconfig