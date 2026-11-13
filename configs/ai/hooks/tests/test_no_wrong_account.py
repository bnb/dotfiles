"""no-wrong-account.py as Claude Code runs it, against real git repos and a
stand-in gh. run: python3 -m unittest discover <this dir>"""

import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

HOOK = Path(__file__).parent.parent / "no-wrong-account.py"
WORK = "tierney@assistant-ui.com"
WORK_BOT = "tierney+botandbang@assistant-ui.com"
MINE = "hello@bnb.im"
# answers gh auth status --json as $GH_LOGIN, and fails like a signed-out gh
# without it, so a read that asked gh would fail closed and show up
FAKE_GH = """#!/bin/sh
[ -n "$GH_LOGIN" ] || exit 1
printf '{"hosts":{"github.com":[{"active":true,"login":"%s"}]}}' "$GH_LOGIN"
"""


class NoWrongAccount(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        home = tempfile.TemporaryDirectory()
        cls.addClassCleanup(home.cleanup)
        cls.home = os.path.realpath(home.name)
        # no global or system git config, so each repo's own email is what counts
        cls.env = {
            key: value
            for key, value in os.environ.items()
            if not key.startswith(("GIT_", "GH_")) and key not in ("GITHUB_TOKEN", "EMAIL")
        }
        bin_dir = Path(cls.home, "bin")
        bin_dir.mkdir()
        Path(bin_dir, "gh").write_text(FAKE_GH)
        Path(bin_dir, "gh").chmod(0o755)
        cls.env.update(
            HOME=cls.home,
            GIT_CONFIG_GLOBAL=os.devnull,
            GIT_CONFIG_NOSYSTEM="1",
            PATH="%s%s%s" % (bin_dir, os.pathsep, os.environ["PATH"]),
        )
        cls.work = cls.repo("GitHub/assistant-ui/app", WORK)
        cls.work_bot = cls.repo("GitHub/assistant-ui/bot", WORK_BOT)
        cls.work_wrong = cls.repo("GitHub/assistant-ui/wrong", MINE)
        cls.mine = cls.repo("GitHub/bnb/mine", MINE)
        cls.mine_leak = cls.repo("GitHub/bnb/leak", WORK)
        cls.work_clone = cls.repo("elsewhere/clone", WORK, remote="git@github.com:assistant-ui/clone.git")
        cls.work_clone_wrong = cls.repo("elsewhere/wrong", MINE, remote="https://github.com/assistant-ui/x.git")
        cls.git(cls.work, "commit", "--allow-empty", "-q", "-m", "init")
        cls.work_worktree = os.path.join(cls.home, "scratch/wt")
        cls.git(cls.work, "worktree", "add", "-q", cls.work_worktree)

    @classmethod
    def git(cls, directory, *args):
        subprocess.run(["git", "-C", directory, *args], check=True, env=cls.env, capture_output=True)

    @classmethod
    def repo(cls, path, email, remote=None):
        directory = os.path.join(cls.home, path)
        os.makedirs(directory)
        cls.git(directory, "init", "-q")
        cls.git(directory, "config", "user.email", email)
        cls.git(directory, "config", "user.name", "Tierney Cyren")
        if remote:
            cls.git(directory, "remote", "add", "origin", remote)
        return directory

    def run_hook(self, command, cwd, login=None, **env):
        event = json.dumps({"tool_name": "Bash", "tool_input": {"command": command}, "cwd": cwd})
        env = dict(self.env, **env, **({"GH_LOGIN": login} if login else {}))
        return subprocess.run(["python3", str(HOOK)], input=event, capture_output=True, text=True, env=env)

    def assert_refused(self, command, cwd, login=None, says="the wrong", **env):
        result = self.run_hook(command, cwd, login, **env)
        self.assertEqual(result.returncode, 2, (command, cwd, result.stderr))
        self.assertIn(says, result.stderr)

    def assert_allowed(self, command, cwd, login=None, **env):
        result = self.run_hook(command, cwd, login, **env)
        self.assertEqual(result.returncode, 0, (command, cwd, result.stderr))
        self.assertEqual(result.stderr, "")

    def test_refuses_committing_as_the_other_side(self):
        for command, cwd in [
            ("git commit -m x", self.work_wrong),
            ("git push", self.work_wrong),
            ("git push origin HEAD", self.work_clone_wrong),
            ("git commit -m x", self.mine_leak),
            ("git -C %s commit -m x" % self.work_wrong, self.home),
            ("git -C GitHub/assistant-ui/wrong push", self.home),
            ("cd ~/GitHub/assistant-ui/wrong && git push", self.home),
            ("cd GitHub && cd bnb/leak && git commit -m x", self.home),
            ("git status && git commit -m x", self.mine_leak),
            ("WT=%s; cd $WT && git commit -m x" % self.work_wrong, self.work),
            ("WT=~/GitHub/bnb/leak && cd \"${WT}\" && git push", self.work),
        ]:
            with self.subTest(command=command, cwd=cwd):
                self.assert_refused(command, cwd, says="would commit as")

    def test_counts_identity_from_the_environment(self):
        self.assert_refused("git commit -m x", self.mine, says=WORK, GIT_AUTHOR_EMAIL=WORK)
        self.assert_refused("git commit -m x", self.work, says=MINE, GIT_COMMITTER_EMAIL=MINE)

    def test_refuses_what_it_cant_place(self):
        for command in [
            "cd $WT && git commit -m x",
            "WT=/x git status; cd $WT && git commit -m x",
            "git -C $WT commit -m x",
            "cd - && git push",
            "cd $WT && gh pr create --fill",
        ]:
            with self.subTest(command=command):
                self.assert_refused(command, self.work, login="bnb", says="couldn't tell which repo")

    def test_allows_each_side_its_own_identity(self):
        for command, cwd in [
            ("git commit -m x", self.work),
            ("git push", self.work_bot),
            ("git commit -m x", self.work_worktree),
            ("git commit -m x", self.work_clone),
            ("git commit -m x", self.mine),
            ("git push origin main", self.mine),
            ("cd ~/GitHub/bnb/mine && git commit -m x", self.work),
            ("git -C %s commit -m x" % self.work, self.mine),
            ("cd $WT && git -C %s commit -m x" % self.work, self.mine),
            ("WT=%s; cd $WT && git commit -m x" % self.mine, self.work),
            ("WT=%s && git -C \"$WT\" push" % self.work_bot, self.mine),
            ("git -C $HOME/GitHub/bnb/mine commit -m x", self.work),
            ("git push", self.home),
        ]:
            with self.subTest(command=command, cwd=cwd):
                self.assert_allowed(command, cwd)

    def test_refuses_gh_writes_from_an_account_thats_not_mine(self):
        for command, cwd in [
            ("gh pr create --fill", self.work),
            ("gh pr merge 1 --squash", self.mine),
            ("gh pr edit 1 --add-label x", self.work),
            ("gh pr comment 1 --body hi", self.mine),
            ("gh issue create --title x --body y", self.home),
            ("gh issue comment 1 -b hi -R assistant-ui/x", self.home),
            ("gh api -X POST repos/bnb/x/issues -f title=t", self.home),
            ("gh api --method=PATCH repos/assistant-ui/x/pulls/1", self.home),
            ("gh api repos/bnb/x/issues -f title=t", self.home),
            ("gh api repos/bnb/x/contents/a --input body.json", self.home),
            ("gh api graphql -f query='mutation { addComment { id } }'", self.mine),
            ("gh api graphql -F query=@q.graphql", self.mine),
        ]:
            with self.subTest(command=command):
                self.assert_refused(command, cwd, login="someone", says="gh would act as someone")

    def test_allows_gh_writes_from_my_accounts(self):
        for login in ["bnb", "botandbang"]:
            for command, cwd in [
                ("gh pr create --fill", self.work),
                ("gh pr merge 1 --squash", self.mine),
                ("gh issue comment 1 -b hi -R assistant-ui/x", self.mine),
                ("gh api -X POST repos/bnb/x/issues -f title=t", self.work),
            ]:
                with self.subTest(command=command, login=login):
                    self.assert_allowed(command, cwd, login=login)

    def test_reads_never_ask_git_or_gh(self):
        # the stand-in gh fails without GH_LOGIN, so any of these that asked it would be refused
        for command in [
            "gh pr view 1",
            "gh pr list",
            "gh issue view 1",
            "gh api repos/o/r/pulls",
            "gh api -X GET repos/o/r/pulls -f per_page=1",
            "gh api graphql -f query='query { viewer { login } }'",
            "git status",
            "git log --oneline",
            "echo git push",
            "cd $WT && git status",
            "",
        ]:
            with self.subTest(command=command):
                self.assert_allowed(command, self.work_wrong)

    def test_fails_closed(self):
        result = subprocess.run(["python3", str(HOOK)], input="not json", capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("couldn't check", result.stderr)
        # a gh write while gh can't say who it is
        self.assert_refused("gh pr create --fill", self.work, says="couldn't check")


if __name__ == "__main__":
    unittest.main()
