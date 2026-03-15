# 11 New Features — Implementation Plan

> 11 tính năng mới cho Tauri Deploy Tool, chia thành 4 phase theo dependency và effort.

---

## Phase 1 — Low-Effort, High-Impact (3 features)

### Feature C: Commit Search & Filter

**Goal:** Search bar in CommitPanel to filter commits by message, author, date.

#### [MODIFY] [git.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/git.rs)
- Add `search_commits()` function: wraps `git log --grep=<query> --author=<author> --after=<date> --before=<date>`
- Reuse `CommitInfo` struct, same format parsing

#### [MODIFY] [commands.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/commands.rs)
- Add `search_commits_cmd` Tauri command

#### [MODIFY] [lib.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/lib.rs)
- Register `search_commits_cmd`

#### [MODIFY] [CommitPanel.tsx](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/components/CommitPanel.tsx)
- Add search bar below header: input field + search icon
- State: `searchQuery`, `searchAuthor`
- When query is set, call `search_commits_cmd` instead of `list_commits_cmd`
- Debounce input (300ms)
- Clear button to reset to full list

#### [MODIFY] [translations.ts](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/i18n/translations.ts)
- Keys: `commits.search`, `commits.searchPlaceholder`, `commits.clearSearch`

---

### Feature J: Keyboard Shortcuts

**Goal:** Global keyboard shortcuts for common actions.

#### [NEW] [useKeyboardShortcuts.ts](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/hooks/useKeyboardShortcuts.ts)
- Custom hook using `useEffect` + `window.addEventListener('keydown')`
- Shortcut map:
  - `Ctrl+R` → refresh git state (`bumpGitState()`)
  - `Ctrl+T` → toggle terminal bar
  - `Ctrl+F` → focus commit search input
  - `Ctrl+1` → switch to list view
  - `Ctrl+2` → switch to graph view
  - `Ctrl+Shift+P` → open project settings
  - `Escape` → close menus/modals
- Prevent default browser behavior for bound keys

#### [MODIFY] [App.tsx](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/App.tsx)
- Call `useKeyboardShortcuts()` at App level
- Pass action handlers via store or refs

#### [MODIFY] [translations.ts](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/i18n/translations.ts)
- Keys: `shortcuts.title`, `shortcuts.refresh`, `shortcuts.toggleTerminal`, `shortcuts.search`

---

### Feature K: Branch Protection Rules

**Goal:** Config-level protection for critical branches with warning confirmations.

#### [MODIFY] [useProjectStore.ts](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/store/useProjectStore.ts)
- Add `protectedBranches?: string[]` to `ProjectConfig` interface (e.g. `["main", "master", "prod"]`)

#### [MODIFY] [ConfigForm.tsx](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/components/ConfigForm.tsx)
- Add "Protected Branches" section: text input with comma-separated branch names, or chip-style tags

#### [MODIFY] [GitTab.tsx](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/components/GitTab.tsx)
- In context menu handlers (delete, merge into, force push): check if target branch is in `protectedBranches`
- If protected → show red warning confirmation dialog with branch name + action description
- Add 🔒 icon next to protected branches in the tree

#### [MODIFY] [translations.ts](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/i18n/translations.ts)
- Keys: `config.protectedBranches`, `config.protectedHint`, `git.protectedWarning`, `git.protectedConfirm`

---

## Phase 2 — Medium-Effort Core Features (3 features)

### Feature D: Auto-fetch + Desktop Notifications

**Goal:** Background polling + system notifications when remote changes detected.

#### [MODIFY] [useProjectStore.ts](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/store/useProjectStore.ts)
- Add `autoFetchInterval?: number` to `ProjectConfig` (minutes, default 5)
- Add `lastFetch: number` timestamp to state
- Add `notificationsEnabled?: boolean` to `ProjectConfig`

#### [NEW] [useAutoFetch.ts](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/hooks/useAutoFetch.ts)
- Custom hook: `setInterval` based on `autoFetchInterval`
- Calls `git fetch --all` via new backend command
- After fetch, check `ahead_remote`/`behind_remote` counts
- If new remote commits detected → Tauri notification via `@tauri-apps/plugin-notification`
- Show unread badge counter next to branch name

#### [MODIFY] [git.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/git.rs)
- Add `fetch_all()`: runs `git fetch --all --prune`

#### [MODIFY] [commands.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/commands.rs)
- Add `fetch_all_cmd` Tauri command

