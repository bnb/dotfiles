  if [ -n "$PERSONAL_SETUP_DEBUG" ]
  then
    echo "setting up idweb command"
  fi

# work alias that opens up idweb on macOS
alias idweb='kdestroy --all; kinit --keychain ticyren@NORTHAMERICA.CORP.MICROSOFT.COM; open http://idweb -a Safari.app' # Hack to make Microsoft's internal tool IDWeb work on macOS. This is a horrible hack. Also the alias included in it is not really confidential since you could figure it out pretty easily – I prefer not to use security through obscurity, especially if it makes my life easier not to do so.
