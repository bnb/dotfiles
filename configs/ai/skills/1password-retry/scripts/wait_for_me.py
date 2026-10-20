#!/usr/bin/env python3
"""Wait until I'm at the Mac again, so a retried 1Password prompt gets seen.

usage: wait_for_me.py "<what needs approving>"

Posts a notification saying what's waiting, then exits once the screen is
unlocked and there's been keyboard or mouse input since it started. The caller
chains the git command after it (`wait_for_me.py "..." && git commit ...`), so
1Password's prompt shows up while I'm there instead of timing out unseen.
Exits right away off macOS, and when it can't read the idle time, so a broken
check never turns into a wait that can't end.
"""

import plistlib
import re
import subprocess
import sys
import time

POLL_SECONDS = 2


def parse_idle_seconds(ioreg_output):
    """Seconds since the last input, from `ioreg -c IOHIDSystem`, or None."""
    match = re.search(r'"HIDIdleTime" = (\d+)', ioreg_output)
    return int(match.group(1)) / 1e9 if match else None


def parse_screen_locked(root_plist):
    """Whether the console session is locked, from `ioreg -n Root -d1 -a`.

    The lock key is only there while locked. No session on the console (another
    user switched in, or the login window) counts as locked too.
    """
    users = plistlib.loads(root_plist).get("IOConsoleUsers", [])
    console = [user for user in users if user.get("kCGSSessionOnConsoleKey")]
    return not console or any(user.get("CGSSessionScreenIsLocked") for user in console)


def is_present(locked, idle_seconds, now, since):
    """Unlocked, with input more recent than `since`."""
    return not locked and now - idle_seconds > since


def run(*args):
    return subprocess.run(args, capture_output=True, check=True).stdout


def notify(message):
    # argv keeps the message out of the AppleScript source, so quotes in it
    # can't break the script.
    subprocess.run(
        [
            "osascript",
            "-e", "on run argv",
            "-e", 'display notification (item 1 of argv) with title "1Password needs you"',
            "-e", "end run",
            message,
        ],
        capture_output=True,
    )


def main(argv):
    if sys.platform != "darwin":
        return 0
    message = argv[1] if len(argv) > 1 else "an agent is waiting to sign"
    since = time.time()
    notify(message)
    print(f"waiting for you to come back: {message}", file=sys.stderr, flush=True)
    while True:
        idle = parse_idle_seconds(run("ioreg", "-c", "IOHIDSystem").decode())
        if idle is None:
            print("couldn't read the idle time, not waiting", file=sys.stderr)
            return 0
        locked = parse_screen_locked(run("ioreg", "-n", "Root", "-d1", "-a"))
        if is_present(locked, idle, time.time(), since):
            print("you're back, retrying", file=sys.stderr)
            return 0
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    sys.exit(main(sys.argv))
