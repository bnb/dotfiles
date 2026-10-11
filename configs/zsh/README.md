# zsh

this is the bulk of the repo: a `.zshrc` that sources a pile of small, single-purpose files, each one gated behind an environment variable so the same config works on my mac, on a linux box, and inside WSL without any of them tripping over each other.

`setup.sh` at the root of this repo wires all of this up for you. Everything below is for when you want to know what it actually did, or you're setting a machine up by hand.

## Setup

In your **real** `~/.zshrc`, source the one in here:

```sh
source ~/GitHub/bnb/dotfiles/configs/zsh/.zshrc
```

That's the only line that's strictly required. The flags below go above it, because `.zshrc` reads them as it's being sourced. Set one after the `source` line and nothing will have looked at it.

## Environment Variables

I use environment variables to turn platform-specific bits on and off. Set them in the `~/.zshrc` that imports this one, so there's zero ambiguity about where a flag came from:

```sh
export PERSONAL_SETUP_MACOS=true
```

### paths

- `PERSONAL_DOTFILES_PATH`
  - Path to this cloned repo. **optional**: `.zshrc` works out where it lives from the file being sourced (`${0:A:h}`) and only uses this variable as an override. It's still exported afterwards, because aliases like `update:dotfiles` use it.
  - If you do set it, use **double** quotes: `"$HOME/GitHub/bnb/dotfiles"`. Writing `'~/GitHub/bnb/dotfiles'` in single quotes leaves a literal `~` that never expands, and every path built from it quietly breaks. `.zshrc` now repairs a leading `~/` for you, but don't rely on that: the same trap applies to anything else you set.
- `PERSONAL_GITHUB_DIR` / `PERSONAL_TANGLED_DIR`
  - The two trees `setup.sh` guarantees on every machine, default `~/GitHub` and `~/tangled`. Also optional: [variables.sh](./general/variables.sh) exports them with those defaults, and honours a value set before it's sourced if a machine keeps its checkouts somewhere else. They're exported so scripts and child processes can rely on them instead of each rebuilding `"$HOME/GitHub"` by hand.

### flags

- `PERSONAL_SETUP_MACOS`
  - if this is a macOS machine, set to `true`. it adds the macOS `$PATH` entries
- `PERSONAL_SETUP_MACOSBREW` / `PERSONAL_SETUP_LINUXBREW`
  - if you want homebrew on this machine, set either one to `true`. they do the same thing; `setup.sh` writes the one named for the platform
- `PERSONAL_SETUP_NVM`
  - if you'd like to include the shell scripts that make nvm work, set to `true`
- `PERSONAL_SETUP_FNM`
  - if you'd like to include the shell scripts that make fnm work, set to `true`
- `PERSONAL_SETUP_ASDF`
  - if you'd like to include the shell scripts that make asdf work, set to `true`
- `PERSONAL_SETUP_STARSHIP`
  - if using starship.rs, set to `true`
- `PERSONAL_SETUP_DEBUG`
  - to print what's being set up as it happens, set to `true`. first thing to reach for when a shell isn't doing what you expect.

### how the flags are read

they're booleans, but "unset" and "false" are not the same thing as "not `true`" unless you check for it, so `__personal_enabled` in [general/helpers.sh](./general/helpers.sh) checks the **value**, not just whether the variable exists:

- these turn a flag **on**: `true` `TRUE` `True` `1` `yes` `YES` `Yes` `on` `ON` `On`
- everything else turns it **off**, including `false`, `0`, an empty value, and not setting it at all

that last part matters: an `export PERSONAL_SETUP_NVM=false` sitting in a `~/.zshrc` used to enable nvm, because the old check was "is this variable set?".

### only one node version manager loads

nvm, fnm and asdf all want to own `$PATH`, so `.zshrc` only ever loads one of them, even if you've set several to `true`. the precedence is:

**nvm > fnm > asdf**

the ones that lost are ignored silently unless `PERSONAL_SETUP_DEBUG` is on, in which case you get a line telling you which one won and which got dropped.

if the winner is enabled but isn't actually installed, you get a warning on stderr. that one always prints, debug or not, because a flag you deliberately turned on and that couldn't be honoured is worth hearing about.

## What's in here

