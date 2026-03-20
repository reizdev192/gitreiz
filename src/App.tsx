import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
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
import { Plus, Settings, Sun, Moon, FolderGit2, Globe, HelpCircle, BarChart3, Network, X, Search, Download, Upload, FolderDown, GitBranch, TrendingUp, RefreshCw, Users } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { save, open } from '@tauri-apps/plugin-dialog';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAutoFetch } from './hooks/useAutoFetch';
import { ConfirmDialog } from './components/ConfirmDialog';
import { PasswordDialog } from './components/PasswordDialog';
import { HomePage } from './components/HomePage';
import type { ProjectConfig } from './store/useProjectStore';

// Lazy load heavy components — only loaded when needed
const HelpGuide = lazy(() => import('./components/HelpGuide').then(m => ({ default: m.HelpGuide })));
const DashboardPanel = lazy(() => import('./components/DashboardPanel').then(m => ({ default: m.DashboardPanel })));
const GlobalSettings = lazy(() => import('./components/GlobalSettings').then(m => ({ default: m.GlobalSettings })));
const SplashScreen = lazy(() => import('./components/SplashScreen').then(m => ({ default: m.SplashScreen })));
const PerformanceTab = lazy(() => import('./components/PerformanceTab').then(m => ({ default: m.PerformanceTab })));
const TeamDashboard = lazy(() => import('./components/TeamDashboard').then(m => ({ default: m.TeamDashboard })));

