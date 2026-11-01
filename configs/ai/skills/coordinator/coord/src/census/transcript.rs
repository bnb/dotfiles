//! Pulls a session's latest prompt, reply, and activity time out of its transcript.

use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use jiff::Timestamp;
use serde::Deserialize;

/// How much of a transcript's end to read. Transcripts reach hundreds of MB, and the latest
/// exchange is near the end.
pub const TAIL_BYTES: u64 = 2 * 1024 * 1024;

/// What the end of a transcript says about the session.
#[derive(Debug, Default, PartialEq, Eq)]
pub struct Tail {
    pub last_user_prompt: Option<String>,
    pub last_assistant_text: Option<String>,
    pub last_timestamp: Option<Timestamp>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Line {
    #[serde(rename = "type")]
    kind: Option<String>,
    is_meta: Option<bool>,
    is_sidechain: Option<bool>,
    message: Option<Message>,
    attachment: Option<Attachment>,
    timestamp: Option<String>,
}

#[derive(Deserialize)]
struct Message {
    content: Option<Content>,
}

#[derive(Deserialize)]
#[serde(untagged)]
enum Content {
    Text(String),
    Blocks(Vec<Block>),
}

#[derive(Deserialize)]
struct Block {
    #[serde(rename = "type")]
    kind: Option<String>,
    text: Option<String>,
}

/// A message the user typed while a turn was running.
#[derive(Deserialize)]
struct Attachment {
    #[serde(rename = "type")]
    kind: Option<String>,
    prompt: Option<Content>,
    origin: Option<Origin>,
}

#[derive(Deserialize)]
struct Origin {
    kind: Option<String>,
}

impl Content {
    /// The text blocks joined, or `None` when there are none (tool results only).
    fn text(&self) -> Option<String> {
        let blocks = match self {
            Content::Text(text) => return Some(text.clone()),
            Content::Blocks(blocks) => blocks,
        };
        let texts: Vec<&str> = blocks
            .iter()
            .filter(|block| block.kind.as_deref() == Some("text"))
            .filter_map(|block| block.text.as_deref())
            .collect();
        (!texts.is_empty()).then(|| texts.join("\n"))
    }
}

impl Line {
    fn is_main_thread(&self) -> bool {
        !self.is_sidechain.unwrap_or(false)
    }

    /// The prompt a person typed, if this line carries one.
    fn user_prompt(&self) -> Option<String> {
        if !self.is_main_thread() {
            return None;
        }
        let content = match self.kind.as_deref()? {
            "user" if !self.is_meta.unwrap_or(false) => self.message.as_ref()?.content.as_ref()?,
            "attachment" => {
                let attachment = self.attachment.as_ref()?;
                let queued = attachment.kind.as_deref() == Some("queued_command");
                let human = attachment.origin.as_ref()?.kind.as_deref() == Some("human");
                if !(queued && human) {
                    return None;
                }
                attachment.prompt.as_ref()?
            }
            _ => return None,
        };
        let text = content.text()?;
        // Slash commands, hook output and system reminders arrive wrapped in tags.
        let typed = !text.trim().is_empty() && !text.trim_start().starts_with('<');
        typed.then_some(text)
    }

    fn assistant_text(&self) -> Option<String> {
        if self.kind.as_deref() != Some("assistant") || !self.is_main_thread() {
            return None;
        }
        let text = self.message.as_ref()?.content.as_ref()?.text()?;
        (!text.trim().is_empty()).then_some(text)
    }
}

/// Reads the last [`TAIL_BYTES`] of a transcript.
pub fn read_tail(path: &Path) -> Result<Tail> {
    let mut file = File::open(path).with_context(|| format!("couldn't open {}", path.display()))?;
    let len = file.metadata()?.len();
    let start = len.saturating_sub(TAIL_BYTES);
    file.seek(SeekFrom::Start(start))?;
    let mut bytes = Vec::new();
    file.read_to_end(&mut bytes).with_context(|| format!("couldn't read {}", path.display()))?;
    // Mid-file, the first line is a fragment of a longer one.
    let whole = match (start > 0, bytes.iter().position(|b| *b == b'\n')) {
        (false, _) => &bytes[..],
        (true, Some(newline)) => &bytes[newline + 1..],
        (true, None) => &[],
    };
    Ok(parse_lines(whole))
}

/// Scans JSONL transcript lines, skipping any that don't parse.
pub fn parse_lines(bytes: &[u8]) -> Tail {
    let mut tail = Tail::default();
    for raw in bytes.split(|b| *b == b'\n') {
        let Ok(line) = serde_json::from_slice::<Line>(raw) else {
            continue;
        };
        let at = line.timestamp.as_deref().and_then(|at| at.parse::<Timestamp>().ok());
        tail.last_timestamp = tail.last_timestamp.max(at);
        if let Some(prompt) = line.user_prompt() {
            tail.last_user_prompt = Some(prompt);
        }
        if let Some(text) = line.assistant_text() {
            tail.last_assistant_text = Some(text);
        }
    }
    tail
}

/// Project dirs (one per cwd) across every transcript root.
pub fn project_dirs(roots: &[PathBuf]) -> Result<Vec<PathBuf>> {
    let mut dirs = Vec::new();
    for root in roots {
        dirs.extend(super::sources::entries(root)?.into_iter().filter(|dir| dir.is_dir()));
    }
    Ok(dirs)
}

/// The session's transcript and when it last changed. A session resumed from another cwd can
/// leave copies in several project dirs; the newest one is current.
pub fn find(project_dirs: &[PathBuf], session_id: &str) -> Option<(PathBuf, Timestamp)> {
    let file_name = format!("{session_id}.jsonl");
    project_dirs
        .iter()
        .map(|dir| dir.join(&file_name))
        .filter_map(|path| {
            let modified = path.metadata().ok()?.modified().ok()?;
            Some((path, Timestamp::try_from(modified).ok()?))
        })
        .max_by_key(|(_, modified)| *modified)
}
