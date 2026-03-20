import { useState, useEffect, useMemo, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useI18n } from '../i18n/useI18n';
import {
    Users, TrendingUp, Calendar, GitCommitHorizontal,
    RefreshCw, ChevronDown, Award, ArrowUpRight,
    ArrowDownRight, Minus
} from 'lucide-react';

interface ContributorStats {
    author: string;
    email: string;
    commits: number;
    lines_added: number;
    lines_removed: number;
    files_changed: number;
    active_days: number;
    first_commit: string;
    last_commit: string;
    avg_commit_size: number;
}

interface HeatmapDay { date: string; count: number; }
interface TeamActivity {
    hash: string; author: string; email: string;
    date: string; date_relative: string; message: string; branch: string;
}

type TimePeriod = '1w' | '1m' | '3m' | '6m' | '1y' | 'all';

const PERIOD_LABELS: Record<TimePeriod, { en: string; vi: string; zh: string }> = {
    '1w': { en: '1 Week', vi: '1 Tuần', zh: '1周' },
    '1m': { en: '1 Month', vi: '1 Tháng', zh: '1个月' },
    '3m': { en: '3 Months', vi: '3 Tháng', zh: '3个月' },
    '6m': { en: '6 Months', vi: '6 Tháng', zh: '6个月' },
    '1y': { en: '1 Year', vi: '1 Năm', zh: '1年' },
    'all': { en: 'All Time', vi: 'Tất cả', zh: '所有' },
};

function getSinceDate(period: TimePeriod): string {
    const now = new Date();
    switch (period) {
        case '1w': now.setDate(now.getDate() - 7); break;
        case '1m': now.setMonth(now.getMonth() - 1); break;
        case '3m': now.setMonth(now.getMonth() - 3); break;
        case '6m': now.setMonth(now.getMonth() - 6); break;
        case '1y': now.setFullYear(now.getFullYear() - 1); break;
        case 'all': return '';
    }
    return now.toISOString().split('T')[0];
}