#### [MODIFY] [ConfigForm.tsx](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/components/ConfigForm.tsx)
- Add "Auto-fetch interval" number input (1-60 mins) in Deploy Settings section
- Add "Enable notifications" toggle

#### [MODIFY] [App.tsx](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/App.tsx)
- Mount `useAutoFetch()` hook

#### [MODIFY] [translations.ts](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/i18n/translations.ts)
- Keys: `config.autoFetch`, `config.fetchInterval`, `config.notifications`, `notify.newCommits`

---

### Feature F: Stash Manager

**Goal:** Visual panel for managing git stashes with list, apply, drop, preview.

#### [MODIFY] [git.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/git.rs)
- Add `StashEntry` struct: `{ index: u32, message: String, date: String, branch: String }`
- Add `list_stashes()`: `git stash list --format=%gd<<SEP>>%gs<<SEP>>%ar<<SEP>>%s`
- Add `stash_apply(index)`: `git stash apply stash@{index}`
- Add `stash_drop(index)`: `git stash drop stash@{index}`

#### [MODIFY] [commands.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/commands.rs)
- Add `list_stashes_cmd`, `stash_apply_cmd`, `stash_drop_cmd`

#### [MODIFY] [lib.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/lib.rs)
- Register 3 new commands

#### [NEW] [StashPanel.tsx](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/components/StashPanel.tsx)
- Collapsible accordion in GitTab sidebar
- List stash entries with index, message, date
- Context actions: Apply, Pop, Drop (with confirm for Drop)
- Badge on stash icon showing count
- Empty state when no stashes

#### [MODIFY] [GitTab.tsx](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/components/GitTab.tsx)
- Add `<StashPanel />` below branch tree (collapsible section)
- Replace existing stash/stash_pop buttons with StashPanel toggle

#### [MODIFY] [translations.ts](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/i18n/translations.ts)
- Keys: `stash.title`, `stash.apply`, `stash.drop`, `stash.pop`, `stash.empty`, `stash.confirmDrop`

---

### Feature G: Tag Manager

**Goal:** Dedicated panel for viewing, creating, deleting git tags.

#### [MODIFY] [git.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/git.rs)
- Add `TagInfo` struct: `{ name: String, hash: String, date: String, message: String, tagger: String }`
- Add `list_tags()`: `git tag -l --sort=-v:refname --format=%(refname:short)<<SEP>>%(objectname:short)<<SEP>>%(creatordate:relative)<<SEP>>%(subject)<<SEP>>%(taggername)`
- Add `delete_tag(name, delete_remote: bool)`: `git tag -d <name>` + optionally `git push origin --delete <name>`
- Add `create_tag_annotated(name, message)`: `git tag -a <name> -m <message>`

#### [MODIFY] [commands.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/commands.rs)
- Add `list_tags_cmd`, `delete_tag_cmd`, `create_tag_cmd`

#### [MODIFY] [lib.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/lib.rs)
- Register 3 new commands

#### [NEW] [TagPanel.tsx](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/components/TagPanel.tsx)
- Tab or section in sidebar
- Filter tags by name pattern (text input)
- Sort by version / date
- Each tag row: name, commit hash, date, tagger
- Context menu: Delete (local), Delete (local + remote), Copy name
- Create tag button → modal with name + message inputs
- Color coding: deploy tags (match env patterns) get accent color, others neutral

#### [MODIFY] [GitTab.tsx](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/components/GitTab.tsx)
- Add tab toggle: Branches | Tags in the tree header
- Render `<TagPanel />` when Tags tab selected

#### [MODIFY] [translations.ts](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/i18n/translations.ts)
- Keys: `tags.title`, `tags.create`, `tags.delete`, `tags.deleteRemote`, `tags.confirmDelete`, `tags.name`, `tags.message`, `tags.empty`, `tags.filter`

---

## Phase 3 — Medium-High Effort Features (3 features)

### Feature B: Deploy History Dashboard

**Goal:** Track and display deployment history per project.

#### [MODIFY] [config.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/config.rs)
- Add `DeployRecord` struct: `{ id: String, tag: String, environment: String, branch: String, timestamp: String, status: String }`
- Add `load_deploy_history(project_id)` / `save_deploy_record(project_id, record)`: read/write from `{app_data}/deploy-history-{id}.json`

#### [MODIFY] [commands.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/commands.rs)
- Modify `begin_deployment()`: after successful deploy, save a `DeployRecord`
- Add `get_deploy_history_cmd(project_id)`, `clear_deploy_history_cmd(project_id)`

