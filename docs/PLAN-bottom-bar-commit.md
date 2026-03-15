# Bottom Bar Terminal + Git Commit Panel

Restructure the Deploy.exe Tauri app layout: replace the current horizontal split (GitTab left | DeployPanel right) with a VS Code–inspired layout featuring a **bottom bar terminal** (pin/toggle, auto-opens on terminal activity) and a **git commit panel** on the right side (SourceTree-style commit history with branch filtering).

## User Review Required

> [!IMPORTANT]
> **Layout Change:** The current right-side `DeployPanel` will be restructured. Deploy controls (env selector + deploy button) move to the **GitTab header area**. Terminal output is extracted into the new bottom bar. The right side becomes a **Git Commit Panel**.

> [!WARNING]
> **New Rust backend command required:** `list_commits_cmd` to fetch commit history with branch filtering. This adds a new Tauri IPC command.

---

## Current Layout

```
┌──────────────────────────────────────────────┐
│ Header (logo, project selector, settings)    │
├────────────────────┬─────────────────────────┤
│                    │                         │
│  GitTab (40%)      │  DeployPanel (60%)      │
│  - branch tree     │  - env selector         │
│  - context menu    │  - deploy button        │
│                    │  - terminal output      │
│                    │                         │
└────────────────────┴─────────────────────────┘
```

## Proposed Layout

```
┌──────────────────────────────────────────────┐
│ Header (logo, project selector, settings)    │
├────────────────────┬─────────────────────────┤
│                    │                         │
│  GitTab (40%)      │  CommitPanel (60%)      │
│  - branch tree     │  - branch selector      │
│  - deploy controls │  - commit list          │
│  (moved here)      │  - hash/author/date     │
│                    │                         │
├────────────────────┴─────────────────────────┤
│ ▼ Terminal Bar (bottom, collapsible)         │
│   deploy logs / command output               │
└──────────────────────────────────────────────┘
```

---

## Proposed Changes

### Rust Backend

#### [MODIFY] [git.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/git.rs)

Add `list_commits` function:
- `git log --format="%H|%h|%an|%ae|%ar|%s|%D" --all` (for all branches)
- `git log --format=... branch_name` (for specific branch)
- Returns `Vec<CommitInfo>` with: `hash`, `short_hash`, `author`, `email`, `date_relative`, `message`, `refs` (branch/tag labels)

#### [MODIFY] [commands.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/commands.rs)

Add `list_commits_cmd` Tauri command:
- Params: `repo_path: String`, `branch: Option<String>`, `limit: Option<u32>`
- If `branch` is `None` → all commits (`--all`)
- If `branch` is `Some(name)` → only that branch's commits
- Default limit: 100

#### [MODIFY] [lib.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/lib.rs)

Register `list_commits_cmd` in `generate_handler![]`.

---

### Frontend - New Components

#### [NEW] [TerminalBar.tsx](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/components/TerminalBar.tsx)

Bottom bar terminal panel (VS Code style):
- **Pin/Toggle button** in header → click to collapse/expand
- **Auto-open** when `terminalLogs` changes (store watcher)
- **Drag-to-resize** height (vertical resize handle at top edge)
- Persist open/pinned/height state in `localStorage`
- Shows deploy logs, command output (reuses current terminal rendering from DeployPanel)
- Clear button, copy-all button
- Min height ~120px, max ~50% viewport

#### [NEW] [CommitPanel.tsx](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/components/CommitPanel.tsx)

Right-side git commit history panel (SourceTree style):
- **Branch selector dropdown** at top: current branch (default), other branches, "All Branches"
- **Commit list** (virtualized / scrollable):
  - Short hash (monospace, clickable → copy)
  - Commit message (truncated)
  - Author name
  - Relative date (e.g. "2 hours ago")
  - Branch/tag labels as colored badges
- Auto-refresh when branch changes or after deploy
- Loading skeleton while fetching

---

### Frontend - Modified Components

#### [MODIFY] [App.tsx](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/App.tsx)

Restructure main layout:
- Keep header as-is
- Main area becomes: `GitTab (left) | CommitPanel (right)` with drag divider (same resize logic)
- Below main: `TerminalBar` (bottom bar, spanning full width)
- Remove `DeployPanel` from right side

#### [MODIFY] [DeployPanel.tsx](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/components/DeployPanel.tsx)

Refactor: extract terminal output section → `TerminalBar`.
- Keep deploy controls (env selector, deploy button, auto-confirm, pending plan overlay) but embed them as a compact section inside `GitTab` header area or as a small toolbar
- Remove the terminal output rendering (moved to `TerminalBar`)

#### [MODIFY] [useProjectStore.ts](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/store/useProjectStore.ts)

Add state:
- `terminalBarOpen: boolean` (default `false`)
- `terminalBarPinned: boolean` (default `false`)
- `openTerminalBar: () => void`
- `toggleTerminalBar: () => void`
- `toggleTerminalBarPin: () => void`
- Modify `appendLog` / `setTerminalLogs` to auto-open terminal bar

#### [MODIFY] [translations.ts](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/i18n/translations.ts)

Add i18n keys:
- `terminal.title`, `terminal.clear`, `terminal.copy`, `terminal.pin`, `terminal.unpin`
- `commits.title`, `commits.allBranches`, `commits.currentBranch`, `commits.noCommits`, `commits.loading`
- `commits.copyHash`

---

## Verification Plan

### Manual Verification (request from user)

1. **Run `npm run tauri dev`** and open the app
2. **Bottom bar behavior:**
   - Terminal bar should be collapsed by default
   - Click toggle button → bar opens/closes
   - Click pin button → bar stays open
   - Trigger a deploy → terminal bar auto-opens with logs
3. **Commit panel:**
   - Select a project → right panel shows commits for current branch
   - Change branch in dropdown → commits update
   - Select "All Branches" → shows all commits with branch labels
   - Commit hashes are clickable → copies to clipboard
4. **Resize:**
   - Drag divider between GitTab and CommitPanel → works like before
   - Drag top edge of terminal bar → resizes height
5. **Persist state:**
   - Close/reopen app → split width, terminal bar height, and pin state persist

> [!NOTE]
> No automated tests exist in this project currently. Manual testing via `npm run tauri dev` is the primary verification method.
