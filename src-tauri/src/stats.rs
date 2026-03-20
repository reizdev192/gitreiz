use crate::git;
use serde::Serialize;
use std::collections::HashMap;

// ── Structs ──

#[derive(Debug, Serialize, Clone)]
pub struct ContributorStats {
    pub author: String,
    pub email: String,
    pub commits: u32,
    pub lines_added: u64,
    pub lines_removed: u64,
    pub files_changed: u32,
    pub active_days: u32,
    pub first_commit: String,
    pub last_commit: String,
    pub avg_commit_size: u64,
}

#[derive(Debug, Serialize, Clone)]
pub struct HeatmapDay {
    pub date: String,
    pub count: u32,
}

#[derive(Debug, Serialize, Clone)]
pub struct HourActivity {
    pub hour: u8,
    pub count: u32,
}

#[derive(Debug, Serialize, Clone)]
pub struct AuthorHourActivity {
    pub author: String,
    pub hours: Vec<HourActivity>,
}

#[derive(Debug, Serialize, Clone)]
pub struct BranchStats {
    pub name: String,
    pub author: String,
    pub age_days: u32,
    pub commits_count: u32,
    pub is_merged: bool,
    pub last_commit_date: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct ChurnFile {
    pub path: String,
    pub times_modified: u32,
    pub unique_authors: u32,
    pub total_changes: u64,
}

#[derive(Debug, Serialize, Clone)]
pub struct CommitSizeInfo {
    pub hash: String,
    pub author: String,
    pub message: String,
    pub date: String,
    pub lines_added: u64,
    pub lines_removed: u64,
    pub total: u64,
}

#[derive(Debug, Serialize, Clone)]
pub struct AlertInfo {
    pub severity: String,    // "info" | "warning" | "critical"
    pub alert_type: String,  // "inactive" | "overtime" | "large_commit" | "high_churn" | "stale_branch"
    pub title: String,
    pub message: String,
    pub author: Option<String>,
}

// ── Commands ──

/// Get contributor stats within a date range
#[tauri::command]
pub async fn get_contributor_stats_cmd(
    repo_path: String,
    since: Option<String>,
    until: Option<String>,
) -> Result<Vec<ContributorStats>, String> {
    // Step 1: Get commits with numstat
    let sep = "<<SEP>>";
    let format_str = format!("--format=<<COMMIT>>%H{0}%an{0}%ae{0}%ai{0}%s", sep);
    let mut args = vec!["log".to_string(), format_str, "--all".to_string(), "--numstat".to_string()];

    if let Some(ref s) = since {
        if !s.is_empty() {
            args.push(format!("--since={}", s));
        }
    }
    if let Some(ref u) = until {
        if !u.is_empty() {
            args.push(format!("--until={}", u));
        }
    }

    let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let output = git::run_git_command(&repo_path, &arg_refs).map_err(|e| e.0)?;

    // Step 2: Parse output
    let mut stats_map: HashMap<String, ContributorStats> = HashMap::new();

    let mut current_author = String::new();
    let mut current_email = String::new();
    let mut current_date = String::new();

    for line in output.lines() {
        if let Some(commit_data) = line.strip_prefix("<<COMMIT>>") {
            let parts: Vec<&str> = commit_data.splitn(5, sep).collect();
            if parts.len() == 5 {
                current_author = parts[1].to_string();
                current_email = parts[2].to_string();
                current_date = parts[3].split('T').next().unwrap_or(parts[3]).to_string();
                // Trim to just date portion (YYYY-MM-DD)
                if current_date.len() > 10 {
                    current_date = current_date[..10].to_string();
                }

                let key = current_email.clone();
                let entry = stats_map.entry(key).or_insert_with(|| ContributorStats {
                    author: current_author.clone(),
                    email: current_email.clone(),
                    commits: 0,
                    lines_added: 0,
                    lines_removed: 0,
                    files_changed: 0,
                    active_days: 0,
                    first_commit: current_date.clone(),
                    last_commit: current_date.clone(),
                    avg_commit_size: 0,
                });
                entry.commits += 1;
                // Track first/last commit
                if current_date < entry.first_commit {
                    entry.first_commit = current_date.clone();
                }
                if current_date > entry.last_commit {
                    entry.last_commit = current_date.clone();
                }
            }
        } else if !line.is_empty() && !current_email.is_empty() {
            // numstat line: <added>\t<removed>\t<file>
            let parts: Vec<&str> = line.split('\t').collect();
            if parts.len() >= 3 {
                let added: u64 = parts[0].parse().unwrap_or(0);
                let removed: u64 = parts[1].parse().unwrap_or(0);
                if let Some(entry) = stats_map.get_mut(&current_email) {
                    entry.lines_added += added;
                    entry.lines_removed += removed;
                    entry.files_changed += 1;
                }
            }
        }
    }

    // Step 3: Calculate active days using a separate git call per author
    for (email, stats) in stats_map.iter_mut() {
        let mut day_args = vec![
            "log".to_string(),
            "--all".to_string(),
            format!("--author={}", email),
            "--format=%ad".to_string(),
            "--date=short".to_string(),
        ];
        if let Some(ref s) = since {
            if !s.is_empty() {
                day_args.push(format!("--since={}", s));
            }
        }
        if let Some(ref u) = until {
            if !u.is_empty() {
                day_args.push(format!("--until={}", u));
            }
        }
        let day_refs: Vec<&str> = day_args.iter().map(|s| s.as_str()).collect();
        if let Ok(day_output) = git::run_git_command(&repo_path, &day_refs) {
            let unique_days: std::collections::HashSet<&str> = day_output.lines().collect();
            stats.active_days = unique_days.len() as u32;
        }

        // Calculate average commit size
        if stats.commits > 0 {
            stats.avg_commit_size = (stats.lines_added + stats.lines_removed) / stats.commits as u64;
        }
    }

    let mut result: Vec<ContributorStats> = stats_map.into_values().collect();
    result.sort_by(|a, b| b.commits.cmp(&a.commits));
    Ok(result)
}

/// Get commit count per day for heatmap (last 365 days)
#[tauri::command]
pub async fn get_commit_heatmap_cmd(
    repo_path: String,
    author: Option<String>,
) -> Result<Vec<HeatmapDay>, String> {
    let mut args = vec![
        "log".to_string(),
        "--all".to_string(),
        "--format=%ad".to_string(),
        "--date=short".to_string(),
        "--since=365 days ago".to_string(),
    ];
    if let Some(ref a) = author {
        if !a.is_empty() {
            args.push(format!("--author={}", a));
        }
    }
    let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let output = git::run_git_command(&repo_path, &arg_refs).map_err(|e| e.0)?;

    let mut day_counts: HashMap<String, u32> = HashMap::new();
    for line in output.lines() {
        let date = line.trim().to_string();
        if !date.is_empty() {
            *day_counts.entry(date).or_insert(0) += 1;
        }
    }

    let mut result: Vec<HeatmapDay> = day_counts
        .into_iter()
        .map(|(date, count)| HeatmapDay { date, count })
        .collect();
    result.sort_by(|a, b| a.date.cmp(&b.date));
    Ok(result)
}

/// Get commit activity by hour per author
#[tauri::command]
pub async fn get_active_hours_cmd(
    repo_path: String,
    since: Option<String>,
) -> Result<Vec<AuthorHourActivity>, String> {
    let mut args = vec![
        "log".to_string(),
        "--all".to_string(),
        "--format=%ae<<SEP>>%aH".to_string(),
    ];
    if let Some(ref s) = since {
        if !s.is_empty() {
            args.push(format!("--since={}", s));
        }
    }
    let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let output = git::run_git_command(&repo_path, &arg_refs).map_err(|e| e.0)?;

    // author_email -> hour -> count
    let mut map: HashMap<String, [u32; 24]> = HashMap::new();

    for line in output.lines() {
        let parts: Vec<&str> = line.splitn(2, "<<SEP>>").collect();
        if parts.len() == 2 {
            let email = parts[0].to_string();
            let hour: usize = parts[1].parse().unwrap_or(0);
            if hour < 24 {
                let entry = map.entry(email).or_insert([0u32; 24]);
                entry[hour] += 1;
            }
        }
    }

    let result: Vec<AuthorHourActivity> = map
        .into_iter()
        .map(|(author, hours_arr)| {
            let hours = hours_arr
                .iter()
                .enumerate()
                .map(|(h, &c)| HourActivity { hour: h as u8, count: c })
                .collect();
            AuthorHourActivity { author, hours }
        })
        .collect();

    Ok(result)
}

/// Get branch lifecycle stats
#[tauri::command]
pub async fn get_branch_lifecycle_cmd(
    repo_path: String,
) -> Result<Vec<BranchStats>, String> {
    // Get all local branches
    let branches_output = git::run_git_command(&repo_path, &[
        "branch", "--format=%(refname:short)<<SEP>>%(authorname)<<SEP>>%(creatordate:short)<<SEP>>%(creatordate:relative)"
    ]).map_err(|e| e.0)?;

    // Get merged branches
    let merged_output = git::run_git_command(&repo_path, &["branch", "--merged", "HEAD", "--format=%(refname:short)"])
        .unwrap_or_default();
    let merged_set: std::collections::HashSet<String> = merged_output.lines().map(|l| l.trim().to_string()).collect();

    let mut result = Vec::new();

    for line in branches_output.lines() {
        let parts: Vec<&str> = line.splitn(4, "<<SEP>>").collect();
        if parts.len() >= 3 {
            let name = parts[0].trim().to_string();
            let author = parts[1].trim().to_string();
            let created_date = parts[2].trim().to_string();

            // Count commits on branch
            let count_output = git::run_git_command(&repo_path, &["rev-list", "--count", &name])
                .unwrap_or_else(|_| "0".to_string());
            let commits_count: u32 = count_output.trim().parse().unwrap_or(0);

            // Get last commit date
            let last_date = git::run_git_command(&repo_path, &["log", &name, "-1", "--format=%ad", "--date=short"])
                .unwrap_or_default();

            // Calculate age in days
            let age_days = calculate_age_days(&created_date);

            result.push(BranchStats {
                name: name.clone(),
                author,
                age_days,
                commits_count,
                is_merged: merged_set.contains(&name),
                last_commit_date: last_date.trim().to_string(),
            });
        }
    }

    result.sort_by(|a, b| b.age_days.cmp(&a.age_days));
    Ok(result)
}

/// Get code churn — files modified multiple times recently
#[tauri::command]
pub async fn get_code_churn_cmd(
    repo_path: String,
    days: Option<u32>,
) -> Result<Vec<ChurnFile>, String> {
    let d = days.unwrap_or(30);
    let since = format!("--since={} days ago", d);

    let output = git::run_git_command(&repo_path, &[
        "log", "--all", &since, "--format=<<COMMIT>>%ae", "--name-only"
    ]).map_err(|e| e.0)?;

    // file -> (count, set of authors)
    let mut file_stats: HashMap<String, (u32, std::collections::HashSet<String>)> = HashMap::new();
    let mut current_author = String::new();

    for line in output.lines() {
        if let Some(commit_data) = line.strip_prefix("<<COMMIT>>") {
            current_author = commit_data.trim().to_string();
        } else if !line.is_empty() && !current_author.is_empty() {
            let path = line.trim().to_string();
            let entry = file_stats.entry(path).or_insert_with(|| (0, std::collections::HashSet::new()));
            entry.0 += 1;
            entry.1.insert(current_author.clone());
        }
    }

    // Get numstat for total changes
    let numstat_output = git::run_git_command(&repo_path, &[
        "log", "--all", &since, "--format=", "--numstat"
    ]).unwrap_or_default();

    let mut file_changes: HashMap<String, u64> = HashMap::new();
    for line in numstat_output.lines() {
        let parts: Vec<&str> = line.split('\t').collect();
        if parts.len() >= 3 {
            let added: u64 = parts[0].parse().unwrap_or(0);
            let removed: u64 = parts[1].parse().unwrap_or(0);
            *file_changes.entry(parts[2].to_string()).or_insert(0) += added + removed;
        }
    }

    let mut result: Vec<ChurnFile> = file_stats
        .into_iter()
        .filter(|(_, (count, _))| *count >= 2) // Only files modified 2+ times
        .map(|(path, (times_modified, authors))| {
            let total_changes = file_changes.get(&path).copied().unwrap_or(0);
            ChurnFile {
                path,
                times_modified,
                unique_authors: authors.len() as u32,
                total_changes,
            }
        })
        .collect();

    result.sort_by(|a, b| b.times_modified.cmp(&a.times_modified));
    // Return top 50
    result.truncate(50);
    Ok(result)
}

/// Get large commits (commit size breakdown)
#[tauri::command]
pub async fn get_commit_sizes_cmd(
    repo_path: String,
    since: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<CommitSizeInfo>, String> {
    let sep = "<<SEP>>";
    let format_str = format!("--format=<<COMMIT>>%H{0}%an{0}%s{0}%ad", sep);
    let lim = limit.unwrap_or(200);

    let mut args = vec![
        "log".to_string(), format_str, "--all".to_string(),
        "--date=short".to_string(), "--numstat".to_string(),
        format!("-{}", lim),
    ];
    if let Some(ref s) = since {
        if !s.is_empty() {
            args.push(format!("--since={}", s));
        }
    }

    let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let output = git::run_git_command(&repo_path, &arg_refs).map_err(|e| e.0)?;

    let mut commits = Vec::new();
    let mut current: Option<CommitSizeInfo> = None;

    for line in output.lines() {
        if let Some(commit_data) = line.strip_prefix("<<COMMIT>>") {
            // Save previous commit
            if let Some(mut c) = current.take() {
                c.total = c.lines_added + c.lines_removed;
                commits.push(c);
            }
            let parts: Vec<&str> = commit_data.splitn(4, sep).collect();
            if parts.len() == 4 {
                current = Some(CommitSizeInfo {
                    hash: parts[0][..7.min(parts[0].len())].to_string(),
                    author: parts[1].to_string(),
                    message: parts[2].to_string(),
                    date: parts[3].to_string(),
                    lines_added: 0,
                    lines_removed: 0,
                    total: 0,
                });
            }
        } else if !line.is_empty() {
            if let Some(ref mut c) = current {
                let parts: Vec<&str> = line.split('\t').collect();
                if parts.len() >= 2 {
                    c.lines_added += parts[0].parse::<u64>().unwrap_or(0);
                    c.lines_removed += parts[1].parse::<u64>().unwrap_or(0);
                }
            }
        }
    }
    // Save last commit
    if let Some(mut c) = current.take() {
        c.total = c.lines_added + c.lines_removed;
        commits.push(c);
    }

    Ok(commits)
}

/// Get smart alerts based on git activity
#[tauri::command]
pub async fn get_smart_alerts_cmd(
    repo_path: String,
) -> Result<Vec<AlertInfo>, String> {
    let mut alerts: Vec<AlertInfo> = Vec::new();

    // 1. Check for inactive members (no commits in 3+ days)
    let recent_output = git::run_git_command(&repo_path, &[
        "log", "--all", "--since=30 days ago", "--format=%ae<<SEP>>%ad", "--date=short"
    ]).unwrap_or_default();

    let mut last_commit_by_author: HashMap<String, String> = HashMap::new();
    for line in recent_output.lines() {
        let parts: Vec<&str> = line.splitn(2, "<<SEP>>").collect();
        if parts.len() == 2 {
            let email = parts[0].to_string();
            let date = parts[1].to_string();
            let entry = last_commit_by_author.entry(email).or_insert_with(|| date.clone());
            if date > *entry {
                *entry = date;
            }
        }
    }

    let today = chrono_today();
    for (author, last_date) in &last_commit_by_author {
        let days_ago = days_between(last_date, &today);
        if days_ago >= 3 {
            alerts.push(AlertInfo {
                severity: if days_ago >= 7 { "critical" } else { "warning" }.to_string(),
                alert_type: "inactive".to_string(),
                title: "Inactive member".to_string(),
                message: format!("No commits in {} days", days_ago),
                author: Some(author.clone()),
            });
        }
    }

    // 2. Check for overtime (commits after 22:00 or before 06:00)
    let hour_output = git::run_git_command(&repo_path, &[
        "log", "--all", "--since=14 days ago", "--format=%ae<<SEP>>%aH"
    ]).unwrap_or_default();

    let mut overtime_counts: HashMap<String, u32> = HashMap::new();
    for line in hour_output.lines() {
        let parts: Vec<&str> = line.splitn(2, "<<SEP>>").collect();
        if parts.len() == 2 {
            let hour: u32 = parts[1].parse().unwrap_or(12);
            if hour >= 22 || hour < 6 {
                *overtime_counts.entry(parts[0].to_string()).or_insert(0) += 1;
            }
        }
    }

    for (author, count) in &overtime_counts {
        if *count >= 3 {
            alerts.push(AlertInfo {
                severity: "warning".to_string(),
                alert_type: "overtime".to_string(),
                title: "Overtime detected".to_string(),
                message: format!("{} commits outside working hours (10PM-6AM) in 2 weeks", count),
                author: Some(author.clone()),
            });
        }
    }

    // 3. Check for large commits (>500 lines) in last 7 days
    let large_output = git::run_git_command(&repo_path, &[
        "log", "--all", "--since=7 days ago", "--format=<<COMMIT>>%ae<<SEP>>%s", "--numstat"
    ]).unwrap_or_default();

    let mut current_author = String::new();
    let mut current_msg = String::new();
    let mut current_total: u64 = 0;

    for line in large_output.lines() {
        if let Some(commit_data) = line.strip_prefix("<<COMMIT>>") {
            // Check previous
            if current_total > 500 && !current_author.is_empty() {
                alerts.push(AlertInfo {
                    severity: "info".to_string(),
                    alert_type: "large_commit".to_string(),
                    title: "Large commit".to_string(),
                    message: format!("{} lines changed: {}", current_total, current_msg),
                    author: Some(current_author.clone()),
                });
            }
            let parts: Vec<&str> = commit_data.splitn(2, "<<SEP>>").collect();
            if parts.len() == 2 {
                current_author = parts[0].to_string();
                current_msg = parts[1].to_string();
            }
            current_total = 0;
        } else if !line.is_empty() {
            let parts: Vec<&str> = line.split('\t').collect();
            if parts.len() >= 2 {
                current_total += parts[0].parse::<u64>().unwrap_or(0);
                current_total += parts[1].parse::<u64>().unwrap_or(0);
            }
        }
    }
    // Check last commit
    if current_total > 500 && !current_author.is_empty() {
        alerts.push(AlertInfo {
            severity: "info".to_string(),
            alert_type: "large_commit".to_string(),
            title: "Large commit".to_string(),
            message: format!("{} lines changed: {}", current_total, current_msg),
            author: Some(current_author),
        });
    }

    // 4. Check for stale branches (>7 days without merge)
    if let Ok(branch_stats) = get_branch_lifecycle_cmd(repo_path).await {
        for b in &branch_stats {
            if !b.is_merged && b.age_days > 7 && b.name != "main" && b.name != "master" && b.name != "develop" {
                alerts.push(AlertInfo {
                    severity: if b.age_days > 30 { "warning" } else { "info" }.to_string(),
                    alert_type: "stale_branch".to_string(),
                    title: "Stale branch".to_string(),
                    message: format!("Branch '{}' is {} days old, not merged", b.name, b.age_days),
                    author: Some(b.author.clone()),
                });
            }
        }
    }

    alerts.sort_by(|a, b| {
        let sev_order = |s: &str| match s { "critical" => 0, "warning" => 1, _ => 2 };
        sev_order(&a.severity).cmp(&sev_order(&b.severity))
    });

    Ok(alerts)
}

// ── Team Dashboard ──

#[derive(Debug, Serialize, Clone)]
pub struct TeamActivity {
    pub hash: String,
    pub author: String,
    pub email: String,
    pub date: String,
    pub date_relative: String,
    pub message: String,
    pub branch: String,
}

/// Get recent team activity (timeline of commits across all members)
#[tauri::command]
pub async fn get_team_activity_cmd(
    repo_path: String,
    since: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<TeamActivity>, String> {
    let sep = "<<SEP>>";
    let format_str = format!("--format=<<COMMIT>>%h{0}%an{0}%ae{0}%ad{0}%ar{0}%s{0}%D", sep);
    let lim = limit.unwrap_or(100);

    let mut args = vec![
        "log".to_string(), format_str, "--all".to_string(),
        "--date=short".to_string(), format!("-{}", lim),
    ];
    if let Some(ref s) = since {
        if !s.is_empty() {
            args.push(format!("--since={}", s));
        }
    }

    let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let output = git::run_git_command(&repo_path, &arg_refs).map_err(|e| e.0)?;

    let mut result = Vec::new();
    for line in output.lines() {
        if let Some(commit_data) = line.strip_prefix("<<COMMIT>>") {
            let parts: Vec<&str> = commit_data.splitn(7, sep).collect();
            if parts.len() == 7 {
                // Extract branch name from decoration string
                let decorations = parts[6].trim();
                let branch = extract_branch_name(decorations);

                result.push(TeamActivity {
                    hash: parts[0].to_string(),
                    author: parts[1].to_string(),
                    email: parts[2].to_string(),
                    date: parts[3].to_string(),
                    date_relative: parts[4].to_string(),
                    message: parts[5].to_string(),
                    branch,
                });
            }
        }
    }

    Ok(result)
}

/// Extract branch name from git decoration string
fn extract_branch_name(decorations: &str) -> String {
    if decorations.is_empty() {
        return String::new();
    }
    // Parse decorations like "HEAD -> main, origin/main"
    for part in decorations.split(',') {
        let trimmed = part.trim();
        if let Some(branch) = trimmed.strip_prefix("HEAD -> ") {
            return branch.to_string();
        }
    }
    // fallback: first decoration
    let first = decorations.split(',').next().unwrap_or("").trim();
    first.replace("origin/", "").to_string()
}

// ── Helpers ──

fn calculate_age_days(date_str: &str) -> u32 {
    let today = chrono_today();
    days_between(date_str, &today)
}

fn chrono_today() -> String {
    // Simple date calculation using system time
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let days_since_epoch = now / 86400;
    // Convert to YYYY-MM-DD
    epoch_days_to_date(days_since_epoch as i64)
}

fn epoch_days_to_date(days: i64) -> String {
    // Simple conversion from days since Unix epoch to YYYY-MM-DD
    let mut y = 1970i64;
    let mut remaining = days;

    loop {
        let days_in_year = if is_leap_year(y) { 366 } else { 365 };
        if remaining < days_in_year {
            break;
        }
        remaining -= days_in_year;
        y += 1;
    }

    let month_days = if is_leap_year(y) {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };

    let mut m = 0usize;
    for (i, &d) in month_days.iter().enumerate() {
        if remaining < d as i64 {
            m = i;
            break;
        }
        remaining -= d as i64;
    }

    format!("{:04}-{:02}-{:02}", y, m + 1, remaining + 1)
}

fn is_leap_year(y: i64) -> bool {
    (y % 4 == 0 && y % 100 != 0) || (y % 400 == 0)
}

fn days_between(from: &str, to: &str) -> u32 {
    let from_days = date_to_epoch_days(from);
    let to_days = date_to_epoch_days(to);
    if to_days > from_days {
        (to_days - from_days) as u32
    } else {
        0
    }
}

fn date_to_epoch_days(date_str: &str) -> i64 {
    let parts: Vec<&str> = date_str.split('-').collect();
    if parts.len() != 3 {
        return 0;
    }
    let y: i64 = parts[0].parse().unwrap_or(1970);
    let m: i64 = parts[1].parse().unwrap_or(1);
    let d: i64 = parts[2].parse().unwrap_or(1);

    // Simplified Julian day calculation
    let mut total_days: i64 = 0;
    for year in 1970..y {
        total_days += if is_leap_year(year) { 366 } else { 365 };
    }

    let month_days = if is_leap_year(y) {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };

    for i in 0..(m - 1) as usize {
        if i < 12 {
            total_days += month_days[i] as i64;
        }
    }

    total_days += d - 1;
    total_days
}