#### [MODIFY] [lib.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/lib.rs)
- Register new commands

#### [NEW] [DeployHistory.tsx](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/components/DeployHistory.tsx)
- Tab in bottom bar (alongside Terminal): timeline layout
- Each entry: tag, environment badge, branch, timestamp, status (✅/❌)
- Filter by environment
- Clear history button
- Highlight latest deploy per environment

#### [MODIFY] [TerminalBar.tsx](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/components/TerminalBar.tsx)
- Add tab toggle: Terminal | Deploy History
- Render `<DeployHistory />` when History tab selected

#### [MODIFY] [translations.ts](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/i18n/translations.ts)
- Keys: `history.title`, `history.empty`, `history.clear`, `history.environment`, `history.success`, `history.failed`

---

### Feature H: Environment Status Dashboard

**Goal:** At-a-glance comparison of all environments.

#### [NEW] [EnvDashboard.tsx](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/components/EnvDashboard.tsx)
- Horizontal card layout, one per environment
- Each card shows:
  - Environment name (header, color coded)
  - Current tag (latest matching tag)
  - Commit behind main/current branch (count + badge)
  - Last deploy time (from deploy history)
  - Quick deploy button
- Outdated environments highlighted with warning color
- Refresh button to re-fetch all data

#### [MODIFY] [App.tsx](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/App.tsx)
- Add toggle in top bar: show/hide EnvDashboard as a collapsible strip above the main content

#### [MODIFY] [translations.ts](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/i18n/translations.ts)
- Keys: `env.dashboard`, `env.currentTag`, `env.behind`, `env.upToDate`, `env.outdated`, `env.lastDeploy`

---

### Feature I: Cherry-pick UI

**Goal:** Right-click commit → cherry-pick into current branch.

#### [MODIFY] [git.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/git.rs)
- Add `cherry_pick(repo_path, hash)`: `git cherry-pick <hash>`

#### [MODIFY] [commands.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/commands.rs)
- Add `cherry_pick_cmd`

#### [MODIFY] [lib.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/lib.rs)
- Register `cherry_pick_cmd`

#### [MODIFY] [CommitPanel.tsx](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/components/CommitPanel.tsx)
- Add right-click context menu on commit rows (both list and graph view)
- Menu items: Cherry-pick, Copy hash, View diff (future)
- Cherry-pick: confirm dialog showing commit message + target branch
- On success: bump git state, show success toast
- On conflict: show error in terminal bar with `git cherry-pick --abort` hint

#### [MODIFY] [translations.ts](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/i18n/translations.ts)
- Keys: `commits.cherryPick`, `commits.cherryPickConfirm`, `commits.cherryPickSuccess`, `commits.cherryPickConflict`

---

## Phase 4 — High-Effort Features (2 features)

### Feature A: Diff Viewer

**Goal:** View file changes for any commit.

#### [MODIFY] [git.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/git.rs)
- Add `DiffFile` struct: `{ path: String, status: String, insertions: u32, deletions: u32 }`
- Add `DiffHunk` struct: `{ header: String, lines: Vec<DiffLine> }` where `DiffLine = { type: +/-/context, content: String }`
- Add `get_commit_files(hash)`: `git diff-tree --no-commit-id -r --numstat <hash>` → list of changed files
- Add `get_file_diff(hash, file_path)`: `git show <hash> -- <file_path>` → parsed diff hunks

#### [MODIFY] [commands.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/commands.rs)
- Add `get_commit_files_cmd`, `get_file_diff_cmd`

#### [MODIFY] [lib.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/lib.rs)
- Register 2 new commands

#### [NEW] [DiffViewer.tsx](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/components/DiffViewer.tsx)
- Triggered by clicking commit in CommitPanel → slide-in panel or modal
- Left sidebar: file tree of changed files with +/- counts and status icons (A/M/D/R)
- Right content: diff view with line-by-line highlighting
  - Green background for additions, red for deletions
  - Line numbers (old/new)
  - Hunk headers in gray
- Expand/collapse hunks
- Copy button per file

#### [MODIFY] [CommitPanel.tsx](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/components/CommitPanel.tsx)
- Add click handler on commit row → open DiffViewer with selected commit hash

#### [MODIFY] [translations.ts](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/i18n/translations.ts)
- Keys: `diff.title`, `diff.files`, `diff.additions`, `diff.deletions`, `diff.noChanges`

---

### Feature E: Quick Commit

**Goal:** Stage files, write message, commit — all within the app.

