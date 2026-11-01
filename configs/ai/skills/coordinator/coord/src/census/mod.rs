//! `coord census`: the Claude Code sessions on this machine, live ones and recent stopped ones.

mod render;
mod repo;
pub mod sources;
pub mod transcript;

use std::cmp::Reverse;
use std::io::Write;
use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use jiff::{SignedDuration, Timestamp};
use serde::Serialize;

use crate::cli::CensusArgs;

/// One session as the census reports it.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub session_id: String,
    pub name: Option<String>,
    pub kind: Option<String>,
    /// The live status, else the job's last state, else "stopped".
    pub status: String,
    pub alive: bool,
    pub pid: Option<i32>,
    pub live_status: Option<String>,
    pub job_state: Option<String>,
    pub job_detail: Option<String>,
    pub cwd: Option<PathBuf>,
    pub worktree_path: Option<PathBuf>,
    pub worktree_branch: Option<String>,
    pub repo: Option<PathBuf>,
    pub repo_name: Option<String>,
    pub branch: Option<String>,
    pub dirty: Option<usize>,
    pub unpushed: Option<usize>,
    pub last_activity: Option<Timestamp>,
    pub age_seconds: Option<i64>,
    pub last_user_prompt: Option<String>,
    pub last_assistant_text: Option<String>,
    pub transcript_path: Option<PathBuf>,
    pub messaging_socket_path: Option<PathBuf>,
}

pub struct Options {
    pub claude_dir: PathBuf,
    pub projects_dirs: Vec<PathBuf>,
    pub since: SignedDuration,
    pub exclude: Vec<PathBuf>,
    pub now: Timestamp,
}

pub fn run(args: CensusArgs, out: &mut dyn Write) -> Result<()> {
    let home = std::env::home_dir();
    let expand = |path: &Path| expand_tilde(path, home.as_deref());
    let claude_dir = match &args.claude_dir {
        Some(dir) => expand(dir),
        None => home.as_deref().context("no home directory; pass --claude-dir")?.join(".claude"),
    };
    let projects_dirs = if args.projects_dirs.is_empty() {
        vec![claude_dir.join("projects")]
    } else {
        args.projects_dirs.iter().map(|dir| expand(dir)).collect()
    };
    let options = Options {
        exclude: args.exclude.iter().map(|path| expand(path)).collect(),
        claude_dir,
        projects_dirs,
        since: args.since,
        now: Timestamp::now(),
    };
    let sessions = census(&options)?;
    if args.json {
        serde_json::to_writer_pretty(&mut *out, &sessions)?;
        writeln!(out)?;
        return Ok(());
    }
    out.write_all(render::table(&sessions).as_bytes())?;
    Ok(())
}

/// Lists live sessions plus stopped ones active within `since`, live first, then newest first.
pub fn census(options: &Options) -> Result<Vec<Session>> {
    let cutoff = options.now - options.since;
    let is_recent = |at: Option<Timestamp>| at.is_some_and(|at| at >= cutoff);
    let project_dirs = transcript::project_dirs(&options.projects_dirs)?;
    let mut sessions = Vec::new();
    for record in sources::load(&options.claude_dir)? {
        let excluded = [&record.cwd, &record.worktree_path]
            .into_iter()
            .flatten()
            .any(|path| options.exclude.iter().any(|prefix| path.starts_with(prefix)));
        if excluded {
            continue;
        }
        let transcript = transcript::find(&project_dirs, &record.session_id);
        // A transcript's mtime bounds its newest timestamp, so it rules out old sessions
        // without reading them.
        let latest_hint = record.updated_at.max(transcript.as_ref().map(|(_, modified)| *modified));
        if !record.alive && !is_recent(latest_hint) {
            continue;
        }
        let tail = match &transcript {
            Some((path, _)) => transcript::read_tail(path)
                .inspect_err(|err| eprintln!("coord: skipping transcript: {err:#}"))
                .unwrap_or_default(),
            None => transcript::Tail::default(),
        };
        let last_activity = tail.last_timestamp.or(record.updated_at);
        if !record.alive && !is_recent(last_activity) {
            continue;
        }
        let repo = match record.worktree_path.as_ref().or(record.cwd.as_ref()) {
            Some(dir) => repo::inspect(dir)?,
            None => None,
        };
        sessions.push(Session {
            status: status(&record),
            age_seconds: last_activity.map(|at| options.now.duration_since(at).as_secs()),
            last_activity,
            last_user_prompt: tail.last_user_prompt,
            last_assistant_text: tail.last_assistant_text,
            transcript_path: transcript.map(|(path, _)| path),
            repo_name: repo.as_ref().map(|repo| repo.name.clone()),
            branch: repo.as_ref().and_then(|repo| repo.branch.clone()),
            dirty: repo.as_ref().map(|repo| repo.dirty),
            unpushed: repo.as_ref().and_then(|repo| repo.unpushed),
            repo: repo.map(|repo| repo.toplevel),
            session_id: record.session_id,
            name: record.name,
            kind: record.kind,
            alive: record.alive,
            pid: record.pid,
            live_status: record.live_status,
            job_state: record.job_state,
            job_detail: record.job_detail,
            cwd: record.cwd,
            worktree_path: record.worktree_path,
            worktree_branch: record.worktree_branch,
            messaging_socket_path: record.messaging_socket_path,
        });
    }
    sessions.sort_by_key(|session| (Reverse(session.alive), Reverse(session.last_activity)));
    Ok(sessions)
}

/// A dead process's status file still says "busy", so only a live one's status counts.
fn status(record: &sources::Record) -> String {
    let live = record.live_status.as_ref().filter(|_| record.alive);
    live.or(record.job_state.as_ref()).map_or_else(|| "stopped".to_owned(), Clone::clone)
}

/// Expands a leading `~` the shell left alone, as in `--exclude=~/scratch`.
pub fn expand_tilde(path: &Path, home: Option<&Path>) -> PathBuf {
    match (path.strip_prefix("~"), home) {
        (Ok(rest), Some(home)) => home.join(rest),
        _ => path.to_path_buf(),
    }
}
