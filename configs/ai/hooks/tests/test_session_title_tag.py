"""session-title-tag.py as Claude Code runs it. run: python3 -m unittest discover <this dir>"""

import json
import subprocess
import tempfile
import unittest
from pathlib import Path

HOOK = Path(__file__).parent.parent / "session-title-tag.py"


def run(session_title=None, transcript=(), tag="personal"):
    with tempfile.NamedTemporaryFile("w", suffix=".jsonl") as file:
        file.writelines(json.dumps(entry) + "\n" for entry in transcript)
        file.flush()
        event = {"hook_event_name": "UserPromptSubmit", "transcript_path": file.name, "prompt": "hi"}
        if session_title is not None:
            event["session_title"] = session_title
        return subprocess.run(
            ["python3", str(HOOK), tag], input=json.dumps(event), capture_output=True, text=True
        )


def title(result):
    if not result.stdout:
        return None
    return json.loads(result.stdout)["hookSpecificOutput"]["sessionTitle"]


def ai_title(text):
    return {"type": "ai-title", "aiTitle": text, "sessionId": "s"}


class SessionTitleTag(unittest.TestCase):
    def test_tags_the_latest_ai_title(self):
        transcript = [{"type": "user"}, ai_title("first guess"), ai_title("start command bootstrap")]
        result = run(transcript=transcript)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(title(result), "[personal] start command bootstrap")

    def test_tags_a_title_set_by_hand(self):
        result = run("my rename", [ai_title("ignored")], tag="work")
        self.assertEqual(title(result), "[work] my rename")

    def test_leaves_a_tagged_title_alone(self):
        self.assertIsNone(title(run("[personal] already")))

    def test_waits_for_a_title(self):
        result = run(transcript=[{"type": "user"}])
        self.assertEqual(result.returncode, 0)
        self.assertIsNone(title(result))

    def test_never_blocks_the_prompt(self):
        result = subprocess.run(["python3", str(HOOK), "personal"], input="not json", capture_output=True, text=True)
        self.assertEqual(result.returncode, 0)
        self.assertIn("couldn't set the title", result.stderr)


if __name__ == "__main__":
    unittest.main()
