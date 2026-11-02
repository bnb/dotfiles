# UserPromptSubmit hook: puts a tag at the front of the session title, like
# `python3 session-title-tag.py personal` for "[personal] start command
# bootstrap". the MARVIN workspaces register it in their own
# .claude/settings.json so their sessions tell apart in the picker and job
# list. Claude Code only applies its AI title while a session has none, and
# writes it during the first turn, so a new session gets the tag on its second
# prompt. tagging any earlier would leave the title as the bare tag.
import json
import sys


def ai_title(transcript_path):
    title = None
    try:
        with open(transcript_path) as transcript:
            for line in transcript:
                if '"ai-title"' not in line:
                    continue
                entry = json.loads(line)
                if entry.get("type") == "ai-title":
                    title = entry.get("aiTitle") or title
    except OSError:
        pass
    return title


def main():
    try:
        tag = "[%s]" % sys.argv[1]
        event = json.load(sys.stdin)
        # session_title is only a title set by hand, --name or a hook
        title = event.get("session_title") or ai_title(event.get("transcript_path") or "")
        if not title or title.startswith(tag):
            return 0
        output = {"hookEventName": "UserPromptSubmit", "sessionTitle": "%s %s" % (tag, title)}
        print(json.dumps({"hookSpecificOutput": output}))
    except Exception as error:
        # a title isn't worth blocking a prompt over
        print("session-title-tag couldn't set the title: %r" % error, file=sys.stderr)
    return 0


sys.exit(main())