// Generate a consistent color from a string
function stringToColor(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 55%)`;
}

export function TeamDashboard({ repoPath }: { repoPath: string }) {
    const { t, locale } = useI18n();
    const [period, setPeriod] = useState<TimePeriod>('1m');
    const [contributors, setContributors] = useState<ContributorStats[]>([]);
    const [activities, setActivities] = useState<TeamActivity[]>([]);
    const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
    const [selectedMember, setSelectedMember] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'timeline'>('overview');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const since = getSinceDate(period);
            const [contribs, acts, heatmap] = await Promise.all([
                invoke<ContributorStats[]>('get_contributor_stats_cmd', {
                    repoPath, since: since || null, until: null
                }),
                invoke<TeamActivity[]>('get_team_activity_cmd', {
                    repoPath, since: since || null, limit: 200
                }),
                invoke<HeatmapDay[]>('get_commit_heatmap_cmd', {
                    repoPath, author: selectedMember || null
                }),
            ]);
            setContributors(contribs);
            setActivities(acts);
            setHeatmapData(heatmap);
        } catch (e) {
            console.error('Failed to fetch team data:', e);
        } finally {
            setLoading(false);
        }
    }, [repoPath, period, selectedMember]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const totalCommits = useMemo(() => contributors.reduce((s, c) => s + c.commits, 0), [contributors]);
    const totalAdded = useMemo(() => contributors.reduce((s, c) => s + c.lines_added, 0), [contributors]);
    const totalRemoved = useMemo(() => contributors.reduce((s, c) => s + c.lines_removed, 0), [contributors]);
    const avgCommitsPerMember = contributors.length > 0 ? Math.round(totalCommits / contributors.length) : 0;
    const topContributor = contributors[0];

    // Max commits for bar chart scaling
    const maxCommits = contributors.length > 0 ? contributors[0].commits : 1;

    // Heatmap: last 52 weeks
    const heatmapGrid = useMemo(() => {
        const map = new Map(heatmapData.map(d => [d.date, d.count]));
        const weeks: { date: string; count: number }[][] = [];
        const today = new Date();
        const start = new Date(today);
        start.setDate(start.getDate() - 364);
        // Align to Sunday
        start.setDate(start.getDate() - start.getDay());

        let currentWeek: { date: string; count: number }[] = [];
        const d = new Date(start);
        while (d <= today) {
            const key = d.toISOString().split('T')[0];
            currentWeek.push({ date: key, count: map.get(key) || 0 });
            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
            d.setDate(d.getDate() + 1);
        }
        if (currentWeek.length > 0) weeks.push(currentWeek);
        return weeks;
    }, [heatmapData]);

    const maxHeatCount = useMemo(() => Math.max(...heatmapData.map(d => d.count), 1), [heatmapData]);

    function getHeatColor(count: number): string {
        if (count === 0) return 'var(--bg-input)';
        const intensity = Math.min(count / maxHeatCount, 1);
        if (intensity < 0.25) return 'hsl(152, 60%, 75%)';
        if (intensity < 0.5) return 'hsl(152, 60%, 55%)';
        if (intensity < 0.75) return 'hsl(152, 60%, 40%)';
        return 'hsl(152, 60%, 30%)';
    }

    // Group activities by date
    const groupedActivities = useMemo(() => {
        const groups: Record<string, TeamActivity[]> = {};
        activities.forEach(a => {
            if (!groups[a.date]) groups[a.date] = [];
            groups[a.date].push(a);
        });
        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    }, [activities]);

    return (
        <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: 'var(--bg-panel)' }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-tree-header)' }}>
                <Users className="w-4 h-4" style={{ color: 'var(--text-accent)' }} />
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t('team.title')}</span>

                <div className="flex-1" />

                {/* Member filter */}
                <div className="relative">
                    <select
                        value={selectedMember}
                        onChange={e => setSelectedMember(e.target.value)}
                        className="text-xs px-2 py-1 rounded-lg appearance-none pr-6 cursor-pointer"
                        style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
                    >
                        <option value="">{t('team.allMembers')}</option>
                        {contributors.map(c => (
                            <option key={c.email} value={c.email}>{c.author}</option>
                        ))}
                    </select>
                    <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                </div>

                {/* Period filter */}
                <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
                    {(['1w', '1m', '3m', '6m', '1y', 'all'] as TimePeriod[]).map(p => (
                        <button key={p} onClick={() => setPeriod(p)}
                            className="px-2 py-1 text-[10px] font-bold transition-colors"
                            style={{
                                backgroundColor: period === p ? 'var(--accent)' : 'var(--bg-input)',
                                color: period === p ? 'var(--text-inverse)' : 'var(--text-muted)',
                            }}
                        >
                            {PERIOD_LABELS[p][locale as keyof typeof PERIOD_LABELS['1w']] || PERIOD_LABELS[p].en}
                        </button>
                    ))}
                </div>

                <button onClick={fetchData} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Overview Cards */}
                    <div className="grid grid-cols-4 gap-3">
                        <StatCard icon={<Users className="w-4 h-4" />} label={t('team.members')} value={String(contributors.length)} color="hsl(210, 70%, 55%)" />
                        <StatCard icon={<GitCommitHorizontal className="w-4 h-4" />} label={t('team.totalCommits')} value={totalCommits.toLocaleString()} color="hsl(152, 60%, 45%)" />
                        <StatCard icon={<TrendingUp className="w-4 h-4" />} label={t('team.avgPerMember')} value={String(avgCommitsPerMember)} color="hsl(270, 60%, 55%)" />
                        <StatCard icon={<Award className="w-4 h-4" />} label={t('team.topContributor')} value={topContributor?.author || '—'} color="hsl(35, 80%, 55%)" />
                    </div>

                    {/* Sub-tabs */}
                    <div className="flex gap-0.5" style={{ borderBottom: '1px solid var(--border-default)' }}>
                        <TabBtn active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label={t('team.tabOverview')} />
                        <TabBtn active={activeTab === 'timeline'} onClick={() => setActiveTab('timeline')} label={t('team.tabTimeline')} />
                    </div>

                    {activeTab === 'overview' ? (
                        <>
                            {/* Contribution Bar Chart */}
                            <Panel title={t('team.contributions')}>
                                <div className="space-y-2">
                                    {contributors.map(c => (
                                        <div key={c.email} className="flex items-center gap-3">
                                            <div className="w-24 text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{c.author}</div>
                                            <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-input)' }}>
                                                <div className="h-full rounded-full transition-all flex items-center px-2"
                                                    style={{ width: `${Math.max((c.commits / maxCommits) * 100, 8)}%`, backgroundColor: stringToColor(c.email) }}
                                                >
                                                    <span className="text-[10px] font-bold text-white whitespace-nowrap">{c.commits}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] shrink-0" style={{ color: 'var(--text-muted)' }}>
                                                <span className="flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3" style={{ color: '#10b981' }}/> {c.lines_added.toLocaleString()}</span>
                                                <span className="flex items-center gap-0.5"><ArrowDownRight className="w-3 h-3" style={{ color: '#ef4444' }}/> {c.lines_removed.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Panel>

                            {/* Member Detail Table */}
                            <Panel title={t('team.memberDetails')}>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                                                <Th>{t('team.name')}</Th>
                                                <Th align="right">{t('team.commits')}</Th>
                                                <Th align="right">{t('team.linesAdded')}</Th>
                                                <Th align="right">{t('team.linesRemoved')}</Th>
                                                <Th align="right">{t('team.filesChanged')}</Th>
                                                <Th align="right">{t('team.activeDays')}</Th>
                                                <Th align="right">{t('team.avgCommitSize')}</Th>
                                                <Th>{t('team.lastCommit')}</Th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {contributors.map(c => (
                                                <tr key={c.email} className="transition-colors" style={{ borderBottom: '1px solid var(--border-default)' }}
                                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    <td className="py-2 px-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                                                                style={{ backgroundColor: stringToColor(c.email) }}
                                                            >
                                                                {c.author.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{c.author}</div>
                                                                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{c.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <Td align="right"><span className="font-bold" style={{ color: 'var(--text-accent)' }}>{c.commits}</span></Td>
                                                    <Td align="right"><span style={{ color: '#10b981' }}>+{c.lines_added.toLocaleString()}</span></Td>
                                                    <Td align="right"><span style={{ color: '#ef4444' }}>-{c.lines_removed.toLocaleString()}</span></Td>
                                                    <Td align="right">{c.files_changed.toLocaleString()}</Td>
                                                    <Td align="right">{c.active_days}</Td>
                                                    <Td align="right">{c.avg_commit_size}</Td>
                                                    <Td>{c.last_commit}</Td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Panel>

                            {/* Heatmap */}
                            <Panel title={t('team.heatmap')}>
                                <div className="overflow-x-auto pb-2">
                                    <div className="flex gap-[3px]" style={{ minWidth: 'max-content' }}>
                                        {heatmapGrid.map((week, wi) => (
                                            <div key={wi} className="flex flex-col gap-[3px]">
                                                {week.map((day) => (
                                                    <div key={day.date} className="w-3 h-3 rounded-sm transition-colors cursor-default"
                                                        style={{ backgroundColor: getHeatColor(day.count) }}
                                                        title={`${day.date}: ${day.count} commits`}
                                                    />
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 mt-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                        <span>{t('team.less')}</span>
                                        {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
                                            <div key={i} className="w-3 h-3 rounded-sm"
                                                style={{ backgroundColor: intensity === 0 ? 'var(--bg-input)' : `hsl(152, 60%, ${75 - intensity * 45}%)` }}
                                            />
                                        ))}
                                        <span>{t('team.more')}</span>
                                    </div>
                                </div>
                            </Panel>

                            {/* Lines Summary */}
                            <div className="grid grid-cols-2 gap-3">
                                <Panel title={t('team.linesWritten')}>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <div className="text-2xl font-bold" style={{ color: '#10b981' }}>+{totalAdded.toLocaleString()}</div>
                                            <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t('team.linesAdded')}</div>
                                        </div>
                                        <Minus className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                                        <div className="flex-1 text-right">
                                            <div className="text-2xl font-bold" style={{ color: '#ef4444' }}>-{totalRemoved.toLocaleString()}</div>
                                            <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t('team.linesRemoved')}</div>
                                        </div>
                                    </div>
                                </Panel>
                                <Panel title={t('team.netContribution')}>
                                    <div className="text-2xl font-bold" style={{ color: (totalAdded - totalRemoved) >= 0 ? '#10b981' : '#ef4444' }}>
                                        {(totalAdded - totalRemoved) >= 0 ? '+' : ''}{(totalAdded - totalRemoved).toLocaleString()}
                                    </div>
                                    <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t('team.netLines')}</div>
                                </Panel>
                            </div>
                        </>
                    ) : (
                        /* Timeline Tab */
                        <Panel title={t('team.recentActivity')}>
                            <div className="space-y-4">
                                {groupedActivities.map(([date, acts]) => (
                                    <div key={date}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--text-accent)' }} />
                                            <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{date}</span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent-muted)', color: 'var(--text-accent)' }}>{acts.length}</span>
                                        </div>
                                        <div className="pl-5 space-y-1.5">
                                            {acts.map((a, i) => (
                                                <div key={i} className="flex items-start gap-2 py-1.5 px-2 rounded-lg transition-colors"
                                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5"
                                                        style={{ backgroundColor: stringToColor(a.email) }}
                                                    >
                                                        {a.author.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{a.author}</span>
                                                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{a.date_relative}</span>
                                                        </div>
                                                        <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{a.message}</div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>{a.hash}</span>
                                                            {a.branch && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--accent-muted)', color: 'var(--text-accent)' }}>{a.branch}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {groupedActivities.length === 0 && (
                                    <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>{t('team.noActivity')}</div>
                                )}
                            </div>
                        </Panel>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Shared sub-components ──

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
    return (
        <div className="rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20`, color }}>{icon}</div>
            <div>
                <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{value}</div>
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</div>
            </div>
        </div>
    );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
            <div className="text-xs font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{title}</div>
            {children}
        </div>
    );
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
    return (
        <button onClick={onClick}
            className="px-4 py-2 text-xs font-semibold transition-colors relative"
            style={{ color: active ? 'var(--text-accent)' : 'var(--text-muted)' }}
        >
            {label}
            {active && <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full" style={{ backgroundColor: 'var(--accent)' }} />}
        </button>
    );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
    return (
        <th className="py-2 px-2 text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)', textAlign: align || 'left' }}>
            {children}
        </th>
    );
}

function Td({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
    return (
        <td className="py-2 px-2 text-xs" style={{ color: 'var(--text-primary)', textAlign: align || 'left' }}>
            {children}
        </td>
    );
}
