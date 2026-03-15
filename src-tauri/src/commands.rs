use crate::config::ProjectConfig;
use crate::git;
use crate::version;
use serde::Serialize;

#[derive(Serialize)]
pub struct DeployPlan {
    pub current_branch: String,
    pub new_tag: String,
    pub commands_preview: Vec<String>,
}

#[tauri::command]
pub async fn begin_deployment(project: ProjectConfig, target: String) -> Result<String, String> {
    let repo_path = &project.path;
    
    let env = project.environments.iter().find(|e| e.name == target)
        .ok_or_else(|| format!("Environment '{}' not configured", target))?;
    let tag_format = &env.tag_format;

    let current_branch = git::run_git_command(repo_path, &["branch", "--show-current"])
        .map_err(|e| e.0)?;

    let mut logs = String::new();
    logs.push_str(&format!("Starting deploy for target '{}' on branch '{}'...\n", target, current_branch));

    let latest_tag = git::get_latest_tag(repo_path, tag_format);
    let new_tag = version::generate_next_tag(latest_tag, tag_format);
    
    git::create_tag(repo_path, &new_tag).map_err(|e| e.0)?;
    logs.push_str(&format!("Created tag {}\n", new_tag));

    git::push_with_tags(repo_path).map_err(|e| e.0)?;
    logs.push_str("Pushed tags successfully\n");

    Ok(logs)
}

#[tauri::command]
pub async fn get_deploy_plan(project: ProjectConfig, target: String) -> Result<DeployPlan, String> {
    let repo_path = &project.path;
    
    let env = project.environments.iter().find(|e| e.name == target)
        .ok_or_else(|| format!("Environment '{}' not configured", target))?;
    let tag_format = &env.tag_format;

    let current_branch = git::run_git_command(repo_path, &["branch", "--show-current"])
        .map_err(|e| e.0)?;

    let latest_tag = git::get_latest_tag(repo_path, tag_format);
    let new_tag = version::generate_next_tag(latest_tag, tag_format);

    let commands_preview = vec![
        format!("git tag {}", new_tag),
        "git push origin --tags".to_string(),
    ];

    Ok(DeployPlan {
        current_branch: current_branch.to_string(),
        new_tag,
        commands_preview,
    })
}

#[tauri::command]
pub async fn check_uncommitted_cmd(repo_path: String) -> Result<bool, String> {
    git::is_working_tree_clean(&repo_path).map_err(|e| e.0)
}

#[tauri::command]
pub async fn list_branches_cmd(repo_path: String) -> Result<Vec<String>, String> {
    git::list_branches(&repo_path).map_err(|e| e.0)
}

#[tauri::command]
pub async fn checkout_branch_cmd(repo_path: String, branch: String) -> Result<String, String> {
    git::checkout(&repo_path, &branch).map_err(|e| e.0)
}

#[tauri::command]
pub async fn get_current_branch_cmd(repo_path: String) -> Result<String, String> {
    git::get_current_branch(&repo_path).map_err(|e| e.0)
}

#[derive(Serialize)]
pub struct BranchTagInfo {
    pub latest_tag: String,
    pub next_tag: String,
}

#[tauri::command]
pub async fn get_branch_tags_cmd(project: ProjectConfig) -> Result<std::collections::HashMap<String, BranchTagInfo>, String> {
    let repo_path = &project.path;
    let mut result = std::collections::HashMap::new();

    for env in &project.environments {
        let latest = git::get_latest_tag(repo_path, &env.tag_format);
        let next = version::generate_next_tag(latest.clone(), &env.tag_format);
        result.insert(env.name.clone(), BranchTagInfo {
            latest_tag: latest.unwrap_or_else(|| "none".to_string()),
            next_tag: next,
        });
    }

    Ok(result)
}

#[tauri::command]
pub async fn stash_cmd(repo_path: String) -> Result<String, String> {
    git::stash(&repo_path).map_err(|e| e.0)
}

