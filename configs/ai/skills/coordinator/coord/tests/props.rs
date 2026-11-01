//! Properties of coord: the text helpers, the landing order, transcript reading, and both
//! commands end to end against temp dirs and isolated git repos.

mod support;

use std::convert::Infallible;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

use coord::census::expand_tilde;
use coord::census::transcript::{self, TAIL_BYTES};
use coord::cli::parse_since;
use coord::merge_plan::order;
use coord::text::{columns, format_age, one_line};
use hegel::generators as gs;
use hegel::{Generator, TestCase};
use jiff::{SignedDuration, Timestamp};
use serde_json::{Value, json};
use support::{commit, coord, coord_json, git, init_repo, stderr, stdout};

/// Texts that steer prompt extraction into its less travelled paths.
const TEXTS: &[&str] = &[
    "fix the bug",
    "  ",
    "",
    "<command-name>/clear</command-name>",
    "  <system-reminder>hi</system-reminder>",
    "multi\nline\tprompt",
    "ünïcode ✓",
    "a < b",
];

fn some_text() -> impl hegel::PrintableGenerator<String> {
    hegel::one_of!(gs::sampled_from(TEXTS.to_vec()).map(String::from), gs::text().max_size(30))
}

/// What a person would see as their prompt: non-blank and not a tag-wrapped system message.
fn typed(text: &str) -> Option<String> {
    let is_typed = !text.trim().is_empty() && !text.trim_start().starts_with('<');
    is_typed.then(|| text.to_owned())
}

fn non_blank(text: &str) -> Option<String> {
    (!text.trim().is_empty()).then(|| text.to_owned())
}

fn now_seconds() -> Timestamp {
    Timestamp::from_second(Timestamp::now().as_second()).expect("now is representable")
}

/// Ages in minutes that stay clear of the 24h cutoff, so test and binary clocks can't disagree.
fn minutes_ago() -> impl hegel::PrintableGenerator<i64> {
    gs::integers::<i64>().min_value(0).max_value(4_000).map(|m| if (1_430..1_450).contains(&m) { m + 30 } else { m })
}

// text

/// One-line text never holds a newline or a whitespace run, fits its budget, and only a cut
/// text loses characters, keeping a prefix.
#[hegel::test(test_cases = 300)]
fn one_line_collapses_and_fits(tc: TestCase) {
    let text = tc.draw(hegel::one_of!(gs::text().max_size(60), gs::text().alphabet("ab \n\t\u{a0}é<").max_size(60)));
    let max = tc.draw(gs::integers::<usize>().max_value(80));
    let line = one_line(&text, max);
    let collapsed = text.split_whitespace().collect::<Vec<_>>().join(" ");
    assert!(line.chars().count() <= max, "{line:?} is over {max}");
    assert!(!line.contains('\n') && !line.contains("  "), "{line:?} isn't one line");
    if collapsed.chars().count() <= max {
        assert_eq!(line, collapsed);
        return;
    }
    let kept = line.strip_suffix('…').unwrap_or(&line);
    assert!(collapsed.starts_with(kept));
    assert_eq!(kept.chars().count(), max.saturating_sub(1));
}

/// An age uses the largest unit it holds at least one of, rounded down.
#[hegel::test(test_cases = 300)]
fn age_uses_its_largest_whole_unit(tc: TestCase) {
    let seconds = tc.draw(gs::integers::<i64>().min_value(-10_000).max_value(400 * 86_400));
    let age = format_age(seconds);
    let (number, unit) = age.split_at(age.len() - 1);
    let number: i64 = number.parse().expect("age starts with a number");
    let (size, next) = match unit {
        "s" => (1, 60),
        "m" => (60, 3_600),
        "h" => (3_600, 86_400),
        "d" => (86_400, i64::MAX),
        other => panic!("unexpected unit {other}"),
    };
    let seconds = seconds.max(0);
    assert!(number * size <= seconds && seconds < (number + 1) * size, "{age} for {seconds}s");
    assert!(seconds < next, "{age} for {seconds}s should use a larger unit");
}

/// Every cell starts at its column's offset, and no line ends in padding.
#[hegel::test(test_cases = 200)]
fn columns_line_cells_up(tc: TestCase) {
    let cell = gs::text().alphabet("abc…é#@-").max_size(8);
    let rows: Vec<Vec<String>> = tc.draw(gs::vecs(gs::vecs(cell).min_size(1).max_size(4)).max_size(5));
    let table = columns(&rows);
    let lines: Vec<&str> = table.lines().collect();
    assert_eq!(lines.len(), rows.len());
    let width = |col: usize| rows.iter().filter_map(|row| row.get(col)).map(|c| c.chars().count()).max().unwrap_or(0);
    for (row, line) in rows.iter().zip(&lines) {
        let chars: Vec<char> = line.chars().collect();
        let mut start = 0;
        for (col, cell) in row.iter().enumerate() {
            let got: String = chars.iter().skip(start).take(cell.chars().count()).collect();
            assert_eq!(&got, cell, "column {col} of {line:?}");
            start += width(col) + 2;
        }
        assert!(!line.ends_with(' '), "{line:?} ends in padding");
    }
}

