"""Fixture repos for cleanup.py. run: python3 -m unittest discover <this dir>"""

import json
import os
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import cleanup  # noqa: E402

SCRIPT = Path(__file__).with_name("cleanup.py")
OLD = "2020-01-01T00:00:00"
OLD_ENV = {"GIT_COMMITTER_DATE": OLD, "GIT_AUTHOR_DATE": OLD}


def sh(cwd, *cmd, env=None):
    return subprocess.run(cmd, cwd=cwd, check=True, capture_output=True, text=True,
                          env={**os.environ, **(env or {})}).stdout.strip()


def commit(cwd, name, env=None):
    Path(cwd, name).write_text(name)
    sh(cwd, "git", "add", name)
    sh(cwd, "git", "commit", "-qm", name, env=env)


def cargo_target(path, age=0):
    target = Path(path, "target")
    (target / "debug").mkdir(parents=True)
    (target / "CACHEDIR.TAG").write_text("Signature: 8a477f597d28d172789f06886806bc55\n# created by cargo.\n")
    stamp = time.time() - age
    for p in (target / "debug", target):
        os.utime(p, (stamp, stamp))
    return target


class Fixture(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(os.path.realpath(tmp.name))
        git_env = {"GIT_CONFIG_GLOBAL": "/dev/null", "GIT_CONFIG_NOSYSTEM": "1",
                   "GIT_AUTHOR_NAME": "t", "GIT_AUTHOR_EMAIL": "t@example.com",
                   "GIT_COMMITTER_NAME": "t", "GIT_COMMITTER_EMAIL": "t@example.com"}
        self._env = {k: os.environ.get(k) for k in git_env}
        os.environ.update(git_env)
        self.addCleanup(lambda: [os.environ.pop(k) if v is None else os.environ.__setitem__(k, v) for k, v in self._env.items()])

        origin = self.root / "origin.git"
        sh(self.root, "git", "init", "-q", "--bare", "-b", "main", str(origin))
        self.repo = self.root / "repo"
        sh(self.root, "git", "clone", "-q", str(origin), str(self.repo))
        Path(self.repo, ".gitignore").write_text(".env.local\nlocal.db\nnode_modules/\ntarget/\n")
        sh(self.repo, "git", "add", ".gitignore")
        sh(self.repo, "git", "commit", "-qm", "init", env=OLD_ENV)
        sh(self.repo, "git", "push", "-q", "-u", "origin", "main")
        sh(self.repo, "git", "remote", "set-head", "origin", "main")

    def worktree(self, name, base="main", env=None):
        path = self.root / name
        sh(self.repo, "git", "worktree", "add", "-q", "-b", name, str(path), base, env=env)
        return path

    def merge(self, branch):
        sh(self.repo, "git", "merge", "-q", "--no-ff", "-m", f"merge {branch}", branch)
        sh(self.repo, "git", "push", "-q", "origin", "main")

    def run_script(self, *args):
        out = sh(self.repo, sys.executable, str(SCRIPT), "--json", *args)
        report = json.loads(out)
        return {(i.get("path") or i["branch"]): i for i in report[0]["items"]}, report[0]["notes"]

    def test_survey_and_apply(self):
        merged = self.worktree("merged")
        commit(merged, "a")
        self.merge("merged")

        dirty = self.worktree("dirty")
        commit(dirty, "b")
        self.merge("dirty")
        Path(dirty, "wip").write_text("wip")

        unmerged = self.worktree("unmerged")
        commit(unmerged, "c")
        idle_build = cargo_target(unmerged, age=7200)
        # a cargo tag on a tracked dir or one git doesn't ignore isn't build output
        tracked = Path(dirty, "vendored")
        tracked.mkdir()
        Path(tracked, "CACHEDIR.TAG").write_text(Path(idle_build, "CACHEDIR.TAG").read_text())
        sh(dirty, "git", "add", "vendored")
        sh(dirty, "git", "commit", "-qm", "vendored")
        forced = cargo_target(Path(dirty, "sub"), age=7200)
        Path(forced, "keep.rs").write_text("tracked")
        sh(dirty, "git", "add", "-f", "sub/target/keep.rs")
        sh(dirty, "git", "commit", "-qm", "forced")
        unsigned = Path(dirty, "other", "target")
        unsigned.mkdir(parents=True)
        Path(unsigned, "CACHEDIR.TAG").write_text("# created by cargo, but not cargo's tag\n")
        unignored = Path(dirty, "notes")
        unignored.mkdir()
        Path(unignored, "CACHEDIR.TAG").write_text(Path(idle_build, "CACHEDIR.TAG").read_text())

        fresh = self.worktree("fresh")
        fresh_build = cargo_target(fresh)
        stale = self.worktree("stale", env=OLD_ENV)

        review = self.worktree("review")
        commit(review, "d")
        self.merge("review")
        Path(review, ".env.local").write_text("KEY=1")
        Path(review, "local.db").write_text("rows")
        Path(self.repo, "local.db").write_text("rows")
        (review / "node_modules").mkdir()

        busy = self.worktree("busy")
        commit(busy, "e")
        self.merge("busy")
        busy_build = cargo_target(busy, age=7200)
        sleeper = subprocess.Popen(["sleep", "60"], cwd=busy)
        self.addCleanup(lambda: (sleeper.kill(), sleeper.wait()))

        locked = self.worktree("locked")
        commit(locked, "f")
        self.merge("locked")
        sh(self.repo, "git", "worktree", "lock", "--reason", "claude session x (pid 999999 start now)", str(locked))

        sh(self.repo, "git", "branch", "gone-merged", "merged")
        sh(self.repo, "git", "branch", "gone-unmerged", "unmerged")
        sh(self.repo, "git", "push", "-q", "origin", "gone-unmerged")
        pushed_ahead = self.worktree("pushed-ahead")
        commit(pushed_ahead, "g")
        sh(pushed_ahead, "git", "push", "-q", "origin", "pushed-ahead")
        commit(pushed_ahead, "h")
        sh(self.repo, "git", "branch", "gone-fresh", "main")
        sh(self.repo, "git", "branch", "gone-stale", "main", env=OLD_ENV)

        items, _ = self.run_script()
        expected = {
            str(merged): "remove", str(dirty): "keep", str(unmerged): "keep",
            str(fresh): "keep", str(stale): "remove", str(review): "review",
            str(busy): "keep", str(locked): "keep",
            str(idle_build): "clean build", str(fresh_build): "keep", str(busy_build): "keep",
            "gone-merged": "remove", "gone-unmerged": "keep", str(pushed_ahead): "keep",
            "gone-fresh": "keep", "gone-stale": "remove",
        }
        actual = {k: items[k]["action"] for k in expected}
        self.assertEqual(actual, expected, {k: items[k]["why"] for k in expected if actual[k] != expected[k]})
        self.assertNotIn(str(tracked), items)
        self.assertNotIn(str(unignored), items)
        self.assertNotIn(str(forced), items)
        self.assertNotIn(str(unsigned), items)
        self.assertEqual(items[str(review)]["ignored"], [".env.local", "local.db (same in main checkout)"])
        self.assertIn("1 commit not in origin/main, not on origin", items[str(unmerged)]["why"])
        self.assertIn("isn't running", items[str(locked)]["why"])
        self.assertEqual(items["gone-unmerged"]["why"], "1 commit not in origin/main, pushed")
        self.assertEqual(items[str(pushed_ahead)]["why"], "2 commits not in origin/main, 1 commit not pushed")
        self.assertIn("sleep", items[str(busy)]["why"])

        items, _ = self.run_script("--apply", "--include", str(review))
        for gone in (merged, stale, review, idle_build):
            self.assertFalse(gone.exists(), gone)
        for kept in (dirty, unmerged, fresh, busy, locked, fresh_build):
            self.assertTrue(kept.exists(), kept)
        branches = set(sh(self.repo, "git", "branch", "--format=%(refname:short)").split())
        self.assertEqual(branches, {"main", "dirty", "unmerged", "fresh", "busy", "locked", "gone-unmerged", "gone-fresh", "pushed-ahead"})

    def test_apply_skips_worktrees_that_changed(self):
        edited, committed = self.worktree("edited"), self.worktree("committed")
        for path in (edited, committed):
            commit(path, path.name)
            self.merge(path.name)
        sh(self.repo, "git", "branch", "moved", "main", env=OLD_ENV)
        unmerged = self.worktree("unmerged")
        commit(unmerged, "u")
        build = cargo_target(unmerged, age=7200)
        repo = cleanup.Repo(self.repo, fetch=False)
        items = cleanup.survey(repo, cleanup.live_processes())
        Path(edited, "new").write_text("written after the survey")
        commit(committed, "committed after the survey")
        sh(self.repo, "git", "branch", "-f", "moved", "unmerged")
        os.utime(build)
        cleanup.apply(repo, items)
        branches = sh(self.repo, "git", "branch", "--format=%(refname:short)").split()
        for path in (edited, committed, build):
            self.assertTrue(path.exists(), path)
        for branch in ("edited", "committed", "moved"):
            self.assertIn(branch, branches)

    def test_human_report(self):
        merged = self.worktree("merged")
        commit(merged, "a")
        self.merge("merged")
        Path(self.worktree("review", base="merged"), ".env.local").write_text("KEY=1")
        unmerged = self.worktree("unmerged")
        commit(unmerged, "b")
        build = cargo_target(unmerged, age=7200)
        nested = Path(unmerged, "vendor", "other")
        sh(self.root, "git", "init", "-q", str(nested))
        cargo_target(nested, age=7200)
        cargo_target(Path(unmerged, "deep", "er", "and", "deeper"), age=7200)
        pruned = self.worktree("pruned")
        sh(self.root, "rm", "-rf", str(pruned))
        held = self.worktree("held")
        sh(self.repo, "git", "worktree", "lock", "--reason", "claude session y (pid 1 start then)", str(held))
        other = self.root / "other-clone"
        sh(self.root, "git", "clone", "-q", str(self.root / "origin.git"), str(other))
        commit(other, "upstream")
        sh(other, "git", "push", "-q", "origin", "main")

        out = sh(self.repo, sys.executable, str(SCRIPT))
        self.assertIn(f"remove:\n  worktree  {merged}  merged  merged into origin/main", out)
        self.assertIn(f"  worktree  {pruned}  directory is gone (pruned)", out)
        self.assertIn("review (merged and clean, look at the ignored files, then pass --include):\n"
                      f"  worktree  {self.root / 'review'}  review  merged into origin/main  ignored files that would go: .env.local", out)
        self.assertIn(f"clean build output:\n  build output  {build}  0M  no process inside\n", out)
        self.assertIn(f"  worktree  {held}  held  locked (claude session y (pid 1 start then))", out)
        self.assertIn("main checkout (main) is 1 commit behind origin/main", out)
        self.assertEqual(out.count("  build output  "), 1)

    def test_squash_merged_pr_from_gh(self):
        squashed = self.worktree("squashed")
        commit(squashed, "a")
        head = sh(squashed, "git", "rev-parse", "HEAD")
        sh(self.repo, "git", "remote", "set-url", "origin", "https://github.com/example/repo.git")
        bin_dir = self.root / "bin"
        bin_dir.mkdir()
        gh = bin_dir / "gh"
        path = f"{bin_dir}:{os.environ['PATH']}"

        gh.write_text(f"#!/bin/sh\necho '[{{\"headRefName\": \"squashed\", \"headRefOid\": \"{head}\"}}]'\n")
        gh.chmod(0o755)
        out = sh(self.repo, sys.executable, str(SCRIPT), "--json", "--no-fetch", env={"PATH": path})
        items = {i.get("path"): i for i in json.loads(out)[0]["items"]}
        self.assertEqual((items[str(squashed)]["action"], items[str(squashed)]["why"]), ("remove", "PR merged"))

        gh.write_text("#!/bin/sh\nexit 1\n")
        out = sh(self.repo, sys.executable, str(SCRIPT), "--json", "--no-fetch", env={"PATH": path})
        self.assertIn("couldn't list merged PRs with gh, so squash-merged branches show as unmerged", json.loads(out)[0]["notes"])

    def test_fetch_failure_and_bad_paths(self):
        sh(self.repo, "git", "remote", "set-url", "origin", str(self.root / "missing.git"))
        _, notes = self.run_script()
        self.assertIn("git fetch failed, so remote state may be stale", notes)
        result = subprocess.run([sys.executable, str(SCRIPT), str(self.root)], capture_output=True, text=True)
        self.assertEqual((result.returncode, result.stderr.strip()), (1, f"{self.root}: not a git repo"))

    def test_apply_refuses_without_process_list(self):
        merged = self.worktree("merged")
        commit(merged, "a")
        self.merge("merged")
        argv, live = sys.argv, cleanup.live_processes
        self.addCleanup(setattr, sys, "argv", argv)
        self.addCleanup(setattr, cleanup, "live_processes", live)
        sys.argv = ["cleanup.py", "--apply", "--no-fetch", str(self.repo)]
        cleanup.live_processes = lambda: []
        self.assertEqual(cleanup.main(), 1)
        self.assertTrue(merged.exists())

    def test_own_shell_doesnt_keep_its_worktree(self):
        merged = self.worktree("merged")
        commit(merged, "a")
        self.merge("merged")
        unmerged = self.worktree("unmerged")
        commit(unmerged, "b")
        Path(cargo_target(unmerged, age=7200), "debug", "lib.rlib").write_bytes(b"0" * 3 * 1024 ** 2)
        os.utime(Path(unmerged, "target", "debug"), (0, 0))
        out = sh(merged, "sh", "-c", f"{sys.executable} {SCRIPT} --apply --no-fetch")
        self.assertFalse(merged.exists())
        self.assertIn("freed 3M", out)

    def test_merged_into_unpushed_local_main(self):
        local = self.worktree("local")
        commit(local, "a")
        sh(self.repo, "git", "merge", "-q", "--no-ff", "-m", "merge local", "local")
        items, _ = self.run_script()
        self.assertEqual((items[str(local)]["action"], items[str(local)]["why"]), ("remove", "merged into main"))

    def test_merged_pr_head_counts_as_merged(self):
        squashed = self.worktree("squashed")
        commit(squashed, "a")
        head = sh(squashed, "git", "rev-parse", "HEAD")
        repo = cleanup.Repo(self.repo, fetch=False)
        self.assertEqual(repo.merge_state(head, "squashed")[0], "unmerged")
        repo.pr_heads = {"squashed": {head}}
        self.assertEqual(repo.merge_state(head, "squashed"), ("merged", "PR merged"))

    def test_pr_updated_on_github_counts_as_merged(self):
        updated = self.worktree("updated")
        commit(updated, "a")
        head = sh(updated, "git", "rev-parse", "HEAD")
        # GitHub's copy gains a commit on top, then the branch is deleted on origin,
        # so the PR's head is only reachable through its pull ref
        sh(updated, "git", "push", "-q", "origin", "updated")
        github = self.root / "github"
        sh(self.root, "git", "clone", "-q", "-b", "updated", str(self.root / "origin.git"), str(github))
        commit(github, "b")
        pr_head = sh(github, "git", "rev-parse", "HEAD")
        sh(github, "git", "push", "-q", "origin", "HEAD:refs/pull/7/head", ":updated")
        repo = cleanup.Repo(self.repo, fetch=False)
        repo.pr_heads, repo.pr_numbers = {"updated": {pr_head}}, {pr_head: 7}
        self.assertEqual(repo.merge_state(head, "updated"), ("merged", "PR merged after updates on GitHub"))
        # a commit the PR never had keeps the branch
        commit(updated, "c")
        self.assertEqual(repo.merge_state(sh(updated, "git", "rev-parse", "HEAD"), "updated")[0], "unmerged")

    def test_notes_list_stashes_and_remote_branches(self):
        merged = self.worktree("merged")
        commit(merged, "a")
        sh(merged, "git", "push", "-q", "origin", "merged")
        self.merge("merged")
        Path(self.repo, ".gitignore").write_text("changed")
        sh(self.repo, "git", "stash", "-q")
        _, notes = self.run_script()
        self.assertIn("origin still has merged", notes)
        self.assertTrue(any(n.startswith("stash: stash@{0}") for n in notes), notes)


if __name__ == "__main__":
    unittest.main()
