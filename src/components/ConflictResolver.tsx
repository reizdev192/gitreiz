import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useI18n } from '../i18n/useI18n';
import { useEscClose } from '../hooks/useEscClose';
import {
    X, FileWarning, Check, ArrowLeft, ArrowRight,
    Merge, AlertTriangle, CheckCircle2, RefreshCw
} from 'lucide-react';

interface ConflictFile { path: string; status: string; }

interface ConflictBlock {
    id: number;
    ours: string;
    theirs: string;
    resolved: string;
    choice: 'none' | 'ours' | 'theirs' | 'both';
}

function parseConflicts(content: string): { blocks: ConflictBlock[]; nonConflictParts: string[] } {
    const blocks: ConflictBlock[] = [];
    const nonConflictParts: string[] = [];
    let id = 0;

    // Split by conflict markers
    const regex = /<<<<<<< [^\n]*\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> [^\n]*/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
        // Text before conflict
        nonConflictParts.push(content.substring(lastIndex, match.index));
        const ours = match[1].replace(/\n$/, '');
        const theirs = match[2].replace(/\n$/, '');
        blocks.push({ id: id++, ours, theirs, resolved: '', choice: 'none' });
        lastIndex = match.index + match[0].length;
    }
    // Text after last conflict
    nonConflictParts.push(content.substring(lastIndex));

    return { blocks, nonConflictParts };
}

function buildResolvedContent(nonConflictParts: string[], blocks: ConflictBlock[]): string {
    let result = '';
    for (let i = 0; i < nonConflictParts.length; i++) {
        result += nonConflictParts[i];
        if (i < blocks.length) {
            const b = blocks[i];
            switch (b.choice) {
                case 'ours': result += b.ours; break;
                case 'theirs': result += b.theirs; break;
                case 'both': result += b.ours + '\n' + b.theirs; break;
                default: result += b.resolved || b.ours; break;
            }
        }
    }
    return result;
}