/// `--since` takes friendly units with a day as 24 hours, and refuses negative spans.
#[hegel::test(test_cases = 300)]
fn since_counts_days_as_24_hours(tc: TestCase) {
    let n = tc.draw(gs::integers::<i64>().min_value(0).max_value(100_000));
    let (unit, seconds) = tc.draw(gs::sampled_from(vec![("s", 1), ("m", 60), ("h", 3_600), ("d", 86_400)]));
    assert_eq!(parse_since(&format!("{n}{unit}")).expect("parses"), SignedDuration::from_secs(n * seconds));
    if n > 0 {
        assert!(parse_since(&format!("-{n}{unit}")).is_err());
    }
    let _ = parse_since(&tc.draw(gs::text().max_size(10)));
}

/// `~` expands only as a whole leading component, and only with a home dir.
#[hegel::test(test_cases = 200)]
fn tilde_expands_only_as_a_leading_component(tc: TestCase) {
    let parts: Vec<String> = tc.draw(gs::vecs(gs::text().alphabet("ab~.").min_size(1).max_size(4)).max_size(3));
    let rest = parts.join("/");
    let home = Path::new("/home/me");
    let tilde = PathBuf::from(if rest.is_empty() { "~".to_owned() } else { format!("~/{rest}") });
    assert_eq!(expand_tilde(&tilde, Some(home)), home.join(&rest));
    assert_eq!(expand_tilde(&tilde, None), tilde);
    let plain = PathBuf::from(format!("/x/{rest}"));
    assert_eq!(expand_tilde(&plain, Some(home)), plain);
}

// order

fn draw_matrix(tc: &TestCase) -> Vec<Vec<bool>> {
    let n = tc.draw(gs::integers::<usize>().max_value(7));
    let mut matrix = vec![vec![false; n]; n];
    let pairs: Vec<(usize, usize)> = (0..n).flat_map(|a| (a + 1..n).map(move |b| (a, b))).collect();
    for (a, b) in pairs {
        let conflict = tc.draw(gs::booleans());
        matrix[a][b] = conflict;
        matrix[b][a] = conflict;
    }
    matrix
}

fn blocked(matrix: &[Vec<bool>], head: usize, remaining: &[usize]) -> usize {
    remaining.iter().filter(|&&other| other != head && matrix[head][other]).count()
}

/// Whatever the predicate says, the order is a permutation of the input; it keeps input order
/// when nothing is clean or nothing conflicts, and a predicate's error stops it.
#[hegel::test(test_cases = 300)]
fn auto_order_is_a_permutation(tc: TestCase) {
    let matrix = draw_matrix(&tc);
    let n = matrix.len();
    let identity: Vec<usize> = (0..n).collect();
    let mode = tc.draw(gs::sampled_from(vec!["all clean", "none clean", "random", "fails"]));
    let coin: Vec<bool> = tc.draw(gs::vecs(gs::booleans()).min_size(64).max_size(64));
    let fail_at = tc.draw(gs::integers::<usize>().max_value(20));
    let mut calls = 0;
    let result = order::auto(&matrix, |landed, head| {
        calls += 1;
        match mode {
            "all clean" => Ok(true),
            "none clean" => Ok(false),
            "fails" if calls > fail_at => Err("predicate failed"),
            _ => Ok(coin[(landed.len() * 8 + head) % 64]),
        }
    });
    let Ok(order) = result else {
        assert_eq!(mode, "fails");
        return;
    };
    let mut sorted = order.clone();
    sorted.sort_unstable();
    assert_eq!(sorted, identity);
    let no_conflicts = matrix.iter().flatten().all(|c| !c);
    if mode == "none clean" || (mode == "all clean" && no_conflicts) {
        assert_eq!(order, identity);
    }
    if mode == "all clean"
        && let Some(&first) = order.first()
    {
        let fewest = (0..n).map(|head| blocked(&matrix, head, &identity)).min();
        assert_eq!(Some(blocked(&matrix, first, &identity)), fewest);
        assert!((0..first).all(|head| blocked(&matrix, head, &identity) > blocked(&matrix, first, &identity)));
    }
}

/// With a predicate that behaves like git (a head is clean unless it conflicts with something
/// landed), the order lands a maximal conflict-free set first, each pick blocking the fewest
/// remaining heads with ties to input order, then the rest in input order.
#[hegel::test(test_cases = 300)]
fn auto_order_lands_greedily(tc: TestCase) {
    let matrix = draw_matrix(&tc);
    let clean = |landed: &[usize], head: usize| landed.iter().all(|&l| !matrix[l][head]);
    let order = order::auto(&matrix, |landed, head| Ok::<_, Infallible>(clean(landed, head))).expect("infallible");
    let mut landed: Vec<usize> = Vec::new();
    let mut remaining: Vec<usize> = (0..matrix.len()).collect();
    for (step, &head) in order.iter().enumerate() {
        let candidates: Vec<usize> = remaining.iter().copied().filter(|&h| clean(&landed, h)).collect();
        if candidates.is_empty() {
            let tail = &order[step..];
            assert!(tail.windows(2).all(|w| w[0] < w[1]), "tail {tail:?} isn't in input order");
            return;
        }
        let fewest = candidates.iter().map(|&h| blocked(&matrix, h, &remaining)).min();
        let first_fewest = candidates.iter().copied().find(|&h| Some(blocked(&matrix, h, &remaining)) == fewest);
        assert_eq!(Some(head), first_fewest, "step {step} of {order:?}");
        landed.push(head);
        remaining.retain(|&h| h != head);
    }
}

