# PLAN: Action Context Filtering

## Phase -1: Context Check
- **User Request:** "lúc thêm action, làm sao biết action đó được chỉ định cho mục nào (commit bar, branch bar, global context,.....) ?"
- **Current State:** Interface `CustomAction` trong `useCustomActionsStore.ts` hiện tại chỉ lưu trữ `id`, `name`, `script`, `icon`, `description`. Mọi action đều đang được hiển thị bừa bãi ở tất cả các context menu.
- **Goal:** Thêm trường quản lý ngữ cảnh (Context Scopes) vào `CustomAction` model để người dùng có thể tự định tuyến xem Action nào sẽ hiện ở Menu nào.

---

## Phase 0: Socratic Gate (User Clarifications)

> [!IMPORTANT]
> **Sếp Xuân ơi, câu hỏi quá chí mạng!** Sếp nhìn thấu ngay vấn đề thiết kế hiện tại. Để chuẩn bị code mượt mà nhất, Sếp cho đệ hỏi 3 câu sau để chốt đơn cấu trúc dữ liệu nhé:

1. **Một Action có thể xuất hiện ở NHIỀU nơi cùng lúc không?**
   Ví dụ Action "Send notification to Telegram" Sếp muốn nó hiện ở cả *Commit context* lẫn *Branch context*, hay 1 Action chỉ được nằm ở 1 menu duy nhất? 
   *(Đệ đề xuất lưu dưới dạng mảng `contexts: ['branch', 'commit']` thay vì string đơn để linh hoạt nhất nha Sếp).*

2. **Sếp có cần "Global Context" ngay bây giờ không?**
   Global Context có nghĩa là các Action đứng nhóm riêng lẻ đâu đó trên top thanh công cụ (không phụ thuộc vào 1 nhánh hay 1 commit cụ thể nào). Sếp có muốn làm thêm loại Global này luôn không, hay tạm thời chỉ khoanh vùng ở **Branch** và **Commit** thôi?

3. **Thiết kế UI cho phần chọn Context trong Builder?**
   Để tiện nhất, lúc User tạo Action mới, Sếp thích dùng một dàn **Checkboxes** (tick chọn: ☑️ Branch ☑️ Commit ☑️ Global) hay là **Dropdown chọn nhiều** (Multi-select) cho đỡ chiếm diện tích?

---

## Phase 1: Task Breakdown (Draft)
*(Sẽ được lên scope chi tiết sau khi Sếp trả lời Phase 0)*

### 1. Model & State Updates (Store)
- Cập nhật interface `CustomAction` thêm attribute: `contexts?: string[]`.
- Đảm bảo tính tương thích ngược (những action lưu từ trước chưa có `contexts` sẽ tự động đổ default là full cả branch lẫn commit để không lỗi).

### 2. Rust Backend
- Nếu Rust đang parse JSON dạng struct nghiêm ngặt (strict mode), cần update struct bên `zengit` backend để khai báo mảng `contexts: Option<Vec<String>>`.

### 3. Builder UI
- Trong `CustomActionsBuilder.tsx`, thêm Row cho phép tick chọn Context.

### 4. Menu Filtering Logic
- Xử lý màng lọc ở `GitTab.tsx` (Menu Branch): `actions.filter(a => a.contexts.includes('branch'))`
- Xử lý màng lọc ở `CommitPanel.tsx` (Menu Commit): `actions.filter(a => a.contexts.includes('commit'))`

---

## Phase 2: Agent Assignments
- `project-planner`: Chịu trách nhiệm chốt hạ requirement và file plan này.
- `frontend-specialist`: Vẽ component chọn Context trong UI Builder, đồng thời ráp hook filter hiển thị.
- `backend-specialist`: Kiểm tra và điều chỉnh Rust structs để parse an toàn mảng `contexts`.

---

## Phase 3: Verification Checklist
- [ ] Mở App không sập nếu actions config cũ chưa có mảng `contexts`.
- [ ] Chọn Action A hiển thị ở *Branch*, Action B hiển thị ở *Commit*. Verify Menu Context hiện chuẩn xác.
- [ ] Verify template variables `{branch_name}` tự động disable hoặc cảnh báo nếu user định gán action đó vào `Global` context (vì ở global làm gì có tên nhánh cụ thể).
