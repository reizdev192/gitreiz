import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useProjectStore } from '../store/useProjectStore';
import { dispatchWebhook } from '../utils/webhookDispatcher';
import { useI18n } from '../i18n/useI18n';
import { useConfirmStore } from '../store/useConfirmStore';
import { Tag, Trash2, Plus, Search, X, Hash, ChevronDown, ChevronRight } from 'lucide-react';

interface TagInfo { name: string; hash: string; date: string; message: string; }

const TAG_PAGE_SIZE = 30;

export function TagPanel() {
    const { projects, selectedProjectId, gitStateVersion, bumpGitState } = useProjectStore();
    const project = projects.find(p => p.id === selectedProjectId);
    const { t } = useI18n();

    const [tags, setTags] = useState<TagInfo[]>([]);
    const [filter, setFilter] = useState('');
    const [collapsed, setCollapsed] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagMsg, setNewTagMsg] = useState('');
    const [showCount, setShowCount] = useState(TAG_PAGE_SIZE);
    const [hasFetched, setHasFetched] = useState(false);

    const fetchTags = useCallback(async () => {
        if (!project) return;
        try {
            const data: TagInfo[] = await invoke('list_tags_cmd', { repoPath: project.path });
            setTags(data);
            setHasFetched(true);
        } catch { setTags([]); }
    }, [project?.path]);

    // Only fetch when panel is opened (lazy), or when git state changes while open
    useEffect(() => {
        if (!collapsed) fetchTags();
    }, [collapsed, fetchTags, gitStateVersion]);

    if (!project) return null;

    const filtered = filter ? tags.filter(tg => tg.name.toLowerCase().includes(filter.toLowerCase())) : tags;
    const displayedTags = filtered.slice(0, showCount);
    const hasMore = filtered.length > showCount;

    const handleDelete = async (name: string, remote: boolean) => {
        if (!await useConfirmStore.getState().confirm({ message: t('tags.confirmDelete') })) return;
        try {
            await invoke<string>('delete_tag_cmd', { repoPath: project.path, name, deleteRemote: remote });
            await fetchTags();
            bumpGitState();
        } catch (e: any) { alert(`Delete failed: ${e}`); }
    };

    const handleCreate = async () => {
        if (!newTagName.trim()) return;
        try {
            await invoke<string>('create_tag_cmd', { repoPath: project.path, name: newTagName.trim(), message: newTagMsg || newTagName.trim() });
            dispatchWebhook(project, 'tag', { tag_name: newTagName.trim(), commit_msg: newTagMsg });
            setNewTagName(''); setNewTagMsg(''); setShowCreate(false);
            await fetchTags();
            bumpGitState();
        } catch (e: any) { alert(`Create failed: ${e}`); }
    };

    return (
        <div style={{ borderTop: '1px solid var(--border-default)' }}>
            <button
                onClick={() => { setCollapsed(!collapsed); setShowCount(TAG_PAGE_SIZE); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors"
                style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tree-header)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-tree-header)'}
            >
                {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                <Tag className="w-3.5 h-3.5" style={{ color: '#facc15' }} />
                {t('tags.title')}
                {hasFetched && tags.length > 0 && (
                    <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'rgba(250,204,21,0.15)', color: '#facc15' }}>
                        {tags.length}
                    </span>
                )}
            </button>
            {!collapsed && (
                <div className="px-2 pb-2">
                    {/* Filter + Create */}
                    <div className="flex items-center gap-1.5 mb-2">
                        <div className="flex-1 flex items-center gap-1.5 px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-tree)', border: '1px solid var(--border-default)' }}>
                            <Search className="w-3 h-3 shrink-0" style={{ color: 'var(--text-muted)' }} />
                            <input value={filter} onChange={e => { setFilter(e.target.value); setShowCount(TAG_PAGE_SIZE); }} placeholder={t('tags.filter')}
                                className="flex-1 bg-transparent border-none outline-none text-[11px]" style={{ color: 'var(--text-primary)' }} />
                            {filter && <button onClick={() => setFilter('')}><X className="w-3 h-3" style={{ color: 'var(--text-muted)' }} /></button>}
                        </div>
                        <button onClick={() => setShowCreate(!showCreate)} className="p-1.5 rounded transition-colors"
                            style={{ color: showCreate ? 'var(--text-accent)' : 'var(--text-muted)', backgroundColor: showCreate ? 'var(--accent-muted)' : 'transparent' }}>
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Create form */}
                    {showCreate && (
                        <div className="mb-2 p-2 rounded space-y-1.5" style={{ backgroundColor: 'var(--bg-tree)', border: '1px solid var(--border-default)' }}>
                            <input value={newTagName} onChange={e => setNewTagName(e.target.value)} placeholder={t('tags.name')}
                                className="w-full px-2 py-1 rounded text-[11px] bg-transparent outline-none" style={{ color: 'var(--text-primary)', border: '1px solid var(--border-default)' }} />
                            <input value={newTagMsg} onChange={e => setNewTagMsg(e.target.value)} placeholder={t('tags.message')}
                                className="w-full px-2 py-1 rounded text-[11px] bg-transparent outline-none" style={{ color: 'var(--text-primary)', border: '1px solid var(--border-default)' }} />
                            <button onClick={handleCreate} className="w-full px-2 py-1 rounded text-[11px] font-bold transition-colors"
                                style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>{t('tags.create')}</button>
                        </div>
                    )}

                    {/* Tag list */}
                    {filtered.length === 0 ? (
                        <div className="text-[10px] italic text-center py-3" style={{ color: 'var(--text-muted)' }}>{t('tags.empty')}</div>
                    ) : (
                        <>
                            {displayedTags.map(tg => (
                                <div key={tg.name} className="flex items-center gap-2 px-2 py-1.5 rounded text-xs group"
                                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                                >
                                    <Tag className="w-3 h-3 shrink-0" style={{ color: '#facc15' }} />
                                    <div className="flex-1 min-w-0">
                                        <div className="truncate text-[11px] font-medium font-mono" style={{ color: 'var(--text-primary)' }}>{tg.name}</div>
                                        <div className="flex items-center gap-2 text-[9px]" style={{ color: 'var(--text-muted)' }}>
                                            <span className="flex items-center gap-0.5"><Hash className="w-2 h-2" />{tg.hash}</span>
                                            <span>{tg.date}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDelete(tg.name, false)} className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all"
                                        title={t('tags.delete')} style={{ color: '#ef4444' }}>
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            {hasMore && (
                                <button onClick={() => setShowCount(prev => prev + TAG_PAGE_SIZE)}
                                    className="w-full py-1.5 text-[10px] font-bold rounded transition-colors mt-1"
                                    style={{ color: 'var(--text-accent)', backgroundColor: 'var(--accent-muted)' }}>
                                    Show more ({filtered.length - showCount} remaining)
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
