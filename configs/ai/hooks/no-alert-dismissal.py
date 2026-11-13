# PreToolUse hook for Bash: refuses dismissing a code scanning alert through
# the API (gh api .../code-scanning/alerts/<n> with state=dismissed). every
# alert gets a code fix. a suspected false positive goes to me with evidence
# and stays open, since a wrong dismissal hides a real hole.
import json
import sys


FIELD_FLAGS = {"-f", "-F", "--field", "--raw-field"}


def dismisses(words):
    if words[:2] != ["gh", "api"]:
        return False
    args = words[2:]
    if not any("code-scanning/alerts/" in arg for arg in args):
        return False
    # a body from a file or stdin can't be read here, so it counts as a dismissal
    if any(arg == "--input" or arg.startswith("--input=") for arg in args):
        return True
    # the key=value pairs gh api sends
    fields = values(args, FIELD_FLAGS)
    return any(field.lower().replace(" ", "").startswith("state=dismissed") for field in fields)


def main():
    # global, so dismisses() can use it too
    global values
    try:
        # imported in here so a missing shell_words.py fails closed too
        from shell_words import commands, values

        command = (json.load(sys.stdin).get("tool_input") or {}).get("command") or ""
        if not any(dismisses(words) for words in commands(command)):
            return 0
    except Exception as error:
        # fail closed: a command this can't read could be one it should refuse
        print("no-alert-dismissal couldn't check this command: %r" % error, file=sys.stderr)
        return 2
    print(
        "this dismisses a code scanning alert, and alerts never get dismissed. fix "
        "the code it points at. if you're sure it's a false positive, leave it open "
        "and bring me the alert link and your evidence.",
        file=sys.stderr,
    )
    return 2


sys.exit(main())
