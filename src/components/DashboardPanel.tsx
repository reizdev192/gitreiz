import { useState, useEffect, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useProjectStore } from '../store/useProjectStore';
import { X, RefreshCw, Loader2, CalendarDays, Users, TrendingUp, Clock, Calendar, CalendarCheck, CalendarRange } from 'lucide-react';
import { useEscClose } from '../hooks/useEscClose';

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

interface DashboardPanelProps {
    onClose: () => void;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6'];

type TabKey = 'total' | 'today' | 'week' | 'month';

const TABS: { key: TabKey; label: string; icon: typeof Calendar }[] = [
    { key: 'total', label: 'Total', icon: CalendarDays },
    { key: 'today', label: 'Today', icon: CalendarCheck },
    { key: 'week', label: 'This Week', icon: CalendarRange },
    { key: 'month', label: 'This Month', icon: Calendar },
];

function parseCommitDate(dateStr: string): Date {
    // "2025-03-15 14:23:45 +0700" → Date
    const d = new Date(dateStr.replace(' ', 'T').replace(/ ([+-]\d{4})$/, '$1'));
    return isNaN(d.getTime()) ? new Date(dateStr.split(' ')[0]) : d;
}

function getDateRange(tab: TabKey): { start: Date; end: Date } {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (tab) {
        case 'today':
            return { start: todayStart, end: now };
        case 'week': {
            const day = now.getDay();
            const mondayOffset = day === 0 ? -6 : 1 - day;
            const weekStart = new Date(todayStart);
            weekStart.setDate(weekStart.getDate() + mondayOffset);
            return { start: weekStart, end: now };
        }
        case 'month':
            return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
        default:
            return { start: new Date(0), end: now };
    }
}

export function DashboardPanel({ onClose }: DashboardPanelProps) {
    useEscClose(onClose);
    const projects = useProjectStore(s => s.projects);
    const selectedProjectId = useProjectStore(s => s.selectedProjectId);
    const gitStateVersion = useProjectStore(s => s.gitStateVersion);
    const project = projects.find(p => p.id === selectedProjectId);

    const [allCommits, setAllCommits] = useState<CommitInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<TabKey>('total');

    const fetchCommits = useCallback(async () => {
        if (!project) return;
        setLoading(true);
        try {
            const data: CommitInfo[] = await invoke('list_commits_cmd', {
                repoPath: project.path,
                branch: null,
                limit: 500,
            });
            setAllCommits(data);
        } catch (e) {
            console.error('Dashboard fetch failed:', e);
        } finally {
            setLoading(false);
        }
    }, [project?.path, gitStateVersion]);

    useEffect(() => { fetchCommits(); }, [fetchCommits]);

    // ───── Filter commits by tab ─────
    const filteredCommits = useMemo(() => {
        if (activeTab === 'total') return allCommits;
        const { start, end } = getDateRange(activeTab);
        return allCommits.filter(c => {
            const d = parseCommitDate(c.date);
            return d >= start && d <= end;
        });
    }, [allCommits, activeTab]);

    // ───── Computed Stats (from filtered) ─────
    const heatmapData = useMemo(() => {
        const map = new Map<string, number>();
        filteredCommits.forEach(c => {
            const d = c.date.split(' ')[0];
            map.set(d, (map.get(d) || 0) + 1);
        });
        const dayCount = activeTab === 'today' ? 1 : activeTab === 'week' ? 7 : activeTab === 'month' ? 31 : 90;
        const days: { date: string; count: number; dayOfWeek: number }[] = [];
        const now = new Date();
        for (let i = dayCount - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            days.push({ date: key, count: map.get(key) || 0, dayOfWeek: d.getDay() });
        }
        return days;
    }, [filteredCommits, activeTab]);

    const authorStats = useMemo(() => {
        const map = new Map<string, number>();
        filteredCommits.forEach(c => {
            map.set(c.author, (map.get(c.author) || 0) + 1);
        });
        return Array.from(map.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);
    }, [filteredCommits]);

    const weeklyTrend = useMemo(() => {
        const map = new Map<string, number>();
        filteredCommits.forEach(c => {
            const d = parseCommitDate(c.date);
            if (isNaN(d.getTime())) return;
            if (activeTab === 'today') {
                // Group by hour for today
                const key = `${d.getHours()}:00`;
                map.set(key, (map.get(key) || 0) + 1);
            } else if (activeTab === 'week') {
                // Group by day for week
                const key = d.toLocaleDateString('default', { weekday: 'short' }) + ' ' + d.getDate();
                map.set(key, (map.get(key) || 0) + 1);
            } else if (activeTab === 'month') {
                // Group by day for month
                const key = d.toISOString().split('T')[0];
                map.set(key, (map.get(key) || 0) + 1);
            } else {
                // Group by week for total
                const day = d.getDay();
                const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                const weekStart = new Date(new Date(d).setDate(diff));
                const key = weekStart.toISOString().split('T')[0];
                map.set(key, (map.get(key) || 0) + 1);
            }
        });
        const sorted = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        if (activeTab === 'today') {
            // Fill all 24 hours
            const hourMap = new Map(sorted.map(([k, v]) => [k, v]));
            return Array.from({ length: 24 }, (_, i) => [`${i}:00`, hourMap.get(`${i}:00`) || 0] as [string, number]);
        }
        return activeTab === 'total' ? sorted.slice(-12) : sorted;
    }, [filteredCommits, activeTab]);

    const peakHours = useMemo(() => {
        const hours = new Array(24).fill(0);
        filteredCommits.forEach(c => {
            const match = c.date.match(/(\d{2}):\d{2}:\d{2}/);
            if (match) hours[parseInt(match[1])]++;
        });
        return hours;
    }, [filteredCommits]);

    const maxHeatmap = Math.max(1, ...heatmapData.map(d => d.count));
    const maxAuthor = Math.max(1, ...(authorStats.map(a => a[1])));
    const maxWeekly = Math.max(1, ...weeklyTrend.map(w => w[1]));
    const maxPeakHour = Math.max(1, ...peakHours);
    const totalCommits = filteredCommits.length;
    const uniqueAuthors = new Set(filteredCommits.map(c => c.author)).size;

    const trendLabel = activeTab === 'today' ? 'Hourly Breakdown' : activeTab === 'week' ? 'Daily Breakdown' : activeTab === 'month' ? 'Daily Breakdown' : 'Weekly Trend';

    const getHeatColor = (count: number) => {
        if (count === 0) return 'rgba(255,255,255,0.04)';
        const intensity = Math.min(count / maxHeatmap, 1);
        if (intensity < 0.25) return 'rgba(16,185,129,0.2)';
        if (intensity < 0.5) return 'rgba(16,185,129,0.4)';
        if (intensity < 0.75) return 'rgba(16,185,129,0.65)';
        return 'rgba(16,185,129,0.9)';
    };

    if (!project) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="w-[90vw] max-w-[1000px] max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
                style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-default)' }}>

                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-3 shrink-0"
                    style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-tree-header)' }}>
                    <TrendingUp className="w-4 h-4" style={{ color: 'var(--text-accent)' }} />
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Git Dashboard</span>

                    {/* Summary pills */}
                    <div className="flex items-center gap-2 ml-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                            style={{ backgroundColor: 'var(--accent-muted)', color: 'var(--text-accent)' }}>
                            {totalCommits} commits
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                            style={{ backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
                            {uniqueAuthors} authors
                        </span>
                    </div>

                    <div className="flex-1" />
                    <button onClick={fetchCommits} className="p-1 rounded transition-colors" style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={onClose} className="p-1 rounded transition-colors" style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 px-4 py-2 shrink-0"
                    style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-sidebar)' }}>
                    {TABS.map(tab => {
                        const isActive = activeTab === tab.key;
                        const Icon = tab.icon;
                        return (
                            <button key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                style={{
                                    backgroundColor: isActive ? 'var(--accent-muted)' : 'transparent',
                                    color: isActive ? 'var(--text-accent)' : 'var(--text-muted)',
                                    border: isActive ? '1px solid var(--accent)' : '1px solid transparent',
                                }}
                                onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                                onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                                <Icon className="w-3 h-3" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Dashboard Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-20 gap-2" style={{ color: 'var(--text-muted)' }}>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm">Loading stats...</span>
                        </div>
                    ) : totalCommits === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-2" style={{ color: 'var(--text-muted)' }}>
                            <CalendarDays className="w-8 h-8 opacity-30" />
                            <span className="text-sm">No commits in this period</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">

                            {/* ─── Card 1: Commit Activity Heatmap ─── */}
                            <div className="col-span-2 rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                                <div className="flex items-center gap-2 mb-3">
                                    <CalendarDays className="w-4 h-4" style={{ color: '#10b981' }} />
                                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                        Commit Activity {activeTab === 'total' ? '(Last 90 Days)' : activeTab === 'today' ? '(Today)' : activeTab === 'week' ? '(This Week)' : '(This Month)'}
                                    </span>
                                    <div className="flex-1" />
                                    <div className="flex items-center gap-1 text-[9px]" style={{ color: 'var(--text-muted)' }}>
                                        <span>Less</span>
                                        {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
                                            <div key={i} className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: getHeatColor(v * maxHeatmap) }} />
                                        ))}
                                        <span>More</span>
                                    </div>
                                </div>
                                <div className="flex gap-[3px] flex-wrap">
                                    {heatmapData.map((d, i) => (
                                        <div key={i}
                                            className="rounded-sm transition-transform hover:scale-150"
                                            style={{
                                                backgroundColor: getHeatColor(d.count),
                                                width: activeTab === 'total' ? '10px' : activeTab === 'month' ? '18px' : '36px',
                                                height: activeTab === 'total' ? '10px' : '28px',
                                            }}
                                            title={`${d.date}: ${d.count} commits`}
                                        />
                                    ))}
                                </div>
                                {/* Date labels */}
                                {activeTab !== 'today' && (
                                    <div className="flex justify-between mt-2 px-1">
                                        {(() => {
                                            const labels: string[] = [];
                                            let lastLabel = '';
                                            heatmapData.forEach(d => {
                                                const l = activeTab === 'total' ? d.date.substring(0, 7) : d.date;
                                                if (l !== lastLabel) { labels.push(l); lastLabel = l; }
                                            });
                                            const show = activeTab === 'total' ? labels : labels.filter((_, i) => i % Math.max(1, Math.floor(labels.length / 8)) === 0);
                                            return show.map(l => (
                                                <span key={l} className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                                                    {activeTab === 'total'
                                                        ? new Date(l + '-01').toLocaleString('default', { month: 'short' })
                                                        : new Date(l).toLocaleDateString('default', { month: 'short', day: 'numeric' })
                                                    }
                                                </span>
                                            ));
                                        })()}
                                    </div>
                                )}
                            </div>

                            {/* ─── Card 2: Commits by Author ─── */}
                            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                                <div className="flex items-center gap-2 mb-3">
                                    <Users className="w-4 h-4" style={{ color: '#3b82f6' }} />
                                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                        Top Authors
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {authorStats.map(([author, count], i) => {
                                        const pct = (count / maxAuthor) * 100;
                                        const color = COLORS[i % COLORS.length];
                                        return (
                                            <div key={author}>
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="flex items-center justify-center w-[18px] h-[18px] rounded-full text-[8px] font-bold shrink-0"
                                                            style={{ backgroundColor: `${color}20`, color }}>
                                                            {author.charAt(0).toUpperCase()}
                                                        </span>
                                                        <span className="text-[10px] font-medium truncate max-w-[120px]" style={{ color: 'var(--text-primary)' }}>
                                                            {author}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] font-bold" style={{ color }}>{count}</span>
                                                </div>
                                                <div className="h-[6px] rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-hover)' }}>
                                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.8 }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {authorStats.length === 0 && (
                                        <span className="text-[10px] italic" style={{ color: 'var(--text-muted)' }}>No data</span>
                                    )}
                                </div>
                            </div>

                            {/* ─── Card 3: Trend (adapts to tab) ─── */}
                            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                                <div className="flex items-center gap-2 mb-3">
                                    <TrendingUp className="w-4 h-4" style={{ color: '#f59e0b' }} />
                                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                        {trendLabel}
                                    </span>
                                </div>
                                <div className="flex items-end gap-1" style={{ height: '200px' }}>
                                    {weeklyTrend.map(([label, count], i) => {
                                        const shortLabel = activeTab === 'today' ? label
                                            : activeTab === 'week' ? label
                                                : activeTab === 'month' ? new Date(label).getDate().toString()
                                                    : new Date(label).toLocaleDateString('default', { month: 'short', day: 'numeric' });
                                        return (
                                            <div key={label + i} className="flex-1 flex flex-col items-center group" style={{ minWidth: 0 }}>
                                                <span className="text-[8px] font-bold mb-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    style={{ color: '#f59e0b' }}>
                                                    {count || ''}
                                                </span>
                                                <div className="w-full rounded-t-md transition-all duration-300 hover:opacity-100"
                                                    style={{
                                                        height: `${Math.max((count / maxWeekly) * 180, 3)}px`,
                                                        background: `linear-gradient(180deg, #f59e0b, rgba(245,158,11,0.3))`,
                                                        opacity: count === 0 ? 0.15 : 0.7,
                                                    }}
                                                    title={`${shortLabel}: ${count} commits`}
                                                />
                                                <span className="text-[7px] mt-1 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                                                    {activeTab === 'today' ? (i % 3 === 0 ? label : '')
                                                        : activeTab === 'month' ? (i % 4 === 0 ? shortLabel : '')
                                                            : (i % Math.max(1, Math.floor(weeklyTrend.length / 6)) === 0 ? shortLabel : '')}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    {weeklyTrend.length === 0 && (
                                        <span className="text-[10px] italic mx-auto" style={{ color: 'var(--text-muted)' }}>No data</span>
                                    )}
                                </div>
                            </div>

                            {/* ─── Card 4: Peak Hours ─── */}
                            <div className="col-span-2 rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                                <div className="flex items-center gap-2 mb-3">
                                    <Clock className="w-4 h-4" style={{ color: '#8b5cf6' }} />
                                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                        Peak Hours (24h)
                                    </span>
                                    <div className="flex-1" />
                                    {maxPeakHour > 0 && (
                                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                            Most active: <span style={{ color: '#8b5cf6', fontWeight: 700 }}>
                                                {peakHours.indexOf(maxPeakHour)}:00
                                            </span>
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-end gap-[3px]" style={{ height: '140px' }}>
                                    {peakHours.map((count, hour) => {
                                        const isWorkHour = hour >= 9 && hour <= 18;
                                        return (
                                            <div key={hour} className="flex-1 flex flex-col items-center group" style={{ minWidth: 0 }}>
                                                <span className="text-[7px] font-bold mb-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    style={{ color: '#8b5cf6' }}>
                                                    {count || ''}
                                                </span>
                                                <div className="w-full rounded-t-sm transition-all duration-200 hover:opacity-100"
                                                    style={{
                                                        height: `${Math.max((count / maxPeakHour) * 120, 2)}px`,
                                                        backgroundColor: isWorkHour ? '#8b5cf6' : '#6d28d9',
                                                        opacity: count === 0 ? 0.1 : (isWorkHour ? 0.7 : 0.4),
                                                    }}
                                                    title={`${hour}:00 - ${count} commits`}
                                                />
                                                <span className="text-[7px] mt-0.5" style={{ color: 'var(--text-muted)', opacity: hour % 3 === 0 ? 1 : 0.3 }}>
                                                    {hour}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex mt-1">
                                    <div className="flex-[9]" />
                                    <div className="flex-[10] flex items-center justify-center">
                                        <span className="text-[8px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
                                            Work Hours (9-18)
                                        </span>
                                    </div>
                                    <div className="flex-[5]" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
