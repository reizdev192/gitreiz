import { useState, useEffect, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { BarChart3, Users, TrendingUp, Calendar, Clock, AlertTriangle, GitBranch, FileCode, RefreshCw, ChevronDown, Flame, Zap, Copy, Trash2, LogIn } from 'lucide-react';
import { useI18n } from '../i18n/useI18n';
import type { TranslationKey } from '../i18n/translations';

// ── Types ──

interface ContributorStats {
    author: string; email: string; commits: number; lines_added: number; lines_removed: number;
    files_changed: number; active_days: number; first_commit: string; last_commit: string; avg_commit_size: number;
}
interface HeatmapDay { date: string; count: number; }
interface HourActivity { hour: number; count: number; }
interface AuthorHourActivity { author: string; hours: HourActivity[]; }
interface BranchStats { name: string; author: string; age_days: number; commits_count: number; is_merged: boolean; last_commit_date: string; }
interface ChurnFile { path: string; times_modified: number; unique_authors: number; total_changes: number; }
interface CommitSizeInfo { hash: string; author: string; message: string; date: string; lines_added: number; lines_removed: number; total: number; }
interface AlertInfo { severity: string; alert_type: string; title: string; message: string; author: string | null; }

type DateRange = 'week' | 'month' | 'quarter' | 'year';
type SubTab = 'overview' | 'alerts' | 'activity' | 'branches';

const DATE_RANGE_KEYS: Record<DateRange, TranslationKey> = {
    week: 'perf.last7days',
    month: 'perf.thisMonth',
    quarter: 'perf.thisQuarter',
    year: 'perf.thisYear',
};

function getDateRange(range: DateRange): { from: Date; to: Date; since: string; days: number } {
    const now = new Date();
    let from: Date;
    if (range === 'week') {
        from = new Date(now); from.setDate(from.getDate() - 7);
    } else if (range === 'month') {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (range === 'quarter') {
        const qMonth = Math.floor(now.getMonth() / 3) * 3;
        from = new Date(now.getFullYear(), qMonth, 1);
    } else {
        from = new Date(now.getFullYear(), 0, 1);
    }
    const diffMs = now.getTime() - from.getTime();
    const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    return { from, to: now, since: `${days} days ago`, days };
}

// ── Component ──

export function PerformanceTab({ repoPath }: { repoPath: string }) {
    const { t } = useI18n();
    const [subTab, setSubTab] = useState<SubTab>('overview');
    const [range, setRange] = useState<DateRange>('month');
    const [selectedAuthor, setSelectedAuthor] = useState<string>('');
    const [showRangeMenu, setShowRangeMenu] = useState(false);
    const [loadedTabs, setLoadedTabs] = useState<Set<SubTab>>(new Set());

    const [contributors, setContributors] = useState<ContributorStats[]>([]);
    const [churnFiles, setChurnFiles] = useState<ChurnFile[]>([]);
    const [commitSizes, setCommitSizes] = useState<CommitSizeInfo[]>([]);
    const [alerts, setAlerts] = useState<AlertInfo[]>([]);
    const [heatmap, setHeatmap] = useState<HeatmapDay[]>([]);
    const [activeHours, setActiveHours] = useState<AuthorHourActivity[]>([]);
    const [branches, setBranches] = useState<BranchStats[]>([]);
    const [tabLoading, setTabLoading] = useState(false);

    const { from: rangeFrom, to: rangeTo, since, days } = useMemo(() => getDateRange(range), [range]);

    const dateRangeLabel = useMemo(() => {
        const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        return `${fmt(rangeFrom)} — ${fmt(rangeTo)}`;
    }, [rangeFrom, rangeTo]);

    const subTabs: { key: SubTab; labelKey: TranslationKey; icon: React.ReactNode }[] = [
        { key: 'overview', labelKey: 'perf.overview', icon: <BarChart3 className="w-3.5 h-3.5" /> },
        { key: 'alerts', labelKey: 'perf.alertsTeam', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
        { key: 'activity', labelKey: 'perf.activity', icon: <Calendar className="w-3.5 h-3.5" /> },
        { key: 'branches', labelKey: 'perf.branches', icon: <GitBranch className="w-3.5 h-3.5" /> },
    ];

    const fetchTab = useCallback(async (tab: SubTab, force = false) => {
        if (!force && loadedTabs.has(tab)) return;
        setTabLoading(true);
        try {
            if (tab === 'overview') {
                const [stats, churn, sizes] = await Promise.all([
                    invoke<ContributorStats[]>('get_contributor_stats_cmd', { repoPath, since }).catch(() => []),
                    invoke<ChurnFile[]>('get_code_churn_cmd', { repoPath, days }).catch(() => []),
                    invoke<CommitSizeInfo[]>('get_commit_sizes_cmd', { repoPath, since, limit: 200 }).catch(() => []),
                ]);
                setContributors(stats); setChurnFiles(churn); setCommitSizes(sizes);
            } else if (tab === 'alerts') {
                const [stats, al] = await Promise.all([
                    invoke<ContributorStats[]>('get_contributor_stats_cmd', { repoPath, since }).catch(() => []),
                    invoke<AlertInfo[]>('get_smart_alerts_cmd', { repoPath }).catch(() => []),
                ]);
                setContributors(stats); setAlerts(al);
            } else if (tab === 'activity') {
                const [heat, hours] = await Promise.all([
                    invoke<HeatmapDay[]>('get_commit_heatmap_cmd', { repoPath, author: selectedAuthor || null }).catch(() => []),
                    invoke<AuthorHourActivity[]>('get_active_hours_cmd', { repoPath, since }).catch(() => []),
                ]);
                setHeatmap(heat); setActiveHours(hours);
            } else if (tab === 'branches') {
                const br = await invoke<BranchStats[]>('get_branch_lifecycle_cmd', { repoPath }).catch(() => []);
                setBranches(br);
            }
            setLoadedTabs(prev => new Set(prev).add(tab));
        } catch (e) { console.error('Failed to fetch tab data:', e); }
        setTabLoading(false);
    }, [repoPath, since, days, selectedAuthor, loadedTabs]);

    useEffect(() => { fetchTab(subTab); }, [subTab, fetchTab]);

    const handleRefresh = () => { setLoadedTabs(new Set()); fetchTab(subTab, true); };
    const handleRangeChange = (r: DateRange) => { setRange(r); setShowRangeMenu(false); setLoadedTabs(new Set()); };

    // ── Derived ──
    const totalCommits = contributors.reduce((s, c) => s + c.commits, 0);
    const totalLinesAdded = contributors.reduce((s, c) => s + c.lines_added, 0);
    const totalLinesRemoved = contributors.reduce((s, c) => s + c.lines_removed, 0);
    const avgPerDay = useMemo(() => days > 0 ? (totalCommits / days).toFixed(1) : '0', [totalCommits, days]);

    const commitSizeDistribution = useMemo(() => {
        let small = 0, medium = 0, large = 0;
        commitSizes.forEach(c => { if (c.total < 50) small++; else if (c.total < 200) medium++; else large++; });
        return { small, medium, large, total: small + medium + large || 1 };
    }, [commitSizes]);

    const focusScores = useMemo(() => {
        const ab: Record<string, Set<string>> = {};
        branches.forEach(b => { if (!ab[b.author]) ab[b.author] = new Set(); if (!b.is_merged) ab[b.author].add(b.name); });
        return Object.entries(ab).map(([author, s]) => ({ author, activeBranches: s.size, score: Math.max(1, Math.min(10, 11 - s.size)) })).sort((a, b) => b.score - a.score);
    }, [branches]);

    const aggregatedHours = useMemo(() => {
        const totals = new Array(24).fill(0);
        (selectedAuthor ? activeHours.filter(a => a.author === selectedAuthor) : activeHours).forEach(a => a.hours.forEach(h => { totals[h.hour] += h.count; }));
        return totals;
    }, [activeHours, selectedAuthor]);
    const maxHourCount = Math.max(...aggregatedHours, 1);

    return (
        <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-panel)' }}>
            {/* Sub-tab bar */}
            <div className="flex items-center shrink-0 gap-0" style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-tree-header)' }}>
                {subTabs.map(tab => (
                    <button key={tab.key} onClick={() => setSubTab(tab.key)}
                        className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold transition-colors relative"
                        style={{ color: subTab === tab.key ? 'var(--text-accent)' : 'var(--text-muted)' }}
                        onMouseEnter={e => { if (subTab !== tab.key) e.currentTarget.style.color = 'var(--text-secondary)'; }}
                        onMouseLeave={e => { if (subTab !== tab.key) e.currentTarget.style.color = 'var(--text-muted)'; }}>
                        {tab.icon} {t(tab.labelKey)}
                        {subTab === tab.key && <span className="absolute bottom-0 left-1 right-1 h-[2px] rounded-full" style={{ backgroundColor: 'var(--accent)' }} />}
                    </button>
                ))}
                <div className="flex-1" />
                <div className="flex items-center gap-2 pr-2">
                    {subTab === 'alerts' && (
                        <select value={selectedAuthor} onChange={e => setSelectedAuthor(e.target.value)}
                            className="text-[11px] font-medium px-2 py-1 rounded outline-none cursor-pointer"
                            style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
                            <option value="">{t('perf.all')}</option>
                            {contributors.map(c => <option key={c.email} value={c.email}>{c.author}</option>)}
                        </select>
                    )}
                    <div className="relative">
                        <button onClick={() => setShowRangeMenu(!showRangeMenu)}
                            className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded transition-colors"
                            style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
                            <Calendar className="w-3 h-3" /> {t(DATE_RANGE_KEYS[range])} <ChevronDown className="w-2.5 h-2.5" />
                        </button>
                        {showRangeMenu && (
                            <div className="absolute right-0 top-full mt-1 rounded-lg overflow-hidden shadow-xl z-50"
                                style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-default)' }}>
                                {(Object.entries(DATE_RANGE_KEYS) as [DateRange, TranslationKey][]).map(([key, labelKey]) => (
                                    <button key={key} onClick={() => handleRangeChange(key)}
                                        className="block w-full text-left text-[11px] px-4 py-2 font-medium transition-colors"
                                        style={{ color: range === key ? 'var(--text-accent)' : 'var(--text-secondary)', backgroundColor: range === key ? 'var(--bg-hover)' : 'transparent' }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                        onMouseLeave={e => { if (range !== key) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                                        {t(labelKey)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{dateRangeLabel}</span>
                    <button onClick={handleRefresh} className="p-1 rounded transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-accent)'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                        <RefreshCw className={`w-3.5 h-3.5 ${tabLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 pb-6" style={{ scrollbarWidth: 'thin' }}>
                {tabLoading && !loadedTabs.has(subTab) ? (
                    <div className="flex items-center justify-center py-8 gap-2" style={{ color: 'var(--text-muted)' }}>
                        <RefreshCw className="w-4 h-4 animate-spin" /> <span className="text-xs">{t('perf.loading')}</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {subTab === 'overview' && <OverviewContent t={t}
                            totalCommits={totalCommits} totalLinesAdded={totalLinesAdded} totalLinesRemoved={totalLinesRemoved}
                            avgPerDay={avgPerDay} contributors={contributors} churnFiles={churnFiles}
                            commitSizeDistribution={commitSizeDistribution} />}
                        {subTab === 'alerts' && <AlertsTeamContent t={t} alerts={alerts} contributors={contributors} />}
                        {subTab === 'activity' && <ActivityContent t={t} heatmap={heatmap} aggregatedHours={aggregatedHours} maxHourCount={maxHourCount} />}
                        {subTab === 'branches' && <BranchesContent t={t} focusScores={focusScores} branches={branches} repoPath={repoPath} onRefresh={handleRefresh} />}
                    </div>
                )}
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════
// ── TAB 1: Overview ──
// ════════════════════════════════════════════════

type TFn = (key: TranslationKey) => string;

function OverviewContent({ t, totalCommits, totalLinesAdded, totalLinesRemoved, avgPerDay, contributors, churnFiles, commitSizeDistribution }: {
    t: TFn; totalCommits: number; totalLinesAdded: number; totalLinesRemoved: number; avgPerDay: string;
    contributors: ContributorStats[]; churnFiles: ChurnFile[];
    commitSizeDistribution: { small: number; medium: number; large: number; total: number };
}) {
    return (
        <>
            <div className="grid grid-cols-4 gap-2">
                <SummaryCard icon={<GitBranch className="w-4 h-4" />} label={t('perf.commits')} value={totalCommits.toLocaleString()} color="#3b82f6" />
                <SummaryCard icon={<TrendingUp className="w-4 h-4" />} label={t('perf.linesAdded')} value={`+${formatNumber(totalLinesAdded)}`} color="#10b981" />
                <SummaryCard icon={<Users className="w-4 h-4" />} label={t('perf.contributors')} value={contributors.length.toString()} color="#8b5cf6" />
                <SummaryCard icon={<Zap className="w-4 h-4" />} label={t('perf.avgDay')} value={avgPerDay} color="#f59e0b" />
            </div>
            <PanelDesc text={t('perf.descOverview')} />

            <div className="grid grid-cols-2 gap-2">
                <div>
                    <Panel icon={<Flame className="w-3.5 h-3.5" />} iconColor="#f97316" title={t('perf.codeHotspots')}>
                        {churnFiles.length === 0 ? <EmptyState text={t('perf.noHotspots')} /> :
                            churnFiles.slice(0, 10).map((f, i) => (
                                <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-[11px]" style={{ borderBottom: '1px solid var(--border-default)' }}>
                                    <FileCode className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                                    <span className="truncate flex-1 font-medium" style={{ color: 'var(--text-primary)' }} title={f.path}>{f.path.split('/').pop()}</span>
                                    <span className="shrink-0 px-2 py-0.5 rounded font-bold" style={{
                                        fontSize: '9px',
                                        backgroundColor: f.times_modified > 10 ? 'rgba(239,68,68,0.15)' : f.times_modified > 5 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                                        color: f.times_modified > 10 ? '#ef4444' : f.times_modified > 5 ? '#f59e0b' : '#10b981',
                                    }}>{f.times_modified}×</span>
                                </div>
                            ))}
                    </Panel>
                    <PanelDesc text={t('perf.descHotspots')} />
                </div>

                <div>
                    <Panel icon={<BarChart3 className="w-3.5 h-3.5" />} iconColor="var(--text-accent)" title={t('perf.commitSizes')}>
                        <div className="p-3 space-y-2.5">
                            <SizeBar label={t('perf.smallCommit')} count={commitSizeDistribution.small} total={commitSizeDistribution.total} color="#10b981" />
                            <SizeBar label={t('perf.mediumCommit')} count={commitSizeDistribution.medium} total={commitSizeDistribution.total} color="#3b82f6" />
                            <SizeBar label={t('perf.largeCommit')} count={commitSizeDistribution.large} total={commitSizeDistribution.total} color="#ef4444" />
                            <div className="text-[9px] pt-1" style={{ color: 'var(--text-muted)' }}>{commitSizeDistribution.total} {t('perf.commitsAnalyzed')}</div>
                        </div>
                    </Panel>
                    <PanelDesc text={t('perf.descCommitSizes')} />
                </div>
            </div>

            <div className="text-center py-1">
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    Total: +{formatNumber(totalLinesAdded)} / -{formatNumber(totalLinesRemoved)} lines | {contributors.length} {t('perf.contributors').toLowerCase()}
                </span>
            </div>
        </>
    );
}

// ════════════════════════════════════════════════
// ── TAB 2: Alerts + Leaderboard ──
// ════════════════════════════════════════════════

function AlertsTeamContent({ t, alerts, contributors }: { t: TFn; alerts: AlertInfo[]; contributors: ContributorStats[] }) {
    return (
        <>
            {alerts.length > 0 && (
                <>
                <Panel icon={<AlertTriangle className="w-3.5 h-3.5" />} iconColor="#f59e0b" title={`${t('perf.alerts')} (${alerts.length})`}>
                    <div className="max-h-64 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                        {alerts.map((a, i) => (
                            <div key={i} className="flex items-start gap-2 px-3 py-2 text-[11px]" style={{ borderBottom: '1px solid var(--border-default)' }}>
                                <span className="shrink-0 w-2 h-2 rounded-full mt-1" style={{
                                    backgroundColor: a.severity === 'critical' ? '#ef4444' : a.severity === 'warning' ? '#f59e0b' : '#3b82f6'
                                }} />
                                <div className="min-w-0">
                                    <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{a.title}</span>
                                    {a.author && <span style={{ color: 'var(--text-muted)' }}> — {a.author}</span>}
                                    <p style={{ color: 'var(--text-secondary)' }}>{a.message}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Panel>
                <PanelDesc text={t('perf.descAlerts')} />
                </>
            )}

            <Panel icon={<Users className="w-3.5 h-3.5" />} iconColor="var(--text-accent)" title={t('perf.leaderboard')}>
                <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                        <thead>
                            <tr style={{ backgroundColor: 'var(--bg-sidebar)' }}>
                                {['#', t('perf.member'), t('perf.commits'), t('perf.linesPlus'), t('perf.linesMinus'), t('perf.files'), t('perf.activeDays'), t('perf.avgSize')].map(h => (
                                    <th key={h} className="px-2 py-2 text-left font-bold whitespace-nowrap" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {contributors.map((c, i) => (
                                <tr key={c.email} className="transition-colors"
                                    style={{ backgroundColor: 'transparent' }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <td className="px-2 py-2 font-bold" style={{ color: i < 3 ? ['#f59e0b', '#94a3b8', '#c2884f'][i] : 'var(--text-muted)' }}>
                                        {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                                    </td>
                                    <td className="px-2 py-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                                                style={{ backgroundColor: `hsl(${hashCode(c.email) % 360}, 60%, 40%)`, color: 'white' }}>
                                                {c.author.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-medium truncate" style={{ color: 'var(--text-primary)', maxWidth: '120px' }}>{c.author}</span>
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 font-bold" style={{ color: 'var(--text-primary)' }}>{c.commits}</td>
                                    <td className="px-2 py-2" style={{ color: '#10b981' }}>+{formatNumber(c.lines_added)}</td>
                                    <td className="px-2 py-2" style={{ color: '#ef4444' }}>-{formatNumber(c.lines_removed)}</td>
                                    <td className="px-2 py-2" style={{ color: 'var(--text-secondary)' }}>{c.files_changed}</td>
                                    <td className="px-2 py-2" style={{ color: 'var(--text-secondary)' }}>{c.active_days}</td>
                                    <td className="px-2 py-2" style={{ color: 'var(--text-muted)' }}>{c.avg_commit_size}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Panel>
            <PanelDesc text={t('perf.descLeaderboard')} />
        </>
    );
}

// ════════════════════════════════════════════════
// ── TAB 3: Activity ──
// ════════════════════════════════════════════════

function ActivityContent({ t, heatmap, aggregatedHours, maxHourCount }: {
    t: TFn; heatmap: HeatmapDay[]; aggregatedHours: number[]; maxHourCount: number;
}) {
    return (
        <>
            <CommitHeatmap t={t} data={heatmap} />
            <PanelDesc text={t('perf.descHeatmap')} />

            <Panel icon={<Clock className="w-3.5 h-3.5" />} iconColor="var(--text-accent)" title={t('perf.activeHours')}>
                <div className="px-3 py-2.5">
                    <div className="flex items-end gap-[3px]" style={{ height: '90px' }}>
                        {aggregatedHours.map((count, hour) => (
                            <div key={hour} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                                <div className="w-full rounded-t transition-all duration-200"
                                    style={{
                                        height: `${Math.max(3, (count / maxHourCount) * 80)}px`,
                                        backgroundColor: hour >= 22 || hour < 6 ? 'rgba(239,68,68,0.6)' : hour >= 9 && hour <= 18 ? 'rgba(59,130,246,0.7)' : 'rgba(148,163,184,0.4)',
                                    }} />
                                <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>{hour}</span>
                                <div className="absolute bottom-full mb-1 hidden group-hover:block px-2 py-1 rounded text-[9px] font-bold whitespace-nowrap z-10"
                                    style={{ backgroundColor: 'var(--bg-panel)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                                    {count} {t('perf.commitsAt')} {hour}:00
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center gap-3 mt-2 justify-end">
                        <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'rgba(59,130,246,0.7)' }} /><span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{t('perf.working')}</span></div>
                        <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'rgba(148,163,184,0.4)' }} /><span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{t('perf.offPeak')}</span></div>
                        <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'rgba(239,68,68,0.6)' }} /><span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{t('perf.overtime')}</span></div>
                    </div>
                </div>
            </Panel>
            <PanelDesc text={t('perf.descActiveHours')} />
        </>
    );
}

// ════════════════════════════════════════════════
// ── TAB 4: Branches ──
// ════════════════════════════════════════════════

function BranchesContent({ t, focusScores, branches, repoPath, onRefresh }: {
    t: TFn; focusScores: { author: string; activeBranches: number; score: number }[];
    branches: BranchStats[]; repoPath: string; onRefresh: () => void;
}) {
    const [actionMsg, setActionMsg] = useState<{ text: string; isError: boolean } | null>(null);

    const showToast = (text: string, isError = false) => {
        setActionMsg({ text, isError });
        setTimeout(() => setActionMsg(null), 2500);
    };

    const handleCheckout = async (branchName: string) => {
        try {
            await invoke('checkout_branch_cmd', { repoPath, branch: branchName });
            showToast(`✓ Switched to ${branchName}`);
            onRefresh();
        } catch (e) { showToast(`✗ ${e}`, true); }
    };

    const handleCopyName = async (branchName: string) => {
        try {
            await navigator.clipboard.writeText(branchName);
            showToast(`✓ Copied: ${branchName}`);
        } catch { showToast('✗ Copy failed', true); }
    };

    const handleDelete = async (branchName: string) => {
        try {
            await invoke<string>('delete_branch_cmd', { repoPath, branch: branchName });
            showToast(`✓ Deleted: ${branchName}`);
            onRefresh();
        } catch (e) { showToast(`✗ ${e}`, true); }
    };

    return (
        <>
            {actionMsg && (
                <div className="text-[10px] font-medium px-3 py-1.5 rounded-md mb-1 transition-all" style={{
                    backgroundColor: actionMsg.isError ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                    color: actionMsg.isError ? '#ef4444' : '#10b981',
                    border: `1px solid ${actionMsg.isError ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                }}>{actionMsg.text}</div>
            )}

            <Panel icon={<Zap className="w-3.5 h-3.5" />} iconColor="#f59e0b" title={t('perf.focusScore')}>
                {focusScores.length === 0 ? <EmptyState text={t('perf.noData')} /> :
                    focusScores.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 text-[11px]" style={{ borderBottom: '1px solid var(--border-default)' }}>
                            <span className="truncate flex-1 font-medium" style={{ color: 'var(--text-primary)' }}>{f.author}</span>
                            <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{f.activeBranches} {t('perf.branches').toLowerCase()}</span>
                            <span className="font-bold px-2 py-0.5 rounded" style={{
                                fontSize: '10px',
                                backgroundColor: f.score >= 8 ? 'rgba(16,185,129,0.15)' : f.score >= 5 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                                color: f.score >= 8 ? '#10b981' : f.score >= 5 ? '#f59e0b' : '#ef4444',
                            }}>{f.score}/10</span>
                        </div>
                    ))}
            </Panel>
            <PanelDesc text={t('perf.descFocusScore')} />

            <Panel icon={<GitBranch className="w-3.5 h-3.5" />} iconColor="var(--text-accent)" title={t('perf.branchLifecycle')}>
                {branches.length === 0 ? <EmptyState text={t('perf.noBranches')} /> :
                    branches.filter(b => b.name !== 'main' && b.name !== 'master').slice(0, 15).map((b, i) => (
                        <div key={i} className="group flex items-center gap-2 px-3 py-1.5 text-[11px] transition-colors"
                            style={{ borderBottom: '1px solid var(--border-default)' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                            <span className="truncate flex-1 font-medium" style={{ color: 'var(--text-primary)' }}>{b.name}</span>
                            <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{b.age_days}d • {b.commits_count} commits</span>

                            {/* Quick Actions — visible on hover */}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                {!b.is_merged && (
                                    <button onClick={() => handleCheckout(b.name)} title={t('ctx.checkout')}
                                        className="p-1 rounded transition-colors"
                                        style={{ color: 'var(--text-muted)' }}
                                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.15)'; e.currentTarget.style.color = '#3b82f6'; }}
                                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                                        <LogIn className="w-3 h-3" />
                                    </button>
                                )}
                                <button onClick={() => handleCopyName(b.name)} title={t('ctx.copyName')}
                                    className="p-1 rounded transition-colors"
                                    style={{ color: 'var(--text-muted)' }}
                                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(139,92,246,0.15)'; e.currentTarget.style.color = '#8b5cf6'; }}
                                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                                    <Copy className="w-3 h-3" />
                                </button>
                                <button onClick={() => handleDelete(b.name)} title={t('ctx.delete')}
                                    className="p-1 rounded transition-colors"
                                    style={{ color: 'var(--text-muted)' }}
                                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#ef4444'; }}
                                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>

                            <span className="shrink-0 px-2 py-0.5 rounded font-bold" style={{
                                fontSize: '9px',
                                backgroundColor: b.is_merged ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                color: b.is_merged ? '#10b981' : '#f59e0b',
                            }}>{b.is_merged ? t('perf.merged') : t('perf.open')}</span>
                        </div>
                    ))}
            </Panel>
            <PanelDesc text={t('perf.descBranchLifecycle')} />
        </>
    );
}

// ════════════════════════════════════════════════
// ── Shared Components ──
// ════════════════════════════════════════════════

function PanelDesc({ text }: { text: string }) {
    return <p className="text-[9px] italic px-1 pt-1 pb-0 leading-relaxed" style={{ color: 'var(--text-muted)' }}>💡 {text}</p>;
}

function Panel({ icon, iconColor, title, children }: { icon: React.ReactNode; iconColor: string; title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-panel)' }}>
            <div className="flex items-center gap-1.5 px-3 py-2" style={{ backgroundColor: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-default)' }}>
                <span style={{ color: iconColor }}>{icon}</span>
                <span className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>{title}</span>
            </div>
            {children}
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return <div className="flex items-center justify-center py-5 text-[11px]" style={{ color: 'var(--text-muted)' }}>{text}</div>;
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
    return (
        <div className="flex flex-col gap-1 p-3 rounded-lg transition-all duration-200"
            style={{ backgroundColor: 'var(--bg-sidebar)', border: '1px solid var(--border-default)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = color}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}>
            <div className="flex items-center gap-1" style={{ color }}>{icon}</div>
            <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{value}</span>
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
        </div>
    );
}

function SizeBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
    const pct = total > 0 ? (count / total) * 100 : 0;
    return (
        <div className="space-y-0.5">
            <div className="flex justify-between text-[10px]">
                <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <span className="font-bold" style={{ color }}>{count} ({pct.toFixed(0)}%)</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-hover)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
        </div>
    );
}

function CommitHeatmap({ t, data }: { t: TFn; data: HeatmapDay[] }) {
    const dayMap = useMemo(() => { const m: Record<string, number> = {}; data.forEach(d => { m[d.date] = d.count; }); return m; }, [data]);
    const maxCount = useMemo(() => Math.max(...data.map(d => d.count), 1), [data]);

    const weeks = useMemo(() => {
        const result: string[][] = [];
        const now = new Date();
        const start = new Date(now); start.setDate(start.getDate() - 364); start.setDate(start.getDate() - start.getDay());
        let currentWeek: string[] = [];
        const cursor = new Date(start);
        while (cursor <= now) {
            currentWeek.push(cursor.toISOString().split('T')[0]);
            if (currentWeek.length === 7) { result.push(currentWeek); currentWeek = []; }
            cursor.setDate(cursor.getDate() + 1);
        }
        if (currentWeek.length > 0) result.push(currentWeek);
        return result;
    }, []);

    const getColor = (count: number) => {
        if (count === 0) return 'var(--bg-hover)';
        const intensity = count / maxCount;
        if (intensity > 0.75) return '#10b981';
        if (intensity > 0.5) return '#34d399';
        if (intensity > 0.25) return '#6ee7b7';
        return '#a7f3d0';
    };

    const monthLabels = useMemo(() => {
        const labels: { label: string; col: number }[] = [];
        let lastMonth = -1;
        weeks.forEach((week, i) => {
            const d = new Date(week[0]);
            if (d.getMonth() !== lastMonth) { lastMonth = d.getMonth(); labels.push({ label: d.toLocaleDateString('en', { month: 'short' }), col: i }); }
        });
        return labels;
    }, [weeks]);

    return (
        <Panel icon={<Calendar className="w-3.5 h-3.5" />} iconColor="var(--text-accent)" title={t('perf.commitActivity')}>
            <div className="px-3 py-2.5 overflow-hidden">
                <div className="overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
                    <div className="flex mb-1" style={{ paddingLeft: '16px' }}>
                        {monthLabels.map(({ label, col }, i) => {
                            const prevCol = i > 0 ? monthLabels[i - 1].col : 0;
                            const gap = i === 0 ? col : col - prevCol;
                            return <span key={i} className="text-[8px] shrink-0" style={{ color: 'var(--text-muted)', width: `${gap * 11}px` }}>{label}</span>;
                        })}
                    </div>
                    <div className="flex gap-[2px]" style={{ width: 'fit-content' }}>
                        <div className="flex flex-col gap-[2px] shrink-0" style={{ width: '14px' }}>
                            {['', 'M', '', 'W', '', 'F', ''].map((d, i) => (
                                <div key={i} className="text-[8px] flex items-center justify-end" style={{ height: '9px', color: 'var(--text-muted)' }}>{d}</div>
                            ))}
                        </div>
                        {weeks.map((week, wi) => (
                            <div key={wi} className="flex flex-col gap-[2px]">
                                {week.map((date, di) => (
                                    <div key={di} className="rounded-[2px] cursor-default"
                                        style={{ width: '9px', height: '9px', backgroundColor: getColor(dayMap[date] || 0) }}
                                        title={`${date}: ${dayMap[date] || 0} commits`} />
                                ))}
                                {week.length < 7 && Array.from({ length: 7 - week.length }).map((_, i) => (
                                    <div key={`pad-${i}`} style={{ width: '9px', height: '9px' }} />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-2 justify-end">
                    <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>{t('perf.less')}</span>
                    {['var(--bg-hover)', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981'].map((c, i) => (
                        <div key={i} className="rounded-[2px]" style={{ width: '9px', height: '9px', backgroundColor: c }} />
                    ))}
                    <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>{t('perf.more')}</span>
                </div>
            </div>
        </Panel>
    );
}

// ── Helpers ──
function formatNumber(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
}
function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return Math.abs(hash);
}
