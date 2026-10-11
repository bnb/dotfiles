# ai

config for the AI coding agents I use, Claude Code and Codex.

## instructions

[instructions.md](./instructions.md) is the set of standing instructions I kept repeating to agents, pulled from my Claude Code history. setup.sh symlinks it to `~/.claude/CLAUDE.md` for Claude Code and `~/.codex/AGENTS.md` (or `$CODEX_HOME/AGENTS.md`) for Codex, so editing the repo copy changes what both agents load. restart running sessions to pick up changes.

### guardrails

some rules hold only if a setting backs them, since both agents treat instruction files as context. setup.sh adds [claude-settings.json](./claude-settings.json) to `~/.claude/settings.json`: no attribution trailers or PR footers, none of Claude Code's built-in git instructions (they also drop the git status snapshot at session start), every `git push` asking first, and `--no-verify` commits denied. lists gain the missing entries, a key already set to something else is left alone, and the old entries that kept agents out of worktrees get taken out. for Codex it links [codex-git.rules](./codex-git.rules) into `~/.codex/rules`, which makes `git push` prompt. both match command text, so forms like `git -C . push` slip past.

### work repos

[assistant-ui.md](./assistant-ui.md) is extra instructions for my work repos. on a machine that has `~/GitHub/assistant-ui`, setup.sh links it there as both `CLAUDE.md` and `AGENTS.md`. neither agent reads an `AGENTS.md` above a repo's root on its own, so each gets a nudge:

- **Claude Code** loads a `CLAUDE.md` from every directory above the one it starts in, so it reads the symlink (worktrees in `.wt/` included). by default, though, a `CLAUDE.md` above a repo stops Claude Code reading that repo's own `AGENTS.md`, so setup.sh also sets **Project instructions** (in `/config`) to read both, unless it's already been changed there. it skips the `AGENTS.md` symlink because it's the same file it already loaded. versions before 2.1.277 don't read `AGENTS.md` at all, so update to get each repo's own.
- **Codex** only reads `AGENTS.md` from the repo's root down. setup.sh links [codex-hooks.json](./codex-hooks.json) to `~/.codex/hooks.json`: a SessionStart hook that prints `~/GitHub/assistant-ui/AGENTS.md` into any session started under that directory, and again after a compaction. Codex skips a hook until you've trusted it, so approve it once in the Codex app's hook settings (the CLI asks at startup), and again whenever the hook entry itself changes. editing `assistant-ui.md` doesn't need a new approval. spawned subagents don't get it.

## Claude accounts

the Claude desktop app is for personal work and Claude in VS Code is for work. both run Claude Code against `~/.claude`, and Claude Code trusts the account identity cached in `~/.claude.json` over the one a session actually signs in with. so desktop sessions, which the app signs in as me, still saw whichever account last booted from `~/.claude` (usually work, from VS Code), plus the work-only auto mode settings in `~/.claude/settings.json`.

to keep them apart, VS Code doesn't use `~/.claude` directly. [vscode-claude.sh](./vscode-claude.sh) is the extension's `claudeCode.claudeProcessWrapper`, which setup.sh sets in VS Code and VS Code Insiders on a machine with `~/GitHub/assistant-ui`. it starts the extension's own claude with `clauth start work`:

- each session gets the work profile's credentials and its own copy of `~/.claude.json`, so its identity comes from the work login. CLAUDE.md, skills, plugins, session history and the agents' `env` are still shared with `~/.claude`.
- on macOS each of those sessions keeps its own Keychain copy of the login, and the first one to refresh it would sign the others out. so the work profile is on a rolling token (`clauth rolling-token work`): sessions get an access token with no refresh token, and `clauth daemon` re-stamps it before it expires. setup.sh keeps the daemon running with a launchd agent, `im.bnb.clauth-daemon`, logging to `~/.clauth/daemon.log`.
- it passes [claude-work-settings.json](./claude-work-settings.json) with `--settings`, for settings only work sessions should get: right now, the auto mode environment for assistant-ui. auto mode only reads user settings and `--settings` files, never a repo's own `.claude/`, so this is how it stays scoped to work. if auto mode's setup writes new rules from a work session, they land in `~/.claude/settings.json` and need moving here.

