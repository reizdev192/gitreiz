import { useState, useCallback, useMemo, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useProjectStore } from '../store/useProjectStore';
import { useI18n } from '../i18n/useI18n';
import { X, FileText, Plus, Minus, Code2, Diff, RefreshCw } from 'lucide-react';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark-dimmed.css';
import { useEscClose } from '../hooks/useEscClose';

interface DiffFile { path: string; status: string; insertions: number; deletions: number; }

interface DiffLine {
    type: 'add' | 'remove' | 'context' | 'header';
    content: string;
    oldLine: number | null;
    newLine: number | null;
}

// Map file extension → highlight.js language
const EXT_LANG: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rs: 'rust', go: 'go', java: 'java', kt: 'kotlin', kts: 'kotlin',
    rb: 'ruby', php: 'php', cs: 'csharp', cpp: 'cpp', c: 'c', h: 'c', hpp: 'cpp',
    swift: 'swift', dart: 'dart', scala: 'scala', sh: 'bash', bash: 'bash', zsh: 'bash',
    html: 'xml', htm: 'xml', xml: 'xml', svg: 'xml', vue: 'xml',
    css: 'css', scss: 'scss', less: 'less', sass: 'scss',
    json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'ini', ini: 'ini',
    md: 'markdown', sql: 'sql', r: 'r', lua: 'lua', perl: 'perl', pl: 'perl',
    dockerfile: 'dockerfile', makefile: 'makefile',
    graphql: 'graphql', gql: 'graphql', proto: 'protobuf',
    ex: 'elixir', exs: 'elixir', erl: 'erlang', hs: 'haskell',
    tf: 'hcl', groovy: 'groovy', gradle: 'groovy',
    ps1: 'powershell', bat: 'dos', cmd: 'dos',
    m: 'objectivec', mm: 'objectivec',
    zig: 'zig', nim: 'nimrod', v: 'verilog',
    clj: 'clojure', cljs: 'clojure', elm: 'elm',
};

function detectLang(filePath: string): string | undefined {
    const name = filePath.split('/').pop()?.toLowerCase() || '';
    // Handle files like Dockerfile, Makefile etc.
    if (name === 'dockerfile') return 'dockerfile';
    if (name === 'makefile' || name === 'gnumakefile') return 'makefile';
    if (name.endsWith('.lock')) return 'json';
    const ext = name.split('.').pop() || '';
    return EXT_LANG[ext];
}

function highlightCode(code: string, lang: string | undefined): string {
    if (!code) return '';
    try {
        if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
        }
        // Auto-detect as fallback
        return hljs.highlightAuto(code).value;
    } catch {
        return escapeHtml(code);
    }
}

function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Highlight all lines at once to maintain syntax state across lines
function highlightLines(lines: string[], lang: string | undefined): string[] {
    const combined = lines.join('\n');
    const highlighted = highlightCode(combined, lang);
    return highlighted.split('\n');
}

function parseDiff(raw: string): DiffLine[] {
    const lines = raw.split('\n');
    const result: DiffLine[] = [];
    let oldLine = 0, newLine = 0;

    for (const line of lines) {
        if (line.startsWith('@@')) {
            const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
            if (match) {
                oldLine = parseInt(match[1]) - 1;
                newLine = parseInt(match[2]) - 1;
            }
            result.push({ type: 'header', content: line, oldLine: null, newLine: null });
        } else if (line.startsWith('diff ') || line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++') || line.startsWith('\\')) {
            // Skip metadata
        } else if (line.startsWith('+')) {
            newLine++;
            result.push({ type: 'add', content: line.substring(1), oldLine: null, newLine });
        } else if (line.startsWith('-')) {
            oldLine++;
            result.push({ type: 'remove', content: line.substring(1), oldLine, newLine: null });
        } else {
            oldLine++;
            newLine++;
            result.push({ type: 'context', content: line.startsWith(' ') ? line.substring(1) : line, oldLine, newLine });
        }
    }
    return result;
}

const lineStyles: Record<string, { bg: string; lineNumBg: string }> = {
    add: { bg: 'rgba(16,185,129,0.1)', lineNumBg: 'rgba(16,185,129,0.18)' },
    remove: { bg: 'rgba(239,68,68,0.1)', lineNumBg: 'rgba(239,68,68,0.18)' },
    context: { bg: 'transparent', lineNumBg: 'transparent' },
    header: { bg: 'rgba(59,130,246,0.08)', lineNumBg: 'rgba(59,130,246,0.12)' },
};

