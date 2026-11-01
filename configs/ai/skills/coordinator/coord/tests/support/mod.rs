//! Fixtures shared by the test binaries: isolated git repos and a way to run `coord`.

#![allow(dead_code)] // each test binary uses its own subset

use std::path::Path;
use std::process::{Command, Output};

/// Keeps the user's global config (signing through 1Password, conditional includes) out of
/// every git process a test starts, coord's own included.
pub const ISOLATED_GIT: [(&str, &str); 2] = [("GIT_CONFIG_GLOBAL", "/dev/null"), ("GIT_CONFIG_NOSYSTEM", "1")];

/// Runs git in `dir` and returns its trimmed stdout, panicking on failure.
pub fn git(dir: &Path, args: &[&str]) -> String {
    let output = Command::new("git").arg("-C").arg(dir).args(args).envs(ISOLATED_GIT).output().expect("git runs");
    assert!(output.status.success(), "git {args:?} failed: {}", String::from_utf8_lossy(&output.stderr));
    String::from_utf8_lossy(&output.stdout).trim_end().to_owned()
}

/// A fresh repo on `main` with an identity, so commits work without global config.
pub fn init_repo(dir: &Path) {
    std::fs::create_dir_all(dir).expect("repo dir");
    git(dir, &["init", "-q", "-b", "main"]);
    git(dir, &["config", "user.name", "test"]);
    git(dir, &["config", "user.email", "test@localhost"]);
    git(dir, &["config", "commit.gpgsign", "false"]);
}

/// Writes `files` and commits them all.
pub fn commit(dir: &Path, message: &str, files: &[(&str, &str)]) {
    for (name, content) in files {
        std::fs::write(dir.join(name), content).expect("write file");
    }
    git(dir, &["add", "-A"]);
    git(dir, &["commit", "-q", "--allow-empty", "-m", message]);
}

/// Runs the built `coord` binary with isolated git config and extra environment.
pub fn coord(args: &[&str], envs: &[(&str, &Path)]) -> Output {
    Command::new(env!("CARGO_BIN_EXE_coord"))
        .args(args)
        .envs(ISOLATED_GIT)
        .envs(envs.iter().map(|(key, value)| (*key, value.as_os_str())))
        .output()
        .expect("coord runs")
}

pub fn stdout(output: &Output) -> String {
    String::from_utf8_lossy(&output.stdout).into_owned()
}

pub fn stderr(output: &Output) -> String {
    String::from_utf8_lossy(&output.stderr).into_owned()
}

/// Runs coord, asserts it succeeded, and parses its JSON output.
pub fn coord_json(args: &[&str], envs: &[(&str, &Path)]) -> serde_json::Value {
    let output = coord(args, envs);
    assert!(output.status.success(), "coord {args:?} failed: {}", stderr(&output));
    serde_json::from_slice(&output.stdout).expect("coord prints JSON")
}
