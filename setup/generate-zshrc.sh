rm -rf ~/.zshrc

echo "# Environemnt Variables:
#
#  $PERSONAL_DOTFILES_PATH: path to my personal dotfiles repo
#  $PERSONAL_SETUP_LINUXBREW: if this is a machine you want to use linuxbrew on, set this to
#  $PERSONAL_SETUP_MACOS: if this is a macOS machine, set to `true`
#  $PERSONAL_SETUP_FNM: if you'd like to include the shell scripts that make fnm work, set to `true`
#  $PERSONAL_SETUP_NVM: if you'd like to include the shell scripts that make nvm work, set to `true`
#  $PERSONAL_SETUP_STARSHIP: if using starship.rs, set to `true`
#  $PERSONAL_SETUP_WORK: if this is a work machine, set to `true`
#  $PERSONAL_SETUP_ZSHPLUGINS: if you want to enable my personal plugin config, set to `true`

# export PERSONAL_DOTFILES_PATH="$HOME/GitHub/bnb/dotfiles"
# export PERSONAL_SETUP_LINUXBREW=true
# export PERSONAL_SETUP_MACOS=true
# export PERSONAL_SETUP_FNM=true
# export PERSONAL_SETUP_NVM=true
# export PERSONAL_SETUP_STARSHIP=true
# export PERSONAL_SETUP_WORK=true
# export PERSONAL_SETUP_ZSHPLUGINS=true

# source $PERSONAL_DOTFILES_PATH/configs/zsh/.zshrc
" >> ~/.zshrc