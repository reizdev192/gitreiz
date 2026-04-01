import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { invoke } from '@tauri-apps/api/core';
import { useProjectStore } from '../store/useProjectStore';
import { useI18n } from '../i18n/useI18n';
import { useConfirmStore } from '../store/useConfirmStore';
import { DeployPanel } from './DeployPanel';
import { StashPanel } from './StashPanel';
import { TagPanel } from './TagPanel';
import { QuickCommit } from './QuickCommit';
import { WorktreePanel } from './WorktreePanel';
import { ConflictResolver } from './ConflictResolver';
import { dispatchWebhook } from '../utils/webhookDispatcher';
import { useCustomActionsStore, type CustomAction } from '../store/useCustomActionsStore';
import { ActionConfirmDialog } from './ActionConfirmDialog';
import { GitBranch, AlertTriangle, CheckCircle, RefreshCw, Folder, ChevronRight, ChevronDown, Rocket, Copy, Tag, Trash2, GitBranchPlus, Archive, ArchiveRestore, ArrowUp, ArrowDown, Download, GitMerge, Upload, Shield, FolderGit2, Link as LinkIcon, Star, TerminalSquare } from 'lucide-react';

interface TreeNode {
    name: string;
    fullPath: string;
    isLeaf: boolean;
    children: Record<string, TreeNode>;
    isOpen: boolean;
}

interface BranchTagInfo { latest_tag: string; next_tag: string; }
interface BranchDetail { last_commit: string; ahead: number; behind: number; ahead_remote: number; behind_remote: number; }
interface ContextMenuState { x: number; y: number; branchName: string; branchFullPath: string; }