export function DiffViewer({ hash, onClose }: { hash: string; onClose: () => void }) {
    const { projects, selectedProjectId } = useProjectStore();
    const project = projects.find(p => p.id === selectedProjectId);
    const { t } = useI18n();
    useEscClose(onClose);

    const [files, setFiles] = useState<DiffFile[]>([]);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [diffContent, setDiffContent] = useState('');
    const [fullContent, setFullContent] = useState('');
    const [viewMode, setViewMode] = useState<'changes' | 'full'>('changes');
    const [loading, setLoading] = useState(true);

    const fetchFiles = useCallback(async () => {
        if (!project) return;
        setLoading(true);
        try {
            const data: DiffFile[] = await invoke('get_commit_files_cmd', { repoPath: project.path, hash });
            setFiles(data);
            if (data.length > 0) {
                setSelectedFile(data[0].path);
                const [diff, full] = await Promise.all([
                    invoke<string>('get_file_diff_cmd', { repoPath: project.path, hash, filePath: data[0].path }),
                    invoke<string>('get_file_content_at_commit_cmd', { repoPath: project.path, hash, filePath: data[0].path }).catch(() => ''),
                ]);
                setDiffContent(diff);
                setFullContent(full);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [project?.path, hash]);

    useState(() => { fetchFiles(); });

    const selectFile = async (path: string) => {
        if (!project) return;
        setSelectedFile(path);
        setLoading(true);
        try {
            const [diff, full] = await Promise.all([
                invoke<string>('get_file_diff_cmd', { repoPath: project.path, hash, filePath: path }),
                invoke<string>('get_file_content_at_commit_cmd', { repoPath: project.path, hash, filePath: path }).catch(() => ''),
            ]);
            setDiffContent(diff);
            setFullContent(full);
        } catch {
            setDiffContent('');
            setFullContent('');
        } finally {
            setLoading(false);
        }
    };

    const lang = useMemo(() => selectedFile ? detectLang(selectedFile) : undefined, [selectedFile]);

    const diffLines = useMemo(() => parseDiff(diffContent), [diffContent]);

    // Highlight diff lines — we extract content, highlight together, then map back
    const highlightedDiffLines = useMemo(() => {
        const contentLines = diffLines.filter(l => l.type !== 'header').map(l => l.content);
        const hlLines = highlightLines(contentLines, lang);
        let idx = 0;
        return diffLines.map(line => {
            if (line.type === 'header') {
                return { ...line, html: escapeHtml(line.content) };
            }
            return { ...line, html: hlLines[idx++] || escapeHtml(line.content) };
        });
    }, [diffLines, lang]);

    // Highlight full file lines
    const highlightedFullLines = useMemo(() => {
        if (!fullContent) return [];
        const lines = fullContent.split('\n');
        return highlightLines(lines, lang);
    }, [fullContent, lang]);

    const changedLineNumbers = useMemo(() => {
        const set = new Set<number>();
        for (const line of diffLines) {
            if (line.type === 'add' && line.newLine !== null) set.add(line.newLine);
        }
        return set;
    }, [diffLines]);

    const STATUS_COLOR: Record<string, string> = { M: '#facc15', A: '#10b981', D: '#ef4444', R: '#3b82f6' };

    // Override hljs background to transparent since we handle our own bg
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `.hljs { background: transparent !important; padding: 0 !important; }`;
        document.head.appendChild(style);
        return () => { document.head.removeChild(style); };
    }, []);

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
                <div className="flex-1 flex flex-col min-w-0">
                    {/* File header + view mode toggle + detected language badge */}
                    <div className="flex items-center gap-2 px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-tree-header)' }}>
                        <span className="text-xs font-mono flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                            {selectedFile || '—'}
                        </span>
                        {/* Detected language badge */}
                        {lang && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: 'rgba(99,102,241,0.12)', color: 'hsl(239, 60%, 65%)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                {lang}
                            </span>
                        )}
                        {/* View Mode Toggle */}
                        <div className="flex rounded-md overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
                            <button onClick={() => setViewMode('changes')}
                                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold transition-colors"
                                style={{
                                    backgroundColor: viewMode === 'changes' ? 'var(--accent)' : 'var(--bg-input)',
                                    color: viewMode === 'changes' ? 'var(--text-inverse)' : 'var(--text-muted)',
                                }}
                            >
                                <Diff className="w-3 h-3" />
                                {t('diff.changesOnly')}
                            </button>
                            <button onClick={() => setViewMode('full')}
                                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold transition-colors"
                                style={{
                                    backgroundColor: viewMode === 'full' ? 'var(--accent)' : 'var(--bg-input)',
                                    color: viewMode === 'full' ? 'var(--text-inverse)' : 'var(--text-muted)',
                                    borderLeft: '1px solid var(--border-default)',
                                }}
                            >
                                <Code2 className="w-3 h-3" />
                                {t('diff.fullFile')}
                            </button>
                        </div>
                    </div>

                    {/* Diff Content */}
                    <div className="flex-1 overflow-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
                                <RefreshCw className="w-5 h-5 animate-spin" />
                            </div>
                        ) : viewMode === 'changes' ? (
                            /* Changes Mode — diff with syntax highlighting */
                            <table className="w-full text-[11px] leading-5 font-mono border-collapse" style={{ minWidth: '100%' }}>
                                <tbody>
                                    {highlightedDiffLines.map((line, i) => {
                                        const style = lineStyles[line.type];
                                        return (
                                            <tr key={i} style={{ backgroundColor: style.bg }}>
                                                <td className="text-right select-none px-2 w-[1%] whitespace-nowrap"
                                                    style={{ color: 'var(--text-muted)', backgroundColor: style.lineNumBg, borderRight: '1px solid var(--border-default)', userSelect: 'none', fontSize: '10px', minWidth: '40px' }}>
                                                    {line.type === 'header' ? '···' : line.oldLine ?? ''}
                                                </td>
                                                <td className="text-right select-none px-2 w-[1%] whitespace-nowrap"
                                                    style={{ color: 'var(--text-muted)', backgroundColor: style.lineNumBg, borderRight: '1px solid var(--border-default)', userSelect: 'none', fontSize: '10px', minWidth: '40px' }}>
                                                    {line.type === 'header' ? '···' : line.newLine ?? ''}
                                                </td>
                                                <td className="text-center w-[1%] select-none" style={{
                                                    color: line.type === 'add' ? '#10b981' : line.type === 'remove' ? '#ef4444' : 'transparent',
                                                    fontWeight: 'bold', userSelect: 'none', width: '18px', fontSize: '11px',
                                                }}>
                                                    {line.type === 'add' ? '+' : line.type === 'remove' ? '−' : ' '}
                                                </td>
                                                <td className="px-2" style={{
                                                    whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                                                    fontStyle: line.type === 'header' ? 'italic' : 'normal',
                                                    fontWeight: line.type === 'header' ? '600' : 'normal',
                                                    color: line.type === 'header' ? 'hsl(210, 70%, 55%)' : undefined,
                                                }}
                                                    dangerouslySetInnerHTML={{ __html: line.html }}
                                                />
                                            </tr>
                                        );
                                    })}
                                    {highlightedDiffLines.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                                                {t('diff.noChanges')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        ) : (
                            /* Full File Mode — syntax highlighted with changed lines highlighted */
                            <table className="w-full text-[11px] leading-5 font-mono border-collapse" style={{ minWidth: '100%' }}>
                                <tbody>
                                    {highlightedFullLines.length > 0 ? highlightedFullLines.map((html, i) => {
                                        const lineNum = i + 1;
                                        const isChanged = changedLineNumbers.has(lineNum);
                                        return (
                                            <tr key={i} style={{ backgroundColor: isChanged ? 'rgba(16,185,129,0.1)' : 'transparent' }}>
                                                <td className="text-right select-none px-2 w-[1%] whitespace-nowrap"
                                                    style={{
                                                        color: 'var(--text-muted)',
                                                        backgroundColor: isChanged ? 'rgba(16,185,129,0.18)' : 'transparent',
                                                        borderRight: '1px solid var(--border-default)',
                                                        userSelect: 'none', fontSize: '10px', minWidth: '40px',
                                                    }}>
                                                    {lineNum}
                                                </td>
                                                <td className="px-3" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                                                    dangerouslySetInnerHTML={{ __html: html }}
                                                />
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={2} className="px-4 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                                                {t('diff.noChanges')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
