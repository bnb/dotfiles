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

see [oneshot.md](./oneshot.md) for what that actually installs, and for the handful of things I still have to do by hand afterwards.

## The directory invariant

The one thing I want true on every machine I touch:

```
~/GitHub/<user-or-org>/<repo>
~/tangled/<user-or-org>/<repo>
```

two trees, one per forge, each with a directory per user or org. `setup.sh` always creates them and it's idempotent, so `~/GitHub/bnb` and `~/tangled/bnb.im` are just *there*, on every machine, every time. muscle memory works, `cd ~/GitHub/bnb/<tab>` works, and every path in these configs can assume it. `github` and `tangled` jump to either root from anywhere (`github bnb/dotfiles` goes straight to a repo).

setup doesn't just `mkdir` and hope: each root and org directory is checked to be a real, writable directory afterwards, and anything that isn't (a file in the way, a root owned by someone else) shows up in the failure summary at the end. the roots follow `$PERSONAL_GITHUB_DIR` / `$PERSONAL_TANGLED_DIR` if they're set, the same as the shell does.

this repo itself lands at `~/GitHub/bnb/dotfiles`. set `$DOTFILES_DIR` before running the one-liner if you want it somewhere else; `./setup.sh` uses whichever copy it's run from.

to start using a new org, add its name to `GITHUB_ORGS` or `TANGLED_ORGS` at the top of [setup/lib/common.sh](./setup/lib/common.sh) and re-run `setup.sh`. that's the whole change.

## git config

[.gitconfig](./.gitconfig) here is only the portable stuff — name, email, editor, `init.defaultBranch`, colours — and it ends with:

```
[include]
	path = ~/.gitconfig.local
```

`~/.gitconfig` itself is a small file `setup.sh` writes that `[include]`s this one, so whatever tools write with `git config --global` stays out of the repo.

anything machine-specific goes in `~/.gitconfig.local`, which is *not* in this repo. git ignores the include when that file doesn't exist, and because includes expand in place it comes after everything else, so whatever's in the local file wins over this one. two things beat it. one is the work include below. the other is `~/.gitconfig` itself: `git config --global` appends there, after the include, so a tool that sets, say, `user.email` globally overrides the local file too. `git config --show-origin --get <key>` says which file a value came from.

that's where commit signing went. signing runs through 1Password's `op-ssh-sign`, at an absolute `/Applications/...` path that doesn't exist on linux, and it was paired with a global `commit.gpgsign = true` — so keeping it in the committed file meant every single `git commit` on WSL, on linux, or on a mac without 1Password just failed. `setup.sh` writes the signing block into `~/.gitconfig.local` only when it finds that binary, so
signing happens where 1Password is and commits work where it isn't.

work repos get their own identity. anything under `~/GitHub/assistant-ui`, and any repo with a remote in the assistant-ui org wherever it's cloned (`hasconfig:remote.*.url`, so a fork with an `upstream` there counts), also includes [configs/git/assistant-ui.gitconfig](./configs/git/assistant-ui.gitconfig), from `includeIf`s after the local include so its signing key wins. commits there use tierney@assistant-ui.com, get signed with that identity's signing key in 1Password, and push with its authentication key. the push goes through `core.sshCommand` with `IdentitiesOnly`, so GitHub never gets offered a personal key first. ssh needs that key's public half on disk, so `setup.sh` links [assistant-ui.pub](./configs/git/assistant-ui.pub) to `~/.ssh/assistant-ui.pub` on a machine that has `~/GitHub/assistant-ui`.

the GitHub automation account (botandbang) can't share my work email or keys, so it has its own: tierney+botandbang@assistant-ui.com, in [assistant-ui-botandbang.gitconfig](./configs/git/assistant-ui-botandbang.gitconfig). while Claude Code is on the bot (outside work sessions), its git config includes that under the same conditions. Claude Code's work sessions, Codex, and Claude Code toggled to me get mine. details in [configs/ai](./configs/ai/README.md#the-github-bots-keys-from-1password).

one gotcha worth writing down, because I've been caught by it: `git config --global --get <key>` doesn't expand includes, so it shows nothing for anything set in `~/.gitconfig.local`. use `git config --get <key>` to see what's actually in effect.

## Contents

  * [setup.sh](./setup.sh): the entry point. creates the directories, installs the tooling, clones this repo, writes `~/.zshrc`, `~/.gitconfig` and `~/.gitconfig.local`, and points `~/.ssh/config` at the 1Password agent.
  * [./configs/zsh](./configs/zsh): the majority of the configuration in this repo, all of it aimed at my zsh environment. there's a pretty good [README.md](./configs/zsh/README.md) in that directory that gives a lot more context
    — the environment variable flags, in particular.
  * [./configs/ai](./configs/ai): config for the AI coding agents: putting the agents on my automation accounts instead of mine (Claude Code outside work on GitHub's, and both agents on @bot.bnb.im on Tangled), my instructions for them (with extra ones for my work repos), keeping Claude in VS Code on my work account and the desktop app on mine, the skills they share, and the tracehub toggle for those repos. its [README.md](./configs/ai/README.md) explains how.
  * [./configs/tg](./configs/tg): config for `tg`, the Tangled CLI, symlinked to `~/.config/tg/config.toml` by `setup.sh`. it pins my own account, so `tg` never acts as whichever account happened to log in last.
  * [.gitconfig](./.gitconfig): my basic .gitconfig, included from `~/.gitconfig`.
  * [./configs/git](./configs/git): the work git identities for the assistant-ui org's repos, mine and the GitHub bot's.
  * [.npmrc](./.npmrc): my basic .npmrc, which zsh reads as npm's global config (`$NPM_CONFIG_GLOBALCONFIG`).
  * [oneshot.md](./oneshot.md): what gets installed, and what has to be done by hand.
  * [./setup](./setup): the per-platform halves of `setup.sh` and the library they share, plus the WSL distro-upgrade scripts.
  * [./configs/streamdeck](./configs/streamdeck): my Stream Deck profile.
