mod config;
mod crypto;
mod git;
mod version;
mod commands;
mod stats;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            config::load_config,
            config::save_config,
            commands::begin_deployment,
            commands::get_deploy_plan,
            commands::check_uncommitted_cmd,
            commands::list_branches_cmd,
            commands::checkout_branch_cmd,
            commands::get_current_branch_cmd,
            commands::get_branch_tags_cmd,
            commands::stash_cmd,
            commands::stash_pop_cmd,
            commands::delete_branch_cmd,
            commands::create_branch_cmd,
            commands::get_branch_details_cmd,
            commands::pull_cmd,
            commands::merge_cmd,
            commands::push_cmd,
            commands::list_commits_cmd,
            commands::search_commits_cmd,
            commands::list_stashes_cmd,
            commands::stash_apply_cmd,
            commands::stash_drop_cmd,
            commands::list_tags_cmd,
            commands::create_tag_cmd,
            commands::delete_tag_cmd,
            commands::cherry_pick_cmd,
            commands::fetch_all_cmd,
            commands::fetch_branch_cmd,
            commands::get_commit_files_cmd,
            commands::get_file_diff_cmd,
            commands::get_file_content_at_commit_cmd,
            commands::get_status_files_cmd,
            commands::stage_file_cmd,
            commands::unstage_file_cmd,
            commands::stage_all_cmd,
            commands::commit_cmd,
            commands::list_worktrees_cmd,
            commands::worktree_add_cmd,
            commands::worktree_remove_cmd,
            commands::worktree_prune_cmd,
            commands::open_in_explorer_cmd,
            commands::open_in_vscode_cmd,
            commands::discard_file_cmd,
            commands::discard_all_cmd,
            config::export_settings_cmd,
            config::import_settings_cmd,
            // Stats commands
            stats::get_contributor_stats_cmd,
            stats::get_commit_heatmap_cmd,
            stats::get_active_hours_cmd,
            stats::get_branch_lifecycle_cmd,
            stats::get_code_churn_cmd,
            stats::get_commit_sizes_cmd,
            stats::get_smart_alerts_cmd,
            stats::get_team_activity_cmd,
            // Conflict resolver commands
            commands::check_merge_state_cmd,
            commands::get_conflicted_files_cmd,
            commands::get_conflict_content_cmd,
            commands::get_ours_version_cmd,
            commands::get_theirs_version_cmd,
            commands::resolve_conflict_cmd,
            commands::abort_merge_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