// transcript

/// One drawn transcript line and what it should contribute.
struct Drawn {
    line: String,
    prompt: Option<String>,
    reply: Option<String>,
    at: Option<Timestamp>,
}

fn draw_line(tc: &TestCase, epoch: Timestamp) -> Drawn {
    let kind = tc.draw(gs::sampled_from(vec!["user", "user blocks", "queued", "assistant", "garbage", "other"]));
    let meta = tc.draw(gs::optional(gs::booleans()));
    let sidechain = tc.draw(gs::optional(gs::booleans()));
    let at = tc.draw(gs::optional(gs::integers::<i64>().min_value(0).max_value(1_000_000)));
    let bad_at = tc.draw(gs::booleans());
    let at = at.map(|secs| epoch + SignedDuration::from_secs(secs));
    let main_thread = sidechain != Some(true);
    let mut value = json!({ "type": kind, "uuid": "x" });
    if let Some(meta) = meta {
        value["isMeta"] = json!(meta);
    }
    if let Some(sidechain) = sidechain {
        value["isSidechain"] = json!(sidechain);
    }
    match (at, bad_at) {
        (Some(at), false) => value["timestamp"] = json!(at.to_string()),
        (_, true) => value["timestamp"] = json!("yesterday"),
        _ => {}
    }
    let at = at.filter(|_| !bad_at);
    let (mut prompt, mut reply) = (None, None);
    match kind {
        "user" => {
            let text = tc.draw(some_text());
            value["message"] = json!({ "role": "user", "content": text });
            prompt = typed(&text).filter(|_| main_thread && meta != Some(true));
        }
        "user blocks" | "assistant" => {
            let blocks: Vec<(bool, String)> = tc.draw(gs::vecs(gs::tuples2(gs::booleans(), some_text())).max_size(3));
            let content: Vec<Value> = blocks
                .iter()
                .map(|(is_text, text)| match is_text {
                    true => json!({ "type": "text", "text": text }),
                    false => json!({ "type": "tool_result", "content": text }),
                })
                .collect();
            let texts: Vec<&str> = blocks.iter().filter(|(t, _)| *t).map(|(_, text)| text.as_str()).collect();
            let joined = (!texts.is_empty()).then(|| texts.join("\n"));
            value["message"] = json!({ "content": content });
            if kind == "assistant" {
                value["type"] = json!("assistant");
                reply = joined.as_deref().and_then(non_blank).filter(|_| main_thread);
            } else {
                value["type"] = json!("user");
                prompt = joined.as_deref().and_then(typed).filter(|_| main_thread && meta != Some(true));
            }
        }
        "queued" => {
            let text = tc.draw(some_text());
            let origin = tc.draw(gs::sampled_from(vec![Some("human"), Some("agent"), None]));
            value["type"] = json!("attachment");
            value["attachment"] = json!({ "type": "queued_command", "prompt": text });
            if let Some(origin) = origin {
                value["attachment"]["origin"] = json!({ "kind": origin });
            }
            prompt = typed(&text).filter(|_| main_thread && origin == Some("human"));
        }
        "garbage" => {
            let line = tc.draw(gs::sampled_from(vec!["not json", "{", "", "[1,2]", "{\"type\":5}", "\"str\""]));
            return Drawn { line: line.to_owned(), prompt: None, reply: None, at: None };
        }
        _ => value["type"] = json!(tc.draw(gs::sampled_from(vec!["progress", "system"]))),
    }
    Drawn { line: value.to_string(), prompt, reply, at }
}

/// The tail reader reports the last typed prompt, the last reply and the newest timestamp,
/// and in a big file sees only the last [`TAIL_BYTES`], including none of a line cut there.
#[hegel::test(test_cases = 60)]
fn transcript_tail_matches_the_model(tc: TestCase) {
    let epoch: Timestamp = "2026-01-01T00:00:00Z".parse().expect("epoch");
    let lines: Vec<Drawn> =
        (0..tc.draw(gs::integers::<usize>().max_value(12))).map(|_| draw_line(&tc, epoch)).collect();
    let big = tc.draw(gs::booleans());
    let body: String = lines.iter().map(|drawn| format!("{}\n", drawn.line)).collect();
    let mut file = String::new();
    if big {
        // Everything here sits before the window: a prompt with the newest timestamp, then a
        // line whose tail, from exactly where the window starts, is valid JSON.
        let early = json!({ "type": "user", "message": { "content": "early" }, "timestamp": "2031-01-01T00:00:00Z" });
        let cut = json!({ "type": "user", "message": { "content": "cut" }, "timestamp": "2032-01-01T00:00:00Z" });
        file.push_str(&format!("{early}\npadding {cut}\n"));
        let window_start = file.len() - cut.to_string().len() - 1;
        let pad = TAIL_BYTES as usize - (file.len() - window_start) - body.len() - 1;
        file.push_str(&"x".repeat(pad));
        file.push('\n');
        assert_eq!(file.len() + body.len() - window_start, TAIL_BYTES as usize);
    }
    file.push_str(&body);
    let dir = tempfile::tempdir().expect("tempdir");
    let path = dir.path().join("t.jsonl");
    fs::write(&path, &file).expect("write transcript");
    let tail = transcript::read_tail(&path).expect("reads");
    let last = |pick: fn(&Drawn) -> Option<String>| lines.iter().rev().find_map(pick);
    assert_eq!(tail.last_user_prompt, last(|d| d.prompt.clone()));
    assert_eq!(tail.last_assistant_text, last(|d| d.reply.clone()));
    assert_eq!(tail.last_timestamp, lines.iter().filter_map(|d| d.at).max());
}

