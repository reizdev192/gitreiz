use std::process::Command;
use std::path::Path;
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Clone)]
pub struct GitError(pub String);

pub fn run_git_command(repo_path: &str, args: &[&str]) -> Result<String, GitError> {
    let output = Command::new("git")
        .current_dir(Path::new(repo_path))
        .args(args)
        .output()
        .map_err(|e| GitError(format!("Failed to execute git: {}", e)))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        let err = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(GitError(err))
    }
}

pub fn get_latest_tag(repo_path: &str, format: &str) -> Option<String> {
    let prefix = format.split("{version}").next().unwrap_or("");
    let pattern = format!("{}*", prefix);
    let pattern_str = if pattern == "*" { "*".to_string() } else { pattern };
    match run_git_command(repo_path, &["tag", "-l", &pattern_str, "--sort=-v:refname"]) {
        Ok(output) => {
            let first_line = output.lines().next().unwrap_or("").trim().to_string();
            if first_line.is_empty() {
                None
            } else {
                Some(first_line)
            }
        },
        Err(_) => None, // Not found
    }
}

pub fn checkout(repo_path: &str, branch: &str) -> Result<String, GitError> {
    run_git_command(repo_path, &["checkout", branch])
}

pub fn pull(repo_path: &str) -> Result<String, GitError> {
    run_git_command(repo_path, &["pull"])
}

pub fn merge(repo_path: &str, from_branch: &str) -> Result<String, GitError> {
    run_git_command(repo_path, &["merge", from_branch, "--no-edit"])
}

pub fn create_tag(repo_path: &str, tag_name: &str) -> Result<String, GitError> {
    run_git_command(repo_path, &["tag", "-a", tag_name, "-m", &format!("Auto-tag {}", tag_name)])
}

pub fn push_with_tags(repo_path: &str) -> Result<String, GitError> {
    // push current branch
    run_git_command(repo_path, &["push"])?;
    // push tags
    run_git_command(repo_path, &["push", "--tags"])
}

pub fn get_current_branch(repo_path: &str) -> Result<String, GitError> {
    run_git_command(repo_path, &["branch", "--show-current"])
}

pub fn is_working_tree_clean(repo_path: &str) -> Result<bool, GitError> {
    let output = run_git_command(repo_path, &["status", "--porcelain"])?;
    Ok(output.is_empty())
}

pub fn list_branches(repo_path: &str) -> Result<Vec<String>, GitError> {
    let output = run_git_command(repo_path, &["branch", "-a", "--format=%(refname:short)"])?;
    let branches: Vec<String> = output
        .lines()
        .map(|line| line.trim().to_string())
        .filter(|line| !line.is_empty())
        .collect();
    Ok(branches)
}

pub fn stash(repo_path: &str) -> Result<String, GitError> {
    run_git_command(repo_path, &["stash", "push", "-m", "Auto-stash by Deploy Tool"])
}

pub fn stash_pop(repo_path: &str) -> Result<String, GitError> {
    run_git_command(repo_path, &["stash", "pop"])
}

pub fn delete_branch(repo_path: &str, branch: &str) -> Result<String, GitError> {
    run_git_command(repo_path, &["branch", "-d", branch])
}

pub fn create_branch(repo_path: &str, new_branch: &str, from_ref: &str) -> Result<String, GitError> {
    run_git_command(repo_path, &["branch", new_branch, from_ref])
}

pub fn get_last_commit(repo_path: &str, branch: &str) -> Result<String, GitError> {
    run_git_command(repo_path, &["log", branch, "-1", "--format=%s (%cr)"])
}

pub fn get_ahead_behind(repo_path: &str, branch_a: &str, branch_b: &str) -> Result<(i32, i32), GitError> {
    let output = run_git_command(repo_path, &["rev-list", "--left-right", "--count", &format!("{}...{}", branch_a, branch_b)])?;
    let parts: Vec<&str> = output.split_whitespace().collect();
    if parts.len() == 2 {
        let ahead = parts[0].parse::<i32>().unwrap_or(0);
        let behind = parts[1].parse::<i32>().unwrap_or(0);
        Ok((ahead, behind))
    } else {
        Ok((0, 0))
    }
}

// ── Stash ──

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StashEntry {
    pub index: u32,
    pub message: String,
    pub date: String,
}

