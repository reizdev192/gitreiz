import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { invoke } from '@tauri-apps/api/core';
import { useProjectStore } from '../store/useProjectStore';
import { useI18n } from '../i18n/useI18n';
import { useConfirmStore } from '../store/useConfirmStore';
import { GitCommitHorizontal, ChevronDown, Copy, Tag, GitBranch, RefreshCw, Loader2, List, GitGraph, User, Clock, Hash, GitFork, Search, X, Eye, Cherry, TerminalSquare } from 'lucide-react';
import { DiffViewer } from './DiffViewer';
import { useCustomActionsStore, type CustomAction } from '../store/useCustomActionsStore';
import { ActionConfirmDialog } from './ActionConfirmDialog';


interface CommitInfo {
    hash: string;
    short_hash: string;
    author: string;
    email: string;
    date: string;
    date_relative: string;
    message: string;
    body: string;
    refs: string;
    parents: string[];
}

interface GraphLine {
    fromCol: number;
    toCol: number;
    color: string;
    type: 'straight' | 'curve';
}

interface GraphNode {
    commit: CommitInfo;
    column: number;
    maxCol: number;
    lines: GraphLine[];
}

const GRAPH_COLORS = [
    '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#f97316', '#14b8a6',
];

function computeGraph(commits: CommitInfo[]): GraphNode[] {
    const hashIdx = new Map<string, number>();
    commits.forEach((c, i) => hashIdx.set(c.hash, i));

    // activeLanes[col] = hash we're waiting for in that column
    let activeLanes: (string | null)[] = [];
    const result: GraphNode[] = [];

    for (let i = 0; i < commits.length; i++) {
        const c = commits[i];
        const visibleParents = c.parents.filter(p => hashIdx.has(p));

        // Find which column this commit lands in
        let col = activeLanes.indexOf(c.hash);
        if (col === -1) {
            // New branch starting — take first empty slot or append
            const emptySlot = activeLanes.indexOf(null);
            col = emptySlot !== -1 ? emptySlot : activeLanes.length;
            if (col === activeLanes.length) activeLanes.push(null);
        }

        // Snapshot lanes BEFORE modification for drawing passthrough
        const lanesBefore = [...activeLanes];

        // Clear this commit's slot
        activeLanes[col] = null;

        // Collect columns that had duplicates of this hash (branches converging)
        const dupeColumns: number[] = [];
        for (let l = 0; l < activeLanes.length; l++) {
            if (activeLanes[l] === c.hash) {
                dupeColumns.push(l);
                activeLanes[l] = null;
            }
        }

        // Place parents
        const parentCols: number[] = [];
        for (let p = 0; p < visibleParents.length; p++) {
            const pHash = visibleParents[p];
            // Check if this parent is already waited for in another lane
            const existingLane = activeLanes.indexOf(pHash);
            if (existingLane !== -1) {
                parentCols.push(existingLane);
            } else if (p === 0) {
                // First parent reuses this commit's column
                activeLanes[col] = pHash;
                parentCols.push(col);
            } else {
                // Secondary parents: reuse a dupe column or find empty or append
                let slot = dupeColumns.shift();
                if (slot === undefined) {
                    slot = activeLanes.indexOf(null);
                    if (slot === -1) {
                        slot = activeLanes.length;
                        activeLanes.push(null);
                    }
                }
                activeLanes[slot] = pHash;
                parentCols.push(slot);
            }
        }

        // Trim trailing nulls
        while (activeLanes.length > 0 && activeLanes[activeLanes.length - 1] === null) {
            activeLanes.pop();
        }

        // Build lines for this row
        const lines: GraphLine[] = [];
        const maxCol = Math.max(col, ...parentCols, lanesBefore.length - 1, activeLanes.length - 1);

        // 1) Passthrough: lanes that existed before and still exist, not this commit
        for (let l = 0; l < lanesBefore.length; l++) {
            if (l === col) continue; // this commit's column handled separately
            if (dupeColumns.includes(l)) continue; // converging lanes
            if (lanesBefore[l] !== null && activeLanes[l] !== undefined && activeLanes[l] !== null) {
                lines.push({
                    fromCol: l, toCol: l,
                    color: GRAPH_COLORS[l % GRAPH_COLORS.length],
                    type: 'straight',
                });
            }
        }

        // 2) This commit → its parents
        for (const pCol of parentCols) {
            lines.push({
                fromCol: col, toCol: pCol,
                color: GRAPH_COLORS[col % GRAPH_COLORS.length],
                type: col === pCol ? 'straight' : 'curve',
            });
        }

        // 3) Converging dupe lanes → this commit
        for (const dc of dupeColumns) {
            lines.push({
                fromCol: dc, toCol: col,
                color: GRAPH_COLORS[dc % GRAPH_COLORS.length],
                type: 'curve',
            });
        }

        result.push({ commit: c, column: col, maxCol, lines });
    }

    return result;
}

