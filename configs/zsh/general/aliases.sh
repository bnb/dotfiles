# personal aliases
alias r="code-insiders -r" # open the passed path in the current VS Code Insiders window, replacing the current contents
alias a="code-insiders -a" # open the passed path in the current VS Code Insiders workspace
alias i="npx covgen hello@bnb.im && npx license mit && npx gitignore node &&  echo \"package-lock=false\" > .npmrc" # init new project files that can't be init'd by an init command
alias ff:main="git fetch upstream && git checkout main && git merge upstream/main"
alias ff:master="git fetch upstream && git checkout master && git merge upstream/master"
alias update:dotfiles="git -C $PERSONAL_DOTFILES_PATH pull"
alias update:brew="brew update --force --quiet"
alias update="update:dotfiles && update:brew"