#### [MODIFY] [git.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/git.rs)
- Add `WorkingFile` struct: `{ path: String, status: String, staged: bool }`
- Add `get_status_files()`: `git status --porcelain=v1` → parse into `WorkingFile` list
- Add `stage_file(path)`: `git add <path>`
- Add `unstage_file(path)`: `git restore --staged <path>`
- Add `stage_all()`: `git add -A`
- Add `commit(message)`: `git commit -m <message>`

#### [MODIFY] [commands.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/commands.rs)
- Add 5 new commands: `get_status_files_cmd`, `stage_file_cmd`, `unstage_file_cmd`, `stage_all_cmd`, `commit_cmd`

#### [MODIFY] [lib.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/lib.rs)
- Register 5 new commands

#### [NEW] [QuickCommit.tsx](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/components/QuickCommit.tsx)
- Collapsible panel in GitTab (above branch tree)
- Shows when working tree is dirty
- File list with checkboxes (staged/unstaged)
  - Click to toggle stage/unstage individual files
  - "Stage All" / "Unstage All" buttons
  - Status icons: M (modified), A (added), D (deleted), ? (untracked)
- Commit message textarea
  - Character count
  - Conventional commit prefix suggestions (feat, fix, chore...)
- Commit button (disabled when no staged files or empty message)
- After commit: auto-refresh, clear message, bump git state

#### [MODIFY] [GitTab.tsx](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/components/GitTab.tsx)
- Insert `<QuickCommit />` at top of GitTab (above branch tree)
- Show/hide based on dirty working tree
- Badge showing number of uncommitted changes

#### [MODIFY] [translations.ts](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/i18n/translations.ts)
- Keys: `commit.stage`, `commit.unstage`, `commit.stageAll`, `commit.unstageAll`, `commit.message`, `commit.messagePlaceholder`, `commit.button`, `commit.empty`, `commit.noMessage`

---

## Summary Table

| Phase | Feature | New Files | Modified Files | New Rust Functions | New i18n Keys |
|-------|---------|-----------|----------------|--------------------|---------------|
| 1 | C: Commit Search | 0 | 5 | 1 | 3 |
| 1 | J: Keyboard Shortcuts | 1 | 2 | 0 | 4 |
| 1 | K: Branch Protection | 0 | 4 | 0 | 4 |
| 2 | D: Auto-fetch + Notif | 1 | 5 | 1 | 4 |
| 2 | F: Stash Manager | 1 | 4 | 3 | 6 |
| 2 | G: Tag Manager | 1 | 4 | 3 | 9 |
| 3 | B: Deploy History | 1 | 4 | 3 | 6 |
| 3 | H: Env Dashboard | 1 | 2 | 0 | 6 |
| 3 | I: Cherry-pick | 0 | 4 | 1 | 4 |
| 4 | A: Diff Viewer | 1 | 4 | 2 | 5 |
| 4 | E: Quick Commit | 1 | 4 | 5 | 9 |
| **Total** | | **8 new** | **~35 edits** | **19 functions** | **60 keys** |

---

## Implementation Order (Recommended)

```
Phase 1 (low effort, do first):
  C: Commit Search → J: Keyboard Shortcuts → K: Branch Protection

Phase 2 (medium, core workflow):
  F: Stash Manager → G: Tag Manager → D: Auto-fetch

Phase 3 (medium-high, polish):
  I: Cherry-pick → B: Deploy History → H: Env Dashboard

Phase 4 (high effort, last):
  E: Quick Commit → A: Diff Viewer
```

---

## Verification Plan

### Build Verification (per feature)
```bash
# Frontend
cd tauri-deploy && npx tsc --noEmit

# Backend
cd src-tauri && cargo check
```

### Manual Testing
- **Each feature**: Run `npm run tauri dev`, test the specific UI interaction
- **Commit Search**: Type query → verify filtered results match
- **Shortcuts**: Press each key combo → verify correct action fires
- **Branch Protection**: Try deleting protected branch → verify warning appears
- **Auto-fetch**: Set interval to 1min → verify fetch runs and notification shows
- **Stash Manager**: Create stash → verify list shows, apply/drop works
- **Tag Manager**: Create/delete tags → verify list updates
- **Deploy History**: Deploy → verify record appears in history tab
- **Env Dashboard**: Check env cards show correct tag/behind counts
- **Cherry-pick**: Pick commit → verify it applies to current branch
- **Diff Viewer**: Click commit → verify file list and diff content
- **Quick Commit**: Stage files, write message, commit → verify git log shows new commit
