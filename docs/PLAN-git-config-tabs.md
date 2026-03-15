# PLAN-git-config-tabs

## Task Breakdown

1. **Rust Backend (Git Commands)**
   - Add command `git_check_uncommitted(repo_path)`. Uses `git status --porcelain` to determine if the working tree is clean.
   - Add command `git_list_branches(repo_path)`. Uses `git branch -a --format="%(refname:short)"` to fetch all local and remote branches. Parses them into a tree structure.
   - Add command `git_checkout_branch(repo_path, branch)`. Checks out the specified branch.

2. **React UI (Layout & Tabs)**
   - Update `ConfigForm.tsx` to include a Tab bar (Git | Config).
   - "Config" Tab will contain the existing forms (Project Name, Path, Environments).
   - "Git" Tab will be a new component focusing on repository state.

3. **React UI (Git Tab & Branch Tree)**
   - Fetch the current branch via `git branch --show-current`.
   - **Environment Validation:** Cross-reference the current branch with `project.environments.map(e => e.name)`. If it does not match any environment name, show a prominent Warning asking the user to switch branches before deploying.
   - **Branch Tree View:** Parse the output of `git_list_branches` into a hierarchical tree (e.g., folder-like structure for `feature/*`, `bugfix/*`, `remotes/origin/*`). Implement standard collapsible tree nodes using a library or custom recursive component.
   - **Switch Branch Action:** Double clicking a leaf node (branch) will trigger a branch switch.

4. **Integration (Safety Guard)**
   - Before allowing a branch switch, invoke `git_check_uncommitted`.
   - If dirty, show a Tauri dialog or UI toast: "Cannot switch branches with uncommitted changes. Please commit or stash them first."
   - If clean, run `git_checkout_branch(selected_branch)` and refresh the Git Tab state.

## Agent Assignments
- **Orchestrator**: Manage overall flow and testing.
- **Backend Specialist**: Implement Rust Git integrations (`status`, `branch -a`, `checkout`).
- **Frontend Specialist**: Implement Tab swapping, the Recursive Tree component for branches, and warning banners.

## Verification Checklist
- [ ] View two separate tabs (Git/Config).
- [ ] See a warning if the current branch does not match any configured environment `name` (e.g., on 'develop' but only 'staging' and 'prod' exist).
- [ ] Prevent switching branch if `status --porcelain` reveals uncommitted changes.
- [ ] Successfully switch branch if clean by clicking an item in the Branch Tree view.