export function ConflictResolver({ repoPath, onClose }: { repoPath: string; onClose: () => void }) {
    const { t } = useI18n();
    useEscClose(onClose);
    const [files, setFiles] = useState<ConflictFile[]>([]);
    const [selectedFile, setSelectedFile] = useState<string>('');
    const [blocks, setBlocks] = useState<ConflictBlock[]>([]);
    const [nonConflictParts, setNonConflictParts] = useState<string[]>([]);
    const [resolvedFiles, setResolvedFiles] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchFiles = useCallback(async () => {
        setLoading(true);
        try {
            const data = await invoke<ConflictFile[]>('get_conflicted_files_cmd', { repoPath });
            setFiles(data);
            if (data.length > 0 && !selectedFile) {
                setSelectedFile(data[0].path);
            }
        } catch (e) {
            console.error('Failed to fetch conflicts:', e);
        } finally {
            setLoading(false);
        }
    }, [repoPath]);

    const loadFile = useCallback(async (path: string) => {
        if (!path) return;
        try {
            const raw = await invoke<string>('get_conflict_content_cmd', { repoPath, filePath: path });
            const parsed = parseConflicts(raw);
            setBlocks(parsed.blocks);
            setNonConflictParts(parsed.nonConflictParts);
        } catch (e) {
            console.error('Failed to load conflict:', e);
        }
    }, [repoPath]);

    useEffect(() => { fetchFiles(); }, [fetchFiles]);
    useEffect(() => { if (selectedFile) loadFile(selectedFile); }, [selectedFile, loadFile]);

    const handleChoice = (blockId: number, choice: 'ours' | 'theirs' | 'both') => {
        setBlocks(prev => prev.map(b =>
            b.id === blockId ? { ...b, choice, resolved: choice === 'ours' ? b.ours : choice === 'theirs' ? b.theirs : b.ours + '\n' + b.theirs } : b
        ));
    };

    const handleResolve = async () => {
        if (!selectedFile) return;
        setSaving(true);
        try {
            const resolved = buildResolvedContent(nonConflictParts, blocks);
            await invoke('resolve_conflict_cmd', { repoPath, filePath: selectedFile, content: resolved });
            setResolvedFiles(prev => new Set([...prev, selectedFile]));
            // Move to next unresolved file
            const next = files.find(f => f.path !== selectedFile && !resolvedFiles.has(f.path));
            if (next) setSelectedFile(next.path);
        } catch (e) {
            console.error('Failed to resolve:', e);
        } finally {
            setSaving(false);
        }
    };

    const handleAbort = async () => {
        try {
            await invoke('abort_merge_cmd', { repoPath });
            onClose();
        } catch (e) {
            console.error('Failed to abort merge:', e);
        }
    };

    const allResolved = files.length > 0 && files.every(f => resolvedFiles.has(f.path));
    const allBlocksChosen = blocks.every(b => b.choice !== 'none');

    return (
        <div className="fixed inset-0 z-[9990] flex" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <div className="m-3 flex-1 rounded-xl overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-default)' }}>
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-2.5 shrink-0" style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-tree-header)' }}>
                    <Merge className="w-4 h-4" style={{ color: '#f59e0b' }} />
                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t('conflict.title')}</span>
                    <div className="flex-1" />

                    {allResolved && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: 'hsla(152, 60%, 45%, 0.15)', color: 'hsl(152, 60%, 45%)' }}>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {t('conflict.allResolved')}
                        </div>
                    )}

                    <button onClick={handleAbort}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                        style={{ backgroundColor: 'hsla(0, 70%, 50%, 0.12)', color: 'hsl(0, 70%, 50%)' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'hsla(0, 70%, 50%, 0.2)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'hsla(0, 70%, 50%, 0.12)'}
                    >
                        <AlertTriangle className="w-3 h-3" />
                        {t('conflict.abortMerge')}
                    </button>

                    <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex flex-1 min-h-0">
                    {/* File List Sidebar */}
                    <div className="w-56 shrink-0 flex flex-col" style={{ borderRight: '1px solid var(--border-default)' }}>
                        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-tree-header)' }}>
                            {t('conflict.files')} ({files.length})
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {files.map(f => (
                                <button key={f.path} onClick={() => setSelectedFile(f.path)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors"
                                    style={{
                                        backgroundColor: selectedFile === f.path ? 'var(--accent-muted)' : 'transparent',
                                        color: selectedFile === f.path ? 'var(--text-accent)' : 'var(--text-primary)',
                                    }}
                                    onMouseEnter={e => { if (selectedFile !== f.path) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                                    onMouseLeave={e => { if (selectedFile !== f.path) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                >
                                    {resolvedFiles.has(f.path) ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: 'hsl(152, 60%, 45%)' }} />
                                    ) : (
                                        <FileWarning className="w-3.5 h-3.5 shrink-0" style={{ color: '#f59e0b' }} />
                                    )}
                                    <span className="truncate font-mono text-[11px]">{f.path.split('/').pop()}</span>
                                </button>
                            ))}
                            {files.length === 0 && !loading && (
                                <div className="px-3 py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {t('conflict.noConflicts')}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Content */}
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                        </div>
                    ) : selectedFile && blocks.length > 0 ? (
                        <div className="flex-1 flex flex-col min-w-0">
                            {/* File path header */}
                            <div className="px-3 py-2 text-xs font-mono shrink-0" style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-tree-header)', color: 'var(--text-secondary)' }}>
                                {selectedFile}
                            </div>

                            {/* Conflict blocks */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                {blocks.map((block, i) => (
                                    <div key={block.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
                                        {/* Block header with actions */}
                                        <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: 'var(--bg-tree-header)', borderBottom: '1px solid var(--border-default)' }}>
                                            <span className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>
                                                Conflict #{i + 1}
                                            </span>
                                            <div className="flex-1" />
                                            <button onClick={() => handleChoice(block.id, 'ours')}
                                                className="px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors flex items-center gap-1"
                                                style={{
                                                    backgroundColor: block.choice === 'ours' ? 'hsla(210, 70%, 55%, 0.2)' : 'var(--bg-input)',
                                                    color: block.choice === 'ours' ? 'hsl(210, 70%, 55%)' : 'var(--text-muted)',
                                                    border: block.choice === 'ours' ? '1px solid hsl(210, 70%, 55%)' : '1px solid var(--border-default)',
                                                }}
                                            >
                                                <ArrowLeft className="w-3 h-3" />
                                                {t('conflict.acceptOurs')}
                                            </button>
                                            <button onClick={() => handleChoice(block.id, 'theirs')}
                                                className="px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors flex items-center gap-1"
                                                style={{
                                                    backgroundColor: block.choice === 'theirs' ? 'hsla(270, 60%, 55%, 0.2)' : 'var(--bg-input)',
                                                    color: block.choice === 'theirs' ? 'hsl(270, 60%, 55%)' : 'var(--text-muted)',
                                                    border: block.choice === 'theirs' ? '1px solid hsl(270, 60%, 55%)' : '1px solid var(--border-default)',
                                                }}
                                            >
                                                {t('conflict.acceptTheirs')}
                                                <ArrowRight className="w-3 h-3" />
                                            </button>
                                            <button onClick={() => handleChoice(block.id, 'both')}
                                                className="px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors flex items-center gap-1"
                                                style={{
                                                    backgroundColor: block.choice === 'both' ? 'hsla(152, 60%, 45%, 0.2)' : 'var(--bg-input)',
                                                    color: block.choice === 'both' ? 'hsl(152, 60%, 45%)' : 'var(--text-muted)',
                                                    border: block.choice === 'both' ? '1px solid hsl(152, 60%, 45%)' : '1px solid var(--border-default)',
                                                }}
                                            >
                                                <Merge className="w-3 h-3" />
                                                {t('conflict.acceptBoth')}
                                            </button>
                                            {block.choice !== 'none' && <Check className="w-4 h-4" style={{ color: 'hsl(152, 60%, 45%)' }} />}
                                        </div>

                                        {/* Two-column diff */}
                                        <div className="grid grid-cols-2" style={{ minHeight: '60px' }}>
                                            {/* Ours */}
                                            <div style={{ borderRight: '1px solid var(--border-default)' }}>
                                                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: 'hsla(210, 70%, 55%, 0.08)', color: 'hsl(210, 70%, 55%)', borderBottom: '1px solid var(--border-default)' }}>
                                                    {t('conflict.ours')}
                                                </div>
                                                <pre className="p-2 text-[11px] leading-5 font-mono m-0 overflow-x-auto" style={{
                                                    color: 'var(--text-primary)',
                                                    backgroundColor: block.choice === 'ours' || block.choice === 'both' ? 'hsla(210, 70%, 55%, 0.05)' : 'transparent',
                                                    whiteSpace: 'pre-wrap', wordBreak: 'break-all'
                                                }}>
                                                    {block.ours || '(empty)'}
                                                </pre>
                                            </div>
                                            {/* Theirs */}
                                            <div>
                                                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: 'hsla(270, 60%, 55%, 0.08)', color: 'hsl(270, 60%, 55%)', borderBottom: '1px solid var(--border-default)' }}>
                                                    {t('conflict.theirs')}
                                                </div>
                                                <pre className="p-2 text-[11px] leading-5 font-mono m-0 overflow-x-auto" style={{
                                                    color: 'var(--text-primary)',
                                                    backgroundColor: block.choice === 'theirs' || block.choice === 'both' ? 'hsla(270, 60%, 55%, 0.05)' : 'transparent',
                                                    whiteSpace: 'pre-wrap', wordBreak: 'break-all'
                                                }}>
                                                    {block.theirs || '(empty)'}
                                                </pre>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer actions */}
                            <div className="flex items-center gap-3 px-4 py-2.5 shrink-0" style={{ borderTop: '1px solid var(--border-default)', backgroundColor: 'var(--bg-tree-header)' }}>
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {blocks.filter(b => b.choice !== 'none').length} / {blocks.length} conflicts resolved
                                </span>
                                <div className="flex-1" />
                                <button onClick={handleResolve}
                                    disabled={!allBlocksChosen || saving}
                                    className="px-4 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                                    style={{
                                        backgroundColor: allBlocksChosen ? 'var(--accent)' : 'var(--bg-input)',
                                        color: allBlocksChosen ? 'var(--text-inverse)' : 'var(--text-muted)',
                                        opacity: saving ? 0.6 : 1,
                                        cursor: allBlocksChosen && !saving ? 'pointer' : 'not-allowed',
                                    }}
                                >
                                    <Check className="w-3.5 h-3.5" />
                                    {saving ? t('conflict.saving') : t('conflict.resolve')}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center gap-2" style={{ color: 'var(--text-muted)' }}>
                            <CheckCircle2 className="w-8 h-8" style={{ color: 'hsl(152, 60%, 50%)' }} />
                            <span className="text-sm">{allResolved ? t('conflict.allResolved') : t('conflict.noConflicts')}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
