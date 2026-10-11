# one shot installer

What [setup.sh](./setup.sh) puts on a machine, and the handful of things it can't do for
me. It's all idempotent, so re-running it on a machine that's already set up is fine.

## what setup.sh does on its own

- creates the [directory invariant](./README.md#the-directory-invariant): `~/GitHub/bnb` and `~/tangled/bnb.im`, then verifies each one is a writable directory (the `github` and `tangled` aliases cd into them)
- installs homebrew if it isn't already there, and finds the prefix at runtime rather than assuming one ([configs/zsh/homebrew/prefixes.sh](./configs/zsh/homebrew/prefixes.sh) lists where it looks)
- run as the one-liner, clones this repo to `~/GitHub/bnb/dotfiles` (or `$DOTFILES_DIR`), or pulls it if it's already there and has no uncommitted changes. `./setup.sh` uses whichever copy it's run from, as it is
- writes a `~/.zshrc` with the right `PERSONAL_SETUP_*` flags for the platform, and a `source` line pointing at [configs/zsh/.zshrc](./configs/zsh/.zshrc)
- writes a `~/.gitconfig` that `[include]`s the repo's [.gitconfig](./.gitconfig), so whatever `git config --global` writes stays out of the repo
- symlinks [configs/tg/config.toml](./configs/tg/config.toml) to `~/.config/tg/config.toml`
- leaves `~/.npmrc` alone: zsh reads the repo's [.npmrc](./.npmrc) as npm's global config instead, and `config:npm` copies it into `~/.npmrc` for npm started anywhere else
- writes the 1Password commit-signing config into `~/.gitconfig.local`, but only on a machine where `op-ssh-sign` actually exists
- on a machine with `~/GitHub/assistant-ui`, symlinks the keys work repos push with, mine and the GitHub bot's, from [configs/git](./configs/git) into `~/.ssh`
- points ssh at the 1Password agent (an `IdentityAgent ~/.1password/agent.sock` block appended to `~/.ssh/config`, plus a symlink to the real socket on macOS), so `git pull` over SSH asks 1Password instead of the key's passphrase. same `op-ssh-sign` check
- points the AI agents at my automation accounts instead of mine, once each has been logged in by hand (steps 5 and 6 below): Claude Code outside work sessions at GitHub's, and Claude Code and Codex at @bot.bnb.im on Tangled. it re-applies on every run, in case an agent or clauth has rewritten its config. details in [configs/ai](./configs/ai/README.md)
- links [configs/ai/instructions.md](./configs/ai/instructions.md) in as Claude Code's and Codex's user instructions, and on a machine with `~/GitHub/assistant-ui`, the work instructions above those checkouts
- adds my agent guardrails (no attribution lines, pushes asking first) to Claude Code's settings and Codex's rules, and links my own skills from [configs/ai/skills](./configs/ai/skills) for both agents. details in [configs/ai](./configs/ai/README.md#guardrails)
- on a machine with `~/GitHub/assistant-ui`, starts Claude in VS Code on the work clauth profile, so it doesn't share an account with the Claude desktop app, and on macOS keeps `clauth daemon` running under launchd. details in [configs/ai](./configs/ai/README.md#claude-accounts)
- sets up [Television](https://television.run), the display my agents put things on: `tv` as a pnpm global, its skills for both agents, and its server as a login service (launchd or systemd). details [below](#television-both-platforms)

anything it's about to replace gets copied to `<file>.backup.<timestamp>` first.

### homebrew formulae (macOS)

`MACOS_FORMULAE` in [setup/macos.sh](./setup/macos.sh).

`git-lfs` because the committed `.gitconfig` sets the lfs filter as `required`, which fails every checkout of an LFS repo on a machine without it. `asdf` is the one node version manager on macOS, since it's the one `~/.zshrc` turns on here; `brew install nvm` or `fnm` if a machine needs the other.

`bash` and `shellcheck` are there for editing this repo: macOS ships bash 3.2 from 2007, and `setup.sh` has to keep working under it because that's the only bash a fresh machine has. having a modern bash and a linter around makes checking that a lot easier.

`ripgrep` and `fd` because my [agent instructions](./configs/ai/instructions.md) tell agents to use them.

`tg` is the Tangled CLI, the `gh` of Tangled, which the AI agents use to act as @bot.bnb.im ([configs/ai](./configs/ai/README.md)). it's in a third-party tap, which `setup.sh` taps and then trusts, since Homebrew 7 won't load a formula from an unofficial tap until you do.

### homebrew casks (macOS)

`MACOS_CASKS` in [setup/macos.sh](./setup/macos.sh): apps, the off-brand builds I actually use day to day (Chrome Canary and VS Code Insiders), and the Cascadia fonts.

(no `brew tap homebrew/cask-fonts` or `homebrew/cask-versions`: both taps were archived and folded into `homebrew/cask`, so tapping them now just errors. that's also why the versioned casks are `@`-suffixed.)

### linux/WSL

no casks. apt first, `APT_PACKAGES` in [setup/linux.sh](./setup/linux.sh) (`curl`, `file` and `procps` are homebrew-on-linux's own documented prerequisites), then homebrew and `LINUX_FORMULAE` from the same file.

no `python3`, `git` or `git-lfs` from brew here: apt already provides them. `fnm` is the one node version manager, since it's the one `~/.zshrc` turns on here. zsh gets set as the login shell, but only if it isn't already, and it's added to `/etc/shells` first because `chsh` refuses a shell that isn't listed there.

### cargo crates (both platforms)

`CARGO_CRATES` in [setup/lib/common.sh](./setup/lib/common.sh), installed with `cargo install --locked` once brew has put `rust` on the machine, and skipped if `cargo install --list` already has it. it builds from source, so it's the slowest part of the run. the binaries land in `~/.cargo/bin`, which brew's rust doesn't put on `$PATH` (rustup would), so [configs/zsh/rust/cargo.sh](./configs/zsh/rust/cargo.sh) does.

### pnpm globals (both platforms)

`PNPM_GLOBALS` in [setup/lib/common.sh](./setup/lib/common.sh). `riftri` is the CLI my agents make worktrees with. `@yarnpkg/cli-dist` is Yarn 4, as `yarn`. brew's `yarn` formula is Yarn 1, corepack is being dropped from Node.js, and `npm i -g` would tie it to whichever node version was active at the time, so it goes in pnpm's global directory instead, which no node version owns. it lands in `$PNPM_HOME/bin`, which [configs/zsh/pnpm/pnpm.sh](./configs/zsh/pnpm/pnpm.sh) puts on `$PATH` (instead of letting `pnpm setup` edit `~/.zshrc`).

two things to know about it:

- it runs on node, which none of this installs, so `yarn` does nothing until fnm/nvm/asdf has a version.
- it's one Yarn 4 for everything. a project that checks in its own release (`yarnPath` in `.yarnrc.yml`) still gets that release, but a `packageManager` pin is ignored: a Yarn 1 project gets Yarn 4, which will rewrite its `yarn.lock` on install.

### agent skills (both platforms)

`AGENT_SKILLS` in [setup/lib/common.sh](./setup/lib/common.sh), installed for Claude Code and Codex with the Skills CLI. what each one does, and how to update them: [configs/ai](./configs/ai/README.md#skills).

### Television (both platforms)

[setup/television.sh](./setup/television.sh), which also runs on its own (`./setup/television.sh`) to set up or repair just Television. it follows [television.run's install guide](https://television.run/install.md): `@telepath-computer/television` from pnpm, `tv skills install ~/.agents/skills` with the same symlinks into `~/.claude/skills` the Skills CLI makes, then `tv serve --persist`.

the service keeps the `PATH` it was installed with, and fnm's per-shell entry on `$PATH` is gone once that shell closes. so the service gets fnm's `default` alias or asdf's shims instead, whichever has node 22.12 or later, and setup records a failure if neither does. it only restarts the service when it isn't already healthy on the installed version, and it reinstalls the skills every run since they change with each release. upgrading is `pnpm update -g @telepath-computer/television`, then `./setup/television.sh`. it also opens Codex's sandbox just enough for Television, see [configs/ai](./configs/ai/README.md#skills).

## what I still have to do by hand

Roughly in the order I do it:

1. **1Password**: sign in, then turn on the SSH agent in Settings → Developer. nothing that touches git over SSH works until this is done, and `setup.sh` deliberately won't write the commit-signing or ssh agent config on a machine that doesn't have it. the ssh config is written anyway if the agent just isn't on yet, and starts working as soon as it is.
2. **SSH keys**: let 1Password hold them. the work ones (a signing and an authentication key each for `tierney@assistant-ui.com` and `tierney+botandbang@assistant-ui.com`) have to be in a vault the SSH agent serves, or work repos can't sign or push.
3. **`gh auth login`**: authenticate the GitHub CLI.
4. **`clauth login`**: add each Claude account as a clauth profile (or `clauth capture` to save the one Claude Code is already logged into). the credentials are per-machine and never go in this repo. name the work one `work`, since that's the one VS Code starts on, then `clauth rolling-token work` so VS Code's sessions don't sign each other out, and `clauth switch personal` so the desktop app and the terminal stay on mine. do this before the next step, which keeps work sessions off the GitHub bot once there's a `work` profile (or rerun `config:ai-github apply` after).
5. **`config:ai-github login`**: log in the GitHub automation account that Claude Code uses instead of mine outside work sessions. sign the browser into the *automation* account before entering the code, since the code authorizes whichever account the browser is signed into. it points Claude Code at that account once it's done. see [configs/ai](./configs/ai/README.md).
6. **`config:ai-tangled login`**: the same for Tangled, as @bot.bnb.im. the browser goes to the bot's PDS to sign in as it. `tg auth login bnb.im` logs me in too; the `tg` config pins my account, so the terminal stays me whichever logged in last.
7. **`opencode auth login`**: authenticate opencode against a model provider; it's installed by brew but can't do anything until it has credentials, and those are per-machine and secret, so they never live in this repo.
8. **switch this repo's remote to SSH** if I plan to push from the machine; `setup.sh` clones over HTTPS so it works before any of the above exists.
9. **sign into everything**: Slack, Discord, Spotify, Zoom, Arc, Chrome Canary, VS Code Insiders (settings sync does the rest).
10. **App Store apps**: homebrew can't install these, so they're manual. anything I've bought rather than brewed lives there.
11. **Docker Desktop**: has to be opened once to finish its own install and grant its privileged helper.
12. **Karabiner-Elements**: needs input-monitoring permission in System Settings, then its own config imported.
13. **macOS system settings**: the trackpad/keyboard/dock tweaks I redo from memory every time. `setup.sh` only handles the one I keep forgetting (`DSDontWriteNetworkStores`, which stops `.DS_Store` files appearing on network shares).
14. **Television's desktop app**: download it from [dl.todesktop.com](https://dl.todesktop.com/260923p52umxx/mac/dmg/arm64) (Apple Silicon only), then paste the link `tv links` prints into its connect screen. it updates itself after that.
15. **[the Stream Deck profile](./configs/streamdeck)**: import it from the Stream Deck app; there's no CLI for it.

## upgrading an old WSL box

Not part of `setup.sh`, but it's the other thing I only do once every couple of years and never remember: [setup/wsl/upgrade.sh](./setup/wsl/upgrade.sh), and [setup/wsl/upgrade-fixer-if-it-aborts.sh](./setup/wsl/upgrade-fixer-if-it-aborts.sh) for when `do-release-upgrade` bails out because of snapd.
