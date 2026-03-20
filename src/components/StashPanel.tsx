import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useProjectStore } from '../store/useProjectStore';
import { useI18n } from '../i18n/useI18n';
import { useConfirmStore } from '../store/useConfirmStore';
import { Archive, Trash2, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';

interface StashEntry { index: number; message: string; date: string; }

export function StashPanel() {
    const { projects, selectedProjectId, gitStateVersion, bumpGitState } = useProjectStore();
    const project = projects.find(p => p.id === selectedProjectId);
    const { t } = useI18n();

    const [stashes, setStashes] = useState<StashEntry[]>([]);
    const [collapsed, setCollapsed] = useState(true);

    const fetchStashes = useCallback(async () => {
        if (!project) return;
        try {
            const data: StashEntry[] = await invoke('list_stashes_cmd', { repoPath: project.path });
            setStashes(data);
        } catch { setStashes([]); }
    }, [project?.path, gitStateVersion]);

    useEffect(() => { fetchStashes(); }, [fetchStashes]);

    if (!project) return null;

    const handleApply = async (index: number) => {
        try {
            await invoke<string>('stash_apply_cmd', { repoPath: project.path, index });
            bumpGitState();
        } catch (e: any) { alert(`Apply failed: ${e}`); }
    };

    const handleDrop = async (index: number) => {
        if (!await useConfirmStore.getState().confirm({ message: t('stash.confirmDrop') })) return;
        try {
            await invoke<string>('stash_drop_cmd', { repoPath: project.path, index });
            await fetchStashes();
            bumpGitState();
        } catch (e: any) { alert(`Drop failed: ${e}`); }
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
                <Archive className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                {t('stash.title')}
                {stashes.length > 0 && (
                    <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'var(--accent-muted)', color: 'var(--text-accent)' }}>
                        {stashes.length}
                    </span>
                )}
            </button>
            {!collapsed && (
                <div className="px-2 pb-2">
                    {stashes.length === 0 ? (
                        <div className="text-[10px] italic text-center py-3" style={{ color: 'var(--text-muted)' }}>{t('stash.empty')}</div>
                    ) : stashes.map(s => (
                        <div key={s.index} className="flex items-center gap-2 px-2 py-1.5 rounded text-xs group transition-colors"
                            style={{ borderBottom: '1px solid var(--border-subtle)' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="truncate text-[11px]" style={{ color: 'var(--text-primary)' }}>{s.message}</div>
                                <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{s.date}</div>
                            </div>
                            <button onClick={() => handleApply(s.index)} className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all"
                                title={t('stash.apply')} style={{ color: '#10b981' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.1)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                <RotateCcw className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleDrop(s.index)} className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all"
                                title={t('stash.drop')} style={{ color: '#ef4444' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
