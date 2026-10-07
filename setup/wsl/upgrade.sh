#!/usr/bin/env bash
#
# Does a full Ubuntu release upgrade in WSL. It is interactive by design (the
# release upgrader asks real questions), it can take a long time, and it can
# leave the distro in a state that needs a `wsl --shutdown` afterwards. Run it
# deliberately, on purpose, when you actually want to move to a new release.
set -uo pipefail

sudo apt update
sudo apt upgrade
sudo apt dist-upgrade
sudo apt install update-manager-core
sudo do-release-upgrade
