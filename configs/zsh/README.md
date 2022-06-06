# Setup

To consume the `.zshrc` file here, in your **default** `.zshrc` include the following:

```shell
source ~/<path to dotfiles>/zsh/.zshrc
```

For how I set things up, this'll usually be:

```shell
source ~/GitHub/bnb/dotfiles/configs/zsh/.zshrc
```

## Environment Variables

I use environment variables to enable/disable platform-specific features. The list of these variables is below.

They're all booleans, so do the following to set them up. I personally set them up in the `.zshrc` that impoorts the `.zshrc` from this file so there's zero ambiguity and easy debugging.

```shell
export VARIABLE_NAME = true
```

- `PERSONAL_DOTFILES_PATH`
  - the path to the cloned dotfiles repository
- `PERSONAL_SETUP_MACOS`
  - if this is a macOS machine, set to `true`
- `PERSONAL_SETUP_MACOSBREW`
  - if this is a macOS machine, set to `true`
- `PERSONAL_SETUP_LINUXBREW`
  - if this is a Linux machine, set to `true`
- `PERSONAL_SETUP_NVM`
  - if you'd like to include the shell scripts that make nvm work, set to `true`
- `PERSONAL_SETUP_STARSHIP`
  - if using starship.rs, set to `true`
- `PERSONAL_SETUP_WORK`
  - if this is a work machine, set to `true`
- `PERSONAL_SETUP_ZSHPLUGINS`
  - if you want to enable my personal plugin config, set to `true`
