# set up some dirs that I always want
mkdir ~/GitHub
mkdir ~/GitHub/bnb/

# update macos dependencies because they're sometimes out of date despite just having installed them

softwareupdate --all --install --force

# pull homebrew and set it up
mkdir homebrew && curl -L https://github.com/Homebrew/brew/tarball/master | tar xz --strip 1 -C homebrew

eval "$(homebrew/bin/brew shellenv)"
brew update --force --quiet
chmod -R go-w "$(brew --prefix)/share/zsh"

# install basics with homebrew

brew install git
brew install gh
brew install nvm
brew install fnm
brew install starship

# install fonts with homebrew

brew tap homebrew/cask-fonts
brew install --cask font-cascadia-code
brew install --cask font-cascadia-code-pl
brew install --cask font-cascadia-mono
brew install --cask font-cascadia-mono-pl

# install some apps we'll want

brew install 1password
brew install alfred
brew install docker
brew install discord
brew install spotify
brew install slack

# install the off-brand versions of apps we'll want

brew tap homebrew/cask-versions
brew install google-chrome-canary
brew install visual-studio-code-insiders

# install ohmyzsh
sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

# echo a basic config for the personal dotfiles to zshrc
echo "export PERSONAL_DOTFILES_PATH='~/GitHub/bnb/dotfiles'" >> ~/.zshrc
echo "export PERSONAL_SETUP_MACOS=true" >> ~/.zshrc
echo "export PERSONAL_SETUP_MACOSBREW=true" >> ~/.zshrc
echo "export PERSONAL_SETUP_NVM=true" >> ~/.zshrc
echo "export PERSONAL_SETUP_STARSHIP=true" >> ~/.zshrc

# clone my dotfiles repo and set it up
git clone https://github.com/bnb/dotfiles.git ~/GitHub/bnb/dotfiles
echo "source ~/GitHub/bnb/dotfiles/configs/zsh/.zshrc" > ~/.zshrc
