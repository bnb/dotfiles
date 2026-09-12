#!/usr/bin/env bash
# github.com/<...>/blob/<...> serves an HTML *page*, not the script - the old
# version of this file piped that HTML into bash. raw.githubusercontent.com
# serves the file itself, and -f makes curl fail loudly on a 404 instead of
# quietly handing bash an error page.
set -euo pipefail

base="https://raw.githubusercontent.com/bnb/dotfiles/main/setup/macos"

curl -fsSL "$base/step-1.sh" | bash && curl -fsSL "$base/step-2.sh" | bash
