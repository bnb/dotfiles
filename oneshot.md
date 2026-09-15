# one shot installer

What [setup.sh](./setup.sh) puts on a machine, and the handful of things it can't do for
me. It's all idempotent, so re-running it on a machine that's already set up is fine.

## what setup.sh does on its own

- creates the [directory invariant](./README.md#the-directory-invariant): `~/GitHub/bnb` and `~/tangled/bnb.im`
- installs homebrew if it isn't already there, and finds the prefix at runtime rather than assuming one (`/opt/homebrew` on apple silicon, `/usr/local` on intel, `/home/linuxbrew/.linuxbrew` on linux)
- clones this repo to `~/GitHub/bnb/dotfiles` (or `$DOTFILES_DIR`), and pulls it if it's already there
- writes a `~/.zshrc` with the right `PERSONAL_SETUP_*` flags for the platform, and a `source` line pointing at [configs/zsh/.zshrc](./configs/zsh/.zshrc)
- symlinks `.gitconfig` and `.npmrc` into `$HOME`
- writes the 1Password commit-signing config into `~/.gitconfig.local`, but only on a machine where `op-ssh-sign` actually exists

anything it's about to replace gets copied to `<file>.backup.<timestamp>` first.

### homebrew formulae (macOS)

```
git gh nvm fnm asdf starship python3 bash shellcheck
```

`bash` and `shellcheck` are there for editing this repo: macOS ships bash 3.2 from 2007, and `setup.sh` has to keep working under it because that's the only bash a fresh machine has. having a modern bash and a linter around makes checking that a lot easier.

### homebrew casks (macOS)

apps:

```
1password alfred arc appcleaner discord spotify slack zoom
karabiner-elements docker-desktop
```

the off-brand builds I actually use day to day:

```
google-chrome@canary visual-studio-code@insiders
```

fonts:

```
font-cascadia-code font-cascadia-code-pl font-cascadia-mono font-cascadia-mono-pl
```

(no `brew tap homebrew/cask-fonts` or `homebrew/cask-versions` — both taps were archived and folded into `homebrew/cask`, so tapping them now just errors. that's also why the versioned casks are `@`-suffixed.)

### linux/WSL

no casks. apt first:

```
build-essential curl file git procps zsh
```

(`curl`, `file` and `procps` are homebrew-on-linux's own documented prerequisites.) then
homebrew and:

```
gh nvm fnm asdf starship shellcheck
```

no `python3` or `git` from brew here — apt already provides them. zsh gets set as the login shell, but only if it isn't already, and it's added to `/etc/shells` first because `chsh` refuses a shell that isn't listed there.

## what I still have to do by hand

Roughly in the order I do it:

1. **1Password** — sign in, then turn on the SSH agent in Settings → Developer. nothing that touches git over SSH works until this is done, and `setup.sh` deliberately won't write the commit-signing config on a machine that doesn't have it.
2. **SSH keys** — let 1Password hold them. the config expects `$SSH_KEY_PATH` at `~/.ssh/id_ed25519` if I'm not using the agent.
3. **`gh auth login`** — authenticate the GitHub CLI.
4. **switch this repo's remote to SSH** if I plan to push from the machine; `setup.sh` clones over HTTPS so it works before any of the above exists.
5. **sign into everything** — Slack, Discord, Spotify, Zoom, Arc, Chrome Canary, VS Code Insiders (settings sync does the rest).
6. **App Store apps** — homebrew can't install these, so they're manual. anything I've bought rather than brewed lives there.
7. **Docker Desktop** — has to be opened once to finish its own install and grant its privileged helper.
8. **Karabiner-Elements** — needs input-monitoring permission in System Settings, then its own config imported.
9. **macOS system settings** — the trackpad/keyboard/dock tweaks I redo from memory every time. `setup.sh` only handles the one I keep forgetting (`DSDontWriteNetworkStores`, which stops `.DS_Store` files appearing on network shares).
10. **[the Stream Deck profile](./configs/streamdeck)** — import it from the Stream Deck app; there's no CLI for it.

## upgrading an old WSL box

Not part of `setup.sh`, but it's the other thing I only do once every couple of years and never remember: [setup/wsl/upgrade.sh](./setup/wsl/upgrade.sh), and [setup/wsl/upgrade-fixer-if-it-aborts.sh](./setup/wsl/upgrade-fixer-if-it-aborts.sh) for when `do-release-upgrade` bails out because of snapd.
