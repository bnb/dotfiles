# PreToolUse hook for Bash: refuses the forms of commands that skip their own
# safety check: git worktree remove --force, git branch -D or -d --force,
# git commit --no-verify or -n, and gh pr merge --admin. settings rules can't
# deny these by pattern, since git takes abbreviated long options (--forc) and
# bundled short ones (-df).
import json
import re
import shlex
import sys

SEGMENT = re.compile(r"\|\|?|&&|;|\n")
# short options whose value is the rest of the bundle or the next word
TAKES_VALUE = set("mFCctu")


def options(args):
    args = iter(args)
    for arg in args:
        if arg == "--":
            return
        if arg.startswith("--"):
            yield arg.split("=", 1)[0]
        elif arg.startswith("-"):
            for i, char in enumerate(arg[1:], 1):
                yield "-" + char
                if char in TAKES_VALUE:
                    if i == len(arg) - 1:
                        next(args, None)
                    break


def has(args, long, short):
    return any(
        opt[1:] in short if len(opt) == 2 else len(opt) > 3 and long.startswith(opt)
        for opt in options(args)
    )


def forced(segment):
    try:
        words = shlex.split(segment)
    except ValueError:
        words = segment.split()
    while words and ("=" in words[0] or words[0] in {"sudo", "command", "env"}):
        words.pop(0)
    if not words:
        return False
    name, rest = words[0].rsplit("/", 1)[-1], words[1:]
    if name == "git":
        while rest and rest[0].startswith("-"):
            rest = rest[2:] if rest[0] in {"-C", "-c"} else rest[1:]
    command = [name, *rest]
    if command[:3] == ["git", "worktree", "remove"]:
        return has(command[3:], "--force", "f")
    if command[:2] == ["git", "branch"]:
        return has(command[2:], "--delete", "dD") and has(command[2:], "--force", "Df")
    if command[:2] == ["git", "commit"]:
        return has(command[2:], "--no-verify", "n")
    if command[:3] == ["gh", "pr", "merge"]:
        return has(command[3:], "--admin", "")
    return False


def main():
    event = json.load(sys.stdin)
    command = (event.get("tool_input") or {}).get("command") or ""
    if not any(forced(s) for s in SEGMENT.split(command)):
        return 0
    print(
        "this skips a safety check (force, --no-verify, or --admin). run it without "
        "that, or fix what it refuses on. if it really needs forcing, ask me to run it.",
        file=sys.stderr,
    )
    return 2


sys.exit(main())