pub fn list_stashes(repo_path: &str) -> Result<Vec<StashEntry>, GitError> {
    let output = run_git_command(repo_path, &["stash", "list", "--format=%gd<<SEP>>%gs<<SEP>>%ar"]);
    match output {
        Ok(text) if !text.is_empty() => {
            Ok(text.lines().filter_map(|line| {
                let parts: Vec<&str> = line.splitn(3, "<<SEP>>").collect();
                if parts.len() == 3 {
                    let idx_str = parts[0].replace("stash@{", "").replace("}", "");
                    let idx = idx_str.parse::<u32>().unwrap_or(0);
                    Some(StashEntry { index: idx, message: parts[1].to_string(), date: parts[2].to_string() })
                } else { None }
            }).collect())
        }
        _ => Ok(vec![])
    }
}

pub fn stash_apply(repo_path: &str, index: u32) -> Result<String, GitError> {
    run_git_command(repo_path, &["stash", "apply", &format!("stash@{{{}}}", index)])
}

pub fn stash_drop(repo_path: &str, index: u32) -> Result<String, GitError> {
    run_git_command(repo_path, &["stash", "drop", &format!("stash@{{{}}}", index)])
}

// ── Tags ──

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TagInfo {
    pub name: String,
    pub hash: String,
    pub date: String,
    pub message: String,
}

pub fn list_tags(repo_path: &str) -> Result<Vec<TagInfo>, GitError> {
    let output = run_git_command(repo_path, &["tag", "-l", "--sort=-v:refname", "--format=%(refname:short)<<SEP>>%(objectname:short)<<SEP>>%(creatordate:relative)<<SEP>>%(subject)"]);
    match output {
        Ok(text) if !text.is_empty() => {
            Ok(text.lines().filter_map(|line| {
                let parts: Vec<&str> = line.splitn(4, "<<SEP>>").collect();
                if parts.len() == 4 {
                    Some(TagInfo { name: parts[0].to_string(), hash: parts[1].to_string(), date: parts[2].to_string(), message: parts[3].to_string() })
                } else { None }
            }).collect())
        }
        _ => Ok(vec![])
    }
}

pub fn delete_tag(repo_path: &str, name: &str, delete_remote: bool) -> Result<String, GitError> {
    let local = run_git_command(repo_path, &["tag", "-d", name])?;
    if delete_remote {
        let _ = run_git_command(repo_path, &["push", "origin", &format!(":refs/tags/{}", name)]);
    }
    Ok(local)
}

pub fn create_tag_annotated(repo_path: &str, name: &str, message: &str) -> Result<String, GitError> {
    run_git_command(repo_path, &["tag", "-a", name, "-m", message])
}

// ── Cherry-pick ──

pub fn cherry_pick(repo_path: &str, hash: &str) -> Result<String, GitError> {
    run_git_command(repo_path, &["cherry-pick", hash])
}

// ── Fetch ──

pub fn fetch_all(repo_path: &str) -> Result<String, GitError> {
    run_git_command(repo_path, &["fetch", "--all", "--prune"])
}

// ── Diff / Working tree ──

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiffFile {
    pub path: String,
    pub status: String,
    pub insertions: u32,
    pub deletions: u32,
}

pub fn get_commit_files(repo_path: &str, hash: &str) -> Result<Vec<DiffFile>, GitError> {
    let numstat = run_git_command(repo_path, &["diff-tree", "--no-commit-id", "-r", "--numstat", hash])?;
    let name_status = run_git_command(repo_path, &["diff-tree", "--no-commit-id", "-r", "--name-status", hash])?;

    let statuses: std::collections::HashMap<String, String> = name_status.lines().filter_map(|l| {
        let parts: Vec<&str> = l.split('\t').collect();
        if parts.len() >= 2 { Some((parts[1].to_string(), parts[0].to_string())) } else { None }
    }).collect();

    let files = numstat.lines().filter_map(|l| {
        let parts: Vec<&str> = l.split('\t').collect();
        if parts.len() >= 3 {
            Some(DiffFile {
                insertions: parts[0].parse().unwrap_or(0),
                deletions: parts[1].parse().unwrap_or(0),
                path: parts[2].to_string(),
                status: statuses.get(parts[2]).cloned().unwrap_or_else(|| "M".to_string()),
            })
        } else { None }
    }).collect();
    Ok(files)
}

