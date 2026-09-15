# dotfiles

This is where my dotfiles live, so I can pick up a new machine and be back to normal without trying to remember what I did last time. It's the config files themselves, plus a `setup.sh` that installs the tools those configs assume and wires everything together.

It runs unattended, it works out whether it's on macOS or linux/WSL by itself, and it's safe to run again on a machine that's already set up — existing files get backed up to `<file>.backup.<timestamp>` rather than clobbered.

## Installation

One command, either platform:

```sh
curl -fsSL https://raw.githubusercontent.com/bnb/dotfiles/main/setup.sh | bash
```

or, from a clone:

```sh
./setup.sh
```

`raw.githubusercontent.com` and not `github.com/bnb/dotfiles/blob/...`, because the `blob` URL serves an HTML *page* — the version of this README that used it was piping HTML into bash and installing precisely nothing. `-f` is there so curl fails loudly on a 404 instead of quietly handing bash an error page.

see [install.md](./install.md) for what that actually installs, and for the handful of things I still have to do by hand afterwards.

## The directory invariant

The one thing I want true on every machine I touch:

```
~/GitHub/<user-or-org>/<repo>
~/tangled/<user-or-org>/<repo>
```

two trees, one per forge, each with a directory per user or org. `setup.sh` always creates them and it's idempotent, so `~/GitHub/bnb` and `~/tangled/bnb.im` are just *there*, on every machine, every time. muscle memory works, `cd ~/GitHub/bnb/<tab>` works, and every path in these configs can assume it.

this repo itself lands at `~/GitHub/bnb/dotfiles`. set `$DOTFILES_DIR` before running `setup.sh` if you want it somewhere else.

to start using a new org, add its name to `GITHUB_ORGS` or `TANGLED_ORGS` at the top of [setup/lib/common.sh](./setup/lib/common.sh) and re-run `setup.sh`. that's the whole change.

## git config

[.gitconfig](./.gitconfig) here is only the portable stuff — name, email, editor, `init.defaultBranch`, colours — and it ends with:

```
[include]
	path = ~/.gitconfig.local
```

anything machine-specific goes in `~/.gitconfig.local`, which is *not* in this repo. git ignores the include when that file doesn't exist, and because includes expand in place it has to stay last — whatever's in the local file wins.

that's where commit signing went. signing runs through 1Password's `op-ssh-sign`, at an absolute `/Applications/...` path that doesn't exist on linux, and it was paired with a global `commit.gpgsign = true` — so keeping it in the committed file meant every single `git commit` on WSL, on linux, or on a mac without 1Password just failed. `setup.sh` writes the signing block into `~/.gitconfig.local` only when it finds that binary, so
signing happens where 1Password is and commits work where it isn't.

one gotcha worth writing down, because I've been caught by it: `git config --global --get <key>` doesn't expand includes, so it shows nothing for anything set in `~/.gitconfig.local`. use `git config --get <key>` to see what's actually in effect.

## Contents

  * [setup.sh](./setup.sh): the entry point. creates the directories, installs the tooling, clones this repo, writes `~/.zshrc` and `~/.gitconfig.local`.
  * [./configs/zsh](./configs/zsh): the majority of the configuration in this repo, all of it aimed at my zsh environment. there's a pretty good [README.md](./configs/zsh/README.md) in that directory that gives a lot more context
    — the environment variable flags, in particular.
  * [.gitconfig](./.gitconfig): my basic .gitconfig.
  * [.npmrc](./.npmrc): my basic .npmrc.
  * [install.md](./install.md): what gets installed, and what has to be done by hand.
  * [./setup](./setup): the odds and ends `setup.sh` doesn't cover — mostly WSL distro-upgrade notes.
  * [./configs/streamdeck](./configs/streamdeck): my Stream Deck profile.
