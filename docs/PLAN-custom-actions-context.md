# PLAN: Custom Actions Execution Context

## Phase -1: Context Check
- **Goal:** Define the runtime environment and context variables for executing Custom Actions in ZenGit.
- **Problem Statement 1:** Is there a language constraint for the actions? (Bash vs Node vs Python, etc.).
- **Problem Statement 2:** Context accuracy. If right-clicking `master` while on `develop`, the target context must be `master`.

---

## Phase 0: Socratic Gate / Resolving Concerns

*Note: Trả lời 2 vấn đề cực kỳ hóc búa của Sếp Xuân:*

**1. Ràng buộc ngôn ngữ là gì?**
Bản chất Tauri/Rust khi chạy lệnh hệ thống (System Subprocess) sẽ không giới hạn ngôn ngữ, miễn là môi trường máy tính của người dùng có cài đặt Runtime đó.
- Nếu họ gõ thẳng vào UI Builder (Textarea): Code sẽ được wrap lại và chạy bởi Default Shell của OS (ví dụ `/bin/sh -c "code..."` trên Mac/Linux hoặc `powershell.exe -c "code..."` trên Windows). -> **Ràng buộc duy nhất là 문 Shell Commands (Bash/Zsh/PowerShell).**
- Nếu họ muốn chạy NodeJS hay Python, họ có quyền điền: `node /path/to/script.js $TARGET_BRANCH`. Lúc này OS lo việc gọi runtime.

**2. Biến truyền vào (Params) phải lấy như thế nào ở Menu Context?**
Sếp suy nghĩ cực kỳ chính xác! Trạng thái UI (chỗ click chuột) khác với trạng thái Repo (nhánh checkout hiện tại). Do đó mình phải định nghĩa 2 tập biến nội suy (Template Variables) rõ ràng:
- Biến **Mục tiêu (Target)**: Cái mà user vừa click chuột phải vào.
- Biến **Môi trường (Global)**: Trạng thái hiện tại của Repo.

👉 *Danh sách biến đề xuất (Nội suy trước khi chạy script):*
- Bao quanh bằng dấu ngoặc móc để tránh nhầm lẫn: `{TARGET_BRANCH}`, `{CURRENT_BRANCH}`, `{TARGET_COMMIT}`, `{REPO_PATH}`.

---

## Phase 1: Task Breakdown (Bổ sung logic truyền context)

### 1. Nâng cấp API execute (Backend Rust)
- [ ] Hàm `execute_custom_action(script, context_payload)`: payload nhận từ Frontend là JSON Object chứa mảng Key-Value từ UI Context.
- [ ] Backend tìm và replace chuỗi ký tự dạng `{KEY}` thành Value tương ứng.
- [ ] Pipe lệnh đó vào Shell của OS (`/bin/sh` hoặc `cmd.exe`) kèm thư mục làm việc là `{REPO_PATH}`.

### 2. Định nghĩa Context Variables (Frontend)
- [ ] Khi user mở Chuột phải ở nhánh `master` trong khi đang đứng ở nhánh `develop`:
      - Payload sinh ra: `{ "TARGET_BRANCH": "master", "CURRENT_BRANCH": "develop", "REPO_PATH": "..." }`
- [ ] Chèn Context Info vào form Builder: Tạo một UI Hint nhỏ list ra danh sách các biến hợp lệ để User biết mà chèn vào lệnh của họ (ví dụ `<kbd>{TARGET_BRANCH}</kbd>`).

### 3. Xử lý UI chạy song song quá trình (Asynchronous UI)
- [ ] Gọi Rust API phải là async (không block UI).
- [ ] Khi lệnh External chạy, cần stream output từ Rust sang màn hình TerminalBar (màu Cam/Xanh) của ZenGit để user thấy lệnh đang chạy tới đâu, khỏi sợ nó treo im ru dưới ngầm.

---

## Phase 2: Agent Assignments
- `project-planner`: Conceptualized resolving path contexts vs UI contexts.
- `backend-specialist`: Build a robust token-replacement engine in Rust before feeding strings to native process commands.
- `frontend-specialist`: Manage UI state so that right click intercepts the specific row data (e.g. `tr` data property for branch string) and passes it to the `onClick` handler of the Context Menu correctly.

---

## Phase 3: Verification Checklist
- [ ] Add Custom Action -> `echo "Target: {TARGET_BRANCH}, Current: {CURRENT_BRANCH}"`
- [ ] Checkout at `develop`. Right click `master` row -> execute.
- [ ] Output in terminal must strictly be: `Target: master, Current: develop`.
