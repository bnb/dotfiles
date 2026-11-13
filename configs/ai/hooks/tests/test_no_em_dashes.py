"""no-em-dashes.py as Claude Code runs it. run: python3 -m unittest discover <this dir>"""

import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

HOOK = Path(__file__).parent.parent / "no-em-dashes.py"
# spelled so this file doesn't trip the hook it tests
DASH = chr(0x2014)
ENTITIES = ["&" + name + ";" for name in ("mdash", "#8212", "#x2014", "MDASH")]


class NoEmDashes(unittest.TestCase):
    def setUp(self):
        # next to the tests rather than in the temp dir, which is /tmp on Linux
        home = tempfile.TemporaryDirectory(dir=Path(__file__).parent)
        self.addCleanup(home.cleanup)
        self.home = home.name

    def run_hook(self, tool, **tool_input):
        event = json.dumps({"tool_name": tool, "tool_input": tool_input})
        env = dict(os.environ, HOME=self.home)
        return subprocess.run(["python3", str(HOOK)], input=event, capture_output=True, text=True, env=env)

    def assert_refused(self, tool, **tool_input):
        result = self.run_hook(tool, **tool_input)
        self.assertEqual(result.returncode, 2, tool_input)
        self.assertIn("em dash", result.stderr)

    def assert_allowed(self, tool, **tool_input):
        result = self.run_hook(tool, **tool_input)
        self.assertEqual(result.returncode, 0, tool_input)
        self.assertEqual(result.stderr, "")

    def test_refuses_adding_a_dash(self):
        notes = os.path.join(self.home, "notes.md")
        self.assert_refused("Write", file_path=notes, content="one %s two" % DASH)
        for entity in ENTITIES:
            with self.subTest(entity=entity):
                self.assert_refused("Write", file_path=notes, content="one %s two" % entity)
                self.assert_refused("Edit", file_path=notes, old_string="a", new_string="a %s b" % entity)
        self.assert_refused(
            "MultiEdit",
            file_path=notes,
            edits=[{"old_string": "a", "new_string": "b"}, {"old_string": "c", "new_string": "c %s d" % DASH}],
        )

    def test_counts_what_was_already_there(self):
        notes = Path(self.home, "notes.md")
        notes.write_text("old %s text" % DASH, encoding="utf-8")
        self.assert_allowed("Write", file_path=str(notes), content="new %s text" % DASH)
        self.assert_refused("Write", file_path=str(notes), content="new %s text %s" % (DASH, DASH))
        self.assert_allowed("Edit", file_path=str(notes), old_string="a %s b" % DASH, new_string="a %s c" % DASH)
        self.assert_allowed("Edit", file_path=str(notes), old_string="a %s b" % DASH, new_string="a, b")
        self.assert_allowed(
            "MultiEdit",
            file_path=str(notes),
            edits=[{"old_string": "a %s b" % DASH, "new_string": "a, b"}, {"old_string": "c", "new_string": "c %s d" % DASH}],
        )
        self.assert_allowed("Write", file_path=str(notes), content="plain")

    def test_skips_scratch_files(self):
        content = "one %s two" % DASH
        for path in [
            "/tmp/notes.md",
            "/private/tmp/claude-501/x/scratchpad/plan.md",
            os.path.join(self.home, ".claude/jobs/abc/tmp/script.py"),
            os.path.join(self.home, ".claude/jobs/abc/tmp/usage/report.md"),
        ]:
            with self.subTest(path=path):
                self.assert_allowed("Write", file_path=path, content=content)
                self.assert_allowed("Edit", file_path=path, old_string="a", new_string=content)

    def test_checks_paths_that_only_look_like_scratch(self):
        content = "one %s two" % DASH
        for path in [
            "/tmp/../Users/me/notes.md",
            "tmp/notes.md",
            os.path.join(self.home, ".claude/jobs/abc/notes.md"),
            os.path.join(self.home, ".claude/jobs/abc/tmp/../notes.md"),
            os.path.join(self.home, "GitHub/repo/tmp/notes.md"),
        ]:
            with self.subTest(path=path):
                self.assert_refused("Write", file_path=path, content=content)

    def test_ignores_other_tools(self):
        self.assert_allowed("Read", file_path="/repo/notes.md")


if __name__ == "__main__":
    unittest.main()