that leaves `~/.claude` to the desktop app, so the global clauth account stays on personal (`clauth switch personal`). in a terminal, `claude` is personal and `clauth start work` is work. `clauth switch work` would give the desktop app the work identity again. work sessions also keep my own GitHub account, where every other Claude session uses the GitHub bot (see [below](#automation-accounts-for-the-agents)). the wrapper setting is machine-scoped, so VS Code's settings sync leaves it alone. Developer: Reload Window moves VS Code's running Claude sessions over.

## skills

setup.sh installs these for both agents with the [Skills CLI](https://skills.sh), from `AGENT_SKILLS` in [setup/lib/common.sh](../../setup/lib/common.sh):

- [humanizer](https://github.com/blader/humanizer) rewrites text that reads as AI-written. my instructions ask for a pass on docs, comments, PR bodies, and commit messages.
- [install-anti-slop](https://github.com/dmmulroy/anti-slop) vendors dmmulroy's anti-slop Oxlint rules into a repo, or updates a copy that's already there.
- [riftri-worktrees](https://github.com/assistant-ui/riftri/blob/main/skills/riftri-worktrees/SKILL.md) is how agents make and clean up the [riftri](https://riftri.dev) worktrees my instructions ask for. setup.sh installs the `riftri` CLI itself as a pnpm global.

my own skills live in [skills/](./skills): rules from my instructions that only matter in some projects, so they load when needed instead of in every session. setup.sh links each `SKILL.md` into `~/.agents/skills` and the folder into `~/.claude/skills`.

- [atproto](./skills/atproto/SKILL.md): conventions for AT Protocol apps.
- [new-project](./skills/new-project/SKILL.md): my default stack for a new project.

[setup/television.sh](../../setup/television.sh) puts Television's own skills (`television` and `tv-*`) in the same places with `tv skills install`, and reinstalls them on every run. every Claude Code session gets them: `clauth start` runtimes link `skills` back to `~/.claude/skills` (only `--isolated` leaves them out). Codex's sandbox would block `tv` reaching its server on localhost and writing to `~/.television/artifacts`, so setup also links [codex-television.rules](./codex-television.rules) into `~/.codex/rules`, which runs the everyday `tv` commands outside the sandbox (deleting, removing channels and admin commands still ask), and sets Codex's `default_permissions` to a `television` profile: its own `:workspace` plus write access to that one directory. if `config.toml` already sets `default_permissions` or `sandbox_mode`, setup leaves it alone and prints the lines to add.

a global install keeps one copy of each in `~/.agents/skills`, which Codex reads directly, and symlinks it into `~/.claude/skills`. setup skips a skill that's already installed, so updating is a separate step:

```sh
DO_NOT_TRACK=1 pnpm dlx skills update -g
```

## tracehub

[tracehub.sh](./tracehub.sh) turns tracehub ([assisted-by](https://github.com/assistant-ui/assisted-by)) on and off for my work checkouts in `~/GitHub/assistant-ui`, and never touches a repo outside it.

```sh
config:tracehub setup    # once, and again after cloning a repo there
config:tracehub status   # each checkout's consent: yes, no, or not given
toggle:tracehub          # flip it (or config:tracehub on / off)
```

`setup` is assisted-by's own guided setup pointed at that directory: GitHub sign-in, git hooks in each checkout (and its worktrees), and consent for the repos I pick. say no to global hooks, since they'd reach every repo on the machine (assisted-by refuses them here anyway, because `~/.gitconfig` uses `[include]`). in the Husky repos the hooks are new files in `.husky/`, so `setup` also lists them in the repo's `.git/info/exclude` to keep them out of commits.

**accounts:** tracehub is always signed in as me, whichever account `toggle:ai-github` gives the agents. assisted-by keeps its own sign-in and ignores gh's and git's, so a push uploads as me whether I or an agent (as the bot or as me) made it. that's on purpose: a tracehub session belongs to the account that first uploaded it, and tracehub refuses anyone else's uploads to it, so uploads that followed the agents' account would strand any session whose commits get pushed by both. `setup` signs in on its own first and checks the account against my own gh login. if the browser was signed in as the bot, it removes that sign-in and stops. `status` shows who it's signed in as. with the toggle on, the bot also needs write access to a work repo before Claude Code can push to it from outside a work session.

`on` and `off` set assisted-by's consent for every checkout there. the hooks check it before they change anything, so while it's off a commit gets no `Assisted-by` trailer and a push uploads nothing, and the hooks can stay installed. new clones and worktrees don't get hooks until `setup` runs again. the script pins assisted-by to the same version as the hooks it installs; bump `VERSION` and rerun `setup` to update both.

## automation accounts for the agents

[automation-accounts.sh](./automation-accounts.sh) puts the agents on bot accounts instead of my own: Claude Code outside work sessions on my GitHub automation account (botandbang), and both Claude Code and Codex on [@bot.bnb.im](https://tangled.org/bot.bnb.im) on Tangled. my terminal stays on my accounts, but anything a bot-wired agent does (`gh pr create`, `tg pr create`, `git push`, a commit) happens as the bot for that forge. that keeps agent work clearly marked as agent work, and it means I can review and approve PRs an agent opened, which I can't do on PRs opened as me.

on GitHub, Claude Code's [work sessions](#claude-accounts) and Codex stay on my own account, with my work identity in work repos. a work session is any session clauth starts on its `work` profile: Claude in VS Code, and `clauth start work`. on a machine without that profile, every Claude Code session counts as outside work.

```sh
config:ai-github login     # once per machine, per forge
config:ai-tangled login
config:ai-github status    # either alias: who the terminal and the agents are on both forges
config:ai-tangled apply    # re-wire the agents (login already does this, and so does setup.sh)
config:ai-tangled remove   # unwire one forge (its login stays)
toggle:ai-github           # flip Claude Code between the GitHub automation account and mine
toggle:ai-tangled          # flip Claude Code and Codex between @bot.bnb.im and @bnb.im
```

**toggling:** `toggle:ai-github` and `toggle:ai-tangled` (or `config:ai-<forge> toggle`) put the agents on my own account for that forge by unwiring it the same way `remove` does, and leave a marker at `~/.config/ai-agents/<forge>.off`. while that's there, `apply` (setup.sh's too) leaves that forge alone instead of quietly switching it back. running the toggle again deletes the marker and runs `apply`, which for GitHub needs 1Password unlocked. each forge toggles on its own, and `status` shows which way each is set. with Tangled off, `tg` falls back to the account [configs/tg/config.toml](../tg/config.toml) pins (mine), and Tangled repos commit as me even while the GitHub bot is on. as with `apply`, restart running sessions afterwards.

**GitHub:** `login` opens the browser for gh's device-code flow. **sign the browser into the automation account before you enter the code**, because the code authorizes whichever account the browser is signed into (a private window is the easy way). if it ends up logged in as my personal account anyway, the script notices, throws that login away, and stops. with a token instead: `config:ai-github login --with-token < token.txt`.

**Tangled:** `login` runs `tg auth login bot.bnb.im`, which sends the browser to bot.bnb.im's PDS to sign in as the bot. with an app password instead: `config:ai-tangled login --password-stdin < app-password.txt`. the agents pick the bot explicitly with `TG_ACCOUNT`, and the terminal stays on my account because [configs/tg/config.toml](../tg/config.toml) pins it (otherwise `tg` uses whichever account logged in last; the script also switches that default back after logging the bot in). `tg` comes from a third-party tap that setup.sh taps and trusts; by hand that's `brew install alyraffauf/tap/tg` after `brew trust --tap alyraffauf/tap`. the handle is `$AI_TANGLED_HANDLE` if that's set.

### how it works

environment variables, set only in each agent's own config, so nothing else on the machine ever sees them:

- `GH_CONFIG_DIR` → `~/.config/gh-automation`, a second gh config directory with only the GitHub automation account logged in. `gh` run by Claude Code outside work sessions acts as that account. everywhere else it's unset, so `gh` uses my own login.
- `TG_ACCOUNT` → the Tangled bot's DID. `tg` keeps every account in one keyring and this picks which one a command uses. it beats the `account` that `~/.config/tg/config.toml` pins to mine, so that's the only place the bot gets used.
- `TG_PROTOCOL` → `https`, so `tg repo clone` gives the agents remotes they can push to.
- `GIT_CONFIG_GLOBAL` → a gitconfig that `apply` generates: `~/.config/ai-agents/gitconfig` for Claude Code outside work sessions, and `gitconfig-without-github` next to it for Codex and work sessions. each includes `~/.gitconfig` (and so `~/.gitconfig.local`), then a fragment per forge the agent is on the bot for (the second one skips GitHub's), each of which:
  - authenticates HTTPS through that forge's CLI (`gh auth git-credential` or `tg auth git-credential`), which reads the variables above. osxkeychain gets cleared out first, since it may be holding my own credentials. `tg` mints a short-lived push token for the repo's knot each time instead of storing one.
  - commits as the bot.

  the GitHub bot is the default identity, except in repos with a Tangled remote (matched with `includeIf "hasconfig:remote.*.url:..."`), which get mine back. the Tangled bot takes over in those when it's wired, and wins in a repo that has remotes on both. its commit email is its DID, which is how Tangled credits a commit to an account without a verified email address.

### the GitHub bot's keys, from 1Password

the GitHub bot has its own two SSH keys in 1Password: a signing key and an authentication key. `apply` doesn't need their names. it asks GitHub which signing and authentication keys the bot has (both lists are public), asks the 1Password agent which of those it holds, and wires up what it finds:

- **signing:** every agent commit is signed with the bot's signing key through `op-ssh-sign`, so GitHub marks it Verified. the key goes in the fragment as `user.signingkey`, and in `~/.config/ai-agents/github-signing.pub`.
- **authentication:** agents' git runs ssh with `~/.config/ai-agents/ssh_config` (`core.sshCommand`), which offers `github.com` only the bot's authentication key (`IdentitiesOnly`, with the public key in `github-auth.pub` as the `IdentityFile`), and never my personal key: for `github.com`, `~/.ssh/config` isn't read at all, since any `IdentityFile` it set would be offered next. every other host falls through to `~/.ssh/config` unchanged. HTTPS remotes push over SSH too (`pushInsteadOf`). fetching over HTTPS stays on the bot's gh token, so anything that only fetches, like a package manager, doesn't wait on 1Password.

`status` shows each key's 1Password title and fingerprint.

**work repos:** for a Claude Code session outside work that opens a work repo, the bot also has a work identity for the assistant-ui org, [configs/git/assistant-ui-botandbang.gitconfig](../git/assistant-ui-botandbang.gitconfig), with its own email and its own pair of keys. `apply` copies the `includeIf`s that give my work identity to work repos in the dotfiles' `.gitconfig`, points them at `configs/git/<org>-<login>.gitconfig` when that file exists, and puts them at the end of the GitHub fragment so they win. in those repos the bot signs with its work signing key and offers its work authentication key first, ahead of its usual one. keys pinned in `configs/git` are skipped when `apply` looks for the bot's usual keys, since they're on the same GitHub account.

when a key can't be found, GitHub falls back to what Tangled does for both: commits go unsigned (my signing key is my account's, so it'd be Unverified), and SSH remotes go over HTTPS (SSH would offer my personal key). if 1Password is installed, that fallback also fails the run, so setup.sh lists it. usually it means 1Password was locked, the key's vault isn't one the SSH agent uses, or the key isn't on the bot's GitHub account yet (https://github.com/settings/keys, signed in as the bot).

for Tangled, the bot still commits unsigned and its SSH remotes still go over HTTPS. `tangled.sh` remotes go to `tangled.org` too, since that's the only host `tg`'s credential helper answers for.

where those variables go:

- **Claude Code**, on a machine without a clauth `work` profile: the `env` block in `~/.claude/settings.json`, which covers the CLI, the desktop app's sessions and the IDE extensions.
- **Claude Code**, with a clauth `work` profile: each profile's `[env]` in `~/.clauth/profiles/<name>/config.toml`. clauth builds a `clauth start` session's settings from `~/.claude/settings.json`, minus the active profile's `[env]` keys, plus its own profile's, so the work profile gets only what work sessions should have and every other profile gets the GitHub bot too. clauth copies the active profile's `[env]` into `~/.claude/settings.json` on each `clauth switch`, and `apply` writes that copy as well, so the desktop app and plain `claude` follow the active profile without waiting for a switch. that means `clauth switch work` also takes the desktop app off the GitHub bot. a new clauth profile gets none of these until the next `apply`. keys in `~/.claude/settings.json` that no profile's `[env]` has would reach every session, work ones included, which is why none of these live only there.
- **Claude's desktop app**, for the git it runs itself rather than in a session (fetching a project's base branch when a session opens, and its sync and PR buttons): the app never reads `~/.claude/settings.json`, so this git used to go out as me, with my personal key on any SSH remote. it does read a login shell's environment once at startup, with `CLAUDE_DESKTOP_RESOLVING_ENVIRONMENT=1` set, and [claude-desktop-env.sh](./claude-desktop-env.sh) (sourced from the zsh config) exports that file's `env` block only then. my terminals, the app's terminal panel and Claude Code's own shells never have that variable, so they don't get it. the app reads it once, so restart the app after anything that changes the block. for pushes, the app copies the global config without its `includeIf`s, so those carry the GitHub bot's identity even in a Tangled repo.
- **Codex**: `[shell_environment_policy.set]` in `~/.codex/config.toml` (or `$CODEX_HOME`), which sets them for every command Codex runs.

the Codex app and clauth both rewrite their files themselves, so the script edits those line by line and checks that the result parses to the same document with only these keys changed. if it can't prove that, it changes nothing and prints what to add by hand. the check needs python 3.11+ for `tomllib` (or `tomli`); without either, Codex is skipped with the same by-hand instructions rather than failing the run, and Claude Code is left alone with an error when there's a `work` profile, since wiring `~/.claude/settings.json` alone would put work sessions on the bot.

every file gets backed up to `<file>.backup.<timestamp>` before any change, and a run that wouldn't change anything doesn't write anything.

### things to know

- **the bots need access.** agents push and open PRs as them, so each bot needs write access to any repo the agents work in outside work sessions: as a collaborator or through an org team on GitHub, as a collaborator on Tangled. that includes my own private repos.
- **restart running sessions** after `apply` or `remove`. both agents read their config at startup. the same goes for the Claude desktop app itself, after those, a toggle, or `clauth switch`.
- **1Password asks before it uses the bot's keys** for an app it hasn't approved yet, and an agent's commit or push waits on that approval. how long an approval lasts is in 1Password > Settings > Developer.
- **only git uses the bot's SSH key.** a plain `ssh git@github.com` from an agent still reads `~/.ssh/config`, and so authenticates as me.
- **a `GH_TOKEN` or `GITHUB_TOKEN` in the environment beats all of this** for gh. gh prefers either one over any config directory, and an agent started from a shell that exports one inherits it. `status` warns about it.
- **`clauth start --isolated`** starts from an empty settings file, but clauth still adds the profile's own `[env]`. with a `work` profile, that's where all of these live, so an isolated session gets the same accounts as any other on its profile. without one, they're only in `~/.claude/settings.json`, so isolated sessions use my own accounts.
- **self-hosted knots aren't covered.** the rewrite and credential helper are for Tangled's hosted endpoint, which is where my repos are. a repo on its own knot keeps its SSH remote, and so my key.
- **rotating the GitHub bot's keys:** swap them in 1Password and on GitHub, then run `config:ai-github apply`.
- **the gh keychain.** every gh config directory shares one keychain service, and gh files each account's token under its own username, so the two GitHub logins don't overwrite each other. logging in also clears gh's old unkeyed slot. current gh only reads that slot when the per-user entry is missing, so `login` checks that my personal account has its per-user entry first, and if it doesn't, it says to run `gh auth refresh` and stops.
- **this only covers what runs locally.** hosted integrations (Claude Code's GitHub MCP connector, ChatGPT's GitHub connector for Codex cloud tasks) have their own OAuth connections, set up in those apps.
- to drop a login entirely: `remove`, then `GH_CONFIG_DIR=~/.config/gh-automation gh auth logout` or `tg auth logout --account bot.bnb.im`.