/// A window inside one line longer than [`TAIL_BYTES`] holds no whole line, even when the
/// line ends in valid JSON.
#[hegel::test(test_cases = 10)]
fn transcript_window_inside_one_line_is_empty(tc: TestCase) {
    let extra = tc.draw(gs::integers::<usize>().min_value(1).max_value(4_096));
    let prompt = json!({ "type": "user", "message": { "content": "inside" }, "timestamp": "2030-01-01T00:00:00Z" });
    let file = format!("{}{prompt}", "x".repeat(TAIL_BYTES as usize + extra));
    let dir = tempfile::tempdir().expect("tempdir");
    let path = dir.path().join("t.jsonl");
    fs::write(&path, file).expect("write transcript");
    assert_eq!(transcript::read_tail(&path).expect("reads"), transcript::Tail::default());
    let gone = dir.path().join("gone.jsonl");
    assert!(transcript::read_tail(&gone).is_err_and(|err| err.to_string().contains("couldn't open")));
}

// census

#[derive(Debug, Clone, Copy, PartialEq, hegel::PrettyPrintable)]
enum Place {
    Repo,
    EmptyRepo,
    Missing,
    Excluded,
    /// The job's worktree is the repo; its cwd is gone.
    Worktree,
    /// A directory outside any repo.
    PlainDir,
    /// A repo whose git dir lives elsewhere, so its name comes from its top level.
    SeparateGitDir,
    /// No cwd recorded at all.
    Nowhere,
}

struct FakeSession {
    id: String,
    session: Option<(bool, Option<String>, i64, Option<String>)>,
    job: Option<(Option<String>, i64, Option<String>)>,
    place: Place,
    transcript: Option<(usize, String, String, Option<i64>, bool)>,
}

