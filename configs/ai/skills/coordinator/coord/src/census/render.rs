//! The census as a table, one session per row with its last exchange under it.

use super::Session;
use crate::text::{columns, format_age, one_line};

const NAME_WIDTH: usize = 40;
const EXCHANGE_WIDTH: usize = 100;
const HEADER: [&str; 9] = ["NAME", "ID", "KIND", "STATUS", "ALIVE", "REPO@BRANCH", "DIRTY", "UNPUSHED", "AGE"];

pub fn table(sessions: &[Session]) -> String {
    if sessions.is_empty() {
        return "no sessions\n".to_owned();
    }
    let mut rows = vec![HEADER.map(String::from).to_vec()];
    rows.extend(sessions.iter().map(row));
    let table = columns(&rows);
    let mut lines = table.lines();
    let mut out = String::new();
    out.extend(lines.next().map(|header| format!("{header}\n")));
    for (session, line) in sessions.iter().zip(lines) {
        out.push_str(line);
        out.push('\n');
        if let Some(prompt) = &session.last_user_prompt {
            out.push_str(&format!("    > {}\n", one_line(prompt, EXCHANGE_WIDTH)));
        }
        if let Some(text) = &session.last_assistant_text {
            out.push_str(&format!("    < {}\n", one_line(text, EXCHANGE_WIDTH)));
        }
    }
    out
}

fn row(session: &Session) -> Vec<String> {
    let dash = || "-".to_owned();
    let repo = session.repo_name.as_ref().map(|name| match &session.branch {
        Some(branch) => format!("{name}@{branch}"),
        None => name.clone(),
    });
    vec![
        session.name.as_deref().map_or_else(dash, |name| one_line(name, NAME_WIDTH)),
        session.session_id.chars().take(8).collect(),
        session.kind.clone().unwrap_or_else(dash),
        session.status.clone(),
        if session.alive { "yes" } else { "no" }.to_owned(),
        repo.unwrap_or_else(dash),
        session.dirty.map_or_else(dash, |n| n.to_string()),
        session.unpushed.map_or_else(dash, |n| n.to_string()),
        session.age_seconds.map_or_else(dash, format_age),
    ]
}
