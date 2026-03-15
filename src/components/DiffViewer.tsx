import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useProjectStore } from '../store/useProjectStore';
import { useI18n } from '../i18n/useI18n';
import { X, FileText, Plus, Minus } from 'lucide-react';

interface DiffFile { path: string; status: string; insertions: number; deletions: number; }

export function DiffViewer({ hash, onClose }: { hash: string; onClose: () => void }) {
    const { projects, selectedProjectId } = useProjectStore();
    const project = projects.find(p => p.id === selectedProjectId);
    const { t } = useI18n();

    const [files, setFiles] = useState<DiffFile[]>([]);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [diffContent, setDiffContent] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchFiles = useCallback(async () => {
        if (!project) return;
        setLoading(true);
        try {
            const data: DiffFile[] = await invoke('get_commit_files_cmd', { repoPath: project.path, hash });
            setFiles(data);
            if (data.length > 0) {
                setSelectedFile(data[0].path);
                const diff: string = await invoke('get_file_diff_cmd', { repoPath: project.path, hash, filePath: data[0].path });
                setDiffContent(diff);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [project?.path, hash]);

    useState(() => { fetchFiles(); });

    const selectFile = async (path: string) => {
        if (!project) return;
        setSelectedFile(path);
        try {
            const diff: string = await invoke('get_file_diff_cmd', { repoPath: project.path, hash, filePath: path });
            setDiffContent(diff);
        } catch { setDiffContent(''); }
    };

    const STATUS_COLOR: Record<string, string> = { M: '#facc15', A: '#10b981', D: '#ef4444', R: '#3b82f6' };

    if (!project) return null;

    return (
        <div className="fixed inset-0 z-[9990] flex" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="m-4 flex-1 rounded-xl overflow-hidden flex" style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-default)' }}>
                {/* Sidebar */}
                <div className="w-64 shrink-0 flex flex-col" style={{ borderRight: '1px solid var(--border-default)' }}>
                    <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: 'var(--bg-tree-header)', borderBottom: '1px solid var(--border-default)' }}>
                        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{t('diff.files')} ({files.length})</span>
                        <button onClick={onClose} className="p-1 rounded transition-colors" style={{ color: 'var(--text-muted)' }}>
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {files.map(f => (
                            <button key={f.path} onClick={() => selectFile(f.path)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[11px] transition-colors"
                                style={{ backgroundColor: selectedFile === f.path ? 'var(--accent-muted)' : 'transparent', color: selectedFile === f.path ? 'var(--text-accent)' : 'var(--text-primary)' }}
                                onMouseEnter={e => { if (selectedFile !== f.path) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                                onMouseLeave={e => { if (selectedFile !== f.path) e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                                <FileText className="w-3 h-3 shrink-0" style={{ color: STATUS_COLOR[f.status] || 'var(--text-muted)' }} />
                                <span className="flex-1 truncate font-mono">{f.path.split('/').pop()}</span>
                                <span className="flex items-center gap-1 text-[9px]">
                                    {f.insertions > 0 && <span style={{ color: '#10b981' }}>+{f.insertions}</span>}
                                    {f.deletions > 0 && <span style={{ color: '#ef4444' }}>-{f.deletions}</span>}
                                </span>
                            </button>
                        ))}
                    </div>
                    {/* Total stats */}
                    <div className="px-3 py-1.5 text-[9px] flex items-center gap-3" style={{ borderTop: '1px solid var(--border-default)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-tree-header)' }}>
                        <span className="flex items-center gap-0.5"><Plus className="w-2 h-2" style={{ color: '#10b981' }} />{files.reduce((s, f) => s + f.insertions, 0)} {t('diff.additions')}</span>
                        <span className="flex items-center gap-0.5"><Minus className="w-2 h-2" style={{ color: '#ef4444' }} />{files.reduce((s, f) => s + f.deletions, 0)} {t('diff.deletions')}</span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col">
                    <div className="px-3 py-2 text-xs font-mono" style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-tree-header)', color: 'var(--text-secondary)' }}>
                        {selectedFile || '—'}
                    </div>
                    <div className="flex-1 overflow-auto p-0">
                        {loading ? (
                            <div className="flex items-center justify-center h-full text-xs" style={{ color: 'var(--text-muted)' }}>Loading...</div>
                        ) : (
                            <pre className="text-[11px] leading-5 font-mono p-3 m-0" style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                {diffContent || t('diff.noChanges')}
                            </pre>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
