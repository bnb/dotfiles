//! Fixed examples that pin the human-readable output and real transcript shapes.

mod support;

use std::fs;

use coord::census::transcript;
use jiff::{SignedDuration, Timestamp};
use serde_json::json;
use support::{commit, coord, git, init_repo, stderr, stdout};

#[test]
fn merge_plan_report_for_three_branches_two_conflicting() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let repo = tmp.path().join("repo");
    init_repo(&repo);
    commit(&repo, "base", &[("CHANGELOG.md", "base\n")]);
    for branch in ["ci-fix", "feature-a", "feature-b"] {
        git(&repo, &["switch", "-q", "-c", branch, "main"]);
        commit(&repo, branch, &[(&format!("{branch}.txt"), branch)]);
    }
    for branch in ["feature-a", "feature-b"] {
        git(&repo, &["switch", "-q", branch]);
        commit(&repo, "changelog", &[("CHANGELOG.md", branch)]);
    }
    git(&repo, &["switch", "-q", "main"]);
    let short = |rev: &str| git(&repo, &["rev-parse", "--short=7", rev]);
    let repo_arg = repo.display().to_string();
    let output = coord(
        &["merge-plan", "--repo", &repo_arg, "--base", "main", "#12=feature-a", "#13=ci-fix", "#14=feature-b"],
        &[],
    );
    assert!(output.status.success(), "{}", stderr(&output));
    let expected = format!(
        "base main {}

heads
  #12  feature-a  {}  clean
  #13  ci-fix     {}  clean
  #14  feature-b  {}  clean

pairs that conflict (1 of 3)
  #12 x #14: CHANGELOG.md

hot files
  CHANGELOG.md (1 pair)

chain (auto order)
  1. #13 lands clean
  2. #12 lands clean
  3. #14 needs main merged in after #12: CHANGELOG.md
",
        short("main"),
        short("feature-a"),
        short("ci-fix"),
        short("feature-b"),
    );
    assert_eq!(stdout(&output), expected);
}

#[test]
fn census_report_shows_a_live_session_and_a_stalled_job() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let claude = tmp.path().join("claude");
    let repo = tmp.path().join("app");
    init_repo(&repo);
    commit(&repo, "first", &[("a.txt", "a")]);
    let five_minutes_ago = Timestamp::now() - SignedDuration::from_mins(5);
    let two_hours_ago = Timestamp::now() - SignedDuration::from_hours(2);
    fs::create_dir_all(claude.join("sessions")).expect("sessions");
    fs::create_dir_all(claude.join("jobs/bbbbbbbb")).expect("jobs");
    fs::create_dir_all(claude.join("projects/-app")).expect("projects");
    let live = json!({
        "pid": std::process::id(), "sessionId": "aaaaaaaa-1111", "cwd": repo, "kind": "interactive",
        "name": "a name long enough that the table has to cut it short", "status": "busy",
        "updatedAt": five_minutes_ago.as_millisecond(),
    });
    fs::write(claude.join("sessions/1.json"), live.to_string()).expect("session");
    let stalled = json!({
        "sessionId": "bbbbbbbb-2222", "state": "working", "name": "stalled job", "cwd": tmp.path().join("gone"),
        "updatedAt": two_hours_ago.to_string(),
    });
    fs::write(claude.join("jobs/bbbbbbbb/state.json"), stalled.to_string()).expect("job");
    let lines = [
        json!({ "type": "user", "message": { "content": "ship\nit" }, "timestamp": five_minutes_ago.to_string() }),
        json!({ "type": "assistant", "message": { "content": [{ "type": "text", "text": "shipped" }] } }),
    ];
    let transcript: String = lines.iter().map(|line| format!("{line}\n")).collect();
    fs::write(claude.join("projects/-app/aaaaaaaa-1111.jsonl"), transcript).expect("transcript");

    let claude_arg = claude.display().to_string();
    let output = coord(&["census", "--claude-dir", &claude_arg], &[]);
    assert!(output.status.success(), "{}", stderr(&output));
    let expected = "\
NAME                                      ID        KIND         STATUS   ALIVE  REPO@BRANCH  DIRTY  UNPUSHED  AGE
a name long enough that the table has t…  aaaaaaaa  interactive  busy     yes    app@main     0      1         5m
    > ship it
    < shipped
stalled job                               bbbbbbbb  -            working  no     -            -      -         2h
";
    assert_eq!(stdout(&output), expected);
}

/// A mid-turn message as Claude Code 2.1 writes it, trimmed to the fields that matter.
#[test]
fn queued_human_message_counts_as_the_last_prompt() {
    let line = r#"{"parentUuid":"58131a9a","isSidechain":false,"attachment":{"type":"queued_command","prompt":"remove my personal chores completely","commandMode":"prompt","origin":{"kind":"human"},"timestamp":"2026-10-30T22:25:13.024Z","humanTurn":true},"type":"attachment","uuid":"b0914702","timestamp":"2026-10-30T22:25:13.024Z","renderedRole":"system"}"#;
    let earlier =
        r#"{"type":"user","message":{"role":"user","content":"first prompt"},"timestamp":"2026-10-30T22:20:00Z"}"#;
    let tail = transcript::parse_lines(format!("{earlier}\n{line}\n").as_bytes());
    assert_eq!(tail.last_user_prompt.as_deref(), Some("remove my personal chores completely"));
    assert_eq!(tail.last_timestamp, Some("2026-10-30T22:25:13.024Z".parse().expect("timestamp")));
}