pub fn get_file_diff(repo_path: &str, hash: &str, file_path: &str) -> Result<String, GitError> {
    run_git_command(repo_path, &["show", &format!("{}:{}", hash, file_path)])
        .or_else(|_| run_git_command(repo_path, &["diff", &format!("{}^", hash), hash, "--", file_path]))
}

// ── Working tree status (Quick Commit) ──

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkingFile {
    pub path: String,
    pub status: String,
    pub staged: bool,
}

pub fn get_status_files(repo_path: &str) -> Result<Vec<WorkingFile>, GitError> {
    let output = run_git_command(repo_path, &["status", "--porcelain=v1"])?;
    let files = output.lines().filter_map(|line| {
        if line.len() < 4 { return None; }
        let x = line.chars().nth(0).unwrap_or(' ');
        let y = line.chars().nth(1).unwrap_or(' ');
        let path = line[3..].to_string();
        let staged = x != ' ' && x != '?';
        let status = if x == '?' { "?".to_string() } else if staged { x.to_string() } else { y.to_string() };
        Some(WorkingFile { path, status, staged })
    }).collect();
    Ok(files)
}

pub fn stage_file(repo_path: &str, path: &str) -> Result<String, GitError> {
    run_git_command(repo_path, &["add", path])
}

pub fn unstage_file(repo_path: &str, path: &str) -> Result<String, GitError> {
    run_git_command(repo_path, &["restore", "--staged", path])
}

pub fn stage_all(repo_path: &str) -> Result<String, GitError> {
    run_git_command(repo_path, &["add", "-A"])
}

pub fn git_commit(repo_path: &str, message: &str) -> Result<String, GitError> {
    run_git_command(repo_path, &["commit", "-m", message])
}

pub fn discard_file(repo_path: &str, path: &str, status: &str) -> Result<String, GitError> {
    if status == "?" {
        // Untracked file → delete it
        let full = Path::new(repo_path).join(path);
        if full.is_dir() {
            std::fs::remove_dir_all(&full).map_err(|e| GitError(e.to_string()))?;
        } else {
            std::fs::remove_file(&full).map_err(|e| GitError(e.to_string()))?;
        }
        Ok(format!("Removed {}", path))
    } else {
        // Tracked file → restore to HEAD using git restore
        // First unstage if staged
        let _ = run_git_command(repo_path, &["restore", "--staged", path]);
        run_git_command(repo_path, &["restore", path])
    }
}

pub fn discard_all(repo_path: &str) -> Result<String, GitError> {
    // Unstage everything first
    let _ = run_git_command(repo_path, &["restore", "--staged", "."]);
    // Restore all tracked files
    let _ = run_git_command(repo_path, &["restore", "."]);
    // Clean untracked files
    run_git_command(repo_path, &["clean", "-fd"])
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommitInfo {
    pub hash: String,
    pub short_hash: String,
    pub author: String,
    pub email: String,
    pub date: String,
    pub date_relative: String,
    pub message: String,
    pub body: String,
    pub refs: String,
    pub parents: Vec<String>,
}

pub fn list_commits(repo_path: &str, branch: Option<&str>, limit: u32) -> Result<Vec<CommitInfo>, GitError> {
    let sep = "<<SEP>>";
    let format_str = format!("--format=%H{0}%h{0}%an{0}%ae{0}%ai{0}%ar{0}%s{0}%b{0}%D{0}%P", sep);
    let limit_str = format!("-{}", limit);

    let mut args = vec!["log", &format_str, &limit_str];

    match branch {
        Some(b) if !b.is_empty() => args.push(b),
        _ => args.push("--all"),
    };

    let output = run_git_command(repo_path, &args)?;

    let commits: Vec<CommitInfo> = output
        .lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.splitn(10, sep).collect();
            if parts.len() == 10 {
                let parents: Vec<String> = parts[9].split_whitespace().map(|s| s.to_string()).collect();
                Some(CommitInfo {
                    hash: parts[0].to_string(),
                    short_hash: parts[1].to_string(),
                    author: parts[2].to_string(),
                    email: parts[3].to_string(),
                    date: parts[4].to_string(),
                    date_relative: parts[5].to_string(),
                    message: parts[6].to_string(),
                    body: parts[7].trim().to_string(),
                    refs: parts[8].to_string(),
                    parents,
                })
            } else {
                None
            }
        })
        .collect();

    Ok(commits)
}