function AppContent() {
    // Individual selectors — only re-render when the specific field changes
    const loadConfig = useProjectStore(s => s.loadConfig);
    const selectedProjectId = useProjectStore(s => s.selectedProjectId);
    const openProjectIds = useProjectStore(s => s.openProjectIds);
    const activeProjectId = useProjectStore(s => s.activeProjectId);
    const projects = useProjectStore(s => s.projects);
    const selectProject = useProjectStore(s => s.selectProject);
    const openProject = useProjectStore(s => s.openProject);
    const closeProject = useProjectStore(s => s.closeProject);
    const { theme, toggleTheme } = useTheme();
    const { t, locale, setLocale } = useI18n();
    const [showConfig, setShowConfig] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [projectFilter, setProjectFilter] = useState('');
    const [showLangMenu, setShowLangMenu] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [showDashboard, setShowDashboard] = useState(false);
    const [showGlobalSettings, setShowGlobalSettings] = useState(false);
    const [showDataMenu, setShowDataMenu] = useState(false);
    const [passwordDialog, setPasswordDialog] = useState<{ mode: 'export' | 'import'; filePath: string } | null>(null);
    const [showSplash, setShowSplash] = useState(true);
    const [mainView, setMainView] = useState<'git' | 'performance' | 'team'>('git');
    const [splitWidth, setSplitWidth] = useState(() => {
        const saved = localStorage.getItem('deploy-split-width');
        return saved ? Number(saved) : 40;
    });

    // formData for inline "NEW" project config
    const [newFormData, setNewFormData] = useState<ProjectConfig>({
        id: crypto.randomUUID(),
        name: '',
        path: '',
        environments: [
            { name: 'staging', tag_format: 'stagingf{version}' },
            { name: 'prod', tag_format: 'v{version}-prod' }
        ],
        hooks: []
    });

    const dropdownRef = useRef<HTMLDivElement>(null);
    const isResizing = useRef(false);
    const mainRef = useRef<HTMLElement>(null);

    useEffect(() => { loadConfig(); }, [loadConfig]);

    useKeyboardShortcuts({
        openSettings: () => setShowConfig(true),
    });
    useAutoFetch();

    const handleExportSettings = async () => {
        setShowDataMenu(false);
        try {
            const filePath = await save({
                title: 'Export Settings',
                defaultPath: 'reizgit-settings.json',
                filters: [{ name: 'JSON', extensions: ['json'] }],
            });
            if (!filePath) return;
            setPasswordDialog({ mode: 'export', filePath });
        } catch (e: any) {
            console.error('Export failed:', e);
        }
    };

    const handleImportSettings = async () => {
        setShowDataMenu(false);
        const { confirm } = await import('./store/useConfirmStore').then(m => m.useConfirmStore.getState());
        const confirmed = await confirm({
            title: 'Import Settings',
            message: 'This will replace ALL current settings (projects, integrations, webhooks). Are you sure?'
        });
        if (!confirmed) return;
        try {
            const filePath = await open({
                title: 'Import Settings',
                filters: [{ name: 'JSON', extensions: ['json'] }],
                multiple: false,
                directory: false,
            });
            if (!filePath) return;
            setPasswordDialog({ mode: 'import', filePath });
        } catch (e: any) {
            console.error('Import failed:', e);
        }
    };

    const handlePasswordConfirm = async (password: string) => {
        if (!passwordDialog) return;
        const { mode, filePath } = passwordDialog;
        setPasswordDialog(null);
        try {
            if (mode === 'export') {
                await invoke('export_settings_cmd', { filePath, password });
            } else {
                await invoke('import_settings_cmd', { filePath, password });
                await loadConfig();
            }
        } catch (e: any) {
            const { confirm } = await import('./store/useConfirmStore').then(m => m.useConfirmStore.getState());
            await confirm({
                title: mode === 'export' ? 'Export Failed' : 'Import Failed',
                message: String(e)
            });
        }
    };

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
            setShowDataMenu(false);
            setShowLangMenu(false);
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
        <>
            {showSplash && <Suspense fallback={null}><SplashScreen onComplete={() => setShowSplash(false)} /></Suspense>}
            
            <div className={`flex flex-col h-screen w-full overflow-hidden font-sans selection:bg-emerald-500/30 transition-opacity duration-500 ${showSplash ? 'opacity-0' : 'opacity-100'}`} style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>

                {/* Global Header */}
            <header className="flex items-center gap-3 px-4 py-2.5 shrink-0 relative z-50"
                style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-sidebar)' }}
            >
                <button 
                    onClick={() => selectProject('')}
                    className="flex items-center gap-2.5 font-medium font-mono shrink-0 hover:opacity-80 transition-opacity cursor-pointer group" 
                    style={{ color: 'var(--text-accent)' }}
                    title={t('app.goHome') || 'Go to Home Screen'}
                >
                    <img src="/logo.png" alt="ReizGit" className="w-7 h-7 rounded-md object-contain group-hover:scale-105 transition-transform" />
                    <span className="text-base font-bold tracking-wide">ReizGit</span>
                </button>

                <div className="w-px h-5 mx-1" style={{ backgroundColor: 'var(--border-default)' }} />

                {/* Project Tab Bar */}
                <div className="flex items-center gap-0.5 min-w-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                    {openProjectIds.map(pid => {
                        const p = projects.find(pr => pr.id === pid);
                        if (!p) return null;
                        const isActive = activeProjectId === pid;
                        return (
                            <div
                                key={pid}
                                className="flex items-center gap-1.5 pl-3 pr-1 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 group max-w-[180px]"
                                style={{
                                    backgroundColor: isActive ? 'var(--accent-muted)' : 'transparent',
                                    color: isActive ? 'var(--text-accent)' : 'var(--text-secondary)',
                                    border: isActive ? '1px solid var(--accent)' : '1px solid transparent',
                                }}
                                onClick={() => openProject(pid)}
                                onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                                onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                                <FolderGit2 className="w-3 h-3 shrink-0" style={{ color: isActive ? 'var(--text-accent)' : 'var(--text-muted)' }} />
                                <span className="truncate">{p.name}</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); closeProject(pid); }}
                                    className="p-0.5 rounded opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity shrink-0"
                                    style={{ color: 'var(--text-muted)' }}
                                    title="Close tab"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Add Project Dropdown — outside overflow container */}
                <div className="relative shrink-0" ref={dropdownRef}>
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowDropdown(!showDropdown); if (showDropdown) setProjectFilter(''); }}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        title={t('app.newProject') || 'Open Project'}
                    >
                        <Plus className="w-4 h-4" />
                    </button>

                    {showDropdown && (
                        <div className="absolute top-full left-0 mt-1 rounded-xl overflow-hidden shadow-2xl z-[9999]"
                            style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-default)', minWidth: '260px' }}
                        >
                            <div className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold"
                                style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-tree-header)' }}
                            >
                                {t('app.projects')}
                            </div>
                            {/* Search */}
                            {projects.length > 3 && (
                                <div className="px-2 py-1.5" style={{ borderBottom: '1px solid var(--border-default)' }}>
                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-default)' }}>
                                        <Search className="w-3 h-3 shrink-0" style={{ color: 'var(--text-muted)' }} />
                                        <input
                                            autoFocus
                                            value={projectFilter}
                                            onChange={e => setProjectFilter(e.target.value)}
                                            placeholder="Search projects..."
                                            className="flex-1 bg-transparent border-none outline-none text-xs"
                                            style={{ color: 'var(--text-primary)' }}
                                            onClick={e => e.stopPropagation()}
                                        />
                                        {projectFilter && (
                                            <button onClick={(e) => { e.stopPropagation(); setProjectFilter(''); }}>
                                                <X className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="py-1 max-h-[300px] overflow-y-auto">
                                {(() => {
                                    const filtered = projectFilter
                                        ? projects.filter(p => p.name.toLowerCase().includes(projectFilter.toLowerCase()) || p.path.toLowerCase().includes(projectFilter.toLowerCase()))
                                        : projects;
                                    if (filtered.length === 0) return (
                                        <div className="px-3 py-3 text-sm italic" style={{ color: 'var(--text-muted)' }}>
                                            {projects.length === 0 ? t('app.noProjects') : 'No matching projects'}
                                        </div>
                                    );
                                    return filtered.map(p => {
                                        const isOpen = openProjectIds.includes(p.id);
                                        return (
                                            <button key={p.id}
                                                onClick={() => { openProject(p.id); setShowDropdown(false); }}
                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors"
                                                style={{ backgroundColor: isOpen ? 'var(--accent-muted)' : 'transparent', color: isOpen ? 'var(--text-accent)' : 'var(--text-primary)' }}
                                                onMouseEnter={e => { if (!isOpen) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                                                onMouseLeave={e => { if (!isOpen) e.currentTarget.style.backgroundColor = isOpen ? 'var(--accent-muted)' : 'transparent'; }}
                                            >
                                                <FolderGit2 className="w-3.5 h-3.5 shrink-0" style={{ color: isOpen ? 'var(--text-accent)' : 'var(--text-muted)' }} />
                                                <div className="min-w-0 flex-1">
                                                    <div className="truncate font-medium">{p.name}</div>
                                                    <div className="text-[10px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>{p.path}</div>
                                                </div>
                                                {isOpen && <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>Open</span>}
                                            </button>
                                        );
                                    });
                                })()}
                            </div>
                            <div style={{ borderTop: '1px solid var(--border-default)' }}>
                                <button
                                    onClick={() => {
                                        setShowDropdown(false);
                                        setNewFormData({
                                            id: crypto.randomUUID(),
                                            name: '',
                                            path: '',
                                            environments: [
                                                { name: 'staging', tag_format: 'stagingf{version}' },
                                                { name: 'prod', tag_format: 'v{version}-prod' }
                                            ],
                                            hooks: []
                                        });
                                        selectProject('NEW');
                                    }}
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
                    <button onClick={() => setShowGlobalSettings(true)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-accent)'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                        title="Global Integrations"
                    >
                        <Network className="w-4 h-4" />
                    </button>

                    {/* Import / Export Settings */}
                    <div className="relative">
                        <button onClick={(e) => { e.stopPropagation(); setShowDataMenu(!showDataMenu); }}
                            className="p-1.5 rounded-lg transition-colors" style={{ color: showDataMenu ? 'var(--text-accent)' : 'var(--text-muted)', backgroundColor: showDataMenu ? 'var(--bg-hover)' : 'transparent' }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-accent)'; }}
                            onMouseLeave={e => { if (!showDataMenu) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; } }}
                            title="Import / Export Settings"
                        >
                            <FolderDown className="w-4 h-4" />
                        </button>
                        {showDataMenu && (
                            <div className="absolute right-0 top-full mt-1 rounded-lg overflow-hidden shadow-2xl z-[9999]" style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-default)', minWidth: '180px' }}>
                                <button onClick={handleImportSettings}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-left transition-colors"
                                    style={{ color: 'var(--text-primary)' }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <Upload className="w-3.5 h-3.5" style={{ color: 'var(--text-accent)' }} /> Import Settings
                                </button>
                                <button onClick={handleExportSettings}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-left transition-colors"
                                    style={{ color: 'var(--text-primary)', borderTop: '1px solid var(--border-default)' }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <Download className="w-3.5 h-3.5" style={{ color: 'var(--text-accent)' }} /> Export Settings
                                </button>
                            </div>
                        )}
                    </div>

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
                {/* Main Navigation Bar — only when project is open */}
                {selectedProjectId && !isConfiguringNew && (
                    <div className="flex items-center shrink-0 px-1" style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-sidebar)' }}>
                        <button onClick={() => setMainView('git')}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-colors relative"
                            style={{ color: mainView === 'git' ? 'var(--text-accent)' : 'var(--text-muted)' }}
                            onMouseEnter={e => { if (mainView !== 'git') e.currentTarget.style.color = 'var(--text-secondary)'; }}
                            onMouseLeave={e => { if (mainView !== 'git') e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >
                            <GitBranch className="w-3.5 h-3.5" /> {t('nav.git')}
                            {mainView === 'git' && <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full" style={{ backgroundColor: 'var(--accent)' }} />}
                        </button>
                        <button onClick={() => setMainView('performance')}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-colors relative"
                            style={{ color: mainView === 'performance' ? 'var(--text-accent)' : 'var(--text-muted)' }}
                            onMouseEnter={e => { if (mainView !== 'performance') e.currentTarget.style.color = 'var(--text-secondary)'; }}
                            onMouseLeave={e => { if (mainView !== 'performance') e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >
                            <TrendingUp className="w-3.5 h-3.5" /> {t('nav.performance')}
                            {mainView === 'performance' && <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full" style={{ backgroundColor: 'var(--accent)' }} />}
                        </button>
                        <button onClick={() => setMainView('team')}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-colors relative"
                            style={{ color: mainView === 'team' ? 'var(--text-accent)' : 'var(--text-muted)' }}
                            onMouseEnter={e => { if (mainView !== 'team') e.currentTarget.style.color = 'var(--text-secondary)'; }}
                            onMouseLeave={e => { if (mainView !== 'team') e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >
                            <Users className="w-3.5 h-3.5" /> {t('nav.team')}
                            {mainView === 'team' && <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full" style={{ backgroundColor: 'var(--accent)' }} />}
                        </button>
                    </div>
                )}

                <main ref={mainRef} className="flex-1 flex min-h-0 overflow-hidden">
                    {!selectedProjectId ? (
                        <HomePage />
                    ) : isConfiguringNew ? (
                        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-card)' }}>
                            <ConfigForm onClose={() => selectProject(projects[0]?.id || '')} formData={newFormData} setFormData={setNewFormData} />
                        </div>
                    ) : mainView === 'performance' ? (
                        <div className="flex-1 min-w-0 overflow-hidden" style={{ backgroundColor: 'var(--bg-panel)' }}>
                            <Suspense fallback={<div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}><RefreshCw className="w-5 h-5 animate-spin" /></div>}>
                                <PerformanceTab repoPath={project!.path} />
                            </Suspense>
                        </div>
                    ) : mainView === 'team' ? (
                        <div className="flex-1 min-w-0 overflow-hidden" style={{ backgroundColor: 'var(--bg-panel)' }}>
                            <Suspense fallback={<div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}><RefreshCw className="w-5 h-5 animate-spin" /></div>}>
                                <TeamDashboard repoPath={project!.path} />
                            </Suspense>
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
            {showHelp && <Suspense fallback={null}><HelpGuide onClose={() => setShowHelp(false)} /></Suspense>}
            <ConfirmDialog />
            {passwordDialog && (
                <PasswordDialog
                    title={passwordDialog.mode === 'export' ? 'Encrypt Settings' : 'Decrypt Settings'}
                    description={passwordDialog.mode === 'export'
                        ? 'Enter a password to encrypt sensitive data (API keys, tokens). You will need this password to import the settings later.'
                        : 'Enter the password that was used to encrypt this settings file.'}
                    confirmLabel={passwordDialog.mode === 'export' ? 'Export' : 'Import'}
                    onConfirm={handlePasswordConfirm}
                    onCancel={() => setPasswordDialog(null)}
                />
            )}

            {/* Dashboard */}
            {showDashboard && <Suspense fallback={null}><DashboardPanel onClose={() => setShowDashboard(false)} /></Suspense>}

            {/* Global Settings */}
            {showGlobalSettings && <Suspense fallback={null}><GlobalSettings onClose={() => setShowGlobalSettings(false)} /></Suspense>}
        </div>
        </>
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
