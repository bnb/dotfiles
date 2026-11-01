//! Runs git against one directory.

use std::path::PathBuf;
use std::process::Command;

use anyhow::{Context, Result, bail};

/// What a finished git command printed and how it exited.
pub struct Output {
    pub code: i32,
    pub stdout: String,
    pub stderr: String,
}

pub struct Git {
    dir: PathBuf,
}

impl Git {
    pub fn new(dir: impl Into<PathBuf>) -> Self {
        Self { dir: dir.into() }
    }

    /// Runs git, returning its output whatever the exit code. Only failing to start it, or a
    /// signal killing it, is an error.
    pub fn raw(&self, args: &[&str], envs: &[(&str, &str)]) -> Result<Output> {
        let output = Command::new("git")
            .arg("-C")
            .arg(&self.dir)
            .args(args)
            // Other agents work in these repos: never take index.lock just to refresh stat info.
            .env("GIT_OPTIONAL_LOCKS", "0")
            .envs(envs.iter().copied())
            .output()
            .with_context(|| format!("couldn't run git {}", args.join(" ")))?;
        let code = output.status.code().with_context(|| format!("git {} was killed by a signal", args.join(" ")))?;
        Ok(Output {
            code,
            stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
            stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
        })
    }

    /// Runs git and returns its trimmed stdout, failing with git's stderr on a nonzero exit.
    pub fn run_with_env(&self, args: &[&str], envs: &[(&str, &str)]) -> Result<String> {
        let output = self.raw(args, envs)?;
        if output.code != 0 {
            bail!("git -C {} {} exited {}: {}", self.dir.display(), args.join(" "), output.code, output.stderr.trim());
        }
        Ok(output.stdout.trim_end().to_owned())
    }

    pub fn run(&self, args: &[&str]) -> Result<String> {
        self.run_with_env(args, &[])
    }

    /// Like [`Git::run`], but a nonzero exit is `None` rather than an error.
    pub fn try_run(&self, args: &[&str]) -> Result<Option<String>> {
        let output = self.raw(args, &[])?;
        Ok((output.code == 0).then(|| output.stdout.trim_end().to_owned()))
    }

    /// Resolves a revision to a full commit id.
    pub fn commit_id(&self, rev: &str) -> Result<String> {
        self.run(&["rev-parse", "--verify", &format!("{rev}^{{commit}}")])
    }
}
