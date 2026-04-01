export type Locale = 'en' | 'vi' | 'zh';

export const LOCALE_LABELS: Record<Locale, string> = {
    en: 'English',
    vi: 'Tiếng Việt',
    zh: '中文',
};

const translations = {
    // Common
    'common.warning': { en: 'Warning', vi: 'Cảnh báo', zh: '警告' },
    'common.cancel': { en: 'Cancel', vi: 'Hủy', zh: '取消' },
    'common.confirm': { en: 'Confirm', vi: 'Xác nhận', zh: '确认' },

    // Navigation
    'nav.git': { en: 'Git', vi: 'Git', zh: 'Git' },
    'nav.performance': { en: 'Performance', vi: 'Hiệu suất', zh: '性能' },

    // App Header
    'app.selectProject': { en: 'Select Project', vi: 'Chọn dự án', zh: '选择项目' },
    'app.projects': { en: 'Projects', vi: 'Dự án', zh: '项目' },
    'app.noProjects': { en: 'No projects configured.', vi: 'Chưa có dự án nào.', zh: '暂无项目。' },
    'app.newProject': { en: 'New Project', vi: 'Dự án mới', zh: '新建项目' },
    'app.projectSettings': { en: 'Project Settings', vi: 'Cài đặt dự án', zh: '项目设置' },
    'app.goHome': { en: 'Go to Home Screen', vi: 'Đi đến màn hình chính', zh: '前往主屏幕' },
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
    'git.globalActions': { en: 'Global Actions', vi: 'Hành động chung', zh: '全局操作' },

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
    'config.envName': { en: 'Branch Name', vi: 'Tên nhánh (Branch)', zh: '分支名' },
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
    'diff.changesOnly': { en: 'Changes', vi: 'Thay đổi', zh: '变更' },
    'diff.fullFile': { en: 'Full File', vi: 'Đầy đủ', zh: '完整文件' },

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

    // Performance Tab
    'perf.overview': { en: 'Overview', vi: 'Tổng quan', zh: '概览' },
    'perf.alertsTeam': { en: 'Alerts & Team', vi: 'Cảnh báo & Đội', zh: '警报和团队' },
    'perf.activity': { en: 'Activity', vi: 'Hoạt động', zh: '活动' },
    'perf.branches': { en: 'Branches', vi: 'Nhánh', zh: '分支' },
    'perf.last7days': { en: 'Last 7 Days', vi: '7 ngày qua', zh: '最近7天' },
    'perf.thisMonth': { en: 'This Month', vi: 'Tháng này', zh: '本月' },
    'perf.thisQuarter': { en: 'This Quarter', vi: 'Quý này', zh: '本季度' },
    'perf.thisYear': { en: 'This Year', vi: 'Năm nay', zh: '今年' },
    'perf.all': { en: 'All', vi: 'Tất cả', zh: '全部' },
    'perf.loading': { en: 'Loading...', vi: 'Đang tải...', zh: '加载中...' },
    'perf.commits': { en: 'Commits', vi: 'Commits', zh: '提交' },
    'perf.linesAdded': { en: 'Lines Added', vi: 'Dòng thêm', zh: '新增行' },
    'perf.contributors': { en: 'Contributors', vi: 'Thành viên', zh: '贡献者' },
    'perf.avgDay': { en: 'Avg/Day', vi: 'TB/Ngày', zh: '日均' },
    'perf.codeHotspots': { en: 'Code Hotspots', vi: 'Điểm nóng mã nguồn', zh: '代码热点' },
    'perf.commitSizes': { en: 'Commit Sizes', vi: 'Kích thước Commit', zh: '提交大小' },
    'perf.smallCommit': { en: 'Small (<50 lines)', vi: 'Nhỏ (<50 dòng)', zh: '小型（<50行）' },
    'perf.mediumCommit': { en: 'Medium (50-200)', vi: 'Vừa (50-200)', zh: '中型（50-200）' },
    'perf.largeCommit': { en: 'Large (200+)', vi: 'Lớn (200+)', zh: '大型（200+）' },
    'perf.commitsAnalyzed': { en: 'commits analyzed', vi: 'commits đã phân tích', zh: '已分析的提交' },
    'perf.noHotspots': { en: 'No hotspots detected', vi: 'Không phát hiện điểm nóng', zh: '未检测到热点' },
    'perf.alerts': { en: 'Alerts', vi: 'Cảnh báo', zh: '警报' },
    'perf.leaderboard': { en: 'Leaderboard', vi: 'Bảng xếp hạng', zh: '排行榜' },
    'perf.member': { en: 'Member', vi: 'Thành viên', zh: '成员' },
    'perf.linesPlus': { en: 'Lines +', vi: 'Dòng +', zh: '增行' },
    'perf.linesMinus': { en: 'Lines −', vi: 'Dòng −', zh: '减行' },
    'perf.files': { en: 'Files', vi: 'Tệp', zh: '文件' },
    'perf.activeDays': { en: 'Active Days', vi: 'Ngày hoạt động', zh: '活跃天数' },
    'perf.avgSize': { en: 'Avg Size', vi: 'TB kích thước', zh: '平均大小' },
    'perf.commitActivity': { en: 'Commit Activity', vi: 'Hoạt động Commit', zh: '提交活动' },
    'perf.activeHours': { en: 'Active Hours', vi: 'Giờ hoạt động', zh: '活跃时段' },
    'perf.working': { en: 'Working', vi: 'Làm việc', zh: '工作时间' },
    'perf.offPeak': { en: 'Off-peak', vi: 'Thấp điểm', zh: '非高峰' },
    'perf.overtime': { en: 'Overtime', vi: 'Ngoài giờ', zh: '加班' },
    'perf.focusScore': { en: 'Focus Score', vi: 'Điểm tập trung', zh: '专注度评分' },
    'perf.branchLifecycle': { en: 'Branch Lifecycle', vi: 'Vòng đời nhánh', zh: '分支生命周期' },
    'perf.noBranches': { en: 'No branches', vi: 'Không có nhánh', zh: '无分支' },
    'perf.noData': { en: 'No data', vi: 'Không có dữ liệu', zh: '无数据' },
    'perf.merged': { en: 'merged', vi: 'đã gộp', zh: '已合并' },
    'perf.open': { en: 'open', vi: 'đang mở', zh: '开放' },
    'perf.less': { en: 'Less', vi: 'Ít', zh: '少' },
    'perf.more': { en: 'More', vi: 'Nhiều', zh: '多' },
    'perf.commitsAt': { en: 'commits at', vi: 'commits lúc', zh: '提交于' },
    'perf.descOverview': { en: 'Overview of team productivity: total commits, code volume, active contributors, and average daily commit frequency.', vi: 'Tổng quan năng suất đội: tổng commits, khối lượng code, thành viên hoạt động, và tần suất commit trung bình/ngày.', zh: '团队生产力概览：总提交数、代码量、活跃贡献者和每日平均提交频率。' },
    'perf.descHotspots': { en: 'Files modified most frequently — high churn may indicate unstable code or areas needing refactoring.', vi: 'Các tệp bị sửa đổi thường xuyên nhất — tần suất cao có thể là dấu hiệu code không ổn định hoặc cần refactor.', zh: '修改最频繁的文件 — 高频率可能表示代码不稳定或需要重构。' },
    'perf.descCommitSizes': { en: 'Commit size distribution — smaller commits are easier to review and reduce merge conflicts.', vi: 'Phân bổ kích thước commit — commit nhỏ dễ review hơn và giảm xung đột khi merge.', zh: '提交大小分布 — 较小的提交更容易审查并减少合并冲突。' },
    'perf.descAlerts': { en: 'Automated alerts detecting potential issues: inactive members, overtime work, unusually large commits, high code churn, and stale branches.', vi: 'Cảnh báo tự động phát hiện vấn đề tiềm ẩn: thành viên không hoạt động, làm việc ngoài giờ, commit quá lớn, code thay đổi nhiều, và nhánh cũ.', zh: '自动警报检测潜在问题：不活跃成员、加班、异常大的提交、高代码变动率和过期分支。' },
    'perf.descLeaderboard': { en: 'Ranking of contributors by commit count, code volume, and activity. Helps identify top performers and workload distribution across the team.', vi: 'Xếp hạng thành viên theo số lượng commit, khối lượng code, và mức độ hoạt động. Giúp xác định người đóng góp nhiều nhất và phân bổ khối lượng công việc.', zh: '按提交数量、代码量和活跃度排名。帮助识别顶级贡献者和团队工作量分配。' },
    'perf.descHeatmap': { en: 'GitHub-style contribution graph showing daily commit activity over the past year. Darker cells indicate higher activity.', vi: 'Biểu đồ đóng góp kiểu GitHub hiển thị hoạt động commit hàng ngày trong năm qua. Ô đậm hơn = hoạt động cao hơn.', zh: 'GitHub风格贡献图，显示过去一年的每日提交活动。颜色越深表示活动越多。' },
    'perf.descActiveHours': { en: 'Distribution of commits by hour of day. Blue = working hours (9-18h), gray = off-peak, red = overtime (22-6h). Helps monitor work-life balance.', vi: 'Phân bổ commit theo giờ trong ngày. Xanh = giờ làm việc (9-18h), xám = thấp điểm, đỏ = ngoài giờ (22-6h). Giúp theo dõi cân bằng công việc.', zh: '按小时分布的提交。蓝色=工作时间(9-18h)，灰色=非高峰，红色=加班(22-6h)。帮助监控工作生活平衡。' },
    'perf.descFocusScore': { en: 'Measures how focused each contributor is. Fewer active (unmerged) branches = higher focus. Score 8-10 is ideal, below 5 may indicate context-switching.', vi: 'Đo mức độ tập trung của từng thành viên. Ít nhánh đang mở = tập trung cao hơn. Điểm 8-10 lý tưởng, dưới 5 có thể do chuyển đổi ngữ cảnh nhiều.', zh: '衡量每位贡献者的专注程度。较少未合并分支=更高专注度。8-10分理想，低于5可能表示频繁切换工作。' },
    'perf.descBranchLifecycle': { en: 'Overview of branch age, commit count, and merge status. Identify stale or long-lived branches that may need attention.', vi: 'Tổng quan tuổi nhánh, số commit, và trạng thái merge. Xác định nhánh cũ hoặc tồn tại lâu cần được xử lý.', zh: '分支年龄、提交数和合并状态概览。识别可能需要关注的过期或长期存在的分支。' },

    // Navigation — Team
    'nav.team': { en: 'Team', vi: 'Nhóm', zh: '团队' },

    // Team Dashboard
    'team.title': { en: 'Team Dashboard', vi: 'Bảng điều khiển nhóm', zh: '团队仪表板' },
    'team.allMembers': { en: 'All Members', vi: 'Tất cả thành viên', zh: '所有成员' },
    'team.members': { en: 'Members', vi: 'Thành viên', zh: '成员' },
    'team.totalCommits': { en: 'Total Commits', vi: 'Tổng commit', zh: '总提交' },
    'team.avgPerMember': { en: 'Avg / Member', vi: 'TB / Thành viên', zh: '每人平均' },
    'team.topContributor': { en: 'Top Contributor', vi: 'Đóng góp nhiều nhất', zh: '最佳贡献者' },
    'team.tabOverview': { en: 'Overview', vi: 'Tổng quan', zh: '概览' },
    'team.tabTimeline': { en: 'Timeline', vi: 'Dòng thời gian', zh: '时间线' },
    'team.contributions': { en: 'Contributions', vi: 'Đóng góp', zh: '贡献' },
    'team.memberDetails': { en: 'Member Details', vi: 'Chi tiết thành viên', zh: '成员详情' },
    'team.name': { en: 'Name', vi: 'Tên', zh: '姓名' },
    'team.commits': { en: 'Commits', vi: 'Commits', zh: '提交' },
    'team.linesAdded': { en: 'Lines Added', vi: 'Dòng thêm', zh: '添加行' },
    'team.linesRemoved': { en: 'Lines Removed', vi: 'Dòng xoá', zh: '删除行' },
    'team.filesChanged': { en: 'Files Changed', vi: 'File thay đổi', zh: '文件更改' },
    'team.activeDays': { en: 'Active Days', vi: 'Ngày hoạt động', zh: '活跃天数' },
    'team.avgCommitSize': { en: 'Avg Size', vi: 'TB kích thước', zh: '平均大小' },
    'team.lastCommit': { en: 'Last Commit', vi: 'Commit cuối', zh: '最后提交' },
    'team.heatmap': { en: 'Commit Heatmap', vi: 'Biểu đồ nhiệt commit', zh: '提交热力图' },
    'team.less': { en: 'Less', vi: 'Ít', zh: '少' },
    'team.more': { en: 'More', vi: 'Nhiều', zh: '多' },
    'team.linesWritten': { en: 'Lines Written', vi: 'Dòng viết', zh: '编写行数' },
    'team.netContribution': { en: 'Net Contribution', vi: 'Đóng góp ròng', zh: '净贡献' },
    'team.netLines': { en: 'net lines of code', vi: 'dòng code ròng', zh: '净代码行' },
    'team.recentActivity': { en: 'Recent Activity', vi: 'Hoạt động gần đây', zh: '最近活动' },
    'team.noActivity': { en: 'No activity found for this period.', vi: 'Không có hoạt động trong thời gian này.', zh: '此期间未找到活动。' },

    // Conflict Resolver
    'conflict.title': { en: 'Conflict Resolver', vi: 'Giải quyết xung đột', zh: '冲突解决器' },
    'conflict.files': { en: 'Conflicted Files', vi: 'File xung đột', zh: '冲突文件' },
    'conflict.ours': { en: 'Ours (Current)', vi: 'Của mình (Hiện tại)', zh: '我方（当前）' },
    'conflict.theirs': { en: 'Theirs (Incoming)', vi: 'Của họ (Nhận vào)', zh: '他方（传入）' },
    'conflict.result': { en: 'Result', vi: 'Kết quả', zh: '结果' },
    'conflict.acceptOurs': { en: 'Accept Ours', vi: 'Chấp nhận Của mình', zh: '接受我方' },
    'conflict.acceptTheirs': { en: 'Accept Theirs', vi: 'Chấp nhận Của họ', zh: '接受他方' },
    'conflict.acceptBoth': { en: 'Accept Both', vi: 'Chấp nhận Cả hai', zh: '接受双方' },
    'conflict.resolve': { en: 'Mark as Resolved', vi: 'Đánh dấu đã giải quyết', zh: '标记为已解决' },
    'conflict.abortMerge': { en: 'Abort Merge', vi: 'Hủy Merge', zh: '中止合并' },
    'conflict.noConflicts': { en: 'No merge conflicts detected.', vi: 'Không phát hiện xung đột merge.', zh: '未检测到合并冲突。' },
    'conflict.resolveBtn': { en: 'Resolve Conflicts', vi: 'Giải quyết xung đột', zh: '解决冲突' },
    'conflict.mergeInProgress': { en: 'Merge in progress — conflicts detected', vi: 'Đang merge — phát hiện xung đột', zh: '合并进行中 — 检测到冲突' },
    'conflict.resolved': { en: 'Resolved', vi: 'Đã giải quyết', zh: '已解决' },
    'conflict.allResolved': { en: 'All conflicts resolved! You can now commit.', vi: 'Tất cả xung đột đã giải quyết! Bạn có thể commit.', zh: '所有冲突已解决！您现在可以提交。' },
    'conflict.saving': { en: 'Saving...', vi: 'Đang lưu...', zh: '保存中...' },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, locale: Locale): string {
    return translations[key]?.[locale] || translations[key]?.en || key;
}

export default translations;
