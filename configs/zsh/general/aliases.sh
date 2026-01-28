# helpful commands
alias ff:main="git fetch upstream && git checkout main && git merge upstream/main"
alias ff:master="git fetch upstream && git checkout master && git merge upstream/master"
alias update:dotfiles="git -C $PERSONAL_DOTFILES_PATH pull"
alias update:brew="brew update --force --quiet"

alias config:git="source $PERSONAL_DOTFILES_PATH/configs/zsh/general/config-git.sh" # doesn't seem to work because of permissions but wanted to keep it
alias config:jj="source $PERSONAL_DOTFILES_PATH/configs/zsh/general/config-jj.sh" # doesn't seem to work because of permissions but wanted to keep it
alias config:npm="source $PERSONAL_DOTFILES_PATH/configs/zsh/general/config-npm.sh" # doesn't seem to work because of permissions but wanted to keep it
alias node:remotes="git remote get-url origin && git remote set-url origin git@github.com:bnb/node.git && git remote get-url origin && git remote get-url upstream && git remote add upstream git@github.com:nodejs/node.git && git remote get-url upstream"
alias redis:start="redis-server $(brew --prefix)/etc/redis.conf"
alias redis:stop="redis-cli SHUTDOWN"

# short aliases aliases
alias r="code-insiders -r" # open the passed path in the current VS Code Insiders window, replacing the current contents
alias a="code-insiders -a" # open the passed path in the current VS Code Insiders workspace
alias i="npx covgen hello@bnb.im && npx license mit && npx gitignore node &&  echo \"package-lock=false\" > .npmrc" # init new project files that can't be init'd by an init command
alias u="update:dotfiles && update:brew"
alias ls="ls --color=auto"
alias c="for i in *.wav; do ffmpeg -i "$i" -ab 320k "${i%.*}.mp3"; done; for i in *.aif; do ffmpeg -i "$i" -ab 320k "${i%.*}.mp3";" # convert all .wav files in a directory into .mp3 files, with ffmpeg