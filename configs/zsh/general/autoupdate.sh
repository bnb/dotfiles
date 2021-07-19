DOTFILES_GITSTATUS=$(git -C $PERSONAL_DOTFILES_PATH rev-list HEAD...origin/main --count)

if [ $DOTFILES_GITSTATUS=0 ]
then
  echo "dotfiles are up to date!"
else
  echo "dotfiles are out of date! Updating..."
  git -C $PERSONAL_DOTFILES_PATH pull 
fi
