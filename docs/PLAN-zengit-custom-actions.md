# PLAN: ZenGit Rename & Custom Actions

## Phase -1: Context Check
- **Goal 1:** Rebrand application from `Reizgit` to `ZenGit`.
- **Goal 2:** Implement Custom Actions framework (JSON + UI Builder).
- **Core Requirement 1:** Custom actions must show a Confirm Dialog with a collapsible/expandable section displaying the exact raw commands to be executed.
- **Core Requirement 2:** Needs to support complex multi-line logic (e.g., auto-incrementing tags for deployment).

---

## Phase 0: Socratic Gate (User Clarifications)

*Note: Trả lời câu hỏi của Sếp: "Để auto tăng tag thì người dùng cần làm nhiều cái khác nữa đúng không?"*
**Chính xác thưa Sếp!** Để viết được logic "Đọc tag cũ -> Tách chuỗi -> Tăng số -> Tạo tag mới -> Push", lệnh bash sẽ kéo dài thành 1 cụm script (multi-line). Do đó, ở tính năng Custom Actions này, chúng ta có 2 ngã rẽ cho user:
1. **Ngã rẽ 1 (Viết code trực tiếp):** UI Builder của mình phải là một TextEditor (ví dụ Monaco/CodeMirror) cho phép gõ nhiều dòng shell script, thay vì chỉ là 1 ô input ngắn dòng.
2. **Ngã rẽ 2 (Gọi file script ngoài):** User tự viết 1 file `deploy.sh` hoặc `deploy.js` ở máy họ, rồi ở Custom Action chỉ gõ duy nhất 1 lệnh: `bash /path/to/script.sh $BRANCH_NAME`.

👉 *Câu hỏi cho Sếp:* Chắc ăn nhất là cả 2 ngã rẽ này mình đều build hỗ trợ (trên Builder mình dùng Textarea hoặc Monaco Editor cho gõ nhiều dòng luôn). Sếp đồng ý chứ ạ?

---

## Phase 1: Task Breakdown

### 1. Rebranding (Dự kiến: 1 giờ)
- [ ] Đổi tên `productName` và `identifier` thành `ZenGit` trong `tauri.conf.json`.
- [ ] Cập nhật package.json, Cargo.toml.
- [ ] Thay text logo, window title trong `index.html` và file UI.
- [ ] Điều hướng config dir: Tách logic để file setting lưu ở `~/.zengit/`. (Làm mới hoàn toàn, bỏ cũ).

### 2. Backend API cho Custom Actions (Dự kiến: 1.5 giờ)
- [ ] Tạo module `custom_actions.rs`.
- [ ] Function `get_custom_actions()`: Đọc `~/.zengit/actions.json`. Trả về mảng JSON.
- [ ] Function `save_custom_actions(actions)`: Ghi đè file.
- [ ] Update function execute command để hỗ trợ chạy script (truyền vào shell `-c` trên Unix, hoặc PowerShell trên Win).

### 3. Frontend Store & UI (Dự kiến: 3 giờ)
- [ ] Init `useCustomActionsStore.ts` (Zustand).
- [ ] Build UI `CustomActionsBuilder.tsx` trong Settings:
  - Bảng danh sách Action.
  - Form thêm/sửa, có Textarea (hỗ trợ nhiều dòng lệnh/script).
- [ ] Chỉnh sửa `GitTab.tsx` và `CommitPanel.tsx`: 
  - Đọc danh sách và đẩy Menu Item (Custom Action) vào Context Menu.

### 4. Luồng Confirmation (Dự kiến: 1 giờ)
- [ ] Tạo Component Dialog `ActionConfirmDialog`.
- [ ] Thiết kế Collapsible Section: `<summary>Xem chi tiết lệnh</summary><pre>{command_scripts}</pre>`.
- [ ] Tiêm Dialog này vào trước hàm execute trong Context Menu.

---

## Phase 2: Agent Assignments
- `backend-specialist`: Ensure secure reading/writing of local JSON config logic. Make sure command execution properly handles complex shell formatting and stdout piping.
- `frontend-specialist`: Update UI components, manage Zustand store, build the settings visualizer, embed context menus cleanly via `lucide-react` icons and standard application aesthetics.

---

## Phase 3: Verification Checklist
- [ ] Window Name, app bundle reads ZenGit.
- [ ] Added a Custom Action with multiline script successfully.
- [ ] Right clicking displays the Action cleanly.
- [ ] Clicking triggers dialog -> Expanding shows EXACT parsed script.
- [ ] Confirming executes successfully without crashing.