export function CommitPanel() {
    const { projects, selectedProjectId, gitStateVersion, bumpGitState, appendLog, openTerminalBar } = useProjectStore();
    const project = projects.find(p => p.id === selectedProjectId);
    const { actions, loadActions } = useCustomActionsStore();
    const { t } = useI18n();

    const [commits, setCommits] = useState<CommitInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [branches, setBranches] = useState<string[]>([]);
    const [currentBranch, setCurrentBranch] = useState('');
    const [selectedBranch, setSelectedBranch] = useState<string>('__current__');
    const [showBranchMenu, setShowBranchMenu] = useState(false);
    const [copiedHash, setCopiedHash] = useState('');
    const [diffHash, setDiffHash] = useState<string | null>(null);
    const [commitCtx, setCommitCtx] = useState<{ x: number; y: number; commit: CommitInfo } | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'graph'>(() => {
        return (localStorage.getItem('commit-view-mode') as 'list' | 'graph') || 'graph';
    });
    const [tooltip, setTooltip] = useState<{ x: number; y: number; commit: CommitInfo } | null>(null);
    const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [pendingAction, setPendingAction] = useState<{ action: CustomAction, renderedScript: string } | null>(null);

    useEffect(() => { loadActions(); }, [loadActions]);


    const handleSearchChange = (val: string) => {
        setSearchQuery(val);
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => setDebouncedQuery(val), 300);
    };

    const showTooltip = (e: React.MouseEvent, c: CommitInfo) => {
        if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
        tooltipTimeoutRef.current = setTimeout(() => {
            setTooltip({ x: e.clientX, y: e.clientY, commit: c });
        }, 400);
    };
    const hideTooltip = () => {
        if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
        setTooltip(null);
    };

    const fetchBranches = useCallback(async () => {
        if (!project) return;
        try {
            const list: string[] = await invoke('list_branches_cmd', { repoPath: project.path });
            setBranches(list.filter(b => !b.startsWith('origin/')));
            const current: string = await invoke('get_current_branch_cmd', { repoPath: project.path });
            setCurrentBranch(current);
        } catch (e) {
            console.error('Failed to fetch branches:', e);
        }
    }, [project?.path, gitStateVersion]);

    const fetchCommits = useCallback(async () => {
        if (!project) return;
        setLoading(true);
        try {
            let branch: string | null = null;
            if (selectedBranch === '__current__') {
                branch = currentBranch || null;
            } else if (selectedBranch !== '__all__') {
                branch = selectedBranch;
            }

            let data: CommitInfo[];
            if (debouncedQuery.trim()) {
                data = await invoke('search_commits_cmd', {
                    repoPath: project.path,
                    query: debouncedQuery.trim(),
                    author: null,
                    branch,
                    limit: 150,
                });
            } else {
                data = await invoke('list_commits_cmd', {
                    repoPath: project.path,
                    branch,
                    limit: 150,
                });
            }
            setCommits(data);
        } catch (e) {
            console.error('Failed to fetch commits:', e);
        } finally {
            setLoading(false);
        }
    }, [project?.path, selectedBranch, currentBranch, gitStateVersion, debouncedQuery]);

    useEffect(() => { fetchBranches(); }, [fetchBranches]);
    useEffect(() => { fetchCommits(); }, [fetchCommits]);

    const graphNodes = useMemo(() => computeGraph(commits), [commits]);
    const maxColumns = useMemo(() => Math.max(1, ...graphNodes.map(n => n.maxCol + 1)), [graphNodes]);

    const copyHash = (hash: string) => {
        navigator.clipboard.writeText(hash);
        setCopiedHash(hash);
        setTimeout(() => setCopiedHash(''), 1500);
    };

    const handleCherryPick = async (hash: string) => {
        if (!project) return;
        if (!await useConfirmStore.getState().confirm({ message: t('commits.cherryPickConfirm'), title: t('common.warning') })) return;
        try {
            await invoke<string>('cherry_pick_cmd', { repoPath: project.path, hash });
            bumpGitState();
        } catch (e: any) {
            alert(`Cherry-pick failed: ${e}`);
        }
    };

    const handleExecuteCustomAction = async () => {
        if (!pendingAction || !project) return;
        const toRun = pendingAction;
        setPendingAction(null);
        setLoading(true);
        appendLog(`[GIT] Executing custom action: ${toRun.action.name}\n`);
        openTerminalBar();
        try {
            const result = await invoke<string>('execute_custom_action', { cwd: project.path, script: toRun.renderedScript });
            appendLog(`[GIT] ${result}\n`);
            bumpGitState();
            fetchCommits();
        } catch (e: any) {
            appendLog(`[ERROR] Action failed: ${e}\n`);
            alert(`Custom action failed: ${e}`);
        } finally {
            setLoading(false);
        }
    };


    const parseRefs = (refs: string): { branches: string[]; tags: string[] } => {
        if (!refs.trim()) return { branches: [], tags: [] };
        const parts = refs.split(',').map(r => r.trim());
        const branchList: string[] = [];
        const tagList: string[] = [];
        for (const part of parts) {
            if (part.startsWith('tag: ')) {
                tagList.push(part.replace('tag: ', ''));
            } else if (part !== 'HEAD' && !part.startsWith('HEAD ->')) {
                const clean = part.replace('HEAD -> ', '');
                if (clean) branchList.push(clean);
            } else if (part.startsWith('HEAD ->')) {
                branchList.push(part.replace('HEAD -> ', ''));
            }
        }
        return { branches: branchList, tags: tagList };
    };

    const branchLabel = selectedBranch === '__current__'
        ? (currentBranch || '...')
        : selectedBranch === '__all__'
            ? t('commits.allBranches')
            : selectedBranch;

    if (!project) return null;

    const ROW_H = 36;
    const COL_W = 16;
    const GRAPH_PAD = 12;
    const graphWidth = GRAPH_PAD + maxColumns * COL_W + 8;

    return (
        <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-panel)', color: 'var(--text-primary)' }}>
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-tree-header)' }}>
                <GitCommitHorizontal className="w-3.5 h-3.5" style={{ color: 'var(--text-accent)' }} />
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {t('commits.title')}
                </span>

                <div className="flex-1" />

                {/* View mode toggle */}
                <div className="flex rounded overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
                    <button
                        onClick={() => { setViewMode('list'); localStorage.setItem('commit-view-mode', 'list'); }}
                        className="px-2 py-1 text-[10px] transition-colors flex items-center gap-1"
                        style={{ backgroundColor: viewMode === 'list' ? 'var(--accent-muted)' : 'transparent', color: viewMode === 'list' ? 'var(--text-accent)' : 'var(--text-muted)' }}
                    >
                        <List className="w-3 h-3" />
                    </button>
                    <button
                        onClick={() => { setViewMode('graph'); localStorage.setItem('commit-view-mode', 'graph'); }}
                        className="px-2 py-1 text-[10px] transition-colors flex items-center gap-1"
                        style={{ backgroundColor: viewMode === 'graph' ? 'var(--accent-muted)' : 'transparent', color: viewMode === 'graph' ? 'var(--text-accent)' : 'var(--text-muted)', borderLeft: '1px solid var(--border-default)' }}
                    >
                        <GitGraph className="w-3 h-3" />
                    </button>
                </div>

                {/* Branch selector */}
                <div className="relative">
                    <button
                        onClick={() => setShowBranchMenu(!showBranchMenu)}
                        className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors"
                        style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
                    >
                        <GitBranch className="w-3 h-3" style={{ color: 'var(--text-accent)' }} />
                        <span className="truncate max-w-[140px]">{branchLabel}</span>
                        <ChevronDown className="w-3 h-3" style={{ color: 'var(--text-muted)', transform: showBranchMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </button>

                    {showBranchMenu && (
                        <div className="absolute right-0 top-full mt-1 rounded-lg overflow-hidden shadow-2xl z-[9999]"
                            style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-default)', minWidth: '200px', maxHeight: '300px', overflowY: 'auto' }}>
                            <button
                                onClick={() => { setSelectedBranch('__current__'); setShowBranchMenu(false); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors"
                                style={{ backgroundColor: selectedBranch === '__current__' ? 'var(--accent-muted)' : 'transparent', color: selectedBranch === '__current__' ? 'var(--text-accent)' : 'var(--text-primary)' }}
                                onMouseEnter={e => { if (selectedBranch !== '__current__') e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                                onMouseLeave={e => { if (selectedBranch !== '__current__') e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                                ● {t('commits.currentBranch')} ({currentBranch})
                            </button>
                            <button
                                onClick={() => { setSelectedBranch('__all__'); setShowBranchMenu(false); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors"
                                style={{ backgroundColor: selectedBranch === '__all__' ? 'var(--accent-muted)' : 'transparent', color: selectedBranch === '__all__' ? 'var(--text-accent)' : 'var(--text-primary)', borderBottom: '1px solid var(--border-default)' }}
                                onMouseEnter={e => { if (selectedBranch !== '__all__') e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                                onMouseLeave={e => { if (selectedBranch !== '__all__') e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                                ◎ {t('commits.allBranches')}
                            </button>
                            {branches.map(b => (
                                <button key={b}
                                    onClick={() => { setSelectedBranch(b); setShowBranchMenu(false); }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors"
                                    style={{ backgroundColor: selectedBranch === b ? 'var(--accent-muted)' : 'transparent', color: selectedBranch === b ? 'var(--text-accent)' : 'var(--text-primary)' }}
                                    onMouseEnter={e => { if (selectedBranch !== b) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                                    onMouseLeave={e => { if (selectedBranch !== b) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                >
                                    <GitBranch className="w-3 h-3 shrink-0" style={{ color: 'var(--text-muted)' }} />
                                    <span className="truncate">{b}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button onClick={fetchCommits} className="p-1 rounded transition-colors" style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    title={t('git.refresh')}>
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Search bar */}
            <div className="flex items-center gap-2 px-3 py-1.5 shrink-0" style={{ borderBottom: '1px solid var(--border-default)' }}>
                <Search className="w-3 h-3 shrink-0" style={{ color: 'var(--text-muted)' }} />
                <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={e => handleSearchChange(e.target.value)}
                    placeholder={t('commits.searchPlaceholder')}
                    className="flex-1 bg-transparent border-none outline-none text-xs"
                    style={{ color: 'var(--text-primary)' }}
                />
                {searchQuery && (
                    <>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'var(--accent-muted)', color: 'var(--text-accent)' }}>
                            {commits.length}
                        </span>
                        <button onClick={() => handleSearchChange('')} className="p-0.5 rounded transition-colors" style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                            <X className="w-3 h-3" />
                        </button>
                    </>
                )}
            </div>

            {/* Commit list */}
            <div className="flex-1 overflow-y-auto min-h-0">
                {loading ? (
                    <div className="flex items-center justify-center py-12 gap-2" style={{ color: 'var(--text-muted)' }}>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-xs">{t('commits.loading')}</span>
                    </div>
                ) : commits.length === 0 ? (
                    <div className="flex items-center justify-center py-12 italic text-xs" style={{ color: 'var(--text-muted)' }}>
                        {t('commits.noCommits')}
                    </div>
                ) : viewMode === 'list' ? (
                    /* ────── LIST VIEW ────── */
                    <div>
                        {commits.map((c) => {
                            const { branches: refBranches, tags: refTags } = parseRefs(c.refs);
                            return (
                                <div key={c.hash} className="px-3 py-2 transition-colors group cursor-pointer"
                                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; showTooltip(e, c); }}
                                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; hideTooltip(); }}
                                    onMouseMove={e => { if (tooltip) setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null); }}
                                    onDoubleClick={() => { hideTooltip(); setDiffHash(c.hash); }}
                                    onContextMenu={e => { e.preventDefault(); hideTooltip(); setCommitCtx({ x: e.clientX, y: e.clientY, commit: c }); }}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <button
                                            onClick={() => copyHash(c.hash)}
                                            className="flex items-center gap-1 font-mono text-[11px] rounded px-1 py-0.5 transition-colors shrink-0"
                                            style={{ color: 'var(--text-accent)', backgroundColor: 'var(--accent-muted)' }}
                                            title={copiedHash === c.hash ? '✓' : t('commits.copyHash')}
                                        >
                                            {c.short_hash}
                                            <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                        {refBranches.map(b => (
                                            <span key={b} className="text-[10px] px-1.5 py-0.5 rounded-full font-medium truncate max-w-[120px]"
                                                style={{ backgroundColor: 'var(--accent-muted)', color: 'var(--text-accent)', border: '1px solid var(--accent)' }}>
                                                {b}
                                            </span>
                                        ))}
                                        {refTags.map(tg => (
                                            <span key={tg} className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium truncate max-w-[120px]"
                                                style={{ backgroundColor: 'rgba(250, 204, 21, 0.15)', color: '#facc15', border: '1px solid rgba(250, 204, 21, 0.3)' }}>
                                                <Tag className="w-2.5 h-2.5" />{tg}
                                            </span>
                                        ))}
                                        <span className="flex-1" />
                                        <span className="text-[10px] shrink-0" style={{ color: 'var(--text-muted)' }}>{c.date_relative}</span>
                                    </div>
                                    <div className="text-xs truncate mb-0.5" style={{ color: 'var(--text-primary)' }}>{c.message}</div>
                                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{c.author}</div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* ────── GRAPH VIEW ────── */
                    <div style={{ position: 'relative' }}>
                        {graphNodes.map((node) => {
                            const { branches: refBranches, tags: refTags } = parseRefs(node.commit.refs);
                            const dotColor = GRAPH_COLORS[node.column % GRAPH_COLORS.length];
                            const isMerge = node.commit.parents.length > 1;

                            return (
                                <div key={node.commit.hash} className="flex items-stretch group transition-colors"
                                    style={{ height: `${ROW_H}px`, borderBottom: '1px solid var(--border-subtle)' }}
                                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; showTooltip(e, node.commit); }}
                                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; hideTooltip(); }}
                                    onMouseMove={e => { if (tooltip) setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null); }}
                                    onDoubleClick={() => { hideTooltip(); setDiffHash(node.commit.hash); }}
                                    onContextMenu={e => { e.preventDefault(); hideTooltip(); setCommitCtx({ x: e.clientX, y: e.clientY, commit: node.commit }); }}>

                                    {/* Graph lane SVG */}
                                    <div className="shrink-0" style={{ width: `${graphWidth}px`, position: 'relative' }}>
                                        <svg width={graphWidth} height={ROW_H} style={{ display: 'block' }}>
                                            {/* Draw lines */}
                                            {node.lines.map((line, li) => {
                                                const x1 = GRAPH_PAD + line.fromCol * COL_W;
                                                const x2 = GRAPH_PAD + line.toCol * COL_W;

                                                if (line.type === 'straight') {
                                                    return <line key={li} x1={x1} y1={0} x2={x2} y2={ROW_H} stroke={line.color} strokeWidth={2} opacity={0.7} />;
                                                }
                                                // Curved merge/branch line
                                                const midY = ROW_H / 2;
                                                return (
                                                    <path key={li}
                                                        d={`M ${x1} ${midY} C ${x1} ${ROW_H * 0.85}, ${x2} ${ROW_H * 0.85}, ${x2} ${ROW_H}`}
                                                        stroke={line.color} strokeWidth={2} fill="none" opacity={0.7}
                                                    />
                                                );
                                            })}

                                            {/* Commit dot */}
                                            <circle
                                                cx={GRAPH_PAD + node.column * COL_W}
                                                cy={ROW_H / 2}
                                                r={isMerge ? 5 : 4}
                                                fill={dotColor}
                                                stroke={isMerge ? 'var(--bg-panel)' : 'none'}
                                                strokeWidth={isMerge ? 2 : 0}
                                            />
                                            {isMerge && (
                                                <circle
                                                    cx={GRAPH_PAD + node.column * COL_W}
                                                    cy={ROW_H / 2}
                                                    r={2}
                                                    fill="var(--bg-panel)"
                                                />
                                            )}
                                        </svg>
                                    </div>

                                    {/* Commit info */}
                                    <div className="flex-1 min-w-0 flex items-center gap-2 pr-3">
                                        {/* Hash */}
                                        <button
                                            onClick={() => copyHash(node.commit.hash)}
                                            className="font-mono text-[10px] rounded px-1 py-0.5 shrink-0 transition-colors"
                                            style={{ color: dotColor, backgroundColor: `${dotColor}18` }}
                                            title={copiedHash === node.commit.hash ? '✓' : t('commits.copyHash')}
                                        >
                                            {node.commit.short_hash}
                                        </button>

                                        {/* Refs badges */}
                                        {refBranches.map(b => (
                                            <span key={b} className="text-[9px] px-1.5 py-0.5 rounded-full font-bold truncate max-w-[100px] shrink-0"
                                                style={{ backgroundColor: 'var(--accent-muted)', color: 'var(--text-accent)', border: '1px solid var(--accent)' }}>
                                                {b}
                                            </span>
                                        ))}
                                        {refTags.map(tg => (
                                            <span key={tg} className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold truncate max-w-[100px] shrink-0"
                                                style={{ backgroundColor: 'rgba(250,204,21,0.15)', color: '#facc15', border: '1px solid rgba(250,204,21,0.3)' }}>
                                                <Tag className="w-2 h-2" />{tg}
                                            </span>
                                        ))}

                                        {/* Message */}
                                        <span className="text-[11px] truncate flex-1 min-w-0" style={{ color: 'var(--text-primary)' }}>
                                            {node.commit.message}
                                        </span>

                                        {/* Author + date */}
                                        <span className="text-[10px] shrink-0 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                                            {node.commit.author}
                                        </span>
                                        <span className="text-[9px] shrink-0 whitespace-nowrap" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
                                            {node.commit.date_relative}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Rich Tooltip via Portal */}
            {tooltip && (() => {
                const c = tooltip.commit;
                const { branches: refB, tags: refT } = parseRefs(c.refs);
                return createPortal(
                    <div className="fixed z-[9998] rounded-xl overflow-hidden shadow-2xl pointer-events-none" style={{
                        left: `${Math.min(tooltip.x + 12, window.innerWidth - 340)}px`,
                        top: `${Math.min(tooltip.y + 12, window.innerHeight - 300)}px`,
                        backgroundColor: 'var(--bg-panel)',
                        border: '1px solid var(--border-default)',
                        minWidth: '300px',
                        maxWidth: '380px',
                    }}>
                        <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-tree-header)' }}>
                            <GitCommitHorizontal className="w-3.5 h-3.5" style={{ color: 'var(--text-accent)' }} />
                            <span className="text-[12px] font-bold font-mono" style={{ color: 'var(--text-accent)' }}>{c.short_hash}</span>
                            {c.parents.length > 1 && (
                                <span className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold ml-auto" style={{ backgroundColor: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}>MERGE</span>
                            )}
                        </div>
                        <div className="px-3 py-2 space-y-2.5">
                            <div>
                                <div className="text-[12px] font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>{c.message}</div>
                                {c.body && <div className="text-[10px] mt-1 leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)', maxHeight: '80px', overflow: 'hidden' }}>{c.body}</div>}
                            </div>
                            <div className="flex items-center gap-2">
                                <User className="w-3 h-3 shrink-0" style={{ color: 'var(--text-muted)' }} />
                                <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{c.author}</span>
                                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>&lt;{c.email}&gt;</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3 shrink-0" style={{ color: 'var(--text-muted)' }} />
                                <span className="text-[11px] font-mono" style={{ color: 'var(--text-secondary)' }}>{c.date}</span>
                                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>({c.date_relative})</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Hash className="w-3 h-3 shrink-0" style={{ color: 'var(--text-muted)' }} />
                                <span className="text-[10px] font-mono break-all" style={{ color: 'var(--text-muted)' }}>{c.hash}</span>
                            </div>
                            {c.parents.length > 0 && (
                                <div className="flex items-start gap-2">
                                    <GitFork className="w-3 h-3 shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
                                    <div className="flex flex-wrap gap-1">
                                        {c.parents.map(p => (
                                            <span key={p} className="text-[10px] font-mono px-1 rounded" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}>{p.slice(0, 7)}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {(refB.length > 0 || refT.length > 0) && (
                                <div className="flex flex-wrap gap-1.5">
                                    {refB.map(b => (
                                        <span key={b} className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'var(--accent-muted)', color: 'var(--text-accent)', border: '1px solid var(--accent)' }}>{b}</span>
                                    ))}
                                    {refT.map(tg => (
                                        <span key={tg} className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'rgba(250,204,21,0.15)', color: '#facc15', border: '1px solid rgba(250,204,21,0.3)' }}>
                                            <Tag className="w-2 h-2" />{tg}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="px-3 py-1.5 text-[9px] italic" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-default)', backgroundColor: 'var(--bg-tree-header)' }}>
                            Double-click → view diff · Right-click → cherry-pick
                        </div>
                    </div>,
                    document.body
                );
            })()}

            {/* Commit Context Menu */}
            {commitCtx && createPortal(
                <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => setCommitCtx(null)} />
                    <div className="fixed z-[9999] rounded-lg overflow-hidden shadow-2xl" style={{
                        left: `${commitCtx.x}px`, top: `${commitCtx.y}px`,
                        backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-default)',
                        minWidth: '200px',
                    }}>
                        <div className="px-3 py-1.5 text-[10px] font-mono truncate" style={{ borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-tree-header)' }}>
                            {commitCtx.commit.short_hash} — {commitCtx.commit.message.slice(0, 50)}
                        </div>
                        {[
                            { icon: <Copy className="w-3.5 h-3.5" />, label: t('commits.copyHash'), action: () => { copyHash(commitCtx.commit.hash); setCommitCtx(null); } },
                            { icon: <Eye className="w-3.5 h-3.5" />, label: t('diff.title'), action: () => { setDiffHash(commitCtx.commit.hash); setCommitCtx(null); } },
                            { icon: <Cherry className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />, label: t('commits.cherryPick'), action: () => { setCommitCtx(null); handleCherryPick(commitCtx.commit.hash); }, danger: true },
                            ...(actions.filter(a => a.context?.trim().toLowerCase() === 'commit').length > 0 ? [{ divider: true }] : []),
                            ...actions.filter(a => a.context?.trim().toLowerCase() === 'commit').map(action => ({
                                icon: <TerminalSquare className="w-3.5 h-3.5" />,
                                label: action.name,
                                action: () => {
                                    setCommitCtx(null);
                                    const script = action.script
                                        .replace(/{TARGET_COMMIT}/g, commitCtx.commit.hash)
                                        .replace(/{CURRENT_BRANCH}/g, currentBranch)
                                        .replace(/{TARGET_BRANCH}/g, selectedBranch !== '__all__' && selectedBranch !== '__current__' ? selectedBranch : currentBranch)
                                        .replace(/{REPO_PATH}/g, project!.path);
                                    setPendingAction({ action, renderedScript: script });
                                }
                            }))
                        ].map((item, i) => item.divider ? (
                            <div key={`div-${i}`} style={{ borderTop: '1px solid var(--border-default)', margin: '2px 0' }} />
                        ) : (
                            <button key={i} onClick={(item as any).action}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors text-left"
                                style={{ color: (item as any).danger ? '#ef4444' : 'var(--text-primary)' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                {item.icon}
                                {item.label}
                            </button>
                        ))}
                    </div>
                </>,
                document.body
            )}

            {/* Custom Action Confirm Dialog */}
            {pendingAction && (
                <ActionConfirmDialog
                    action={pendingAction.action}
                    renderedScript={pendingAction.renderedScript}
                    onConfirm={handleExecuteCustomAction}
                    onClose={() => setPendingAction(null)}
                />
            )}

            {/* DiffViewer Modal */}
            {diffHash && <DiffViewer hash={diffHash} onClose={() => setDiffHash(null)} />}
        </div>
    );
}