export function GitTab() {
    const projects = useProjectStore(s => s.projects);
    const selectedProjectId = useProjectStore(s => s.selectedProjectId);
    const triggerDeploy = useProjectStore(s => s.triggerDeploy);
    const appendLog = useProjectStore(s => s.appendLog);
    const openTerminalBar = useProjectStore(s => s.openTerminalBar);
    const bumpGitState = useProjectStore(s => s.bumpGitState);
    const toggleFavoriteBranch = useProjectStore(s => s.toggleFavoriteBranch);
    const { actions, loadActions } = useCustomActionsStore();
    const { t } = useI18n();
    const project = projects.find(p => p.id === selectedProjectId);

    const [currentBranch, setCurrentBranch] = useState('');
    const [isClean, setIsClean] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [checkoutMessage, setCheckoutMessage] = useState<{ text: string, isError: boolean } | null>(null);
    const [treeData, setTreeData] = useState<TreeNode | null>(null);
    const [tagMap, setTagMap] = useState<Record<string, BranchTagInfo>>({});
    const [detailMap, setDetailMap] = useState<Record<string, BranchDetail>>({});
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const [globalContextMenu, setGlobalContextMenu] = useState<{ x: number, y: number } | null>(null);
    const [promptState, setPromptState] = useState<{ type: string; branchFullPath: string; value: string } | null>(null);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; branch: string } | null>(null);
    const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [activeWorktrees, setActiveWorktrees] = useState<string[]>([]);
    const [isMergeConflict, setIsMergeConflict] = useState(false);
    const [showConflictResolver, setShowConflictResolver] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ action: CustomAction, renderedScript: string } | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => { loadActions(); }, [loadActions]);
    useEffect(() => { if (project) refreshGitState(); }, [project?.id]);
    useEffect(() => {
        const handler = () => { if (project) refreshGitState(); };
        window.addEventListener('force-git-refresh', handler);
        return () => window.removeEventListener('force-git-refresh', handler);
    }, [project?.id]);
    useEffect(() => {
        const handler = () => { setContextMenu(null); setGlobalContextMenu(null); };
        window.addEventListener('click', handler);
        return () => window.removeEventListener('click', handler);
    }, []);

    const refreshGitState = async () => {
        if (!project) return;
        setIsLoading(true);
        // Fetch active worktrees for indicator
        try {
            const wts: { branch: string }[] = await invoke('list_worktrees_cmd', { repoPath: project.path });
            setActiveWorktrees(wts.filter((_, i) => i > 0).map(w => w.branch));
        } catch { setActiveWorktrees([]); }
        setCheckoutMessage(null);
        try {
            const [rawBranches, current, clean, tags] = await Promise.all([
                invoke<string[]>('list_branches_cmd', { repoPath: project.path }),
                invoke<string>('get_current_branch_cmd', { repoPath: project.path }),
                invoke<boolean>('check_uncommitted_cmd', { repoPath: project.path }),
                invoke<Record<string, BranchTagInfo>>('get_branch_tags_cmd', { project }),
            ]);
            setCurrentBranch(current);
            setIsClean(clean);
            setTreeData(buildTree(rawBranches));
            setTagMap(tags);

            // Fetch branch details (last commit + ahead/behind) — non-blocking
            const localBranches = rawBranches.filter(b => !b.startsWith('origin/'));
            invoke<Record<string, BranchDetail>>('get_branch_details_cmd', {
                repoPath: project.path, branches: localBranches, currentBranch: current
            }).then(setDetailMap).catch(() => { });

            // Check merge/conflict state — non-blocking
            invoke<boolean>('check_merge_state_cmd', { repoPath: project.path })
                .then(setIsMergeConflict).catch(() => setIsMergeConflict(false));
        } catch (error) {
            console.error("Failed to refresh git state", error);
        } finally {
            setIsLoading(false);
            bumpGitState();
        }
    };

    const buildTree = (branchList: string[]): TreeNode => {
        const root: TreeNode = { name: 'root', fullPath: '', isLeaf: false, children: {}, isOpen: true };
        for (const fullPath of branchList) {
            const parts = fullPath.replace('remotes/', '').split('/');
            let current = root;
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const isLeaf = i === parts.length - 1;
                if (!current.children[part]) {
                    current.children[part] = { name: part, fullPath: isLeaf ? fullPath : '', isLeaf, children: {}, isOpen: false };
                }
                current = current.children[part];
            }
        }
        return root;
    };

    const toggleNode = (node: TreeNode) => {
        node.isOpen = !node.isOpen;
        setTreeData(treeData ? { ...treeData } : null);
    };

    const clean = (branch: string) => {
        if (branch.startsWith('remotes/origin/')) return branch.replace('remotes/origin/', '');
        if (branch.startsWith('origin/')) return branch.replace('origin/', '');
        return branch;
    };

    const isProtected = (branch: string) => {
        const pb = project?.protectedBranches || [];
        const cleaned = clean(branch);
        return pb.some(p => cleaned === p || cleaned.endsWith('/' + p));
    };

    const showMsg = (text: string, isError = false) => {
        setCheckoutMessage({ text, isError });
        if (!isError) setTimeout(() => setCheckoutMessage(null), 4000);
    };

    const handleCheckout = async (branch: string) => {
        if (!project) return;
        if (!isClean) { showMsg(t('err.cannotCheckout'), true); return; }
        setIsLoading(true);
        try {
            await invoke('checkout_branch_cmd', { repoPath: project.path, branch: clean(branch) });
            showMsg(`Switched to "${clean(branch)}"`);
            await refreshGitState();
        } catch (e: any) {
            const err = String(e);
            if (err.includes('already used by worktree')) {
                // Branch has active worktree — offer to remove it first
                if (await useConfirmStore.getState().confirm({ title: t('common.warning'), message: `Branch "${clean(branch)}" has an active worktree.\nRemove worktree and checkout?` })) {
                    try {
                        // Find the worktree path from the error or from listing
                        const wts: { path: string; branch: string }[] = await invoke('list_worktrees_cmd', { repoPath: project.path });
                        const wt = wts.find(w => w.branch === clean(branch));
                        if (wt) {
                            await invoke<string>('worktree_remove_cmd', { repoPath: project.path, worktreePath: wt.path });
                            appendLog(`Removed worktree: ${wt.path}\n`);
                        }
                        await invoke('checkout_branch_cmd', { repoPath: project.path, branch: clean(branch) });
                        showMsg(`Switched to "${clean(branch)}"`);
                        await refreshGitState();
                        return;
                    } catch (e2: any) { showMsg(`Checkout failed: ${e2}`, true); }
                }
                setIsLoading(false);
            } else {
                showMsg(`Checkout failed: ${err}`, true);
                setIsLoading(false);
            }
        }
    };

    const handleQuickDeploy = async (branchFullPath: string) => {
        if (!project) return;
        const targetEnv = clean(branchFullPath);
        if (!project.environments.find(e => e.name === targetEnv)) return;

        if (currentBranch !== targetEnv) {
            if (!isClean) { showMsg(t('err.cannotDeploy'), true); return; }
            setIsLoading(true);
            try {
                await invoke('checkout_branch_cmd', { repoPath: project.path, branch: targetEnv });
                setCurrentBranch(targetEnv);
                await refreshGitState();
            } catch (e: any) { showMsg(`Failed to switch: ${e}`, true); setIsLoading(false); return; }
        }
        triggerDeploy(targetEnv);
        showMsg(`Deploy triggered → "${targetEnv}". Check Terminal Output →`);
        setIsLoading(false);
    };

    const handleStash = async () => {
        if (!project) return;
        setIsLoading(true);
        appendLog(`[GIT] Stashing changes...\n`);
        try {
            const result = await invoke<string>('stash_cmd', { repoPath: project.path });
            appendLog(`[GIT] ${result || 'Changes stashed successfully'}\n`);
            showMsg(t('msg.stashSuccess'));
            await refreshGitState();
        } catch (e: any) { appendLog(`[ERROR] Stash failed: ${e}\n`); showMsg(`Stash failed: ${e}`, true); setIsLoading(false); }
    };

    const handleStashPop = async () => {
        if (!project) return;
        setIsLoading(true);
        appendLog(`[GIT] Popping stash...\n`);
        try {
            const result = await invoke<string>('stash_pop_cmd', { repoPath: project.path });
            appendLog(`[GIT] ${result || 'Stash popped successfully'}\n`);
            showMsg(t('msg.stashPopSuccess'));
            await refreshGitState();
        } catch (e: any) { appendLog(`[ERROR] Stash pop failed: ${e}\n`); showMsg(`Stash pop failed: ${e}`, true); setIsLoading(false); }
    };

    const handleDeleteBranch = async (branch: string) => {
        if (!project) return;
        const branchName = clean(branch);
        if (branchName === currentBranch) { showMsg(t('err.cannotDeleteCurrent'), true); return; }
        if (isProtected(branch)) {
            const protectedOk = await useConfirmStore.getState().confirm({ title: `⚠️ ${t('git.protectedWarning')}`, message: `"${branchName}" ${t('git.protectedConfirm')}` });
            if (!protectedOk) return;
        }
        const confirmed = await useConfirmStore.getState().confirm({ title: t('common.warning'), message: `Delete local branch "${branchName}"?\n\nThis will run: git branch -d ${branchName}` });
        if (!confirmed) return;
        setIsLoading(true);
        try {
            await invoke<string>('delete_branch_cmd', { repoPath: project.path, branch: branchName });
            showMsg(`Deleted branch "${branchName}"`);
            await refreshGitState();
        } catch (e: any) { showMsg(`Delete failed: ${e}`, true); setIsLoading(false); }
    };

    const handleCreateBranch = async (fromBranch: string) => {
        setPromptState({ type: 'create', branchFullPath: fromBranch, value: '' });
    };

    const submitCreateBranch = async () => {
        if (!project || !promptState) return;
        const newName = promptState.value.trim();
        if (!newName) { showMsg(t('err.branchEmpty'), true); return; }
        setIsLoading(true);
        setPromptState(null);
        try {
            await invoke<string>('create_branch_cmd', { repoPath: project.path, newBranch: newName, fromRef: clean(promptState.branchFullPath) });
            dispatchWebhook(project, 'create_branch', { branch: newName, details: `Created from ${clean(promptState.branchFullPath)}` });
            showMsg(`Created branch "${newName}" from "${clean(promptState.branchFullPath)}"`);
            await refreshGitState();
        } catch (e: any) { showMsg(`Create failed: ${e}`, true); setIsLoading(false); }
    };

    const handleOpenWorktree = async (branch: string) => {
        if (!project) return;
        setContextMenu(null);
        setIsLoading(true);
        try {
            const path = await invoke<string>('worktree_add_cmd', { repoPath: project.path, branch });
            showMsg(`Worktree created at: ${path}`);
            await refreshGitState();
        } catch (e: any) { showMsg(`Worktree failed: ${e}`, true); setIsLoading(false); }
    };

    const handleCopyBranch = useCallback((branch: string) => {
        navigator.clipboard.writeText(clean(branch));
        showMsg(`Copied "${clean(branch)}"`);
    }, []);

    const handlePull = async () => {
        if (!project) return;
        setIsLoading(true);
        appendLog(`[GIT] Pulling "${currentBranch}"...\n`);
        try {
            const result = await invoke<string>('pull_cmd', { repoPath: project.path });
            appendLog(`[GIT] ${result || 'Already up to date.'}\n`);
            showMsg(result || 'Pull successful');
            await refreshGitState();
        } catch (e: any) { appendLog(`[ERROR] Pull failed: ${e}\n`); showMsg(`Pull failed: ${e}`, true); setIsLoading(false); }
    };

    const handleFetchBranch = async (branch: string) => {
        if (!project) return;
        const branchName = clean(branch);
        setIsLoading(true);
        appendLog(`[GIT] Fetching "${branchName}" from remote...\n`);
        try {
            const result = await invoke<string>('fetch_branch_cmd', { repoPath: project.path, branch: branchName });
            appendLog(`[GIT] ${result || `Fetched "${branchName}" successfully`}\n`);
            showMsg(result || `Fetched "${branchName}"`);
            await refreshGitState();
        } catch (e: any) { appendLog(`[ERROR] Fetch failed: ${e}\n`); showMsg(`Fetch failed: ${e}`, true); setIsLoading(false); }
    };

    const handleMerge = async (branch: string) => {
        if (!project) return;
        const branchName = clean(branch);
        if (branchName === currentBranch) { showMsg(t('err.cannotMergeSelf'), true); return; }
        if (!isClean) { showMsg(t('err.cannotMergeDirty'), true); return; }
        const confirmed = await useConfirmStore.getState().confirm({ title: t('common.warning'), message: `Merge "${branchName}" into "${currentBranch}"?\n\nThis will run: git merge ${branchName} --no-edit` });
        if (!confirmed) return;
        setIsLoading(true);
        appendLog(`[GIT] Merging "${branchName}" into "${currentBranch}"...\n`);
        try {
            const result = await invoke<string>('merge_cmd', { repoPath: project.path, fromBranch: branchName });
            dispatchWebhook(project, 'merge', { branch: currentBranch, details: `Merged ${branchName} into ${currentBranch}` });
            appendLog(`[GIT] ${result || `Merged "${branchName}" into "${currentBranch}"`}\n`);
            showMsg(result || `Merged "${branchName}" into "${currentBranch}"`);
            await refreshGitState();
        } catch (e: any) { appendLog(`[ERROR] Merge failed: ${e}\n`); showMsg(`Merge failed: ${e}`, true); setIsLoading(false); }
    };

    const handlePush = async () => {
        if (!project) return;
        const confirmed = await useConfirmStore.getState().confirm({ title: t('common.warning'), message: `Push "${currentBranch}" to remote?\n\nThis will run:\n  git push\n  git push --tags` });
        if (!confirmed) return;
        setIsLoading(true);
        appendLog(`[GIT] Pushing "${currentBranch}"...\n`);
        try {
            const result = await invoke<string>('push_cmd', { repoPath: project.path });
            dispatchWebhook(project, 'push', { branch: currentBranch });
            appendLog(`[GIT] ${result || 'Push successful'}\n`);
            showMsg(result || 'Push successful');
            await refreshGitState();
        } catch (e: any) { appendLog(`[ERROR] Push failed: ${e}\n`); showMsg(`Push failed: ${e}`, true); setIsLoading(false); }
    };

    const handleExecuteCustomAction = async () => {
        if (!pendingAction || !project) return;
        const toRun = pendingAction;
        setPendingAction(null);
        setIsLoading(true);
        appendLog(`[GIT] Executing custom action: ${toRun.action.name}\n`);
        openTerminalBar();
        try {
            const result = await invoke<string>('execute_custom_action', { cwd: project.path, script: toRun.renderedScript });
            appendLog(`[GIT] ${result}\n`);
            showMsg(`Executed: ${toRun.action.name}`);
            await refreshGitState();
        } catch (e: any) {
            appendLog(`[ERROR] Action failed: ${e}\n`);
            showMsg(`Action failed: ${e}`, true);
            setIsLoading(false);
        }
    };

    const handleContextMenu = (e: React.MouseEvent, node: TreeNode) => {
        if (!node.isLeaf) return;
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, branchName: node.name, branchFullPath: node.fullPath });
    };

    const handleWorkspaceContextMenu = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            e.preventDefault();
            setGlobalContextMenu({ x: e.clientX, y: e.clientY });
        }
    };

    const renderTree = (node: TreeNode, depth: number = 0): React.ReactNode => {
        let children = Object.values(node.children);
        const favs = project?.favoriteBranches || [];
        
        // Sort: favorites first -> folders -> alphabetically
        children.sort((a, b) => {
            const aFav = a.isLeaf ? (favs.includes(clean(a.fullPath)) ? 1 : 0) : 0;
            const bFav = b.isLeaf ? (favs.includes(clean(b.fullPath)) ? 1 : 0) : 0;
            if (aFav !== bFav) return bFav - aFav;
            if (a.isLeaf !== b.isLeaf) return a.isLeaf ? 1 : -1;
            return a.name.localeCompare(b.name);
        });

        if (node.name === 'root') return children.map(child => renderTree(child, depth));

        const indent = depth * 16;
        const isCurrent = node.fullPath === currentBranch || node.fullPath.endsWith(`/${currentBranch}`);

        if (node.isLeaf) {
            const branchClean = clean(node.fullPath);
            const tagInfo = tagMap[branchClean];
            const detail = detailMap[branchClean];
            const isEnvBranch = !!project?.environments.find(e => e.name === branchClean);
            const isRemote = node.fullPath.startsWith('origin/');
            const hasRemoteSync = detail && !isRemote && (detail.ahead_remote > 0 || detail.behind_remote > 0);

            const showTooltip = (e: React.MouseEvent) => {
                if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
                tooltipTimeoutRef.current = setTimeout(() => {
                    setTooltip({ x: e.clientX, y: e.clientY, branch: branchClean });
                }, 400);
            };
            const hideTooltip = () => {
                if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
                setTooltip(null);
            };

            return (
                <div key={node.fullPath} className="group rounded-md cursor-pointer transition-colors" style={{ marginBottom: '1px' }}
                    onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; showTooltip(e); }}
                    onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.backgroundColor = isCurrent ? 'var(--accent-muted)' : 'transparent'; hideTooltip(); }}
                    onContextMenu={e => handleContextMenu(e, node)}
                >
                    <div className="flex items-center" style={{ paddingLeft: `${12 + indent}px`, paddingRight: '8px', paddingTop: '5px', paddingBottom: '5px', backgroundColor: isCurrent ? 'var(--accent-muted)' : 'transparent', borderRadius: '6px' }}>
                        <GitBranch className="w-3.5 h-3.5 shrink-0" style={{ color: isCurrent ? 'var(--text-accent)' : 'var(--text-muted)', marginRight: '8px' }} />
                        {isProtected(node.fullPath) && (
                            <Shield className="w-3 h-3 shrink-0" style={{ color: '#f59e0b', marginRight: '4px' }} />
                        )}
                        {activeWorktrees.includes(branchClean) && (
                            <LinkIcon className="w-3 h-3 shrink-0" style={{ color: '#06b6d4', marginRight: '4px' }} />
                        )}
                        {favs.includes(branchClean) && (
                            <Star className="w-3 h-3 shrink-0 fill-yellow-400 stroke-yellow-500" style={{ marginRight: '6px' }} />
                        )}
                        {isEnvBranch && !isRemote && (
                            <Rocket className="w-3 h-3 shrink-0" style={{ color: '#f59e0b', marginRight: '4px' }} />
                        )}
                        <span className="text-[13px] select-none" style={{ color: isCurrent ? 'var(--text-accent)' : 'var(--text-primary)', fontWeight: isCurrent ? 600 : 400, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {node.name}
                        </span>

                        {/* Remote sync badges (push/pull needs) */}
                        {hasRemoteSync && (
                            <span className="ml-2 flex items-center gap-1.5 shrink-0">
                                {detail.ahead_remote > 0 && (
                                    <span className="flex items-center gap-0.5 text-[9px] font-mono px-1 rounded" style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                                        <ArrowUp className="w-2.5 h-2.5" />{detail.ahead_remote}
                                    </span>
                                )}
                                {detail.behind_remote > 0 && (
                                    <span className="flex items-center gap-0.5 text-[9px] font-mono px-1 rounded" style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                                        <ArrowDown className="w-2.5 h-2.5" />{detail.behind_remote}
                                    </span>
                                )}
                            </span>
                        )}

                        {/* Tag badge */}
                        {tagInfo && tagInfo.latest_tag !== 'none' && isEnvBranch && (
                            <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded shrink-0 flex items-center gap-1 font-mono"
                                style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
                            >
                                <Tag className="w-2.5 h-2.5" />{tagInfo.latest_tag}
                            </span>
                        )}

                        {/* Quick action buttons — visible on hover */}
                        {!isRemote && (
                            <span className="ml-auto flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                {isCurrent ? (
                                    <>
                                        <button onClick={e => { e.stopPropagation(); handlePull(); }} title={t('ctx.pull')}
                                            className="p-1 rounded transition-colors"
                                            style={{ color: 'var(--text-muted)' }}
                                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.15)'; e.currentTarget.style.color = '#3b82f6'; }}
                                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                                            <Download className="w-3 h-3" />
                                        </button>
                                        <button onClick={e => { e.stopPropagation(); handlePush(); }} title={t('ctx.push')}
                                            className="p-1 rounded transition-colors"
                                            style={{ color: 'var(--text-muted)' }}
                                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.15)'; e.currentTarget.style.color = '#10b981'; }}
                                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                                            <Upload className="w-3 h-3" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={e => { e.stopPropagation(); handleFetchBranch(node.fullPath); }} title={t('ctx.pull')}
                                            className="p-1 rounded transition-colors"
                                            style={{ color: 'var(--text-muted)' }}
                                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.15)'; e.currentTarget.style.color = '#3b82f6'; }}
                                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                                            <Download className="w-3 h-3" />
                                        </button>
                                        <button onClick={e => { e.stopPropagation(); handleCheckout(node.fullPath); }} title={t('ctx.checkout')}
                                            className="p-1 rounded transition-colors"
                                            style={{ color: 'var(--text-muted)' }}
                                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(139,92,246,0.15)'; e.currentTarget.style.color = '#8b5cf6'; }}
                                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                                            <GitBranch className="w-3 h-3" />
                                        </button>
                                    </>
                                )}
                            </span>
                        )}

                        {isCurrent && (
                            <span className="ml-2 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 font-bold" style={{ backgroundColor: 'var(--accent-muted)', color: 'var(--text-accent)' }}>HEAD</span>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div key={node.name}>
                <div className="flex items-center rounded-md cursor-pointer transition-colors"
                    style={{ paddingLeft: `${8 + indent}px`, paddingRight: '12px', paddingTop: '5px', paddingBottom: '5px', marginBottom: '1px', color: 'var(--text-secondary)' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => toggleNode(node)}
                >
                    {node.isOpen ? <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ marginRight: '4px' }} /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ marginRight: '4px' }} />}
                    <Folder className="w-3.5 h-3.5 shrink-0" style={{ marginRight: '8px', color: 'var(--text-muted)' }} />
                    <span className="text-[13px] font-semibold select-none">{node.name}</span>
                    <span className="ml-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>({Object.keys(node.children).length})</span>
                </div>
                {node.isOpen && (
                    <div style={{ marginLeft: `${12 + indent}px`, borderLeft: '1px solid var(--border-tree-line)', paddingLeft: '4px' }}>
                        {children.map(child => renderTree(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    if (!project) return null;
    const isDeployBranch = project.environments.some(env => env.name === currentBranch);

    const contextMenuItems = () => {
        if (!contextMenu) return [];
        const branchClean = clean(contextMenu.branchFullPath);
        const env = project?.environments.find(e => e.name === branchClean);
        const tagInfo = tagMap[branchClean];
        const isRemote = contextMenu.branchFullPath.startsWith('origin/');
        const items: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean; accent?: boolean; divider?: boolean }[] = [];

        // Deploy (env branches only)
        if (env && tagInfo) {
            items.push({ label: `Deploy → ${tagInfo.next_tag}`, icon: <Rocket className="w-3.5 h-3.5" />, onClick: () => handleQuickDeploy(contextMenu.branchFullPath), accent: true });
        }

        // Checkout (if not current)
        if (branchClean !== currentBranch) {
            items.push({ label: `${t('ctx.checkout')} "${branchClean}"`, icon: <GitBranch className="w-3.5 h-3.5" />, onClick: () => handleCheckout(contextMenu.branchFullPath) });
        }

        // Create new branch from this
        items.push({ label: `${t('ctx.createBranch').replace('...', '')} "${branchClean}"`, icon: <GitBranchPlus className="w-3.5 h-3.5" />, onClick: () => handleCreateBranch(contextMenu.branchFullPath) });

        // Favorite Toggle
        const isFav = project?.favoriteBranches?.includes(branchClean);
        items.push({ 
            label: isFav ? 'Remove from Favorites' : 'Add to Favorites', 
            icon: <Star className="w-3.5 h-3.5" style={{ fill: isFav ? 'currentColor' : 'none' }} />, 
            onClick: () => toggleFavoriteBranch(project!.id, branchClean),
            divider: true
        });

        // Worktree (Open in Parallel)
        if (branchClean !== currentBranch && !activeWorktrees.includes(branchClean)) {
            items.push({ label: `${t('worktree.openParallel')} "${branchClean}"`, icon: <FolderGit2 className="w-3.5 h-3.5" />, onClick: () => handleOpenWorktree(branchClean) });
        }

        // Copy
        items.push({ label: t('ctx.copyName'), icon: <Copy className="w-3.5 h-3.5" />, onClick: () => handleCopyBranch(contextMenu.branchFullPath) });

        // Stash / Stash Pop (only when relevant)
        if (!isClean) {
            items.push({ label: t('ctx.stash'), icon: <Archive className="w-3.5 h-3.5" />, onClick: handleStash, divider: true });
        }
        items.push({ label: t('ctx.stashPop'), icon: <ArchiveRestore className="w-3.5 h-3.5" />, onClick: handleStashPop });

        // Git Operations
        items.push({ label: t('ctx.pull'), icon: <Download className="w-3.5 h-3.5" />, onClick: handlePull, divider: true });
        if (branchClean !== currentBranch) {
            items.push({ label: `${t('ctx.merge')} "${currentBranch}" ← "${branchClean}"`, icon: <GitMerge className="w-3.5 h-3.5" />, onClick: () => handleMerge(contextMenu.branchFullPath) });
        }
        items.push({ label: `${t('ctx.push')} "${currentBranch}"`, icon: <Upload className="w-3.5 h-3.5" />, onClick: handlePush });

        // Delete (local branches only, not current)
        if (!isRemote && branchClean !== currentBranch) {
            items.push({ label: `${t('ctx.delete')} "${branchClean}"`, icon: <Trash2 className="w-3.5 h-3.5" />, onClick: () => handleDeleteBranch(contextMenu.branchFullPath), danger: true, divider: true });
        }

        // Refresh
        items.push({ label: t('git.refresh'), icon: <RefreshCw className="w-3.5 h-3.5" />, onClick: refreshGitState });

        // Custom Actions
        const branchActions = actions.filter(a => a.context === 'branch');
        if (branchActions.length > 0) {
            let first = true;
            for (const action of branchActions) {
                items.push({
                    divider: first,
                    label: action.name,
                    icon: <TerminalSquare className="w-3.5 h-3.5" />,
                    onClick: () => {
                        const script = action.script
                            .replace(/{TARGET_BRANCH}/g, branchClean)
                            .replace(/{CURRENT_BRANCH}/g, currentBranch)
                            .replace(/{REPO_PATH}/g, project!.path)
                            .replace(/{TARGET_COMMIT}/g, '');
                        setPendingAction({ action, renderedScript: script });
                    }
                });
                first = false;
            }
        }

        return items;
    };

    const globalContextMenuItems = () => {
        const globalActions = actions.filter(a => a.context === 'global');
        if (globalActions.length === 0) return [];
        
        return globalActions.map(action => ({
            label: action.name,
            icon: <TerminalSquare className="w-3.5 h-3.5" />,
            onClick: () => {
                const script = action.script
                    .replace(/{CURRENT_BRANCH}/g, currentBranch)
                    .replace(/{REPO_PATH}/g, project!.path)
                    .replace(/{TARGET_BRANCH}/g, '')
                    .replace(/{TARGET_COMMIT}/g, '');
                setPendingAction({ action, renderedScript: script });
            }
        }));
    };

    return (
        <>
        <div className="flex flex-col h-full overflow-hidden relative" ref={containerRef}>
            {/* Header */}
            <div className="flex justify-between items-center shrink-0 px-5 pt-5 pb-4">
                <h2 className="text-lg font-semibold font-mono" style={{ color: 'var(--text-accent)' }}>{t('git.status')}</h2>
                <button onClick={refreshGitState} disabled={isLoading}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm disabled:opacity-50 transition-colors"
                    style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> {t('git.refresh')}
                </button>
            </div>

            {/* Compact Status Bar */}
            <div className="shrink-0 flex items-center gap-2 flex-wrap px-5 py-2" style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-tree-header)' }}>
                {/* Branch */}
                <span className="flex items-center gap-1.5 text-xs font-mono font-semibold px-2 py-1 rounded"
                    style={{
                        backgroundColor: isDeployBranch ? 'var(--accent-muted)' : 'rgba(245,158,11,0.1)',
                        color: isDeployBranch ? 'var(--text-accent)' : '#f59e0b',
                        border: `1px solid ${isDeployBranch ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                    }}
                >
                    <GitBranch className="w-3 h-3" />
                    {currentBranch || '...'}
                </span>

                {/* Clean / Dirty */}
                {isClean ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded"
                        style={{ backgroundColor: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
                    >
                        <CheckCircle className="w-3 h-3" /> {t('git.clean')}
                    </span>
                ) : (
                    <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded"
                        style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                    >
                        <AlertTriangle className="w-3 h-3" /> {t('git.uncommitted')}
                    </span>
                )}

                {/* Not Deploy Branch hint */}
                {!isDeployBranch && (
                    <span className="text-[10px] italic" style={{ color: 'var(--text-muted)' }}>
                        {t('git.notDeployBranch')}
                    </span>
                )}

                {/* Checkout / action message */}
                {checkoutMessage && (
                    <span className="ml-auto text-[11px] font-medium px-2 py-1 rounded"
                        style={{
                            backgroundColor: checkoutMessage.isError ? 'rgba(239,68,68,0.08)' : 'var(--accent-muted)',
                            color: checkoutMessage.isError ? '#ef4444' : 'var(--text-accent)',
                        }}
                    >
                        {checkoutMessage.text}
                    </span>
                )}

                {/* Merge Conflict Indicator */}
                {isMergeConflict && (
                    <button onClick={() => setShowConflictResolver(true)}
                        className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded transition-colors ml-auto"
                        style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.2)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.12)'}
                    >
                        <GitMerge className="w-3 h-3" />
                        {t('conflict.resolveBtn')}
                    </button>
                )}
            </div>

            {/* Create Branch Prompt */}
            {promptState?.type === 'create' && (
                <div className="shrink-0 rounded-lg p-3 flex gap-2 items-center" style={{ marginBottom: '12px', backgroundColor: 'var(--bg-tree)', border: '1px solid var(--border-default)' }}>
                    <GitBranchPlus className="w-4 h-4 shrink-0" style={{ color: 'var(--text-accent)' }} />
                    <input
                        autoFocus
                        className="flex-1 text-sm rounded px-2 py-1 outline-none font-mono"
                        style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                        value={promptState.value}
                        onChange={e => setPromptState({ ...promptState, value: e.target.value })}
                        onKeyDown={e => { if (e.key === 'Enter') submitCreateBranch(); if (e.key === 'Escape') setPromptState(null); }}
                        placeholder={`New branch from ${clean(promptState.branchFullPath)}...`}
                    />
                    <button onClick={submitCreateBranch} className="px-3 py-1 rounded text-xs font-bold" style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>Create</button>
                    <button onClick={() => setPromptState(null)} className="px-2 py-1 rounded text-xs" style={{ color: 'var(--text-muted)' }}>Cancel</button>
                </div>
            )}
            {/* Deploy Controls */}
            <DeployPanel />
            <QuickCommit />

            {/* Scrollable area for Branch Tree + Panels */}
            <div className="flex-1 overflow-y-auto min-h-0 px-5 pb-5" onContextMenu={handleWorkspaceContextMenu}>
            {/* Branch Tree */}
            <div className="rounded-lg flex flex-col mt-3" style={{ backgroundColor: 'var(--bg-tree)', border: '1px solid var(--border-default)' }}>
                <div className="flex justify-between items-center text-[11px] uppercase tracking-wider font-semibold" style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-tree-header)', color: 'var(--text-muted)' }}>
                    <span>{t('git.branches')}</span>
                    <span className="text-[10px] italic lowercase normal-case font-normal" style={{ color: 'var(--text-muted)' }}>{t('git.rightClickActions')}</span>
                </div>
                <div className="font-mono" style={{ padding: '6px' }}>
                    {treeData ? renderTree(treeData) : (
                        <div className="flex justify-center items-center h-full" style={{ color: 'var(--text-muted)' }}>
                            {isLoading ? t('git.loading') : t('git.noBranches')}
                        </div>
                    )}
                </div>
            </div>

            <StashPanel />
            <TagPanel />
            <WorktreePanel />
            </div> {/* end scrollable area */}

            {/* Custom Action Confirm Dialog */}
            {pendingAction && (
                <ActionConfirmDialog
                    action={pendingAction.action}
                    renderedScript={pendingAction.renderedScript}
                    onConfirm={handleExecuteCustomAction}
                    onClose={() => setPendingAction(null)}
                />
            )}

            {/* Context Menu via Portal */}
            {contextMenu && createPortal(
                <div className="fixed z-[9999] rounded-lg overflow-hidden shadow-2xl" style={{
                    left: `${contextMenu.x}px`, top: `${contextMenu.y}px`,
                    backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-default)', minWidth: '240px',
                }} onClick={e => e.stopPropagation()}>
                    <div className="px-3 py-2 text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-tree-header)' }}>
                        {contextMenu.branchName}
                    </div>
                    {contextMenuItems().map((item, idx) => (
                        <div key={idx}>
                            {item.divider && <div style={{ borderTop: '1px solid var(--border-default)', margin: '2px 0' }} />}
                            <button
                                onClick={() => { item.onClick(); setContextMenu(null); }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-[13px] transition-colors text-left"
                                style={{ color: item.accent ? 'var(--text-accent)' : item.danger ? '#ef4444' : 'var(--text-primary)' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = item.danger ? 'rgba(239,68,68,0.08)' : 'var(--bg-hover)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <span style={{ color: item.accent ? 'var(--text-accent)' : item.danger ? '#ef4444' : 'var(--text-muted)' }}>{item.icon}</span>
                                <span className={item.accent ? 'font-semibold' : ''}>{item.label}</span>
                            </button>
                        </div>
                    ))}
                </div>,
                document.body
            )}

            {/* Global Context Menu via Portal */}
            {globalContextMenu && globalContextMenuItems().length > 0 && createPortal(
                <div className="fixed z-[9999] rounded-lg overflow-hidden shadow-2xl" style={{
                    left: `${globalContextMenu.x}px`, top: `${globalContextMenu.y}px`,
                    backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-default)', minWidth: '200px',
                }} onClick={e => e.stopPropagation()}>
                    <div className="px-3 py-2 text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-tree-header)' }}>
                        {t('git.globalActions')}
                    </div>
                    {globalContextMenuItems().map((item, idx) => (
                        <button
                            key={idx}
                            onClick={() => { item.onClick(); setGlobalContextMenu(null); }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-[13px] transition-colors text-left"
                            style={{ color: 'var(--text-primary)' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <span style={{ color: 'var(--text-muted)' }}>{item.icon}</span>
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>,
                document.body
            )}

            {/* Rich Tooltip via Portal */}
            {tooltip && !contextMenu && (() => {
                const td = detailMap[tooltip.branch];
                const ti = tagMap[tooltip.branch];
                const isEnv = !!project?.environments.find(e => e.name === tooltip.branch);
                if (!td) return null;
                return createPortal(
                    <div className="fixed z-[9998] rounded-xl overflow-hidden shadow-2xl pointer-events-none" style={{
                        left: `${Math.min(tooltip.x + 12, window.innerWidth - 300)}px`,
                        top: `${Math.min(tooltip.y + 12, window.innerHeight - 250)}px`,
                        backgroundColor: 'var(--bg-panel)',
                        border: '1px solid var(--border-default)',
                        minWidth: '280px',
                        maxWidth: '320px',
                    }}>
                        {/* Header */}
                        <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-tree-header)' }}>
                            <GitBranch className="w-3.5 h-3.5" style={{ color: 'var(--text-accent)' }} />
                            <span className="text-[12px] font-bold font-mono" style={{ color: 'var(--text-accent)' }}>{tooltip.branch}</span>
                            {tooltip.branch === currentBranch && (
                                <span className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold ml-auto" style={{ backgroundColor: 'var(--accent-muted)', color: 'var(--text-accent)' }}>HEAD</span>
                            )}
                        </div>

                        <div className="px-3 py-2 space-y-2.5">
                            {/* Last Commit */}
                            {td.last_commit && (
                                <div>
                                    <div className="text-[9px] uppercase tracking-wider font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{t('tip.latestCommit')}</div>
                                    <div className="text-[11px] font-mono leading-normal" style={{ color: 'var(--text-secondary)' }}>{td.last_commit}</div>
                                </div>
                            )}

                            {/* Remote Sync */}
                            <div>
                                <div className="text-[9px] uppercase tracking-wider font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{t('tip.remoteSync')}</div>
                                {td.ahead_remote === 0 && td.behind_remote === 0 ? (
                                    <div className="flex items-center gap-1.5 text-[11px]" style={{ color: '#10b981' }}>
                                        <CheckCircle className="w-3 h-3" /> {t('tip.inSync')}
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {td.ahead_remote > 0 && (
                                            <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                                                <ArrowUp className="w-3 h-3" />{td.ahead_remote} {t('tip.toPush')}
                                            </span>
                                        )}
                                        {td.behind_remote > 0 && (
                                            <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                                                <ArrowDown className="w-3 h-3" />{td.behind_remote} {t('tip.toPull')}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Branch Comparison */}
                            {tooltip.branch !== currentBranch && (td.ahead > 0 || td.behind > 0) && (
                                <div>
                                    <div className="text-[9px] uppercase tracking-wider font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>vs {currentBranch}</div>
                                    <div className="flex flex-wrap gap-2">
                                        {td.ahead > 0 && (
                                            <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                                                <ArrowUp className="w-3 h-3" />{td.ahead} {t('tip.ahead')}
                                            </span>
                                        )}
                                        {td.behind > 0 && (
                                            <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(249,115,22,0.12)', color: '#f97316' }}>
                                                <ArrowDown className="w-3 h-3" />{td.behind} {t('tip.behind')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tag Info */}
                            {ti && ti.latest_tag !== 'none' && isEnv && (
                                <div>
                                    <div className="text-[9px] uppercase tracking-wider font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{t('tip.deployTag')}</div>
                                    <div className="flex items-center gap-2 text-[10px] font-mono">
                                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                                            <Tag className="w-2.5 h-2.5" />{ti.latest_tag}
                                        </span>
                                        <span style={{ color: 'var(--text-muted)' }}>→</span>
                                        <span className="font-semibold" style={{ color: 'var(--text-accent)' }}>{ti.next_tag}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer hint */}
                        <div className="px-3 py-1.5 text-[9px] italic" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-default)', backgroundColor: 'var(--bg-tree-header)' }}>
                            {t('tip.hint')}
                        </div>
                    </div>,
                    document.body
                );
            })()}
        </div>
            {showConflictResolver && project && (
                <ConflictResolver repoPath={project.path} onClose={() => { setShowConflictResolver(false); refreshGitState(); }} />
            )}
        </>
    );
}
