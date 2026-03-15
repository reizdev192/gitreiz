import { useState, useEffect, useRef, useCallback } from 'react';
import { useProjectStore } from './store/useProjectStore';
import { ConfigForm } from './components/ConfigForm';
import { GitTab } from './components/GitTab';
import { CommitPanel } from './components/CommitPanel';
import { TerminalBar } from './components/TerminalBar';
import { ConfigModal } from './components/ConfigModal';
import { ThemeProvider } from './context/ThemeContext';
import { useTheme } from './context/ThemeContext';
import { I18nProvider, useI18n } from './i18n/useI18n';
import { LOCALE_LABELS, type Locale } from './i18n/translations';
import { TerminalSquare, ChevronDown, Plus, Settings, Sun, Moon, FolderGit2, Globe, HelpCircle, BarChart3 } from 'lucide-react';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAutoFetch } from './hooks/useAutoFetch';
import { HelpGuide } from './components/HelpGuide';
import { DashboardPanel } from './components/DashboardPanel';

function AppContent() {
    const { loadConfig, selectedProjectId, projects, selectProject } = useProjectStore();
    const { theme, toggleTheme } = useTheme();
    const { t, locale, setLocale } = useI18n();
    const [showConfig, setShowConfig] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showLangMenu, setShowLangMenu] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [showDashboard, setShowDashboard] = useState(false);
    const [splitWidth, setSplitWidth] = useState(() => {
        const saved = localStorage.getItem('deploy-split-width');
        return saved ? Number(saved) : 40;
    });
    const dropdownRef = useRef<HTMLDivElement>(null);
    const isResizing = useRef(false);
    const mainRef = useRef<HTMLElement>(null);

    useEffect(() => { loadConfig(); }, [loadConfig]);

    useKeyboardShortcuts({
        openSettings: () => setShowConfig(true),
    });
    useAutoFetch();

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
        };
        window.addEventListener('click', handler);
        return () => window.removeEventListener('click', handler);
    }, []);

    const startResize = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isResizing.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const onMouseMove = (ev: MouseEvent) => {
            if (!isResizing.current || !mainRef.current) return;
            const rect = mainRef.current.getBoundingClientRect();
            const pct = Math.min(70, Math.max(20, ((ev.clientX - rect.left) / rect.width) * 100));
            setSplitWidth(pct);
            localStorage.setItem('deploy-split-width', String(Math.round(pct)));
        };
        const onMouseUp = () => {
            isResizing.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }, []);

    const project = projects.find(p => p.id === selectedProjectId);
    const isConfiguringNew = selectedProjectId === 'NEW';

    return (
        <div className="flex flex-col h-screen w-full overflow-hidden font-sans selection:bg-emerald-500/30" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>

            {/* Global Header */}
            <header className="flex items-center gap-3 px-4 py-2.5 shrink-0"
                style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-sidebar)' }}
            >
                {/* Logo */}
                <div className="flex items-center gap-2 font-medium font-mono shrink-0" style={{ color: 'var(--text-accent)' }}>
                    <TerminalSquare className="w-4.5 h-4.5" />
                    <span className="text-sm">Deploy.exe</span>
                </div>

                <div className="w-px h-5 mx-1" style={{ backgroundColor: 'var(--border-default)' }} />

                {/* Project Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                        style={{ backgroundColor: showDropdown ? 'var(--bg-hover)' : 'transparent', color: 'var(--text-primary)' }}
                        onMouseEnter={e => { if (!showDropdown) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                        onMouseLeave={e => { if (!showDropdown) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                        <FolderGit2 className="w-3.5 h-3.5" style={{ color: 'var(--text-accent)' }} />
                        <span className="truncate max-w-[200px]">{project?.name || t('app.selectProject')}</span>
                        <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)', transform: showDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </button>

                    {/* Dropdown Menu */}
                    {showDropdown && (
                        <div className="absolute top-full left-0 mt-1 rounded-xl overflow-hidden shadow-2xl z-[9999]"
                            style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-default)', minWidth: '260px', backdropFilter: 'blur(16px)' }}
                        >
                            <div className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold"
                                style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-tree-header)' }}
                            >
                                {t('app.projects')}
                            </div>
                            <div className="py-1 max-h-[300px] overflow-y-auto">
                                {projects.length === 0 ? (
                                    <div className="px-3 py-3 text-sm italic" style={{ color: 'var(--text-muted)' }}>{t('app.noProjects')}</div>
                                ) : (
                                    projects.map(p => (
                                        <button key={p.id}
                                            onClick={() => { selectProject(p.id); setShowDropdown(false); }}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors"
                                            style={{ backgroundColor: selectedProjectId === p.id ? 'var(--accent-muted)' : 'transparent', color: selectedProjectId === p.id ? 'var(--text-accent)' : 'var(--text-primary)' }}
                                            onMouseEnter={e => { if (selectedProjectId !== p.id) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                                            onMouseLeave={e => { if (selectedProjectId !== p.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                        >
                                            <FolderGit2 className="w-3.5 h-3.5 shrink-0" style={{ color: selectedProjectId === p.id ? 'var(--text-accent)' : 'var(--text-muted)' }} />
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate font-medium">{p.name}</div>
                                                <div className="text-[10px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>{p.path}</div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                            <div style={{ borderTop: '1px solid var(--border-default)' }}>
                                <button
                                    onClick={() => { setShowDropdown(false); selectProject('NEW'); }}
                                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors"
                                    style={{ color: 'var(--text-accent)' }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <Plus className="w-3.5 h-3.5" /> {t('app.newProject')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right side: project path + actions */}
                <div className="flex-1 min-w-0">
                    {project && (
                        <span className="text-[11px] font-mono truncate block" style={{ color: 'var(--text-muted)' }} title={project.path}>{project.path}</span>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    {/* Dashboard */}
                    {project && (
                        <button onClick={() => setShowDashboard(true)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-accent)'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                            title="Dashboard">
                            <BarChart3 className="w-4 h-4" />
                        </button>
                    )}
                    {/* Help Guide */}
                    <button onClick={() => setShowHelp(true)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-accent)'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                        title="Help">
                        <HelpCircle className="w-4 h-4" />
                    </button>
                    {project && (
                        <button onClick={() => setShowConfig(true)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-accent)'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                            title={t('app.projectSettings')}
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                    )}

                    {/* Language Selector */}
                    <div className="relative">
                        <button onClick={() => setShowLangMenu(!showLangMenu)} className="p-1.5 rounded-lg transition-colors flex items-center gap-1" style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = showLangMenu ? 'var(--bg-hover)' : 'transparent'}
                        >
                            <Globe className="w-4 h-4" />
                            <span className="text-[10px] uppercase font-bold">{locale}</span>
                        </button>
                        {showLangMenu && (
                            <div className="absolute right-0 top-full mt-1 rounded-lg overflow-hidden shadow-2xl z-[9999]" style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-default)', minWidth: '140px' }}>
                                {(Object.entries(LOCALE_LABELS) as [Locale, string][]).map(([code, label]) => (
                                    <button key={code}
                                        onClick={() => { setLocale(code); setShowLangMenu(false); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors"
                                        style={{ backgroundColor: locale === code ? 'var(--accent-muted)' : 'transparent', color: locale === code ? 'var(--text-accent)' : 'var(--text-primary)' }}
                                        onMouseEnter={e => { if (locale !== code) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                                        onMouseLeave={e => { if (locale !== code) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                    >
                                        <span className="text-[10px] uppercase font-bold w-5" style={{ color: 'var(--text-muted)' }}>{code}</span>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button onClick={toggleTheme} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <main ref={mainRef} className="flex-1 flex min-h-0 overflow-hidden">
                    {!selectedProjectId ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-xl ring-1 ring-white/5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
                                    <span className="text-3xl font-mono" style={{ color: 'var(--text-accent)' }}>{`{}`}</span>
                                </div>
                                <p style={{ color: 'var(--text-muted)' }} className="max-w-sm">{t('app.selectPrompt')}</p>
                            </div>
                        </div>
                    ) : isConfiguringNew ? (
                        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-card)' }}>
                            <ConfigForm onClose={() => selectProject(projects[0]?.id || '')} />
                        </div>
                    ) : (
                        <>
                            <div className="overflow-hidden flex flex-col" style={{ width: `${splitWidth}%`, backgroundColor: 'var(--bg-card)' }}>
                                <GitTab />
                            </div>
                            {/* Drag Divider */}
                            <div
                                className="shrink-0 cursor-col-resize group flex items-center justify-center"
                                style={{ width: '4px', backgroundColor: 'var(--border-default)', transition: 'background-color 0.15s' }}
                                onMouseDown={startResize}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent)'}
                                onMouseLeave={e => { if (!isResizing) e.currentTarget.style.backgroundColor = 'var(--border-default)'; }}
                            />
                            <div className="flex-1 min-w-0" style={{ backgroundColor: 'var(--bg-panel)' }}>
                                <CommitPanel />
                            </div>
                        </>
                    )}
                </main>

                {/* Bottom Terminal Bar */}
                {selectedProjectId && !isConfiguringNew && <TerminalBar />}
            </div>

            {/* Config Modal */}
            {showConfig && <ConfigModal onClose={() => setShowConfig(false)} />}

            {/* Help Guide */}
            {showHelp && <HelpGuide onClose={() => setShowHelp(false)} />}

            {/* Dashboard */}
            {showDashboard && <DashboardPanel onClose={() => setShowDashboard(false)} />}
        </div>
    );
}

function App() {
    return (
        <ThemeProvider>
            <I18nProvider>
                <AppContent />
            </I18nProvider>
        </ThemeProvider>
    );
}

export default App;
