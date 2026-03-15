# Git Merge / Pull / Push — Context Menu Actions

Thêm 3 chức năng merge, pull, push vào context menu trên branch tree trong GitTab. Backend đã có sẵn hàm `pull()`, `merge()`, `push_with_tags()` trong `git.rs`, chỉ cần wrap thành Tauri commands và thêm UI vào context menu.

## Proposed Changes

### Backend (Rust)

---

#### [MODIFY] [commands.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/commands.rs)

Thêm 3 Tauri commands mới:

```rust
// Pull current branch (git pull)
#[tauri::command]
pub async fn pull_cmd(repo_path: String) -> Result<String, String> {
    git::pull(&repo_path).map_err(|e| e.0)
}

// Merge branch vào current branch (git merge <branch> --no-edit)
#[tauri::command]
pub async fn merge_cmd(repo_path: String, from_branch: String) -> Result<String, String> {
    git::merge(&repo_path, &from_branch).map_err(|e| e.0)
}

// Push current branch + tags (git push && git push --tags)
#[tauri::command]
pub async fn push_cmd(repo_path: String) -> Result<String, String> {
    git::push_with_tags(&repo_path).map_err(|e| e.0)
}
```

---

#### [MODIFY] [lib.rs](file:///e:/Workspace/MyProject/personal/tauri-deploy/src-tauri/src/lib.rs)

Register 3 commands mới vào `invoke_handler`:

```diff
 commands::get_branch_details_cmd
+commands::pull_cmd,
+commands::merge_cmd,
+commands::push_cmd
```

---

### Frontend (React/TypeScript)

---

#### [MODIFY] [GitTab.tsx](file:///e:/Workspace/MyProject/personal/tauri-deploy/src/components/GitTab.tsx)

**1. Import thêm icons:**

```diff
-import { GitBranch, AlertTriangle, CheckCircle, RefreshCw, Folder, ChevronRight, ChevronDown, Rocket, Copy, Tag, Trash2, GitBranchPlus, Archive, ArchiveRestore, ArrowUp, ArrowDown } from 'lucide-react';
+import { GitBranch, AlertTriangle, CheckCircle, RefreshCw, Folder, ChevronRight, ChevronDown, Rocket, Copy, Tag, Trash2, GitBranchPlus, Archive, ArchiveRestore, ArrowUp, ArrowDown, Download, GitMerge, Upload } from 'lucide-react';
```

**2. Thêm 3 handler functions** (sau `handleCopyBranch`, trước `handleContextMenu`):

```typescript
// Pull current branch
const handlePull = async () => {
    if (!project) return;
    setIsLoading(true);
    try {
        const result = await invoke<string>('pull_cmd', { repoPath: project.path });
        showMsg(result || 'Pull successful');
        await refreshGitState();
    } catch (e: any) { showMsg(`Pull failed: ${e}`, true); setIsLoading(false); }
};

// Merge selected branch into current
const handleMerge = async (branch: string) => {
    if (!project) return;
    const branchName = clean(branch);
    if (branchName === currentBranch) { showMsg("Cannot merge a branch into itself", true); return; }
    if (!isClean) { showMsg("Cannot merge: uncommitted changes. Commit or stash first.", true); return; }
    const confirmed = window.confirm(
        `Merge "${branchName}" into "${currentBranch}"?\n\nThis will run: git merge ${branchName} --no-edit`
    );
    if (!confirmed) return;
    setIsLoading(true);
    try {
        const result = await invoke<string>('merge_cmd', { repoPath: project.path, fromBranch: branchName });
        showMsg(result || `Merged "${branchName}" into "${currentBranch}"`);
        await refreshGitState();
    } catch (e: any) { showMsg(`Merge failed: ${e}`, true); setIsLoading(false); }
};

// Push current branch + tags
const handlePush = async () => {
    if (!project) return;
    const confirmed = window.confirm(
        `Push "${currentBranch}" to remote?\n\nThis will run:\n  git push\n  git push --tags`
    );
    if (!confirmed) return;
    setIsLoading(true);
    try {
        const result = await invoke<string>('push_cmd', { repoPath: project.path });
        showMsg(result || 'Push successful');
        await refreshGitState();
    } catch (e: any) { showMsg(`Push failed: ${e}`, true); setIsLoading(false); }
};
```

**3. Thêm menu items** vào `contextMenuItems()` — chèn sau "Pop Stash" và trước "Delete":

```typescript
// --- Git Operations ---
// Pull (only on current branch context)
items.push({ label: 'Pull', icon: <Download className="w-3.5 h-3.5" />, onClick: handlePull, divider: true });

// Merge into current (not self, not remote)
if (branchClean !== currentBranch) {
    items.push({ label: `Merge "${branchClean}" → "${currentBranch}"`, icon: <GitMerge className="w-3.5 h-3.5" />, onClick: () => handleMerge(contextMenu.branchFullPath) });
}

// Push
items.push({ label: `Push "${currentBranch}"`, icon: <Upload className="w-3.5 h-3.5" />, onClick: handlePush });
```

---

## Verification Plan

> [!IMPORTANT]
> Project này không có unit tests. Verification bằng manual testing trên app Tauri.

### Manual Verification

**Cách chạy app:**
```bash
cd e:\Workspace\MyProject\personal\tauri-deploy
npm run tauri dev
```

**Test Pull:**
1. Mở app, chọn project đã config
2. Right-click bất kỳ branch nào → nhấn **Pull**
3. Xác nhận message "Pull successful" hiện ra
4. Nếu không có gì pull, output sẽ là "Already up to date."

**Test Merge:**
1. Checkout sang branch A (ví dụ `main`)
2. Right-click branch B (ví dụ `develop`) → nhấn **Merge "develop" → "main"**
3. Confirm dialog hiện ra → nhấn OK
4. Xác nhận merge thành công (hoặc lỗi conflict nếu có)
5. Thử merge branch vào chính nó → phải hiện error "Cannot merge a branch into itself"
6. Thử merge khi có uncommitted changes → phải hiện error

**Test Push:**
1. Right-click bất kỳ branch nào → nhấn **Push "current-branch"**
2. Confirm dialog hiện ra → nhấn OK
3. Xác nhận push thành công

**Edge Cases cần verify:**
- Pull/Push khi không có remote → error message rõ ràng
- Merge conflict → error message từ git hiện đúng
- Context menu: Merge option KHÔNG hiện khi right-click chính branch hiện tại
