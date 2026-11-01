//! Text shaping for the human-readable reports.

/// Collapses every whitespace run, newlines included, into one space, then caps the result at
/// `max` characters.
pub fn one_line(text: &str, max: usize) -> String {
    let collapsed = text.split_whitespace().collect::<Vec<_>>().join(" ");
    truncate(&collapsed, max)
}

/// Caps `text` at `max` characters. A cut text ends in an ellipsis so it doesn't read as whole.
pub fn truncate(text: &str, max: usize) -> String {
    if text.chars().count() <= max {
        return text.to_owned();
    }
    let Some(keep) = max.checked_sub(1) else {
        return String::new();
    };
    let mut cut: String = text.chars().take(keep).collect();
    cut.push('…');
    cut
}

/// Formats an age in its largest whole unit: "45s", "12m", "3h", "2d".
pub fn format_age(seconds: i64) -> String {
    let seconds = seconds.max(0);
    match seconds {
        0..60 => format!("{seconds}s"),
        60..3_600 => format!("{}m", seconds / 60),
        3_600..86_400 => format!("{}h", seconds / 3_600),
        _ => format!("{}d", seconds / 86_400),
    }
}

/// Lays rows out in left-aligned columns two spaces apart, without trailing spaces.
pub fn columns(rows: &[Vec<String>]) -> String {
    let width_count = rows.iter().map(Vec::len).max().unwrap_or(0);
    let widths: Vec<usize> = (0..width_count)
        .map(|col| rows.iter().filter_map(|row| row.get(col)).map(|cell| cell.chars().count()).max().unwrap_or(0))
        .collect();
    let mut out = String::new();
    for row in rows {
        let mut line = String::new();
        for (cell, width) in row.iter().zip(&widths) {
            line.push_str(&format!("{cell:<width$}  "));
        }
        out.push_str(line.trim_end());
        out.push('\n');
    }
    out
}