#[tauri::command]
pub async fn stash_pop_cmd(repo_path: String) -> Result<String, String> {
    git::stash_pop(&repo_path).map_err(|e| e.0)
}

#[tauri::command]
pub async fn delete_branch_cmd(repo_path: String, branch: String) -> Result<String, String> {
    git::delete_branch(&repo_path, &branch).map_err(|e| e.0)
}

#[tauri::command]
pub async fn create_branch_cmd(repo_path: String, new_branch: String, from_ref: String) -> Result<String, String> {
    git::create_branch(&repo_path, &new_branch, &from_ref).map_err(|e| e.0)
}

#[derive(Serialize)]
pub struct BranchDetail {
    pub last_commit: String,
    pub ahead: i32,
    pub behind: i32,
    pub ahead_remote: i32,
    pub behind_remote: i32,
}

#[tauri::command]
pub async fn get_branch_details_cmd(repo_path: String, branches: Vec<String>, current_branch: String) -> Result<std::collections::HashMap<String, BranchDetail>, String> {
    let mut result = std::collections::HashMap::new();

    for branch in &branches {
        let last_commit = git::get_last_commit(&repo_path, branch).unwrap_or_default();
        let (ahead, behind) = if branch != &current_branch {
            git::get_ahead_behind(&repo_path, branch, &current_branch).unwrap_or((0, 0))
        } else {
            (0, 0)
        };
        let remote_ref = format!("origin/{}", branch);
        let (ahead_remote, behind_remote) = git::get_ahead_behind(&repo_path, branch, &remote_ref).unwrap_or((0, 0));
        result.insert(branch.clone(), BranchDetail { last_commit, ahead, behind, ahead_remote, behind_remote });
    }

    Ok(result)
}

#[tauri::command]
pub async fn pull_cmd(repo_path: String) -> Result<String, String> {
    git::pull(&repo_path).map_err(|e| e.0)
}

#[tauri::command]
pub async fn merge_cmd(repo_path: String, from_branch: String) -> Result<String, String> {
    git::merge(&repo_path, &from_branch).map_err(|e| e.0)
}

#[tauri::command]
pub async fn push_cmd(repo_path: String) -> Result<String, String> {
    git::push_with_tags(&repo_path).map_err(|e| e.0)
}

#[tauri::command]
pub async fn list_commits_cmd(repo_path: String, branch: Option<String>, limit: Option<u32>) -> Result<Vec<git::CommitInfo>, String> {
    let lim = limit.unwrap_or(100);
    git::list_commits(&repo_path, branch.as_deref(), lim).map_err(|e| e.0)
}

#[tauri::command]
pub async fn search_commits_cmd(repo_path: String, query: Option<String>, author: Option<String>, branch: Option<String>, limit: Option<u32>) -> Result<Vec<git::CommitInfo>, String> {
    let lim = limit.unwrap_or(100);
    git::search_commits(&repo_path, query.as_deref(), author.as_deref(), branch.as_deref(), lim).map_err(|e| e.0)
}

// ── Stash commands ──

#[tauri::command]
pub async fn list_stashes_cmd(repo_path: String) -> Result<Vec<git::StashEntry>, String> {
    git::list_stashes(&repo_path).map_err(|e| e.0)
}

#[tauri::command]
pub async fn stash_apply_cmd(repo_path: String, index: u32) -> Result<String, String> {
    git::stash_apply(&repo_path, index).map_err(|e| e.0)
}

#[tauri::command]
pub async fn stash_drop_cmd(repo_path: String, index: u32) -> Result<String, String> {
    git::stash_drop(&repo_path, index).map_err(|e| e.0)
}

// ── Tag commands ──

#[tauri::command]
pub async fn list_tags_cmd(repo_path: String) -> Result<Vec<git::TagInfo>, String> {
    git::list_tags(&repo_path).map_err(|e| e.0)
}

