export type Locale = 'en' | 'vi' | 'zh';

export const LOCALE_LABELS: Record<Locale, string> = {
    en: 'English',
    vi: 'Tiếng Việt',
    zh: '中文',
};

const translations = {
    // App Header
    'app.selectProject': { en: 'Select Project', vi: 'Chọn dự án', zh: '选择项目' },
    'app.projects': { en: 'Projects', vi: 'Dự án', zh: '项目' },
    'app.noProjects': { en: 'No projects configured.', vi: 'Chưa có dự án nào.', zh: '暂无项目。' },
    'app.newProject': { en: 'New Project', vi: 'Dự án mới', zh: '新建项目' },
    'app.projectSettings': { en: 'Project Settings', vi: 'Cài đặt dự án', zh: '项目设置' },
    'app.selectPrompt': { en: 'Select a project from the dropdown above to start deploying.', vi: 'Chọn dự án từ menu trên để bắt đầu triển khai.', zh: '从上方下拉菜单选择项目开始部署。' },

    // Git Tab
    'git.status': { en: 'Git Status', vi: 'Trạng thái Git', zh: 'Git 状态' },
    'git.refresh': { en: 'Refresh', vi: 'Làm mới', zh: '刷新' },
    'git.clean': { en: 'Clean', vi: 'Sạch', zh: '干净' },
    'git.uncommitted': { en: 'Uncommitted changes', vi: 'Có thay đổi chưa commit', zh: '未提交的更改' },
    'git.notDeployBranch': { en: 'Not a deploy branch', vi: 'Không phải nhánh deploy', zh: '非部署分支' },
    'git.branches': { en: 'Branches', vi: 'Nhánh', zh: '分支' },
    'git.rightClickActions': { en: 'Right-click for actions', vi: 'Nhấn chuột phải để thao tác', zh: '右键查看操作' },
    'git.loading': { en: 'Loading...', vi: 'Đang tải...', zh: '加载中...' },
    'git.noBranches': { en: 'No branches found', vi: 'Không tìm thấy nhánh', zh: '未找到分支' },

    // Context Menu
    'ctx.checkout': { en: 'Checkout', vi: 'Chuyển nhánh', zh: '切换分支' },
    'ctx.quickDeploy': { en: 'Quick Deploy →', vi: 'Triển khai nhanh →', zh: '快速部署 →' },
    'ctx.pull': { en: 'Pull', vi: 'Kéo về', zh: '拉取' },
    'ctx.merge': { en: 'Merge into', vi: 'Gộp vào', zh: '合并到' },
    'ctx.push': { en: 'Push...', vi: 'Đẩy lên...', zh: '推送...' },
    'ctx.stash': { en: 'Stash Changes', vi: 'Lưu tạm', zh: '暂存更改' },
    'ctx.stashPop': { en: 'Pop Stash', vi: 'Khôi phục tạm', zh: '恢复暂存' },
    'ctx.createBranch': { en: 'Create Branch...', vi: 'Tạo nhánh...', zh: '创建分支...' },
    'ctx.copyName': { en: 'Copy Name', vi: 'Sao chép tên', zh: '复制名称' },
    'ctx.delete': { en: 'Delete Branch', vi: 'Xóa nhánh', zh: '删除分支' },

    // Tooltip
    'tip.latestCommit': { en: 'Latest Commit', vi: 'Commit mới nhất', zh: '最新提交' },
    'tip.remoteSync': { en: 'Remote Sync', vi: 'Đồng bộ remote', zh: '远程同步' },
    'tip.inSync': { en: 'In sync with origin', vi: 'Đã đồng bộ với origin', zh: '已与远程同步' },
    'tip.toPush': { en: 'to push', vi: 'cần push', zh: '待推送' },
    'tip.toPull': { en: 'to pull', vi: 'cần pull', zh: '待拉取' },
    'tip.ahead': { en: 'ahead', vi: 'đi trước', zh: '领先' },
    'tip.behind': { en: 'behind', vi: 'đi sau', zh: '落后' },
    'tip.deployTag': { en: 'Deploy Tag', vi: 'Tag triển khai', zh: '部署标签' },
    'tip.hint': { en: 'Double-click to checkout · Right-click for actions', vi: 'Nhấn đôi để chuyển nhánh · Nhấn phải để thao tác', zh: '双击切换分支 · 右键查看操作' },

    // Deploy Panel
    'deploy.autoConfirm': { en: 'Auto-confirm (skip review)', vi: 'Tự động xác nhận (bỏ qua xem xét)', zh: '自动确认（跳过审查）' },
    'deploy.target': { en: 'DEPLOY TARGET', vi: 'MỤC TIÊU TRIỂN KHAI', zh: '部署目标' },
    'deploy.noEnvs': { en: 'No environments configured', vi: 'Chưa cấu hình môi trường', zh: '未配置环境' },
    'deploy.terminal': { en: 'TERMINAL OUTPUT', vi: 'ĐẦU RA TERMINAL', zh: '终端输出' },
    'deploy.ready': { en: 'Ready for deployment...', vi: 'Sẵn sàng triển khai...', zh: '准备部署...' },
    'deploy.planTitle': { en: 'Deployment Plan', vi: 'Kế hoạch triển khai', zh: '部署计划' },
    'deploy.confirm': { en: 'Confirm Deploy', vi: 'Xác nhận triển khai', zh: '确认部署' },
    'deploy.cancel': { en: 'Cancel', vi: 'Hủy', zh: '取消' },

    // Config Form
    'config.projectName': { en: 'Project Name', vi: 'Tên dự án', zh: '项目名称' },
    'config.repoPath': { en: 'Repository Path (Absolute)', vi: 'Đường dẫn kho lưu trữ (tuyệt đối)', zh: '仓库路径（绝对路径）' },
    'config.environments': { en: 'Deployment Environments', vi: 'Môi trường triển khai', zh: '部署环境' },
    'config.addEnv': { en: 'Add Env', vi: 'Thêm MT', zh: '添加环境' },
    'config.envName': { en: 'Env Name', vi: 'Tên MT', zh: '环境名' },
    'config.tagFormat': { en: 'Tag Format', vi: 'Định dạng tag', zh: '标签格式' },
    'config.noEnvs': { en: 'No environments added yet.', vi: 'Chưa thêm môi trường nào.', zh: '暂未添加环境。' },
    'config.delete': { en: 'Delete Project', vi: 'Xóa dự án', zh: '删除项目' },
    'config.save': { en: 'Save Configuration', vi: 'Lưu cấu hình', zh: '保存配置' },
    'config.browse': { en: 'Browse Folder', vi: 'Chọn thư mục', zh: '选择文件夹' },

    // Messages
    'msg.switchedTo': { en: 'Switched to', vi: 'Đã chuyển sang', zh: '已切换到' },
    'msg.pullSuccess': { en: 'Pull successful', vi: 'Kéo về thành công', zh: '拉取成功' },
    'msg.pushSuccess': { en: 'Push successful', vi: 'Đẩy lên thành công', zh: '推送成功' },
    'msg.stashSuccess': { en: 'Changes stashed successfully', vi: 'Đã lưu tạm thay đổi', zh: '更改已暂存' },
    'msg.stashPopSuccess': { en: 'Stash popped successfully', vi: 'Đã khôi phục thay đổi', zh: '暂存已恢复' },
    'msg.copied': { en: 'Copied', vi: 'Đã sao chép', zh: '已复制' },
    'msg.deleted': { en: 'Deleted branch', vi: 'Đã xóa nhánh', zh: '已删除分支' },
    'msg.created': { en: 'Created branch', vi: 'Đã tạo nhánh', zh: '已创建分支' },
    'msg.deployTriggered': { en: 'Deploy triggered', vi: 'Đã kích hoạt triển khai', zh: '已触发部署' },
    'msg.checkTerminal': { en: 'Check Terminal Output →', vi: 'Kiểm tra đầu ra Terminal →', zh: '查看终端输出 →' },

    // Errors
    'err.cannotCheckout': { en: 'Cannot checkout: uncommitted changes. Commit or stash first.', vi: 'Không thể chuyển nhánh: có thay đổi chưa commit. Hãy commit hoặc lưu tạm trước.', zh: '无法切换：有未提交的更改。请先提交或暂存。' },
    'err.cannotMergeSelf': { en: 'Cannot merge a branch into itself', vi: 'Không thể gộp nhánh vào chính nó', zh: '无法将分支合并到自身' },
    'err.cannotMergeDirty': { en: 'Cannot merge: uncommitted changes. Commit or stash first.', vi: 'Không thể gộp: có thay đổi chưa commit. Hãy commit hoặc lưu tạm trước.', zh: '无法合并：有未提交的更改。请先提交或暂存。' },
    'err.cannotDeleteCurrent': { en: 'Cannot delete the current branch', vi: 'Không thể xóa nhánh hiện tại', zh: '无法删除当前分支' },
    'err.cannotDeploy': { en: 'Cannot deploy: uncommitted changes. Commit or stash first.', vi: 'Không thể triển khai: có thay đổi chưa commit. Hãy commit hoặc lưu tạm trước.', zh: '无法部署：有未提交的更改。请先提交或暂存。' },
    'err.branchEmpty': { en: 'Branch name cannot be empty', vi: 'Tên nhánh không được để trống', zh: '分支名不能为空' },

    // Config - Deploy
    'config.deploySettings': { en: 'Deploy Settings', vi: 'Cấu hình Deploy', zh: '部署设置' },
    'config.autoConfirmHint': { en: 'Skip plan preview and deploy immediately', vi: 'Bỏ qua xem trước kế hoạch và deploy ngay', zh: '跳过计划预览并立即部署' },

    // Terminal Bar
    'terminal.title': { en: 'Terminal', vi: 'Terminal', zh: '终端' },
    'terminal.clear': { en: 'Clear', vi: 'Xóa', zh: '清除' },
    'terminal.copy': { en: 'Copy All', vi: 'Sao chép tất cả', zh: '复制全部' },
    'terminal.pin': { en: 'Pin Terminal', vi: 'Ghim Terminal', zh: '固定终端' },
    'terminal.unpin': { en: 'Unpin Terminal', vi: 'Bỏ ghim Terminal', zh: '取消固定终端' },

    // Commit Panel
    'commits.title': { en: 'Commits', vi: 'Lịch sử Commit', zh: '提交历史' },
    'commits.allBranches': { en: 'All Branches', vi: 'Tất cả nhánh', zh: '所有分支' },
    'commits.currentBranch': { en: 'Current Branch', vi: 'Nhánh hiện tại', zh: '当前分支' },
    'commits.noCommits': { en: 'No commits found', vi: 'Không tìm thấy commit nào', zh: '未找到提交' },
    'commits.loading': { en: 'Loading commits...', vi: 'Đang tải commit...', zh: '加载提交中...' },
    'commits.copyHash': { en: 'Copy full hash', vi: 'Sao chép hash đầy đủ', zh: '复制完整哈希' },
    'commits.searchPlaceholder': { en: 'Search commits...', vi: 'Tìm kiếm commit...', zh: '搜索提交...' },
    'commits.cherryPick': { en: 'Cherry-pick', vi: 'Cherry-pick', zh: 'Cherry-pick' },
    'commits.cherryPickConfirm': { en: 'Cherry-pick this commit into current branch?', vi: 'Cherry-pick commit này vào nhánh hiện tại?', zh: '将此提交 Cherry-pick 到当前分支？' },

    // Branch Protection
    'config.protectedBranches': { en: 'Protected Branches', vi: 'Nhánh được bảo vệ', zh: '受保护的分支' },
    'config.protectedHint': { en: 'Comma-separated branch names (e.g. main, prod)', vi: 'Tên nhánh cách nhau bởi dấu phẩy (vd: main, prod)', zh: '逗号分隔的分支名（如 main, prod）' },
    'git.protectedWarning': { en: 'This branch is protected!', vi: 'Nhánh này được bảo vệ!', zh: '此分支受保护！' },
    'git.protectedConfirm': { en: 'Are you sure you want to perform this action on a protected branch?', vi: 'Bạn có chắc muốn thực hiện hành động này trên nhánh được bảo vệ?', zh: '确定要在受保护的分支上执行此操作吗？' },

    // Stash Manager
    'stash.title': { en: 'Stashes', vi: 'Lưu tạm', zh: '暂存' },
    'stash.apply': { en: 'Apply', vi: 'Áp dụng', zh: '应用' },
    'stash.drop': { en: 'Drop', vi: 'Xóa', zh: '丢弃' },
    'stash.pop': { en: 'Pop', vi: 'Khôi phục', zh: '恢复' },
    'stash.empty': { en: 'No stashes', vi: 'Không có lưu tạm', zh: '无暂存' },
    'stash.confirmDrop': { en: 'Drop this stash entry?', vi: 'Xóa mục lưu tạm này?', zh: '丢弃此暂存条目？' },

    // Tag Manager
    'tags.title': { en: 'Tags', vi: 'Thẻ', zh: '标签' },
    'tags.create': { en: 'Create Tag', vi: 'Tạo thẻ', zh: '创建标签' },
    'tags.delete': { en: 'Delete Tag', vi: 'Xóa thẻ', zh: '删除标签' },
    'tags.deleteRemote': { en: 'Delete Tag (Remote)', vi: 'Xóa thẻ (Remote)', zh: '删除标签（远程）' },
    'tags.confirmDelete': { en: 'Delete this tag?', vi: 'Xóa thẻ này?', zh: '删除此标签？' },
    'tags.name': { en: 'Tag Name', vi: 'Tên thẻ', zh: '标签名' },
    'tags.message': { en: 'Message', vi: 'Tin nhắn', zh: '消息' },
    'tags.empty': { en: 'No tags found', vi: 'Không tìm thấy thẻ', zh: '未找到标签' },
    'tags.filter': { en: 'Filter tags...', vi: 'Lọc thẻ...', zh: '筛选标签...' },

    // Auto-fetch
    'config.autoFetch': { en: 'Auto-fetch (minutes)', vi: 'Tự động fetch (phút)', zh: '自动拉取（分钟）' },
    'config.notifications': { en: 'Desktop Notifications', vi: 'Thông báo Desktop', zh: '桌面通知' },
    'notify.newCommits': { en: 'New commits available', vi: 'Có commit mới', zh: '有新提交' },

    // Deploy History
    'history.title': { en: 'Deploy History', vi: 'Lịch sử Deploy', zh: '部署历史' },
    'history.empty': { en: 'No deployments yet', vi: 'Chưa có lần deploy nào', zh: '暂无部署记录' },
    'history.clear': { en: 'Clear History', vi: 'Xóa lịch sử', zh: '清除历史' },

    // Env Dashboard
    'env.dashboard': { en: 'Environment Status', vi: 'Trạng thái môi trường', zh: '环境状态' },
    'env.currentTag': { en: 'Current Tag', vi: 'Tag hiện tại', zh: '当前标签' },
    'env.behind': { en: 'behind', vi: 'đi sau', zh: '落后' },
    'env.upToDate': { en: 'Up to date', vi: 'Đã cập nhật', zh: '已是最新' },
    'env.outdated': { en: 'Outdated', vi: 'Lỗi thời', zh: '已过期' },

    // Quick Commit
    'commit.stage': { en: 'Stage', vi: 'Thêm vào', zh: '暂存' },
    'commit.unstage': { en: 'Unstage', vi: 'Bỏ ra', zh: '取消暂存' },
    'commit.stageAll': { en: 'Stage All', vi: 'Thêm tất cả', zh: '全部暂存' },
    'commit.unstageAll': { en: 'Unstage All', vi: 'Bỏ tất cả', zh: '全部取消' },
    'commit.message': { en: 'Commit Message', vi: 'Nội dung Commit', zh: '提交消息' },
    'commit.button': { en: 'Commit', vi: 'Commit', zh: '提交' },
    'commit.discard': { en: 'Discard Changes', vi: 'Hủy thay đổi', zh: '放弃更改' },
    'commit.discardAll': { en: 'Discard All', vi: 'Hủy tất cả', zh: '全部放弃' },
    'commit.discardConfirm': { en: 'Discard changes to this file? This cannot be undone!', vi: 'Hủy thay đổi file này? Không thể hoàn tác!', zh: '放弃对此文件的更改？此操作不可撤销！' },
    'commit.discardAllConfirm': { en: 'Discard ALL changes? This cannot be undone!', vi: 'Hủy TẤT CẢ thay đổi? Không thể hoàn tác!', zh: '放弃所有更改？此操作不可撤销！' },

    // Diff Viewer
    'diff.title': { en: 'Changes', vi: 'Thay đổi', zh: '变更' },
    'diff.files': { en: 'Files', vi: 'Tệp', zh: '文件' },
    'diff.additions': { en: 'additions', vi: 'thêm', zh: '新增' },
    'diff.deletions': { en: 'deletions', vi: 'xóa', zh: '删除' },
    'diff.noChanges': { en: 'No changes', vi: 'Không có thay đổi', zh: '无变更' },

    // Worktree
    'worktree.title': { en: 'Worktrees', vi: 'Worktrees', zh: '工作树' },
    'worktree.empty': { en: 'No linked worktrees', vi: 'Không có worktree liên kết', zh: '无链接工作树' },
    'worktree.openExplorer': { en: 'Open in Explorer', vi: 'Mở trong Explorer', zh: '在资源管理器中打开' },
    'worktree.openVscode': { en: 'Open in VS Code', vi: 'Mở trong VS Code', zh: '在 VS Code 中打开' },
    'worktree.remove': { en: 'Remove Worktree', vi: 'Xóa Worktree', zh: '移除工作树' },
    'worktree.confirmRemove': { en: 'Remove this worktree? The directory will be deleted.', vi: 'Xóa worktree này? Thư mục sẽ bị xóa.', zh: '移除此工作树？目录将被删除。' },
    'worktree.openParallel': { en: 'Open in Parallel', vi: 'Mở song song', zh: '并行打开' },
    'worktree.alreadyOpen': { en: 'Already open as worktree', vi: 'Đã mở trong worktree', zh: '已作为工作树打开' },
    'worktree.main': { en: 'Main Worktree', vi: 'Worktree chính', zh: '主工作树' },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, locale: Locale): string {
    return translations[key]?.[locale] || translations[key]?.en || key;
}

export default translations;
