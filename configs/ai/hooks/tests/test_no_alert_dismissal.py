"""no-alert-dismissal.py as Claude Code runs it. run: python3 -m unittest discover <this dir>"""

import json
import subprocess
import unittest
from pathlib import Path

HOOK = Path(__file__).parent.parent / "no-alert-dismissal.py"


def run(command):
    event = json.dumps({"tool_name": "Bash", "tool_input": {"command": command}})
    return subprocess.run(["python3", str(HOOK)], input=event, capture_output=True, text=True)


class NoAlertDismissal(unittest.TestCase):
    def test_refuses_dismissing_an_alert(self):
        for command in [
            "gh api -X PATCH repos/o/r/code-scanning/alerts/12 -f state=dismissed -f dismissed_reason='false positive'",
            "gh api --method PATCH /repos/o/r/code-scanning/alerts/3 -f state=dismissed",
            "gh api repos/o/r/code-scanning/alerts/3 --field 'state=dismissed'",
            "cd /tmp && gh api -X PATCH repos/o/r/code-scanning/alerts/1 -F dismissed_reason=used_in_tests -f state=dismissed",
            "true; gh api -X PATCH repos/o/r/code-scanning/alerts/1 -f state=DISMISSED",
            "gh api -X PATCH repos/o/r/code-scanning/alerts/1 --field=state=dismissed",
            "gh api -X PATCH repos/o/r/code-scanning/alerts/1 -fstate=dismissed",
            "gh api -X PATCH repos/o/r/code-scanning/alerts/1 --input body.json",
        ]:
            with self.subTest(command=command):
                result = run(command)
                self.assertEqual(result.returncode, 2, command)
                self.assertIn("never get dismissed", result.stderr)

    def test_allows_reading_alerts(self):
        for command in [
            "gh api repos/o/r/code-scanning/alerts --jq '.[].number'",
            "gh api repos/o/r/code-scanning/alerts/12",
            "gh api 'repos/o/r/code-scanning/alerts?state=dismissed&per_page=100'",
            "gh api -X PATCH repos/o/r/code-scanning/alerts/12 -f state=open",
            "gh api repos/o/r/pulls/1",
            "echo code-scanning/alerts dismissed",
        ]:
            with self.subTest(command=command):
                result = run(command)
                self.assertEqual(result.returncode, 0, command)
                self.assertEqual(result.stderr, "")


if __name__ == "__main__":
    unittest.main()