#[tauri::command]
pub async fn create_tag_cmd(repo_path: String, name: String, message: String) -> Result<String, String> {
    git::create_tag_annotated(&repo_path, &name, &message).map_err(|e| e.0)
}

#[tauri::command]
pub async fn delete_tag_cmd(repo_path: String, name: String, delete_remote: bool) -> Result<String, String> {
    git::delete_tag(&repo_path, &name, delete_remote).map_err(|e| e.0)
}

// ── Cherry-pick command ──

#[tauri::command]
pub async fn cherry_pick_cmd(repo_path: String, hash: String) -> Result<String, String> {
    git::cherry_pick(&repo_path, &hash).map_err(|e| e.0)
}

// ── Fetch command ──

#[tauri::command]
pub async fn fetch_all_cmd(repo_path: String) -> Result<String, String> {
    git::fetch_all(&repo_path).map_err(|e| e.0)
}

// ── Diff commands ──

#[tauri::command]
pub async fn get_commit_files_cmd(repo_path: String, hash: String) -> Result<Vec<git::DiffFile>, String> {
    git::get_commit_files(&repo_path, &hash).map_err(|e| e.0)
}

#[tauri::command]
pub async fn get_file_diff_cmd(repo_path: String, hash: String, file_path: String) -> Result<String, String> {
    git::get_file_diff(&repo_path, &hash, &file_path).map_err(|e| e.0)
}

// ── Working tree / Quick Commit commands ──

#[tauri::command]
pub async fn get_status_files_cmd(repo_path: String) -> Result<Vec<git::WorkingFile>, String> {
    git::get_status_files(&repo_path).map_err(|e| e.0)
}

#[tauri::command]
pub async fn stage_file_cmd(repo_path: String, path: String) -> Result<String, String> {
    git::stage_file(&repo_path, &path).map_err(|e| e.0)
}

#[tauri::command]
pub async fn unstage_file_cmd(repo_path: String, path: String) -> Result<String, String> {
    git::unstage_file(&repo_path, &path).map_err(|e| e.0)
}

#[tauri::command]
pub async fn stage_all_cmd(repo_path: String) -> Result<String, String> {
    git::stage_all(&repo_path).map_err(|e| e.0)
}

#[tauri::command]
pub async fn commit_cmd(repo_path: String, message: String) -> Result<String, String> {
    git::git_commit(&repo_path, &message).map_err(|e| e.0)
}

#[tauri::command]
pub async fn discard_file_cmd(repo_path: String, path: String, status: String) -> Result<String, String> {
    git::discard_file(&repo_path, &path, &status).map_err(|e| e.0)
}

#[tauri::command]
pub async fn discard_all_cmd(repo_path: String) -> Result<String, String> {
    git::discard_all(&repo_path).map_err(|e| e.0)
}

// ── Worktree commands ──

#[tauri::command]
pub async fn list_worktrees_cmd(repo_path: String) -> Result<Vec<git::WorktreeInfo>, String> {
    git::list_worktrees(&repo_path).map_err(|e| e.0)
}

#[tauri::command]
pub async fn worktree_add_cmd(repo_path: String, branch: String) -> Result<String, String> {
    git::worktree_add(&repo_path, &branch).map_err(|e| e.0)
}

#[tauri::command]
pub async fn worktree_remove_cmd(repo_path: String, worktree_path: String) -> Result<String, String> {
    git::worktree_remove(&repo_path, &worktree_path).map_err(|e| e.0)
}

#[tauri::command]
pub async fn worktree_prune_cmd(repo_path: String) -> Result<String, String> {
    git::worktree_prune(&repo_path).map_err(|e| e.0)
}

#[tauri::command]
pub async fn open_in_explorer_cmd(path: String) -> Result<(), String> {
    std::process::Command::new("explorer")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn open_in_vscode_cmd(path: String) -> Result<(), String> {
    std::process::Command::new("cmd")
        .args(["/C", "code", &path])
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}
