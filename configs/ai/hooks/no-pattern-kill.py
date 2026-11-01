# PreToolUse hook for Bash: refuses pkill and killall, with any flags. other
# agents run on this machine too, and one agent's `pkill -f cargo-nextest`
# once killed three others' test runs. stop what you started by its PID or
# process group instead. the deny rules in claude-settings.json stay as a
# second layer, for when this can't run.
import json
import sys

PATTERN_KILLERS = {"pkill", "killall"}


def main():
    try:
        # imported in here so a missing shell_words.py fails closed too
        from shell_words import commands

        command = (json.load(sys.stdin).get("tool_input") or {}).get("command") or ""
        if not any(words[0] in PATTERN_KILLERS for words in commands(command)):
            return 0
    except Exception as error:
        # fail closed: a command this can't read could be one it should refuse
        print("no-pattern-kill couldn't check this command: %r" % error, file=sys.stderr)
        return 2
    print(
        "pkill and killall match other agents' processes too. stop what you "
        "started by the PID or process group you recorded when you started it, "
        "for example: kill <pid>, or kill -TERM -- -<pgid>.",
        file=sys.stderr,
    )
    return 2


sys.exit(main())
