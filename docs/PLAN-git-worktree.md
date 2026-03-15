# PLAN: Git Worktree + Smart UI

## Mục tiêu

Cho phép user **mở nhiều branch song song** mà không mất code. Ví dụ: đang code ở `dev`, nhảy qua `prod` fix bug trong thư mục riêng, xong quay lại `dev` tiếp tục — không cần commit/stash.

Dùng **`git worktree`** (native Git) + **UI trực quan** trong app.

---

## User Flow

```
User chuột phải branch "prod" → "🔗 Open in Parallel"
  → App tạo worktree tại {project}/.worktrees/prod/
  → Panel "Worktrees" hiện bên dưới (GitTab)
  → User click "📂 Open in Explorer" hoặc "💻 Open in VS Code"
  → Fix bug, commit bình thường tại thư mục worktree
  → User click "🗑️ Close" → App remove worktree, cleanup
```

---

## Proposed Changes

### 1. Rust Backend — `git.rs`

#### [MODIFY] [git.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/git.rs)

Thêm struct `WorktreeInfo` + 5 functions:

```rust
// ── Worktree ──

struct WorktreeInfo {
    path: String,       // absolute path to worktree dir
    branch: String,     // branch checked out
    head: String,       // HEAD commit hash (short)
    is_main: bool,      // is main worktree (original)
}

// List all worktrees (git worktree list --porcelain)
fn list_worktrees(repo_path) -> Vec<WorktreeInfo>

// Add new worktree (git worktree add <path> <branch>)
fn worktree_add(repo_path, branch, target_dir) -> Result<String>

// Remove worktree (git worktree remove <path> --force)
fn worktree_remove(repo_path, worktree_path) -> Result<String>

// Prune stale worktrees (git worktree prune)
fn worktree_prune(repo_path) -> Result<String>
```

**Quy tắc đường dẫn worktree:**
- Default: `{project_path}/.worktrees/{branch_name_sanitized}/`
- Sanitize: `origin/feature/login` → `feature-login`
- Nếu folder đã tồn tại → báo lỗi rõ ràng

---

### 2. Tauri Commands — `commands.rs`

#### [MODIFY] [commands.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/commands.rs)

Thêm 4 commands:

```rust
list_worktrees_cmd(repo_path: String) -> Vec<WorktreeInfo>
worktree_add_cmd(repo_path: String, branch: String) -> String
worktree_remove_cmd(repo_path: String, worktree_path: String) -> String
worktree_prune_cmd(repo_path: String) -> String
```

#### [MODIFY] [lib.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/lib.rs)

Register 4 new commands trong `invoke_handler`.

---

### 3. Frontend — `WorktreePanel.tsx`

#### [NEW] [WorktreePanel.tsx](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/components/WorktreePanel.tsx)

Component accordion (giống StashPanel/TagPanel), hiện dưới cây branch:

**UI Elements:**
- Header: `🌲 Worktrees` + badge count (chỉ đếm linked worktrees, không đếm main)
- Collapsed by default, lazy-fetch khi mở
- Mỗi worktree row hiển thị:
  - Branch name (font-mono, accent color)
  - Path (truncated, text-muted)
  - HEAD short hash
  - Nút actions (hover để hiện):
    - `📂 Open in Explorer` → `shell.open(path)` (Tauri API)
    - `💻 Open in VS Code` → `shell.execute("code", [path])`
    - `🗑️ Remove` → confirm → `worktree_remove_cmd` → refresh

**State:**
- `worktrees: WorktreeInfo[]` — fetched from backend
- `collapsed: boolean` — accordion state

---

### 4. Context Menu Integration — `GitTab.tsx`

#### [MODIFY] [GitTab.tsx](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/components/GitTab.tsx)

**Thêm menu item "Open in Parallel"** trong `contextMenuItems()`:
- Chỉ hiện khi branch **không phải** branch hiện tại
- Chỉ hiện khi branch **chưa có** worktree đang mở
- Icon: `GitFork` hoặc `FolderGit2`
- Vị trí: sau "Create Branch", trước "Copy Name"

```tsx
// Worktree (if not already open and not current branch)
if (branchClean !== currentBranch && !activeWorktrees.includes(branchClean)) {
    items.push({
        label: `Open "${branchClean}" in Parallel`,
        icon: <FolderGit2 />,
        onClick: () => handleOpenWorktree(branchClean)
    });
}
```

