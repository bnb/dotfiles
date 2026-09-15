# zsh

this is the bulk of the repo: a `.zshrc` that sources a pile of small, single-purpose files, each one gated behind an environment variable so the same config works on my mac, on a linux box, and inside WSL without any of them tripping over each other.

`setup.sh` at the root of this repo wires all of this up for you. Everything below is for when you want to know what it actually did, or you're setting a machine up by hand.

## Setup

In your **real** `~/.zshrc`, source the one in here:

```sh
source ~/GitHub/bnb/dotfiles/configs/zsh/.zshrc
```

That's the only line that's strictly required. The flags below go above it, because `.zshrc` reads them as it's being sourced — set one after the `source` line and nothing will have looked at it.

## Environment Variables

I use environment variables to turn platform-specific bits on and off. Set them in the `~/.zshrc` that imports this one, so there's zero ambiguity about where a flag came from:

```sh
export PERSONAL_SETUP_MACOS=true
```

### paths

- `PERSONAL_DOTFILES_PATH`
  - Path to this cloned repo. **optional** — `.zshrc` works out where it lives from the file being sourced (`${0:A:h}`) and only uses this variable as an override. It's still exported afterwards, because aliases like `update:dotfiles` use it.
  - If you do set it, use **double** quotes: `"$HOME/GitHub/bnb/dotfiles"`. Writing `'~/GitHub/bnb/dotfiles'` in single quotes leaves a literal `~` that never expands, and every path built from it quietly breaks. `.zshrc` now repairs a leading `~/` for you, but don't rely on that — the same trap applies to anything else you set.
- `PERSONAL_GITHUB_DIR` / `PERSONAL_TANGLED_DIR`
  - The two trees `setup.sh` guarantees on every machine, default `~/GitHub` and `~/tangled`. Also optional: [variables.sh](./general/variables.sh) exports them with those defaults, and honours a value set before it's sourced if a machine keeps its checkouts somewhere else. They're exported so scripts and child processes can rely on them instead of each rebuilding `"$HOME/GitHub"` by hand.

### flags

- `PERSONAL_SETUP_MACOS`
  - if this is a macOS machine, set to `true` — adds the macOS `$PATH` entries
- `PERSONAL_SETUP_MACOSBREW`
  - if this is a macOS machine you want homebrew on, set to `true`
- `PERSONAL_SETUP_LINUXBREW`
  - if this is a linux/WSL machine you want linuxbrew on, set to `true`
- `PERSONAL_SETUP_NVM`
  - if you'd like to include the shell scripts that make nvm work, set to `true`
- `PERSONAL_SETUP_FNM`
  - if you'd like to include the shell scripts that make fnm work, set to `true`
- `PERSONAL_SETUP_ASDF`
  - if you'd like to include the shell scripts that make asdf work, set to `true`
- `PERSONAL_SETUP_STARSHIP`
  - if using starship.rs, set to `true`
- `PERSONAL_SETUP_ZSHPLUGINS`
  - if you want my personal plugin config, set to `true`. it's skipped with a debug note if `configs/zsh/plugins/init.sh` isn't there, which right now it isn't.
- `PERSONAL_SETUP_WORK`
  - if this is a work machine, set to `true`. the work aliases only load when `PERSONAL_SETUP_MACOS` is also true.
- `PERSONAL_SETUP_DEBUG`
  - to print what's being set up as it happens, set to `true`. first thing to reach for when a shell isn't doing what you expect.

### how the flags are read

they're booleans, but "unset" and "false" are not the same thing as "not `true`" unless you check for it — so `__personal_enabled` in [general/helpers.sh](./general/helpers.sh) checks the **value**, not just whether the variable exists:

- these turn a flag **on**: `true` `TRUE` `True` `1` `yes` `YES` `Yes` `on` `ON` `On`
- everything else turns it **off**, including `false`, `0`, an empty value, and not setting it at all

that last part matters: an `export PERSONAL_SETUP_NVM=false` sitting in a `~/.zshrc` used to enable nvm, because the old check was "is this variable set?".

### only one node version manager loads

nvm, fnm and asdf all want to own `$PATH`, so `.zshrc` only ever loads one of them, even if you've set several to `true`. the precedence is:

**nvm > fnm > asdf**

the ones that lost are ignored silently unless `PERSONAL_SETUP_DEBUG` is on, in which case you get a line telling you which one won and which got dropped.

if the winner is enabled but isn't actually installed, you get a warning on stderr — that one always prints, debug or not, because a flag you deliberately turned on and that couldn't be honoured is worth hearing about.

## What's in here

- [.zshrc](./.zshrc): the entry point. self-locates, sources `general/`, then everything else behind its flag.
- `general/`: always loaded.
  - [helpers.sh](./general/helpers.sh): `__personal_enabled`, `__personal_debug`, `__personal_warn`, and `__personal_brew_prefix` — which finds brew across `/opt/homebrew`, `/usr/local` and `/home/linuxbrew/.linuxbrew` and caches the answer, so nothing in here hardcodes a prefix. sourced first, because everything below uses them.
  - [aliases.sh](./general/aliases.sh): my aliases, plus `c` — converts every wav/aif/aiff/flac under the current directory into `./mp3` at 320k.
  - [correction.sh](./general/correction.sh): turns zsh's "did you mean" autocorrect off.
  - [language.sh](./general/language.sh): `LANG`.
  - [sshKeyPath.sh](./general/sshKeyPath.sh): `SSH_KEY_PATH`, pointed at the first private key that's actually on the machine rather than an ed25519 path that might not exist.
  - [variables.sh](./general/variables.sh): `PERSONAL_GITHUB_DIR` and
    `PERSONAL_TANGLED_DIR`.
  - [config-git.sh](./general/config-git.sh), [config-jj.sh](./general/config-jj.sh), [config-npm.sh](./general/config-npm.sh): not sourced at startup — they're run on demand by the `config:git` / `config:jj` / `config:npm` aliases to stamp my name and email onto a machine.
- `homebrew/`: [macos.sh](./homebrew/macos.sh) and [linux.sh](./homebrew/linux.sh) — `brew shellenv`, skipped with a debug note if brew isn't installed.
- `macos/`: [pathExports.sh](./macos/pathExports.sh) — the macOS `$PATH`. `typeset -U` so re-sourcing can't stack duplicates, and directories that don't exist get dropped rather than sitting in front of ones that do.
- `node/`: [nvm.sh](./node/nvm.sh), [fnm.sh](./node/fnm.sh), [asdf.sh](./node/asdf.sh) — one of these, per the precedence above.
- `starship/`: [init.sh](./starship/init.sh) and [starship.toml](./starship/starship.toml) — the prompt, and its config.
- `work/`: [aliases.sh](./work/aliases.sh) — work-machine-only aliases, loaded only when `PERSONAL_SETUP_WORK` and `PERSONAL_SETUP_MACOS` are both on, and skipped with a debug note if the file isn't there. it's where employer-specific stuff goes so it never ends up in the general aliases. the file is public, so nothing secret lives in it.

## Debugging

```sh
PERSONAL_SETUP_DEBUG=true zsh -i -c exit
```

prints every step as it happens, which is usually enough to spot the flag that isn't set, or the tool that isn't installed.
