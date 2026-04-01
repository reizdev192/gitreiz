import { useState } from 'react';
import { X, ChevronDown, ChevronRight, Keyboard, GitBranch, Search, Archive, Tag, Cherry, Eye, FileEdit, Shield, RefreshCw, Rocket, GitFork } from 'lucide-react';
import { useI18n } from '../i18n/useI18n';
import { useEscClose } from '../hooks/useEscClose';

interface Section { title: string; icon: React.ReactNode; content: React.ReactNode; }

function Accordion({ section }: { section: Section }) {
    const [open, setOpen] = useState(false);
    return (
        <div style={{ borderBottom: '1px solid var(--border-default)' }}>
            <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2.5 px-4 py-3 text-left transition-colors"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                {open ? <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--text-accent)' }} /> : <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />}
                <span className="shrink-0" style={{ color: 'var(--text-accent)' }}>{section.icon}</span>
                <span className="text-sm font-semibold flex-1">{section.title}</span>
            </button>
            {open && (
                <div className="px-4 pb-4 pl-11 text-[12px] leading-relaxed space-y-2" style={{ color: 'var(--text-secondary)' }}>
                    {section.content}
                </div>
            )}
        </div>
    );
}

function Kbd({ children }: { children: string }) {
    return <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold mx-0.5" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>{children}</kbd>;
}

function Term({ children, desc }: { children: string; desc: string }) {
    return (
        <div className="flex gap-2 py-1.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <span className="font-bold shrink-0 text-[11px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--accent-muted)', color: 'var(--text-accent)' }}>{children}</span>
            <span>{desc}</span>
        </div>
    );
}