**Thêm handler `handleOpenWorktree`:**
- Gọi `worktree_add_cmd`
- Alert success/error
- Bump git state

**Render `<WorktreePanel />` sau `<TagPanel />`.**

---

### 5. Worktree Indicator in Branch Tree

#### [MODIFY] [GitTab.tsx](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/components/GitTab.tsx)

Trong `renderTree()`, nếu branch có linked worktree đang mở → hiện icon `🔗` bên cạnh tên (giống `🛡️` cho protected branches).

---

### 6. i18n Keys

#### [MODIFY] [translations.ts](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/i18n/translations.ts)

```
worktree.title          → Worktrees / Worktrees / 工作树
worktree.empty          → No linked worktrees / Không có worktree liên kết / 无链接工作树
worktree.openExplorer   → Open in Explorer / Mở trong Explorer / 在资源管理器中打开
worktree.openVscode     → Open in VS Code
worktree.remove         → Remove Worktree / Xóa Worktree / 移除工作树
worktree.confirmRemove  → Confirm remove?
worktree.openParallel   → Open in Parallel / Mở song song / 并行打开
worktree.alreadyOpen    → Already open in worktree / Đã mở trong worktree / 已在工作树中打开
worktree.main           → Main Worktree / Worktree chính / 主工作树
```

---

### 7. Help Guide Update

#### [MODIFY] [HelpGuide.tsx](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/components/HelpGuide.tsx)

Thêm section mới `🌲 Worktree (Làm việc song song)` giải thích:
- Worktree là gì, khác gì stash/branch
- Khi nào dùng (use case chính: fix bug prod mà không mất code dev)
- Cách dùng step-by-step
- Warning: không checkout cùng branch ở 2 nơi

---

### 8. `.gitignore` Update

#### [MODIFY] [.gitignore](file:///e:/Workspace/MyProject/personal/tauri-deploy/.gitignore)

Thêm `.worktrees/` để tránh commit folder worktree vào repo.

---

## File Summary

| Action | File | Changes |
|--------|------|---------|
| MODIFY | `git.rs` | +1 struct `WorktreeInfo`, +4 functions |
| MODIFY | `commands.rs` | +4 Tauri commands |
| MODIFY | `lib.rs` | Register 4 commands |
| **NEW** | `WorktreePanel.tsx` | Accordion panel with worktree list + actions |
| MODIFY | `GitTab.tsx` | Context menu item, handler, indicator, render panel |
| MODIFY | `translations.ts` | +9 i18n keys (en/vi/zh) |
| MODIFY | `HelpGuide.tsx` | +1 section "Worktree" |
| MODIFY | `.gitignore` | +`.worktrees/` |

**Estimated Effort:** ~150 LOC Rust, ~200 LOC TSX, ~30 LOC i18n

---

## Edge Cases & Safeguards

| Edge Case | Handling |
|-----------|----------|
| Checkout branch đã có worktree | Git tự block → hiện error rõ ràng |
| Xóa branch đang có worktree mở | Confirm dialog cảnh báo trước khi xóa |
| App crash khi có worktrees mở | Worktrees vẫn tồn tại trên disk → dùng `git worktree prune` để cleanup |
| Disk space | Worktree chỉ checkout files, không clone lại `.git` → nhẹ |
| Branch name có ký tự đặc biệt | Sanitize: `feature/login` → `feature-login` |
| User xóa folder worktree thủ công | `git worktree prune` tự dọn metadata |

---

## Verification Plan

### Build Checks
```bash
# Rust backend
cd src-tauri && cargo check

# TypeScript frontend
npx tsc --noEmit
```

### Manual Testing (Sếp tự test)

1. **Tạo worktree:** Chuột phải branch → "Open in Parallel" → kiểm tra folder `.worktrees/{branch}/` được tạo
2. **Xem panel:** Mở accordion "Worktrees" → thấy worktree vừa tạo với branch, path, hash
3. **Open in Explorer:** Click 📂 → Windows Explorer mở đúng folder worktree
4. **Open in VS Code:** Click 💻 → VS Code mở tại folder worktree
5. **Remove:** Click 🗑️ → confirm → folder được xóa, panel cập nhật
6. **Indicator:** Branch có worktree hiện icon 🔗 trong cây branch
7. **Block duplicate:** Chuột phải branch đã có worktree → menu không hiện "Open in Parallel"
8. **Help Guide:** Click (?) → mở section "Worktree" → nội dung đầy đủ