/// Census merges sessions with jobs, filters by liveness, recency and exclusion, sorts live
/// then newest first, and reports the git state of where each one works.
#[hegel::test(test_cases = 25)]
fn census_matches_the_model(tc: TestCase) {
    let tmp = tempfile::tempdir().expect("tempdir");
    let home = tmp.path().join("home");
    let claude = home.join(".claude");
    let extra = home.join("extra");
    let excluded = home.join("excluded");
    let repo = home.join("repo");
    let empty = home.join("empty");
    for dir in
        [claude.join("sessions"), claude.join("jobs/tmp"), claude.join("projects/p"), extra.join("p"), excluded.clone()]
    {
        fs::create_dir_all(dir).expect("dirs");
    }
    init_repo(&repo);
    commit(&repo, "first", &[("a.txt", "a")]);
    fs::write(repo.join("untracked.txt"), "x").expect("dirty file");
    init_repo(&empty);
    fs::write(empty.join("untracked.txt"), "x").expect("dirty file");
    let separate = home.join("sep");
    let store = home.join("sep-store").display().to_string();
    git(&home, &["init", "-q", "-b", "main", "--separate-git-dir", &store, &separate.display().to_string()]);
    fs::create_dir_all(home.join("plain")).expect("plain dir");
    fs::write(claude.join("sessions/1.0123.key"), "secret").expect("key");
    fs::write(claude.join("sessions/2.json"), "{").expect("bad session");
    fs::create_dir_all(claude.join("jobs/bad")).expect("bad job dir");
    fs::write(claude.join("jobs/bad/state.json"), "nope").expect("bad job");

    let default_dirs = tc.draw(gs::booleans());
    let now = now_seconds();
    let ago = |minutes: i64| now - SignedDuration::from_mins(minutes);
    let count = tc.draw(gs::integers::<usize>().max_value(4));
    let mut fakes = Vec::new();
    for i in 0..count {
        let id = format!("{i:08x}-0000-4000-8000-000000000000");
        let has_session = tc.draw(gs::booleans());
        let session = has_session.then(|| {
            let alive = tc.draw(gs::booleans());
            let status = tc.draw(gs::sampled_from(vec![Some("busy".to_owned()), Some("idle".to_owned()), None]));
            (alive, status, tc.draw(minutes_ago()), tc.draw(gs::optional(gs::just("live name".to_owned()))))
        });
        let has_job = !has_session || tc.draw(gs::booleans());
        let job = has_job.then(|| {
            let state = tc.draw(gs::sampled_from(vec![Some("working".to_owned()), Some("done".to_owned()), None]));
            (state, tc.draw(minutes_ago()), tc.draw(gs::optional(gs::just("job name".to_owned()))))
        });
        let place = tc.draw(gs::sampled_from(vec![
            Place::Repo,
            Place::EmptyRepo,
            Place::Missing,
            Place::Excluded,
            Place::Worktree,
            Place::PlainDir,
            Place::SeparateGitDir,
            Place::Nowhere,
        ]));
        let transcript = tc.draw(gs::booleans()).then(|| {
            let root = tc.draw(gs::integers::<usize>().max_value(1));
            let at = tc.draw(gs::optional(minutes_ago()));
            (root, tc.draw(some_text()), tc.draw(some_text()), at, tc.draw(gs::weighted_booleans(0.15)))
        });
        let cwd = match place {
            Place::Repo => Some(repo.clone()),
            Place::EmptyRepo => Some(empty.clone()),
            Place::Excluded => Some(excluded.join(format!("s{i}"))),
            Place::Missing | Place::Worktree => Some(home.join(format!("missing{i}"))),
            Place::PlainDir => Some(home.join("plain")),
            Place::SeparateGitDir => Some(separate.clone()),
            Place::Nowhere => None,
        };
        if let Some((alive, status, minutes, name)) = &session {
            let dead = tc.draw(gs::sampled_from(vec![i64::from(i32::MAX), 0, -5]));
            let pid = if *alive { i64::from(std::process::id()) } else { dead };
            let mut file = json!({
                "pid": pid, "sessionId": id, "cwd": cwd, "kind": "bg", "status": status,
                "updatedAt": ago(*minutes).as_millisecond(), "messagingSocketPath": format!("/tmp/{i}.sock"), "extra": [1],
            });
            if let Some(name) = name {
                file["name"] = json!(name);
            }
            fs::write(claude.join(format!("sessions/{}.json", 100 + i)), file.to_string()).expect("session file");
        }
        if let Some((state, minutes, name)) = &job {
            let mut file = json!({ "sessionId": id, "cwd": cwd, "detail": "did a thing", "updatedAt": ago(*minutes).to_string(), "state": state });
            if let Some(name) = name {
                file["name"] = json!(name);
            }
            if place == Place::Worktree {
                file["worktreePath"] = json!(repo);
                file["worktreeBranch"] = json!("main");
            }
            fs::create_dir_all(claude.join(format!("jobs/{i}"))).expect("job dir");
            fs::write(claude.join(format!("jobs/{i}/state.json")), file.to_string()).expect("job file");
        }
        if let Some((root, prompt, reply, at, as_dir)) = &transcript {
            let dir = if *root == 0 { claude.join("projects/p") } else { extra.join("p") };
            let path = dir.join(format!("{id}.jsonl"));
            if *as_dir {
                fs::create_dir_all(&path).expect("transcript dir");
            } else {
                let at = at.map(|m| ago(m).to_string());
                let user = json!({ "type": "user", "message": { "content": prompt }, "timestamp": at });
                let assistant =
                    json!({ "type": "assistant", "message": { "content": [{ "type": "text", "text": reply }] } });
                fs::write(&path, format!("{user}\n{assistant}\n")).expect("transcript");
            }
        }
        fakes.push(FakeSession { id, session, job, place, transcript });
    }

    let mut args: Vec<String> = vec!["census".into(), "--json".into()];
    if default_dirs {
        args.extend(["--exclude".into(), "~/excluded".into()]);
    } else {
        for flag in
            [("--claude-dir", &claude), ("--projects-dir", &claude.join("projects")), ("--projects-dir", &extra)]
        {
            args.extend([flag.0.to_owned(), flag.1.display().to_string()]);
        }
        args.extend(["--exclude".into(), excluded.display().to_string(), "--since".into(), "24h".into()]);
    }
    let arg_refs: Vec<&str> = args.iter().map(String::as_str).collect();
    let envs = [("HOME", home.as_path())];
    let report = coord_json(&arg_refs, &envs);
    let report = report.as_array().expect("an array");

    let cutoff = now - SignedDuration::from_hours(24);
    let repo_top = fs::canonicalize(&repo).expect("repo path");
    let empty_top = fs::canonicalize(&empty).expect("empty repo path");
    let separate_top = fs::canonicalize(&separate).expect("separate repo path");
    let mut expected_ids = Vec::new();
    for fake in &fakes {
        let alive = fake.session.as_ref().is_some_and(|s| s.0);
        let found = fake.transcript.as_ref().filter(|t| !(default_dirs && t.0 == 1));
        let readable = found.filter(|t| !t.4);
        let updated = match (&fake.session, &fake.job) {
            (Some(session), _) => ago(session.2),
            (None, Some(job)) => ago(job.1),
            (None, None) => unreachable!("every fake has a session or a job"),
        };
        let activity = readable.and_then(|t| t.3).map(ago).unwrap_or(updated);
        let included = fake.place != Place::Excluded && (alive || activity >= cutoff);
        let got = report.iter().find(|s| s["sessionId"] == fake.id.as_str());
        let Some(got) = got else {
            assert!(!included, "{} is missing from {report:#?}", fake.id);
            continue;
        };
        assert!(included, "{} shouldn't be listed: {got:#}", fake.id);
        expected_ids.push(fake.id.clone());
        let live_status = fake.session.as_ref().and_then(|s| s.1.clone()).filter(|_| alive);
        let job_state = fake.job.as_ref().and_then(|j| j.0.clone());
        let status = live_status.or(job_state).unwrap_or_else(|| "stopped".to_owned());
        assert_eq!(got["status"], status.as_str());
        assert_eq!(got["alive"], alive);
        let name =
            fake.session.as_ref().and_then(|s| s.3.clone()).or_else(|| fake.job.as_ref().and_then(|j| j.2.clone()));
        assert_eq!(got["name"], json!(name));
        let got_activity: Timestamp = got["lastActivity"].as_str().expect("activity").parse().expect("timestamp");
        assert_eq!(got_activity, activity);
        assert_eq!(got["lastUserPrompt"], json!(readable.and_then(|t| typed(&t.1))));
        assert_eq!(got["lastAssistantText"], json!(readable.and_then(|t| non_blank(&t.2))));
        assert_eq!(got["transcriptPath"].is_null(), found.is_none());
        assert_eq!(got["messagingSocketPath"].is_null(), fake.session.is_none());
        let worktree = fake.place == Place::Worktree && fake.job.is_some();
        let (top, name, branch, dirty, unpushed) = match fake.place {
            Place::Repo => (Some(&repo_top), Some("repo"), Some("main"), Some(1), Some(1)),
            Place::Worktree if worktree => (Some(&repo_top), Some("repo"), Some("main"), Some(1), Some(1)),
            Place::EmptyRepo => (Some(&empty_top), Some("empty"), None, Some(1), None),
            Place::SeparateGitDir => (Some(&separate_top), Some("sep"), None, Some(0), None),
            _ => (None, None, None, None, None),
        };
        assert_eq!(got["repo"], json!(top), "{got:#}");
        assert_eq!(got["repoName"], json!(name));
        assert_eq!(got["branch"], json!(branch));
        assert_eq!(got["dirty"], json!(dirty));
        assert_eq!(got["unpushed"], json!(unpushed));
    }
    assert_eq!(report.len(), expected_ids.len());
    let keys: Vec<(bool, Timestamp)> = report
        .iter()
        .map(|s| (s["alive"] == true, s["lastActivity"].as_str().expect("activity").parse().expect("timestamp")))
        .collect();
    let mut live_then_newest = keys.clone();
    live_then_newest.sort_by(|a, b| b.cmp(a));
    assert_eq!(keys, live_then_newest);

    let human_args: Vec<&str> = arg_refs.iter().copied().filter(|arg| *arg != "--json").collect();
    let human = coord(&human_args, &envs);
    assert!(human.status.success(), "{}", stderr(&human));
    let text = stdout(&human);
    if expected_ids.is_empty() {
        assert_eq!(text, "no sessions\n");
    }
    for id in &expected_ids {
        assert!(text.contains(&id[..8]), "{id} missing from\n{text}");
    }
}