export function HelpGuide({ onClose }: { onClose: () => void }) {
    const { locale } = useI18n();
    useEscClose(onClose);
    const isVi = locale === 'vi';
    const isZh = locale === 'zh';

    const sections: Section[] = [
        {
            title: isVi ? '🚀 Tổng quan ứng dụng' : isZh ? '🚀 应用概述' : '🚀 App Overview',
            icon: <Rocket className="w-4 h-4" />,
            content: isVi ? (
                <div className="space-y-2">
                    <p><strong>ZenGit</strong> là công cụ quản lý Git và triển khai (deploy) ứng dụng dành cho lập trình viên. Ứng dụng giúp bạn:</p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>Quản lý <strong>nhánh (branch)</strong> — xem, chuyển, tạo, xóa, gộp nhánh</li>
                        <li>Xem <strong>lịch sử commit</strong> dạng danh sách hoặc đồ thị (graph)</li>
                        <li>Thực hiện <strong>triển khai nhanh (Quick Deploy)</strong> bằng chuột phải vào branch</li>
                        <li>Quản lý <strong>tag, stash, file thay đổi</strong></li>
                        <li>Xem <strong>diff</strong> (sự thay đổi) của từng commit</li>
                    </ul>
                    <p className="text-[11px] italic" style={{ color: 'var(--text-muted)' }}>💡 Tip: Phần bên trái là khu vực quản lý Git, phần bên phải hiển thị lịch sử commit. Phía dưới là Terminal output.</p>
                </div>
            ) : isZh ? (
                <div className="space-y-2">
                    <p><strong>ZenGit</strong> 是一款面向开发者的 Git 管理和部署工具。功能包括：</p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>管理<strong>分支 (branch)</strong>——查看、切换、创建、删除、合并</li>
                        <li>以列表或图表形式查看<strong>提交历史</strong></li>
                        <li>右键分支进行<strong>快速部署</strong></li>
                        <li>管理<strong>标签、暂存、文件变更</strong></li>
                        <li>查看每次提交的<strong>差异 (diff)</strong></li>
                    </ul>
                </div>
            ) : (
                <div className="space-y-2">
                    <p><strong>ZenGit</strong> is a Git management and deployment tool for developers. Features include:</p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>Manage <strong>branches</strong> — view, checkout, create, delete, merge</li>
                        <li>View <strong>commit history</strong> in list or graph mode</li>
                        <li>Perform <strong>Quick Deploy</strong> via right-click on branches</li>
                        <li>Manage <strong>tags, stashes, and file changes</strong></li>
                        <li>View <strong>diffs</strong> for each commit</li>
                    </ul>
                </div>
            ),
        },
        {
            title: isVi ? '🌿 Quản lý nhánh (Branch)' : isZh ? '🌿 分支管理' : '🌿 Branch Management',
            icon: <GitBranch className="w-4 h-4" />,
            content: isVi ? (
                <div className="space-y-2">
                    <Term desc="Một nhánh (branch) là một phiên bản song song của mã nguồn. Bạn có thể làm việc trên nhánh riêng mà không ảnh hưởng nhánh chính.">Branch</Term>
                    <Term desc="Chuyển sang nhánh khác để làm việc. Giống như mở một folder khác. Nhấn đôi (double-click) vào branch tại cây nhánh bên trái.">Checkout</Term>
                    <Term desc="Gộp code từ nhánh khác vào nhánh hiện tại. Chuột phải → Merge into. Ví dụ: gộp 'feature' vào 'main' để đưa tính năng mới vào bản chính.">Merge</Term>
                    <Term desc="Đẩy code từ máy bạn lên server (remote). Chuột phải → Push.">Push</Term>
                    <Term desc="Kéo code mới nhất từ server về máy bạn. Chuột phải → Pull.">Pull</Term>
                    <Term desc="Xóa nhánh không cần nữa. Chuột phải → Delete. Không thể xóa nhánh đang dùng.">Delete Branch</Term>
                    <p className="text-[11px] italic" style={{ color: 'var(--text-muted)' }}>💡 Tip: Nhấn chuột phải vào bất kỳ branch nào để thấy tất cả thao tác.</p>
                </div>
            ) : isZh ? (
                <div className="space-y-2">
                    <Term desc="分支是代码的并行版本。您可以在自己的分支上工作而不影响主分支。">Branch</Term>
                    <Term desc="切换到另一个分支。双击左侧分支树中的分支。">Checkout</Term>
                    <Term desc="将另一个分支的代码合并到当前分支。右键 → Merge into。">Merge</Term>
                    <Term desc="将本地代码推送到远程服务器。右键 → Push。">Push</Term>
                    <Term desc="从远程服务器拉取最新代码。右键 → Pull。">Pull</Term>
                </div>
            ) : (
                <div className="space-y-2">
                    <Term desc="A branch is a parallel version of your code. You work on your own branch without affecting the main codebase.">Branch</Term>
                    <Term desc="Switch to a different branch to work on. Double-click any branch in the tree.">Checkout</Term>
                    <Term desc="Combine code from another branch into the current one. Right-click → Merge into.">Merge</Term>
                    <Term desc="Upload your local commits to the remote server. Right-click → Push.">Push</Term>
                    <Term desc="Download the latest commits from the server. Right-click → Pull.">Pull</Term>
                </div>
            ),
        },
        {
            title: isVi ? '📜 Lịch sử Commit & Tìm kiếm' : isZh ? '📜 提交历史与搜索' : '📜 Commit History & Search',
            icon: <Search className="w-4 h-4" />,
            content: isVi ? (
                <div className="space-y-2">
                    <Term desc="Commit là một bản lưu (snapshot) các thay đổi của bạn. Giống như 'Save Game' — mỗi commit ghi lại code đã thay đổi gì, ai thay đổi, khi nào.">Commit</Term>
                    <p><strong>Chế độ hiển thị:</strong></p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li><strong>List View (📋)</strong> — Hiển thị danh sách commit đơn giản, dễ đọc</li>
                        <li><strong>Graph View (🔀)</strong> — Hiển thị đồ thị phân nhánh, giống SourceTree. Các đường màu cho thấy nhánh nào rẽ ra, gộp lại.</li>
                    </ul>
                    <p><strong>Tìm kiếm commit:</strong> Gõ vào ô search ở trên cùng panel commit. Hệ thống sẽ tìm theo nội dung message của commit.</p>
                    <p><strong>Lọc theo branch:</strong> Click nút branch ở header commit panel để chọn xem commit của nhánh nào, hoặc tất cả nhánh.</p>
                    <p><strong>Hover vào commit:</strong> Di chuột vào bất kỳ commit nào để xem thông tin đầy đủ (hash, author, ngày giờ, message, parent commits).</p>
                    <p className="text-[11px] italic" style={{ color: 'var(--text-muted)' }}>💡 Tip: Nhấn đôi vào commit để xem diff (thay đổi). Nhấn chuột phải để thấy thêm tùy chọn.</p>
                </div>
            ) : isZh ? (
                <div className="space-y-2">
                    <Term desc="提交是您更改的快照。每次提交记录了什么代码被更改、由谁更改以及何时更改。">Commit</Term>
                    <p>搜索提交：在提交面板顶部的搜索框中输入。系统会按提交消息内容搜索。</p>
                    <p>双击提交查看差异。右键查看更多选项。</p>
                </div>
            ) : (
                <div className="space-y-2">
                    <Term desc="A commit is a snapshot of your changes. Each commit records what code changed, who changed it, and when.">Commit</Term>
                    <p><strong>Search:</strong> Type in the search bar at the top of the commit panel. It searches by commit message.</p>
                    <p><strong>View modes:</strong> List (simple) or Graph (shows branching visually).</p>
                    <p>Double-click a commit to view its diff. Right-click for more options.</p>
                </div>
            ),
        },
        {
            title: isVi ? '🍒 Cherry-pick' : isZh ? '🍒 Cherry-pick' : '🍒 Cherry-pick',
            icon: <Cherry className="w-4 h-4" />,
            content: isVi ? (
                <div className="space-y-2">
                    <p><strong>Cherry-pick</strong> là thao tác "hái" một commit cụ thể từ nhánh khác và áp dụng vào nhánh hiện tại.</p>
                    <p><strong>Khi nào dùng?</strong></p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>Bạn cần lấy <strong>một fix bug cụ thể</strong> từ nhánh develop sang production, nhưng không muốn merge toàn bộ nhánh develop</li>
                        <li>Một tính năng nhỏ đã hoàn thành ở nhánh feature, bạn muốn đưa riêng commit đó sang nhánh release</li>
                        <li>Bạn commit nhầm nhánh — cherry-pick commit đó sang đúng nhánh, rồi revert ở nhánh cũ</li>
                    </ul>
                    <p><strong>Cách dùng:</strong></p>
                    <ol className="list-decimal pl-4 space-y-1">
                        <li>Checkout sang nhánh đích (nhánh sẽ nhận commit)</li>
                        <li>Ở panel commit bên phải, chọn "All Branches" để thấy commit từ nhánh khác</li>
                        <li>Nhấn <strong>chuột phải</strong> vào commit cần cherry-pick</li>
                        <li>Chọn <strong>"Cherry-pick"</strong> trong menu</li>
                        <li>Xác nhận → commit sẽ được áp dụng vào nhánh hiện tại</li>
                    </ol>
                    <p className="text-[11px] px-2 py-1.5 rounded" style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
                        ⚠️ Lưu ý: Cherry-pick có thể gây <strong>conflict</strong> (xung đột code) nếu nhánh đích có code khác nhiều. Khi xảy ra conflict, mở terminal để xem chi tiết và giải quyết thủ công.
                    </p>
                </div>
            ) : isZh ? (
                <div className="space-y-2">
                    <p><strong>Cherry-pick</strong> 是从另一个分支中"摘取"特定提交并应用到当前分支的操作。</p>
                    <p>右键提交 → 选择 Cherry-pick。适用于只需要某个特定修复而不想合并整个分支的情况。</p>
                </div>
            ) : (
                <div className="space-y-2">
                    <p><strong>Cherry-pick</strong> is the act of picking a specific commit from another branch and applying it to the current branch.</p>
                    <p><strong>When to use:</strong></p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>You need a specific bug fix from develop in production, without merging all of develop</li>
                        <li>A small feature is done in a feature branch and you want just that commit in release</li>
                    </ul>
                    <p>Right-click a commit → Cherry-pick. May cause conflicts if branches diverge significantly.</p>
                </div>
            ),
        },
        {
            title: isVi ? '👁️ Diff Viewer (Xem thay đổi)' : isZh ? '👁️ 差异查看器' : '👁️ Diff Viewer',
            icon: <Eye className="w-4 h-4" />,
            content: isVi ? (
                <div className="space-y-2">
                    <Term desc="Diff (difference) cho thấy sự khác biệt giữa file trước và sau khi thay đổi. Dòng xanh = thêm mới, dòng đỏ = đã xóa.">Diff</Term>
                    <p><strong>Cách dùng:</strong> Nhấn đôi (double-click) vào bất kỳ commit nào ở panel bên phải.</p>
                    <p>Cửa sổ Diff Viewer sẽ mở ra với:</p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li><strong>Sidebar trái:</strong> Danh sách file bị thay đổi, kèm số dòng thêm (+) và xóa (-)</li>
                        <li><strong>Panel phải:</strong> Nội dung thay đổi của file được chọn</li>
                        <li>Màu sắc file: 🟡 Modified (sửa), 🟢 Added (thêm), 🔴 Deleted (xóa), 🔵 Renamed (đổi tên)</li>
                    </ul>
                </div>
            ) : isZh ? (
                <div className="space-y-2">
                    <Term desc="差异显示文件更改前后的不同。绿色 = 新增，红色 = 删除。">Diff</Term>
                    <p>双击任意提交打开差异查看器。左侧为更改的文件列表，右侧为选中文件的内容。</p>
                </div>
            ) : (
                <div className="space-y-2">
                    <Term desc="Diff shows the difference between a file before and after changes. Green = added, Red = deleted.">Diff</Term>
                    <p>Double-click any commit to open the Diff Viewer. Left sidebar shows changed files, right panel shows content.</p>
                </div>
            ),
        },
        {
            title: isVi ? '📦 Stash (Lưu tạm)' : isZh ? '📦 暂存' : '📦 Stash',
            icon: <Archive className="w-4 h-4" />,
            content: isVi ? (
                <div className="space-y-2">
                    <Term desc="Stash lưu tạm các thay đổi chưa commit vào 'ngăn kéo' riêng. Code sẽ trở về trạng thái sạch (clean), và bạn có thể khôi phục lại bất cứ lúc nào.">Stash</Term>
                    <p><strong>Khi nào dùng?</strong></p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>Đang code dở, cần chuyển nhánh gấp → stash lại, chuyển nhánh, xong quay lại pop stash</li>
                        <li>Muốn test thử code sạch mà không mất thay đổi hiện tại</li>
                        <li>Cần pull code mới về nhưng có conflict với code đang sửa → stash, pull, rồi pop lại</li>
                    </ul>
                    <p><strong>Cách dùng:</strong></p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li><strong>Lưu tạm:</strong> Chuột phải vào branch → "Stash Changes"</li>
                        <li><strong>Khôi phục:</strong> Mở panel Stash ở dưới cây branch → nhấn nút ↩️ Apply</li>
                        <li><strong>Xóa:</strong> Nhấn nút 🗑️ Drop để xóa stash không cần nữa</li>
                    </ul>
                </div>
            ) : isZh ? (
                <div className="space-y-2">
                    <Term desc="暂存会将未提交的更改保存到一个'抽屉'中。代码恢复到干净状态，您可以随时恢复更改。">Stash</Term>
                    <p>右键分支 → "Stash Changes" 暂存。在分支树下方的 Stash 面板中恢复或删除。</p>
                </div>
            ) : (
                <div className="space-y-2">
                    <Term desc="Stash saves your uncommitted changes to a 'drawer'. Your code returns to a clean state, and you can restore changes anytime.">Stash</Term>
                    <p>Right-click branch → "Stash Changes". Use the Stash panel below the branch tree to Apply or Drop.</p>
                </div>
            ),
        },
        {
            title: isVi ? '🏷️ Tag (Thẻ đánh dấu)' : isZh ? '🏷️ 标签' : '🏷️ Tags',
            icon: <Tag className="w-4 h-4" />,
            content: isVi ? (
                <div className="space-y-2">
                    <Term desc="Tag là một nhãn cố định gắn vào một commit. Thường dùng để đánh dấu phiên bản (v1.0.0, v2.1.3). Khác với branch, tag không di chuyển theo commit mới.">Tag</Term>
                    <p><strong>Cách dùng:</strong></p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>Mở panel <strong>Tags</strong> ở dưới cây branch (bên trái)</li>
                        <li>Nhấn <strong>+</strong> để tạo tag mới tại commit hiện tại</li>
                        <li>Dùng ô <strong>filter</strong> để lọc tag theo tên</li>
                        <li>Nhấn 🗑️ để xóa tag local</li>
                    </ul>
                    <p className="text-[11px] italic" style={{ color: 'var(--text-muted)' }}>💡 Tip: Tag format trong config (ví dụ: staging-*) quyết định tag nào được dùng cho deploy.</p>
                </div>
            ) : isZh ? (
                <div className="space-y-2">
                    <Term desc="标签是附加在提交上的固定标记。通常用于标记版本（v1.0.0）。与分支不同，标签不会随新提交移动。">Tag</Term>
                    <p>在左侧分支树下方打开 Tags 面板。点击 + 创建新标签，使用筛选框搜索。</p>
                </div>
            ) : (
                <div className="space-y-2">
                    <Term desc="A tag is a fixed label attached to a commit. Usually used for versioning (v1.0.0). Unlike branches, tags don't move with new commits.">Tag</Term>
                    <p>Open the Tags panel below the branch tree. Click + to create, use filter to search.</p>
                </div>
            ),
        },
        {
            title: isVi ? '✏️ Quick Commit (Commit nhanh)' : isZh ? '✏️ 快速提交' : '✏️ Quick Commit',
            icon: <FileEdit className="w-4 h-4" />,
            content: isVi ? (
                <div className="space-y-2">
                    <p>Panel Quick Commit <strong>tự động hiện</strong> khi có file thay đổi trong project (working tree dirty).</p>
                    <Term desc="Stage = chọn file nào sẽ được đưa vào commit tiếp theo. Giống như bỏ đồ vào hộp trước khi gửi. Chỉ file 'Staged' mới được commit.">Stage</Term>
                    <Term desc="Bỏ file ra khỏi staged — file vẫn thay đổi nhưng sẽ không nằm trong commit tiếp theo.">Unstage</Term>
                    <p><strong>Cách commit:</strong></p>
                    <ol className="list-decimal pl-4 space-y-1">
                        <li>Nhấn <strong>+</strong> bên phải file để Stage, hoặc nhấn "Stage All" để stage tất cả</li>
                        <li>Viết <strong>commit message</strong> mô tả thay đổi (bắt buộc)</li>
                        <li>Nhấn <strong>Commit</strong> — xong! Code đã được lưu vĩnh viễn vào lịch sử Git</li>
                    </ol>
                    <p className="text-[11px] px-2 py-1.5 rounded" style={{ backgroundColor: 'rgba(250,204,21,0.08)', color: '#facc15' }}>
                        💡 Tip: Viết message ngắn gọn nhưng rõ ràng. Ví dụ: "fix: login button not clickable" thay vì "fix bug".
                    </p>
                </div>
            ) : isZh ? (
                <div className="space-y-2">
                    <p>Quick Commit 面板在项目有文件更改时自动显示。</p>
                    <Term desc="Stage = 选择哪些文件将包含在下一次提交中。">Stage</Term>
                    <p>点击文件旁的 + 暂存，输入提交消息，点击 Commit。</p>
                </div>
            ) : (
                <div className="space-y-2">
                    <p>The Quick Commit panel appears automatically when files are changed.</p>
                    <Term desc="Stage = select which files to include in the next commit. Only staged files get committed.">Stage</Term>
                    <p>Click + next to files to stage, type a message, and click Commit.</p>
                </div>
            ),
        },
        {
            title: isVi ? '🛡️ Branch Protection (Bảo vệ nhánh)' : isZh ? '🛡️ 分支保护' : '🛡️ Branch Protection',
            icon: <Shield className="w-4 h-4" />,
            content: isVi ? (
                <div className="space-y-2">
                    <p>Branch Protection giúp bảo vệ các nhánh quan trọng (ví dụ: <code>main</code>, <code>production</code>) khỏi bị xóa hoặc thao tác nhầm.</p>
                    <p><strong>Cách cấu hình:</strong></p>
                    <ol className="list-decimal pl-4 space-y-1">
                        <li>Vào <strong>Project Settings</strong> (⚙️ icon ở header)</li>
                        <li>Tìm mục <strong>"Protected Branches"</strong></li>
                        <li>Nhập tên nhánh cần bảo vệ, cách nhau bởi dấu phẩy. Ví dụ: <code>main, production, staging</code></li>
                    </ol>
                    <p>Khi nhánh được bảo vệ:</p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>Icon 🛡️ hiện bên cạnh tên branch</li>
                        <li>Xóa branch sẽ hiện cảnh báo và yêu cầu xác nhận thêm</li>
                    </ul>
                </div>
            ) : isZh ? (
                <div className="space-y-2">
                    <p>分支保护防止重要分支（如 main, production）被误操作。</p>
                    <p>在项目设置中配置受保护的分支名称（逗号分隔）。受保护分支会显示 🛡️ 图标，删除时需要额外确认。</p>
                </div>
            ) : (
                <div className="space-y-2">
                    <p>Branch Protection prevents accidental operations on important branches like <code>main</code> or <code>production</code>.</p>
                    <p>Configure in Project Settings → "Protected Branches" (comma-separated). Protected branches show a 🛡️ icon and require extra confirmation before deletion.</p>
                </div>
            ),
        },
        {
            title: isVi ? '🌲 Worktree (Làm việc song song)' : isZh ? '🌲 工作树（并行工作）' : '🌲 Worktree (Parallel Work)',
            icon: <GitFork className="w-4 h-4" />,
            content: isVi ? (
                <div className="space-y-2">
                    <Term desc="Worktree là một thư mục làm việc riêng biệt, checkout sang branch khác nhưng chia sẻ cùng repository. Bạn có thể mở 2 branch cùng lúc ở 2 folder khác nhau.">Worktree</Term>
                    <p><strong>Khi nào dùng?</strong></p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>Đang code ở <code>dev</code>, cần fix bug gấp ở <code>prod</code> → mở worktree cho <code>prod</code>, fix xong đóng lại</li>
                        <li>Cần so sánh code giữa 2 branch bằng cách mở 2 cửa sổ VS Code</li>
                        <li>Review code nhanh ở branch khác mà không muốn stash/commit code hiện tại</li>
                    </ul>
                    <p><strong>Cách dùng:</strong></p>
                    <ol className="list-decimal pl-4 space-y-1">
                        <li>Nhấn <strong>chuột phải</strong> vào branch cần mở song song</li>
                        <li>Chọn <strong>"Mở song song"</strong> (Open in Parallel)</li>
                        <li>Hệ thống tạo thư mục riêng tại <code>.worktrees/branch-name/</code></li>
                        <li>Mở panel <strong>Worktrees</strong> ở dưới cây branch</li>
                        <li>Click <strong>📂</strong> để mở Explorer, hoặc <strong>💻</strong> để mở VS Code tại thư mục đó</li>
                        <li>Fix xong → click <strong>🗑️ Remove</strong> để xóa worktree</li>
                    </ol>
                    <p><strong>Dấu hiệu nhận biết:</strong></p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>Branch có worktree đang mở sẽ hiện icon <strong>🔗</strong> bên cạnh tên</li>
                        <li>Menu chuột phải sẽ <strong>không hiện</strong> "Open in Parallel" cho branch đã mở</li>
                    </ul>
                    <p className="text-[11px] px-2 py-1.5 rounded" style={{ backgroundColor: 'rgba(6,182,212,0.08)', color: '#06b6d4' }}>
                        💡 Khác với Stash: Stash lưu tạm rồi chuyển nhánh (vẫn 1 folder). Worktree tạo folder mới → code 2 branch cùng lúc thật sự.
                    </p>
                    <p className="text-[11px] px-2 py-1.5 rounded" style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
                        ⚠️ Không thể checkout cùng 1 branch ở 2 nơi cùng lúc. Git tự block để tránh xung đột.
                    </p>
                </div>
            ) : isZh ? (
                <div className="space-y-2">
                    <Term desc="工作树是一个独立的工作目录，检出到另一个分支但共享同一仓库。可以同时在两个文件夹中打开两个分支。">Worktree</Term>
                    <p>右键分支 → "并行打开"。在 <code>.worktrees/</code> 目录下创建文件夹。点击 📂 打开资源管理器或 💻 打开 VS Code。完成后点击 🗑️ 移除。</p>
                    <p>注意：不能同时在两个工作树中检出同一分支。</p>
                </div>
            ) : (
                <div className="space-y-2">
                    <Term desc="A worktree is a separate working directory checked out to another branch, sharing the same repository. You can work on two branches simultaneously in two folders.">Worktree</Term>
                    <p><strong>When to use:</strong> You're coding on <code>dev</code> and need to urgently fix a bug on <code>prod</code> — open a worktree for <code>prod</code>, fix it, and close.</p>
                    <p>Right-click branch → "Open in Parallel". Click 📂 for Explorer or 💻 for VS Code. Click 🗑️ Remove when done.</p>
                    <p>⚠️ You cannot checkout the same branch in two worktrees simultaneously.</p>
                </div>
            ),
        },
        {
            title: isVi ? '⌨️ Phím tắt' : isZh ? '⌨️ 快捷键' : '⌨️ Keyboard Shortcuts',
            icon: <Keyboard className="w-4 h-4" />,
            content: (
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between py-1" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <span><Kbd>Ctrl</Kbd>+<Kbd>R</Kbd></span>
                        <span>{isVi ? 'Làm mới trạng thái Git (Refresh)' : isZh ? '刷新 Git 状态' : 'Refresh Git state'}</span>
                    </div>
                    <div className="flex items-center justify-between py-1" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <span><Kbd>Ctrl</Kbd>+<Kbd>T</Kbd></span>
                        <span>{isVi ? 'Mở/đóng Terminal' : isZh ? '切换终端' : 'Toggle Terminal'}</span>
                    </div>
                    <div className="flex items-center justify-between py-1" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <span><Kbd>Ctrl</Kbd>+<Kbd>F</Kbd></span>
                        <span>{isVi ? 'Focus vào ô tìm kiếm commit' : isZh ? '聚焦搜索框' : 'Focus commit search'}</span>
                    </div>
                    <div className="flex items-center justify-between py-1" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <span><Kbd>Ctrl</Kbd>+<Kbd>Shift</Kbd>+<Kbd>P</Kbd></span>
                        <span>{isVi ? 'Mở cài đặt dự án' : isZh ? '打开项目设置' : 'Open project settings'}</span>
                    </div>
                </div>
            ),
        },
        {
            title: isVi ? '🚀 Deploy (Triển khai)' : isZh ? '🚀 部署' : '🚀 Deployment',
            icon: <Rocket className="w-4 h-4" />,
            content: isVi ? (
                <div className="space-y-2">
                    <Term desc="Deploy là quá trình đưa code lên server thật (staging, production) để người dùng cuối có thể sử dụng.">Deploy</Term>
                    <p><strong>Cách deploy:</strong></p>
                    <ol className="list-decimal pl-4 space-y-1">
                        <li>Nhấn chuột phải vào branch cần deploy</li>
                        <li>Chọn <strong>"Quick Deploy →"</strong> rồi chọn môi trường (staging, production...)</li>
                        <li>Hệ thống sẽ tạo tag mới, push tag, và chạy deploy script</li>
                        <li>Xem output trong <strong>Terminal</strong> ở phía dưới</li>
                    </ol>
                    <p><strong>Cấu hình môi trường:</strong></p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>Vào Project Settings → Environments</li>
                        <li>Thêm môi trường với tên (vd: staging) và tag format (vd: <code>staging-*</code>)</li>
                        <li>Bật "Auto Confirm" trong Deploy Settings nếu muốn bỏ qua bước review plan</li>
                    </ul>
                    <p className="text-[11px] italic" style={{ color: 'var(--text-muted)' }}>💡 Branch có icon 🚀 nhấp nháy = deploy branch (match với tag format).</p>
                </div>
            ) : isZh ? (
                <div className="space-y-2">
                    <Term desc="部署是将代码推送到真实服务器（staging、production）供最终用户使用的过程。">Deploy</Term>
                    <p>右键分支 → Quick Deploy → 选择环境。系统会创建新标签、推送并运行部署脚本。</p>
                </div>
            ) : (
                <div className="space-y-2">
                    <Term desc="Deployment is the process of pushing code to real servers (staging, production) for end users.">Deploy</Term>
                    <p>Right-click branch → Quick Deploy → select environment. The system creates a new tag, pushes it, and runs the deploy script.</p>
                </div>
            ),
        },
        {
            title: isVi ? '🔄 Auto-fetch & Terminal' : isZh ? '🔄 自动拉取与终端' : '🔄 Auto-fetch & Terminal',
            icon: <RefreshCw className="w-4 h-4" />,
            content: isVi ? (
                <div className="space-y-2">
                    <Term desc="Fetch tự động kéo thông tin mới nhất từ remote về (KHÔNG thay đổi code local của bạn). Chỉ cập nhật danh sách branch, tag, commit mới.">Auto-fetch</Term>
                    <p><strong>Terminal Bar</strong> ở phía dưới hiển thị output của các lệnh deploy, push, pull... Có thể:</p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li><strong>Pin/Unpin</strong> — giữ terminal luôn mở hoặc tự động ẩn</li>
                        <li><strong>Copy All</strong> — sao chép toàn bộ output</li>
                        <li><strong>Clear</strong> — xóa output cũ</li>
                    </ul>
                    <p className="text-[11px] italic" style={{ color: 'var(--text-muted)' }}>💡 Terminal tự động mở khi có lệnh mới chạy (deploy, push, pull...).</p>
                </div>
            ) : isZh ? (
                <div className="space-y-2">
                    <Term desc="自动拉取从远程获取最新信息（不改变本地代码）。仅更新分支和标签列表。">Auto-fetch</Term>
                    <p>底部终端栏显示命令输出。可以固定、复制或清除。</p>
                </div>
            ) : (
                <div className="space-y-2">
                    <Term desc="Auto-fetch pulls the latest info from remote (does NOT change your local code). Only updates branch/tag lists.">Auto-fetch</Term>
                    <p>The Terminal Bar at the bottom shows command output. You can Pin, Copy All, or Clear it.</p>
                </div>
            ),
        },
    ];

    return (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <div className="rounded-2xl overflow-hidden flex flex-col shadow-2xl" style={{
                backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-default)',
                width: 'min(680px, 90vw)', maxHeight: '85vh',
            }}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-tree-header)' }}>
                    <div className="flex items-center gap-2">
                        <span className="text-lg">📖</span>
                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                            {isVi ? 'Hướng dẫn sử dụng ZenGit' : isZh ? 'ZenGit 使用指南' : 'ZenGit User Guide'}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Intro */}
                <div className="px-5 py-3 text-[12px]" style={{ borderBottom: '1px solid var(--border-default)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-app)' }}>
                    {isVi ? '👋 Chào mừng bạn! Click vào từng mục bên dưới để tìm hiểu chi tiết. Mỗi mục giải thích thuật ngữ, cách dùng, và mẹo hữu ích.' :
                        isZh ? '👋 欢迎！点击下方各个条目了解详情。每个条目包含术语解释、使用方法和实用技巧。' :
                            '👋 Welcome! Click each section below for details. Each includes terminology, usage instructions, and helpful tips.'}
                </div>

                {/* Sections */}
                <div className="flex-1 overflow-y-auto">
                    {sections.map((s, i) => <Accordion key={i} section={s} />)}
                </div>

                {/* Footer */}
                <div className="px-5 py-2 text-[10px] text-center shrink-0" style={{ borderTop: '1px solid var(--border-default)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-tree-header)' }}>
                    {isVi ? 'Nhấn Esc hoặc nút X để đóng' : isZh ? '按 Esc 或 X 关闭' : 'Press Esc or X to close'}
                </div>
            </div>
        </div>
    );
}
