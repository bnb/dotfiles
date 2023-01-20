sudo apt update -y
sudo apt upgrade -y
sudo apt install build-essential -y
sudo apt install zsh -y

# pull homebrew and set it up
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

eval "$(homebrew/bin/brew shellenv)"
brew update --force --quiet
chmod -R go-w "$(brew --prefix)/share/zsh"

# install a bunch of developer tools I need
brew install gh
brew install nvm
brew install fnm
brew install starship

# setup our dotfiles config
echo "export PERSONAL_DOTFILES_PATH='$HOME/GitHub/bnb/dotfiles'" > ~/.zshrc
echo "export PERSONAL_SETUP_LINUXBREW=true" > ~/.zshrc
echo "export PERSONAL_SETUP_FNM=true" > ~/.zshrc
echo "export PERSONAL_SETUP_STARSHIP=true" > ~/.zshrc
echo "export PERSONAL_SETUP_ZSHPLUGINS=true" > ~/.zshrc

echo "source $PERSONAL_DOTFILES_PATH/configs/zsh/.zshrc" > ~/.zshrc

chsh -s /bin/zsh