// merge-plan

const SHARED: [&str; 3] = ["f0.txt", "f1.txt", "f2.txt"];

fn shared(files: &[bool; 3]) -> Vec<String> {
    SHARED.iter().zip(files).filter(|(_, on)| **on).map(|(name, _)| (*name).to_owned()).collect()
}

fn overlap(a: &[bool; 3], b: &[bool; 3]) -> [bool; 3] {
    [a[0] && b[0], a[1] && b[1], a[2] && b[2]]
}

/// Everything about a repo that merge-plan must leave alone.
fn repo_state(repo: &Path, worktrees: &[PathBuf]) -> Vec<String> {
    let mut state =
        vec![git(repo, &["for-each-ref"]), git(repo, &["status", "--porcelain"]), git(repo, &["stash", "list"])];
    state.extend(worktrees.iter().map(|wt| git(wt, &["status", "--porcelain"])));
    state
}

/// Heads that edit the same line of the same file conflict. merge-plan reports exactly those
/// conflicts against the base and between pairs, and chains heads so each one that lands
/// shares no file with the base's changes or an earlier lander, all without touching a ref.
#[hegel::test(test_cases = 15)]
fn merge_plan_matches_the_model(tc: TestCase) {
    let tmp = tempfile::tempdir().expect("tempdir");
    let repo = tmp.path().join("repo");
    init_repo(&repo);
    commit(&repo, "base", &[("f0.txt", "base\n"), ("f1.txt", "base\n"), ("f2.txt", "base\n")]);
    let count = tc.draw(gs::integers::<usize>().min_value(1).max_value(4));
    let mut edits: Vec<[bool; 3]> = Vec::new();
    for i in 0..count {
        let files = tc.draw(gs::arrays::<_, _, 3>(gs::booleans()));
        git(&repo, &["switch", "-q", "-c", &format!("h{i}"), "main"]);
        let own = format!("own{i}.txt");
        let content = format!("head {i}\n");
        let mut writes = vec![(own.as_str(), "own\n")];
        writes.extend(SHARED.iter().zip(files).filter(|(_, on)| *on).map(|(name, _)| (*name, content.as_str())));
        commit(&repo, &format!("head {i}"), &writes);
        edits.push(files);
    }
    git(&repo, &["switch", "-q", "main"]);
    let base_edits = tc.draw(gs::arrays::<_, _, 3>(gs::booleans()));
    let base_writes: Vec<(&str, &str)> =
        SHARED.iter().zip(base_edits).filter(|(_, on)| *on).map(|(name, _)| (*name, "main\n")).collect();
    commit(&repo, "main moves", &base_writes);

    let base_mode = tc.draw(gs::sampled_from(vec!["explicit", "origin/HEAD", "origin/main"]));
    let base_ref = match base_mode {
        "explicit" => "main",
        "origin/HEAD" => {
            git(&repo, &["update-ref", "refs/remotes/origin/main", "main"]);
            git(&repo, &["symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/main"]);
            "origin/HEAD"
        }
        _ => {
            git(&repo, &["update-ref", "refs/remotes/origin/main", "main"]);
            "origin/main"
        }
    };

    let mut args: Vec<String> = Vec::new();
    let mut labels = Vec::new();
    let mut dirty = Vec::new();
    let mut worktrees = Vec::new();
    for i in 0..count {
        let form = tc.draw(gs::sampled_from(vec!["ref", "label", "worktree", "dirty worktree"]));
        let branch = format!("h{i}");
        let (arg, label) = match form {
            "ref" => (branch.clone(), branch.clone()),
            "label" => (format!("#{i}={branch}"), format!("#{i}")),
            _ => {
                let wt = tmp.path().join(format!("wt{i}"));
                git(&repo, &["worktree", "add", "-q", &wt.display().to_string(), &branch]);
                if form == "dirty worktree" {
                    fs::write(wt.join(format!("own{i}.txt")), "changed\n").expect("dirty the worktree");
                }
                worktrees.push(wt.clone());
                (wt.display().to_string(), branch.clone())
            }
        };
        args.push(arg);
        labels.push(label);
        dirty.push(form == "dirty worktree");
    }
    let order_mode = tc.draw(gs::sampled_from(vec!["auto", "given"]));
    let repo_arg = repo.display().to_string();
    let mut cli = vec!["merge-plan", "--repo", &repo_arg, "--order", order_mode];
    if base_mode == "explicit" {
        cli.extend(["--base", "main"]);
    }
    cli.extend(args.iter().map(String::as_str));
    let before = repo_state(&repo, &worktrees);
    let mut json_cli = cli.clone();
    json_cli.push("--json");
    let plan = coord_json(&json_cli, &[]);
    assert_eq!(repo_state(&repo, &worktrees), before, "merge-plan changed the repo");

    assert_eq!(plan["base"]["ref"], base_ref);
    assert_eq!(plan["base"]["sha"], git(&repo, &["rev-parse", "main"]).as_str());
    for (i, head) in plan["heads"].as_array().expect("heads").iter().enumerate() {
        assert_eq!(head["label"], labels[i].as_str());
        assert_eq!(head["dirty"], dirty[i]);
        assert_eq!(head["vsBase"]["conflicts"], json!(shared(&overlap(&edits[i], &base_edits))));
        assert_eq!(head["vsBase"]["clean"], shared(&overlap(&edits[i], &base_edits)).is_empty());
    }
    let mut pairs = Vec::new();
    let mut hot: Vec<(String, usize)> = Vec::new();
    for a in 0..count {
        for b in a + 1..count {
            let files = shared(&overlap(&edits[a], &edits[b]));
            if files.is_empty() {
                continue;
            }
            for file in &files {
                match hot.iter_mut().find(|(path, _)| path == file) {
                    Some((_, n)) => *n += 1,
                    None => hot.push((file.clone(), 1)),
                }
            }
            pairs.push(json!({ "a": labels[a], "b": labels[b], "files": files }));
        }
    }
    assert_eq!(plan["pairCount"], count * (count - 1) / 2);
    assert_eq!(plan["pairs"], json!(pairs));
    let got_hot: Vec<(String, usize)> = plan["hotFiles"]
        .as_array()
        .expect("hot files")
        .iter()
        .map(|f| (f["path"].as_str().expect("path").to_owned(), f["pairs"].as_u64().expect("count") as usize))
        .collect();
    assert!(got_hot.windows(2).all(|w| w[0].1 >= w[1].1), "hot files {got_hot:?} aren't descending");
    hot.sort();
    let mut sorted_hot = got_hot.clone();
    sorted_hot.sort();
    assert_eq!(sorted_hot, hot);

    let chain = plan["chain"].as_array().expect("chain");
    let sequence: Vec<usize> = chain
        .iter()
        .map(|step| labels.iter().position(|l| step["label"] == l.as_str()).expect("a known label"))
        .collect();
    if order_mode == "given" {
        assert_eq!(sequence, (0..count).collect::<Vec<_>>());
    }
    let mut touched = base_edits;
    let mut previous: Option<&str> = None;
    let mut seen_conflict = false;
    for (step, &i) in chain.iter().zip(&sequence) {
        let conflicts = shared(&overlap(&edits[i], &touched));
        assert_eq!(step["landed"], conflicts.is_empty(), "{step}");
        assert_eq!(step["conflicts"], json!(conflicts));
        if conflicts.is_empty() {
            assert!(order_mode == "given" || !seen_conflict, "auto order lands {step} after a conflict");
            touched = [touched[0] || edits[i][0], touched[1] || edits[i][1], touched[2] || edits[i][2]];
            previous = Some(&labels[i]);
            assert!(step["after"].is_null());
            continue;
        }
        seen_conflict = true;
        assert_eq!(step["after"], json!(previous));
    }

    let human = coord(&cli, &[]);
    assert!(human.status.success(), "{}", stderr(&human));
    let text = stdout(&human);
    assert!(text.starts_with(&format!("base {base_ref} ")), "{text}");
    assert!(text.contains(&format!("pairs that conflict ({} of {})", pairs.len(), count * (count - 1) / 2)), "{text}");
    assert_eq!(text.matches(" lands clean").count(), chain.iter().filter(|s| s["landed"] == true).count(), "{text}");
    assert_eq!(text.matches(" (dirty)").count(), dirty.iter().filter(|d| **d).count(), "{text}");
}