pub fn search_commits(repo_path: &str, query: Option<&str>, author: Option<&str>, branch: Option<&str>, limit: u32) -> Result<Vec<CommitInfo>, GitError> {
    let sep = "<<SEP>>";
    let format_str = format!("--format=%H{0}%h{0}%an{0}%ae{0}%ai{0}%ar{0}%s{0}%b{0}%D{0}%P", sep);
    let limit_str = format!("-{}", limit);

    let mut args = vec!["log".to_string(), format_str, limit_str];

    if let Some(q) = query {
        if !q.is_empty() {
            args.push(format!("--grep={}", q));
            args.push("--regexp-ignore-case".to_string());
        }
    }
    if let Some(a) = author {
        if !a.is_empty() {
            args.push(format!("--author={}", a));
        }
    }

    match branch {
        Some(b) if !b.is_empty() => args.push(b.to_string()),
        _ => args.push("--all".to_string()),
    };

    let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let output = run_git_command(repo_path, &arg_refs)?;

    let commits: Vec<CommitInfo> = output
        .lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.splitn(10, sep).collect();
            if parts.len() == 10 {
                let parents: Vec<String> = parts[9].split_whitespace().map(|s| s.to_string()).collect();
                Some(CommitInfo {
                    hash: parts[0].to_string(),
                    short_hash: parts[1].to_string(),
                    author: parts[2].to_string(),
                    email: parts[3].to_string(),
                    date: parts[4].to_string(),
                    date_relative: parts[5].to_string(),
                    message: parts[6].to_string(),
                    body: parts[7].trim().to_string(),
                    refs: parts[8].to_string(),
                    parents,
                })
            } else {
                None
            }
        })
        .collect();

    Ok(commits)
}

// ── Worktree ──

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorktreeInfo {
    pub path: String,
    pub branch: String,
    pub head: String,
    pub is_main: bool,
}

pub fn list_worktrees(repo_path: &str) -> Result<Vec<WorktreeInfo>, GitError> {
    let output = run_git_command(repo_path, &["worktree", "list", "--porcelain"])?;
    let mut worktrees: Vec<WorktreeInfo> = Vec::new();
    let mut path = String::new();
    let mut head = String::new();
    let mut branch = String::new();
    let mut is_bare = false;

    for line in output.lines() {
        if let Some(p) = line.strip_prefix("worktree ") {
            path = p.to_string();
        } else if let Some(h) = line.strip_prefix("HEAD ") {
            head = h[..7.min(h.len())].to_string();
        } else if let Some(b) = line.strip_prefix("branch refs/heads/") {
            branch = b.to_string();
        } else if line == "bare" {
            is_bare = true;
        } else if line.is_empty() && !path.is_empty() {
            if !is_bare {
                let is_main = worktrees.is_empty();
                if branch.is_empty() {
                    branch = "(detached)".to_string();
                }
                worktrees.push(WorktreeInfo {
                    path: path.clone(),
                    branch: branch.clone(),
                    head: head.clone(),
                    is_main,
                });
            }
            path.clear();
            head.clear();
            branch.clear();
            is_bare = false;
        }
    }
    // Handle last entry (no trailing newline)
    if !path.is_empty() && !is_bare {
        let is_main = worktrees.is_empty();
        if branch.is_empty() {
            branch = "(detached)".to_string();
        }
        worktrees.push(WorktreeInfo {
            path,
            branch,
            head,
            is_main,
        });
    }
    Ok(worktrees)
}

pub fn worktree_add(repo_path: &str, branch: &str) -> Result<String, GitError> {
    let sanitized = branch
        .replace("origin/", "")
        .replace('/', "-")
        .replace('\\', "-");
    let target = Path::new(repo_path).join(".worktrees").join(&sanitized);
    let target_str = target.to_string_lossy().to_string();
    run_git_command(repo_path, &["worktree", "add", &target_str, branch])?;
    Ok(target_str)
}

pub fn worktree_remove(repo_path: &str, worktree_path: &str) -> Result<String, GitError> {
    run_git_command(repo_path, &["worktree", "remove", worktree_path, "--force"])
}

pub fn worktree_prune(repo_path: &str) -> Result<String, GitError> {
    run_git_command(repo_path, &["worktree", "prune"])
}
