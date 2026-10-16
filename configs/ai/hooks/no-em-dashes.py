# PreToolUse hook for Write, Edit, and MultiEdit: refuses an edit that adds an
# em dash (the character or its HTML entities). counts what the file or the
# replaced text already had, so editing a file that has some still works.
import json
import re
import sys

# spelled so this file doesn't trip the em dash checks it backs
DASH = re.compile("\u2014|&(?:mdash|#8212|#x2014);", re.IGNORECASE)


def count(text):
    return len(DASH.findall(text or ""))


def main():
    event = json.load(sys.stdin)
    tool = event.get("tool_name")
    args = event.get("tool_input") or {}

    if tool == "Write":
        try:
            with open(args.get("file_path", ""), encoding="utf-8") as current:
                before = count(current.read())
        except (OSError, UnicodeDecodeError):
            before = 0
        added = count(args.get("content")) - before
    elif tool == "Edit":
        added = count(args.get("new_string")) - count(args.get("old_string"))
    elif tool == "MultiEdit":
        edits = args.get("edits") or []
        added = sum(count(e.get("new_string")) - count(e.get("old_string")) for e in edits)
    else:
        return 0

    if added <= 0:
        return 0
    print(
        "this edit adds %d em dash%s (U+2014 or an HTML entity for it). restructure "
        "those sentences instead: use a period, comma, colon, or parentheses."
        % (added, "" if added == 1 else "es"),
        file=sys.stderr,
    )
    return 2


sys.exit(main())