// errors and flags

/// Usage errors, unresolvable heads and broken inputs exit 2 with a message naming the cause;
/// `--version`, `--help` and a reader closing the pipe early exit 0.
#[hegel::test(test_cases = 8)]
fn bad_input_exits_2(tc: TestCase) {
    let tmp = tempfile::tempdir().expect("tempdir");
    let repo = tmp.path().join("repo");
    init_repo(&repo);
    commit(&repo, "base", &[("a.txt", "a\n")]);
    git(&repo, &["switch", "-q", "--orphan", "lonely"]);
    commit(&repo, "unrelated", &[("b.txt", "b\n")]);
    git(&repo, &["switch", "-q", "main"]);
    let other = tmp.path().join("other");
    init_repo(&other);
    // Unlike the orphan branch above, so the two commits can never share an id.
    commit(&other, "elsewhere", &[("c.txt", "c\n")]);
    let not_repo = tmp.path().join("plain");
    fs::create_dir_all(&not_repo).expect("plain dir");
    let claude = tmp.path().join("claude");
    fs::create_dir_all(&claude).expect("claude dir");
    fs::write(claude.join("sessions"), "a file where a dir belongs").expect("sessions file");
    let junk = format!("nope-{}", tc.draw(gs::text().alphabet("abc123_/").max_size(8)));
    let (r, o, p, c) = (
        repo.display().to_string(),
        other.display().to_string(),
        not_repo.display().to_string(),
        claude.display().to_string(),
    );
    let cases = [
        ("bad ref", vec!["merge-plan", "--repo", &r, "--base", "main", &junk], "rev-parse"),
        ("bad base", vec!["merge-plan", "--repo", &r, "--base", &junk, "main"], "rev-parse"),
        ("no origin", vec!["merge-plan", "--repo", &r, "main"], "origin/main"),
        ("not a repo", vec!["merge-plan", "--repo", &p, "--base", "main", "main"], "not a git repository"),
        ("foreign worktree", vec!["merge-plan", "--repo", &r, "--base", "main", &o], "isn't a worktree of the repo"),
        ("unrelated", vec!["merge-plan", "--repo", &r, "--base", "main", "lonely"], "unrelated histories"),
        ("plain dir head", vec!["merge-plan", "--repo", &r, "--base", "main", &p], "couldn't snapshot"),
        ("no heads", vec!["merge-plan", "--repo", &r], "HEAD"),
        ("bad since", vec!["census", "--claude-dir", &c, "--since", "soon"], "duration"),
        ("negative since", vec!["census", "--claude-dir", &c, "--since=-1h"], "negative"),
        ("unlistable", vec!["census", "--claude-dir", &c], "couldn't list"),
        ("unknown flag", vec!["census", "--frobnicate"], "unexpected argument"),
    ];
    for (name, args, needle) in cases {
        let output = coord(&args, &[]);
        assert_eq!(output.status.code(), Some(2), "{name}: {}", stderr(&output));
        assert!(stderr(&output).contains(needle), "{name}: {:?} lacks {needle:?}", stderr(&output));
    }
    let output = coord(&["merge-plan", "--repo", &r, "main"], &[("PATH", Path::new(""))]);
    assert_eq!(output.status.code(), Some(2), "{}", stderr(&output));
    assert!(stderr(&output).contains("couldn't run git"), "{}", stderr(&output));

    let flag = tc.draw(gs::sampled_from(vec!["--version", "--help"]));
    let output = coord(&[flag], &[]);
    assert_eq!(output.status.code(), Some(0));
    assert!(stdout(&output).contains("coord"));

    // Closing the read end before coord starts writing makes its write fail with EPIPE.
    let mut child = Command::new(env!("CARGO_BIN_EXE_coord"))
        .args(["census", "--claude-dir", &tmp.path().join("none").display().to_string()])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("coord starts");
    drop(child.stdout.take());
    let output = child.wait_with_output().expect("coord finishes");
    assert_eq!(output.status.code(), Some(0), "{}", stderr(&output));
    assert_eq!(stderr(&output), "");
}
