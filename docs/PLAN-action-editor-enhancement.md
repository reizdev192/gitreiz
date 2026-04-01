# PLAN: Custom Action Editor Enhancement

## Goal Description
Enhance the custom actions script editor by providing inline variable insertions and syntax highlighting. The goal is to improve Developer Experience (DX) and make the Custom Actions Builder more intuitive and powerful without cluttering the UI.

## Assumptions & Interpretations
- **Syntax Highlighting**: Sếp Xuân mentioned "editor phải hightlight js" but custom actions run as shell scripts (bash/powershell). We assume the syntax should highlight as shell/bash (or JS if the user writes JS and invokes via node, but primarily shell). We will use `highlight.js` which is already in `package.json` with a transparent `<textarea>` overlay pattern to achieve syntax highlighting without heavy dependencies.
- **Cursor Position Insertion**: Clicking a variable badge will insert the text exactly where the textarea cursor was last placed, restoring focus to the editor after insertion.

## User Review Required
> [!WARNING]
> Please verify these assumptions before proceeding:
> 1. Trình highlight syntax: Sếp nhắc "highlight js", ý Sếp là script sẽ chuyển qua chạy Nodejs thay vì shell, hay là Sếp chỉ cần code được tô màu (syntax highlight) cho đẹp mắt, mặc định ngữ pháp Shell/Bash?
> 2. Đệ sẽ dùng kỹ thuật Overlay Editor (sử dụng thư viện `highlight.js` sẵn có trong project) để hỗ trợ highlight syntax nhẹ nhàng thay vì nhét nguyên một em khủng long Monaco Editor vào màn hình để giữ cho app mượt mà nhất. Sếp có ưng không?

## Proposed Changes

### 1. Remove Static Guide Panel
Remove the `w-1/3` left-side static guide from the `CustomActionsBuilder`. The action list and edit form will now expand to take full width.

### 2. Context-Aware Variable Badges
Inside the Action Edit Form, underneath the "Triggers On (Context)" selector, we will dynamically render available variables as clickable badges (e.g., `<span className="badge">{TARGET_BRANCH}</span>`).
- **Global Context**: `{CURRENT_BRANCH}`, `{REPO_PATH}`
- **Branch Context**: `{TARGET_BRANCH}`, `{CURRENT_BRANCH}`, `{REPO_PATH}`
- **Commit Context**: `{TARGET_COMMIT}`, `{CURRENT_BRANCH}`, `{REPO_PATH}`

### 3. Implement Script Editor with Highlight & Auto-Insertion
- **[NEW Component] `SyntaxEditor.tsx`**: A reusable component featuring:
  - A bottom `<pre><code>` block running `highlight.js` to render colored code.
  - A top overlapping transparent `<textarea>` to capture user input, syncing text with the `<pre>` tag underneath.
  - Support for refs to directly manipulate the cursor position and insert text.
- Connect the Variable Badges `onClick` to `SyntaxEditor`'s insert method, fetching the `selectionStart` and `selectionEnd` to insert the placeholder correctly.

## Verification Checklists

### Context Badges Verification
- [ ] Select "global", verify only 2 global badges appear.
- [ ] Select "branch", verify 3 branch badges appear.
- [ ] Select "commit", verify 3 commit badges appear.

### Auto Fill Insertion Verification
- [ ] Click within standard text inside the script editor.
- [ ] Click a badge, verify the placeholder text is inserted seamlessly at the cursor.
- [ ] Keyboard focus returns to the textarea so the user can continue typing.

### JS / Bash Syntax Highlighting Verification
- [ ] Type standard keywords like `if`, `echo`, `git` inside the editor. They should immediately highlight.
- [ ] UI doesn't visually break when scrolling.

---
**Prepared by**: Antigravity Project Planner
