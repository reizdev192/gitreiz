import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useProjectStore } from '../store/useProjectStore';
import { useI18n } from '../i18n/useI18n';
import { useConfirmStore } from '../store/useConfirmStore';
import { dispatchWebhook } from '../utils/webhookDispatcher';
import { FileEdit, Plus, Minus, Check, ChevronDown, ChevronRight, AlertCircle, Undo2, Trash2 } from 'lucide-react';

interface WorkingFile { path: string; status: string; staged: boolean; }

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
    'M': { bg: 'rgba(250,204,21,0.12)', fg: '#facc15' },
    'A': { bg: 'rgba(16,185,129,0.12)', fg: '#10b981' },
    'D': { bg: 'rgba(239,68,68,0.12)', fg: '#ef4444' },
    '?': { bg: 'rgba(139,92,246,0.12)', fg: '#8b5cf6' },
    'R': { bg: 'rgba(59,130,246,0.12)', fg: '#3b82f6' },
};

export function QuickCommit() {
    const { projects, selectedProjectId, gitStateVersion, bumpGitState, appendLog } = useProjectStore();
    const project = projects.find(p => p.id === selectedProjectId);
    const { t } = useI18n();

    const [files, setFiles] = useState<WorkingFile[]>([]);
    const [message, setMessage] = useState('');
    const [collapsed, setCollapsed] = useState(false);
    const [isCommitting, setIsCommitting] = useState(false);

    const fetchFiles = useCallback(async () => {
        if (!project) return;
        try {
            const data: WorkingFile[] = await invoke('get_status_files_cmd', { repoPath: project.path });
            setFiles(data);
        } catch { setFiles([]); }
    }, [project?.path, gitStateVersion]);

    useEffect(() => { fetchFiles(); }, [fetchFiles]);

    if (!project || files.length === 0) return null;

    const stagedFiles = files.filter(f => f.staged);
    const unstagedFiles = files.filter(f => !f.staged);

    const handleStage = async (path: string) => {
        try {
            await invoke<string>('stage_file_cmd', { repoPath: project.path, path });
            await fetchFiles();
        } catch (e: any) { alert(`Stage failed: ${e}`); }
    };

    const handleUnstage = async (path: string) => {
        try {
            await invoke<string>('unstage_file_cmd', { repoPath: project.path, path });
            await fetchFiles();
        } catch (e: any) { alert(`Unstage failed: ${e}`); }
    };

    const handleStageAll = async () => {
        try {
            await invoke<string>('stage_all_cmd', { repoPath: project.path });
            await fetchFiles();
        } catch (e: any) { alert(`Stage all failed: ${e}`); }
    };

    const handleDiscard = async (path: string, status: string) => {
        if (!await useConfirmStore.getState().confirm({ message: t('commit.discardConfirm'), title: t('common.warning') })) return;
        try {
            const result = await invoke<string>('discard_file_cmd', { repoPath: project.path, path, status });
            appendLog(`Discarded: ${path} ${result ? '→ ' + result : '✓'}`);
            await fetchFiles();
            bumpGitState();
            window.dispatchEvent(new Event('force-git-refresh'));
        } catch (e: any) { appendLog(`Discard failed: ${path} → ${e}`); alert(`Discard failed: ${e}`); }
    };

    const handleDiscardAll = async () => {
        if (!await useConfirmStore.getState().confirm({ message: t('commit.discardAllConfirm'), title: t('common.warning') })) return;
        try {
            await invoke<string>('discard_all_cmd', { repoPath: project.path });
            appendLog('Discarded all changes ✓');
            await fetchFiles();
            bumpGitState();
            window.dispatchEvent(new Event('force-git-refresh'));
        } catch (e: any) { appendLog(`Discard all failed: ${e}`); alert(`Discard all failed: ${e}`); }
    };

    const handleCommit = async () => {
        if (!message.trim() || stagedFiles.length === 0) return;
        setIsCommitting(true);
        try {
            await invoke<string>('commit_cmd', { repoPath: project.path, message: message.trim() });
            dispatchWebhook(project, 'commit', { commit_msg: message.trim() });
            setMessage('');
            bumpGitState();
        } catch (e: any) { alert(`Commit failed: ${e}`); }
        finally { setIsCommitting(false); }
    };

    const renderFile = (f: WorkingFile, isStaged: boolean) => {
        const sc = STATUS_COLORS[f.status] || STATUS_COLORS['M'];
        return (
            <div key={`${isStaged}-${f.path}`} className="flex items-center gap-2 px-2 py-1 rounded text-[11px] group transition-colors"
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <span className="text-[9px] font-bold w-4 text-center rounded px-0.5" style={{ backgroundColor: sc.bg, color: sc.fg }}>{f.status}</span>
                <span className="flex-1 truncate font-mono" style={{ color: 'var(--text-primary)' }}>{f.path}</span>
                <button onClick={() => isStaged ? handleUnstage(f.path) : handleStage(f.path)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all"
                    style={{ color: isStaged ? '#ef4444' : '#10b981' }}
                    title={isStaged ? t('commit.unstage') : t('commit.stage')}>
                    {isStaged ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                </button>
                {!isStaged && (
                    <button onClick={() => handleDiscard(f.path, f.status)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all"
                        style={{ color: '#ef4444' }}
                        title={t('commit.discard')}>
                        <Undo2 className="w-3 h-3" />
                    </button>
                )}
            </div>
        );
    };

    return (
        <div style={{ borderBottom: '1px solid var(--border-default)' }}>
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors"
                style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tree-header)' }}
            >
                {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                <FileEdit className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
                {t('commit.message')}
                <span className="ml-auto flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" style={{ color: '#f59e0b' }} />
                    <span className="text-[9px] font-mono" style={{ color: '#f59e0b' }}>{files.length}</span>
                </span>
            </button>
            {!collapsed && (
                <div className="px-2 pb-2 space-y-2">
                    {/* Unstaged */}
                    {unstagedFiles.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between px-2 text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                                <span>Unstaged ({unstagedFiles.length})</span>
                                <div className="flex items-center gap-1">
                                    <button onClick={handleDiscardAll} className="text-[9px] px-1.5 py-0.5 rounded transition-colors"
                                        style={{ color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)' }}>
                                        <span className="flex items-center gap-0.5"><Trash2 className="w-2.5 h-2.5" /> {t('commit.discardAll')}</span>
                                    </button>
                                    <button onClick={handleStageAll} className="text-[9px] px-1.5 py-0.5 rounded transition-colors"
                                        style={{ color: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)' }}>{t('commit.stageAll')}</button>
                                </div>
                            </div>
                            {unstagedFiles.map(f => renderFile(f, false))}
                        </div>
                    )}
                    {/* Staged */}
                    {stagedFiles.length > 0 && (
                        <div>
                            <div className="px-2 text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                                Staged ({stagedFiles.length})
                            </div>
                            {stagedFiles.map(f => renderFile(f, true))}
                        </div>
                    )}
                    {/* Message + Commit */}
                    <div className="space-y-1.5">
                        <textarea
                            value={message} onChange={e => setMessage(e.target.value)}
                            placeholder="feat: ..." rows={2}
                            className="w-full px-2 py-1.5 rounded text-[11px] resize-none outline-none"
                            style={{ backgroundColor: 'var(--bg-tree)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
                        />
                        <button onClick={handleCommit} disabled={!message.trim() || stagedFiles.length === 0 || isCommitting}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold transition-colors disabled:opacity-40"
                            style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>
                            <Check className="w-3 h-3" /> {t('commit.button')} ({stagedFiles.length})
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
