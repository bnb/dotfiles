# dotfiles

this is a simple home for my dotfiles. Zero automation in it, just the source for each dotfile respectively and an `install.md` file that surfaces the tools needed for the envirionment to be set up successfully.

## curl pipe bash (Installation)

**macOS**:
```sh
curl https://github.com/bnb/dotfiles/blob/main/setup/macos.sh | bash
```

## Contents

  * [./configs/zsh](./configs/zsh): the majority of the configuration files in this repo, focused on setting up my zsh environment. There's a pretty good [README.md](./configs/zsh/README.md) in that redirectory that gives a lot more context.
  * [.gitconfig](./.gitconfig): my basic .gitconfig.
  * [.npmrc](./.npmrc): my basic .npmrc.
  * [install.md](./install.md): a list of things that should probably be installed.

## Example `.zshrc`

Just a central place to document the frontmatter comment I like to put in every computer's `.zshrc` after this repo has been cloned. This is duplicated in [Setup 3](./setup/generate-zshrc.sh)
  
```sh
# Environemnt Variables:
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
```