import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useProjectStore } from '../store/useProjectStore';
import { useI18n } from '../i18n/useI18n';
import { useConfirmStore } from '../store/useConfirmStore';
import { GitFork, Trash2, FolderOpen, Terminal, ChevronDown, ChevronRight, Hash, Link } from 'lucide-react';

interface WorktreeInfo { path: string; branch: string; head: string; is_main: boolean; }

export function WorktreePanel() {
    const { projects, selectedProjectId, gitStateVersion, bumpGitState } = useProjectStore();
    const project = projects.find(p => p.id === selectedProjectId);
    const { t } = useI18n();

    const [worktrees, setWorktrees] = useState<WorktreeInfo[]>([]);
    const [collapsed, setCollapsed] = useState(true);
    const [hasFetched, setHasFetched] = useState(false);

    const fetchWorktrees = useCallback(async () => {
        if (!project) return;
        try {
            const data: WorktreeInfo[] = await invoke('list_worktrees_cmd', { repoPath: project.path });
            setWorktrees(data);
            setHasFetched(true);
        } catch { setWorktrees([]); }
    }, [project?.path]);

    useEffect(() => {
        if (!collapsed) fetchWorktrees();
    }, [collapsed, fetchWorktrees, gitStateVersion]);

    if (!project) return null;

    const linked = worktrees.filter(w => !w.is_main);

    const handleRemove = async (path: string) => {
        if (!await useConfirmStore.getState().confirm({ message: t('worktree.confirmRemove'), title: t('common.warning') })) return;
        try {
            await invoke<string>('worktree_remove_cmd', { repoPath: project.path, worktreePath: path });
            await fetchWorktrees();
            bumpGitState();
        } catch (e: any) { alert(`Remove failed: ${e}`); }
    };

    const handleOpenExplorer = async (path: string) => {
        try { await invoke('open_in_explorer_cmd', { path }); } catch (e: any) { alert(`Open failed: ${e}`); }
    };

    const handleOpenVscode = async (path: string) => {
        try { await invoke('open_in_vscode_cmd', { path }); } catch (e: any) { alert(`Open VS Code failed: ${e}`); }
    };

    return (
        <div style={{ borderTop: '1px solid var(--border-default)' }}>
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors"
                style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tree-header)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-tree-header)'}
            >
                {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                <GitFork className="w-3.5 h-3.5" style={{ color: '#06b6d4' }} />
                {t('worktree.title')}
                {hasFetched && linked.length > 0 && (
                    <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'rgba(6,182,212,0.15)', color: '#06b6d4' }}>
                        {linked.length}
                    </span>
                )}
            </button>
            {!collapsed && (
                <div className="px-2 pb-2">
                    {linked.length === 0 ? (
                        <div className="text-[10px] italic text-center py-3" style={{ color: 'var(--text-muted)' }}>
                            {t('worktree.empty')}
                        </div>
                    ) : linked.map(w => (
                        <div key={w.path} className="px-2 py-2 rounded group"
                            style={{ borderBottom: '1px solid var(--border-subtle)' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <Link className="w-3 h-3 shrink-0" style={{ color: '#06b6d4' }} />
                                <span className="text-[11px] font-mono font-bold truncate" style={{ color: 'var(--text-accent)' }}>{w.branch}</span>
                                <span className="flex items-center gap-0.5 text-[9px] font-mono ml-auto" style={{ color: 'var(--text-muted)' }}>
                                    <Hash className="w-2 h-2" />{w.head}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-mono truncate flex-1" style={{ color: 'var(--text-muted)' }} title={w.path}>{w.path}</span>
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <button onClick={() => handleOpenExplorer(w.path)} className="p-1 rounded transition-colors"
                                        title={t('worktree.openExplorer')} style={{ color: '#06b6d4' }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(6,182,212,0.1)'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                        <FolderOpen className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => handleOpenVscode(w.path)} className="p-1 rounded transition-colors"
                                        title={t('worktree.openVscode')} style={{ color: '#3b82f6' }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.1)'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                        <Terminal className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => handleRemove(w.path)} className="p-1 rounded transition-colors"
                                        title={t('worktree.remove')} style={{ color: '#ef4444' }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
