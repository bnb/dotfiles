//! Reads the session and job files Claude Code keeps under its config dir.

use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use indexmap::IndexMap;
use jiff::Timestamp;
use rustc_hash::FxBuildHasher;
use rustix::io::Errno;
use rustix::process::{Pid, test_kill_process};
use serde::Deserialize;
use serde::de::DeserializeOwned;

/// `<claude-dir>/sessions/<pid>.json`, written by every running Claude Code process.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionFile {
    pid: i32,
    session_id: String,
    cwd: Option<PathBuf>,
    kind: Option<String>,
    name: Option<String>,
    status: Option<String>,
    /// Milliseconds since the epoch.
    updated_at: Option<i64>,
    messaging_socket_path: Option<PathBuf>,
}

/// `<claude-dir>/jobs/<id>/state.json`, which outlives the process that ran the job.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JobState {
    session_id: String,
    state: Option<String>,
    detail: Option<String>,
    name: Option<String>,
    worktree_path: Option<PathBuf>,
    worktree_branch: Option<String>,
    cwd: Option<PathBuf>,
    /// ISO 8601.
    updated_at: Option<String>,
}

/// Everything the session and job files say about one session.
#[derive(Debug, Default)]
pub struct Record {
    pub session_id: String,
    pub pid: Option<i32>,
    pub alive: bool,
    pub name: Option<String>,
    pub kind: Option<String>,
    pub live_status: Option<String>,
    pub job_state: Option<String>,
    pub job_detail: Option<String>,
    pub cwd: Option<PathBuf>,
    pub worktree_path: Option<PathBuf>,
    pub worktree_branch: Option<String>,
    pub updated_at: Option<Timestamp>,
    pub messaging_socket_path: Option<PathBuf>,
}

/// Loads every job and session under `claude_dir`, merged by session id.
pub fn load(claude_dir: &Path) -> Result<Vec<Record>> {
    let mut records: IndexMap<String, Record, FxBuildHasher> = IndexMap::default();
    for dir in entries(&claude_dir.join("jobs"))? {
        let path = dir.join("state.json");
        if !path.is_file() {
            continue;
        }
        let Some(job) = parse::<JobState>(&path) else {
            continue;
        };
        let record = records.entry(job.session_id.clone()).or_default();
        record.session_id = job.session_id;
        record.job_state = job.state;
        record.job_detail = job.detail;
        record.name = job.name;
        record.worktree_path = job.worktree_path;
        record.worktree_branch = job.worktree_branch;
        record.cwd = job.cwd;
        record.updated_at = job.updated_at.and_then(|at| at.parse().ok());
    }

    let mut sessions: Vec<(bool, SessionFile)> = entries(&claude_dir.join("sessions"))?
        .into_iter()
        .filter(|path| path.extension().is_some_and(|ext| ext == "json"))
        .filter_map(|path| parse::<SessionFile>(&path))
        .map(|session| (is_alive(session.pid), session))
        .collect();
    // A stale file can share its session id with a live one; overlaying live and newest last
    // lets those win.
    sessions.sort_by_key(|(alive, session)| (*alive, session.updated_at));
    for (alive, session) in sessions {
        let record = records.entry(session.session_id.clone()).or_default();
        record.session_id = session.session_id;
        record.pid = Some(session.pid);
        record.alive = alive;
        record.live_status = session.status;
        record.messaging_socket_path = session.messaging_socket_path;
        record.name = session.name.or(record.name.take());
        record.kind = session.kind.or(record.kind.take());
        record.cwd = session.cwd.or(record.cwd.take());
        let updated_at = session.updated_at.and_then(|ms| Timestamp::from_millisecond(ms).ok());
        record.updated_at = updated_at.or(record.updated_at);
    }
    Ok(records.into_values().collect())
}

/// Whether a process with this pid exists. EPERM still means it does, just not as ours.
pub fn is_alive(pid: i32) -> bool {
    if pid <= 0 {
        return false;
    }
    Pid::from_raw(pid).is_some_and(|pid| matches!(test_kill_process(pid), Ok(()) | Err(Errno::PERM)))
}

/// The entries of `dir`, sorted, or none when it doesn't exist.
pub fn entries(dir: &Path) -> Result<Vec<PathBuf>> {
    let read = match fs::read_dir(dir) {
        Ok(read) => read,
        Err(err) if err.kind() == ErrorKind::NotFound => return Ok(Vec::new()),
        Err(err) => return Err(err).with_context(|| format!("couldn't list {}", dir.display())),
    };
    let mut paths = read
        .map(|entry| entry.map(|entry| entry.path()))
        .collect::<Result<Vec<_>, _>>()
        .with_context(|| format!("couldn't list {}", dir.display()))?;
    paths.sort();
    Ok(paths)
}

/// Parses one JSON file. A file Claude Code is midway through writing shouldn't sink the whole
/// census, so failures are a warning.
fn parse<T: DeserializeOwned>(path: &Path) -> Option<T> {
    let parsed = fs::read(path).map_err(anyhow::Error::from).and_then(|bytes| Ok(serde_json::from_slice(&bytes)?));
    parsed.inspect_err(|err| eprintln!("coord: skipping {}: {err}", path.display())).ok()
}