- [.zshrc](./.zshrc): the entry point. self-locates, sources `general/`, makes `$path` drop duplicates (`typeset -U`), then sources everything else behind its flag.
- `general/`: always loaded.
  - [helpers.sh](./general/helpers.sh): `__personal_enabled`, `__personal_debug`, `__personal_warn`, `__personal_brew_prefix` (finds brew in the prefixes [homebrew/prefixes.sh](./homebrew/prefixes.sh) lists, which setup.sh shares, and caches the answer), `__personal_brew_shellenv`, and `__personal_cache`, which keeps a tool's generated shell setup in `~/.cache/dotfiles/` and only re-runs the tool when its binary (or a config file the output depends on) changes path or mtime. sourced first, because everything below uses them.
  - [aliases.sh](./general/aliases.sh): my aliases. they include `g`, which opens the current directory (or one you pass) in Ghostty; `github` / `tangled`, which cd to `$PERSONAL_GITHUB_DIR` / `$PERSONAL_TANGLED_DIR` or a path under them; and `c`, which converts every wav/aif/aiff/flac under the current directory into `./mp3` at 320k. run `aliases` to list them all, each beside the comment trailing its definition, or its command if it has none.
  - [correction.sh](./general/correction.sh): turns zsh's "did you mean" autocorrect off.
  - [language.sh](./general/language.sh): `LANG`.
  - [variables.sh](./general/variables.sh): `PERSONAL_GITHUB_DIR` and
    `PERSONAL_TANGLED_DIR`, plus `NPM_CONFIG_GLOBALCONFIG`, which points npm at the repo's [.npmrc](../../.npmrc) as its global config (the comment there says why).
  - [config-jj.sh](./general/config-jj.sh), [config-npm.sh](./general/config-npm.sh): not sourced at startup. they're run on demand by the `config:jj` / `config:npm` aliases: `config:jj` copies my git identity into jj, and `config:npm` copies the repo's .npmrc into `~/.npmrc` for npm started outside zsh. `config:ai-github` and `config:ai-tangled` are the same idea for the accounts Claude Code and Codex use on each forge, and `toggle:ai-github` and `toggle:ai-tangled` flip the agents between that forge's bot and my own account. `config:tracehub` and `toggle:tracehub` set up and flip tracehub for my work repos. those scripts live in [configs/ai](../ai/README.md).
- `homebrew/`: [init.sh](./homebrew/init.sh), sourced when either brew flag is on: what `brew shellenv` sets up, done by `__personal_brew_shellenv` without running brew (which cost ~20ms a shell). skipped with a debug note if brew isn't installed. [prefixes.sh](./homebrew/prefixes.sh) lists where brew can live, for the shell and setup.sh both.
- `macos/`: [pathExports.sh](./macos/pathExports.sh) sets the macOS `$PATH`. directories that don't exist get dropped rather than sitting in front of ones that do. sourced after homebrew, cargo and pnpm, so `~/.local/bin` and `~/bin` stay ahead of everything, then cargo's and pnpm's bins, then brew's directories.
- `rust/`: [cargo.sh](./rust/cargo.sh) puts `~/.cargo/bin` (or `$CARGO_HOME/bin`) on `$PATH`, which is where `cargo install`ed tools like `clauth` live. brew's `rust` doesn't do this the way rustup would. no flag: it's always sourced, after homebrew, and does nothing if the directory isn't there.
- `pnpm/`: [pnpm.sh](./pnpm/pnpm.sh) exports `PNPM_HOME` (pnpm's own default, or whatever you set before it, worked out in [home.sh](./pnpm/home.sh), which setup.sh shares) and puts `$PNPM_HOME/bin` on `$PATH`, which `pnpm add -g` refuses to run without. that's also where `yarn` (Yarn 4, installed by `setup.sh` as a pnpm global) lives. it replaces the block `pnpm setup` would append to `~/.zshrc`. no flag, and it's added even before the directory exists, because pnpm checks `$PATH` before creating anything.
- `node/`: one of [nvm.sh](./node/nvm.sh), [fnm.sh](./node/fnm.sh) or [asdf.sh](./node/asdf.sh), per the precedence above.
- `starship/`: [init.sh](./starship/init.sh) and [starship.toml](./starship/starship.toml) are the prompt and its config. starship's init is cached in `~/.cache/dotfiles/starship-init.zsh` with `PROMPT2` baked in, so a shell runs starship zero times instead of three; it's regenerated when starship or `starship.toml` changes.
- completions: `.zshrc` runs `compinit` itself, unless the system zshrc already has (Ubuntu's does). macOS's system zshrc doesn't, so without this a mac had no tab completion at all. the full check runs at most once a day (`compinit -C` otherwise), so delete `~/.zcompdump` to pick up a new completion straight away.
- `clauth/`: [completions.sh](./clauth/completions.sh) is the tab completion `clauth completions install` writes to `~/.clauth/completions/clauth.zsh`. clauth also appends a line sourcing it to `~/.zshrc`; delete that line, this replaces it. no flag: it's sourced after compinit, and skipped with a debug note if the file isn't there.
- `tg/`: [completions.sh](./tg/completions.sh) is tab completion for `tg`, the Tangled CLI. its brew formula doesn't install any, and running `tg completion zsh` on every shell would cost a fork, so it's generated into `~/.cache/dotfiles/tg-completion.zsh` once and only regenerated when the `tg` binary changes, which is to say after an upgrade. no flag: sourced right after clauth's, and skipped with a debug note if `tg` isn't installed.

## Debugging

```sh
PERSONAL_SETUP_DEBUG=true zsh -i -c exit
```

prints every step as it happens, which is usually enough to spot the flag that isn't set, or the tool that isn't installed.

that only works if `~/.zshrc` doesn't hardcode the flag: a plain `export PERSONAL_SETUP_DEBUG=true` (or `=false`) there runs after the environment is read and overwrites whatever you passed in, so debug ends up stuck on or off. if you want a default in `~/.zshrc`, make it one the environment can override:

```sh
export PERSONAL_SETUP_DEBUG="${PERSONAL_SETUP_DEBUG:-false}"
```
