import { FolderGit2, Plus, Moon, Sun } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { useTheme } from '../context/ThemeContext';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function ProjectList() {
    const { projects, selectedProjectId, selectProject } = useProjectStore();
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="w-64 flex flex-col h-full overflow-hidden" style={{ backgroundColor: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-default)' }}>
            <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-default)' }}>
                <div className="flex items-center gap-2.5 font-medium font-mono" style={{ color: 'var(--text-accent)' }}>
                    <img src="/logo.png" alt="ZenGit" className="w-8 h-8 rounded-lg object-contain filter drop-shadow-sm" />
                    <span className="text-xl font-bold tracking-wider">ZenGit</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={toggleTheme}
                        className="p-1.5 rounded-md transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => selectProject('NEW')}
                        className="p-1.5 rounded-md transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        title="Add new project"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 px-2" style={{ color: 'var(--text-muted)' }}>Projects</h3>
                {projects.length === 0 ? (
                    <p className="text-sm px-2 italic" style={{ color: 'var(--text-muted)' }}>No projects configured.</p>
                ) : (
                    projects.map(p => (
                        <button
                            key={p.id}
                            onClick={() => selectProject(p.id)}
                            className={twMerge(
                                clsx(
                                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all text-left border",
                                    selectedProjectId === p.id
                                        ? "font-medium"
                                        : "border-transparent"
                                )
                            )}
                            style={selectedProjectId === p.id ? {
                                backgroundColor: 'var(--bg-active)',
                                color: 'var(--text-accent)',
                                borderColor: 'var(--border-default)'
                            } : {
                                color: 'var(--text-secondary)'
                            }}
                        >
                            <FolderGit2 className="w-4 h-4" style={{ color: selectedProjectId === p.id ? 'var(--text-accent)' : 'var(--text-muted)' }} />
                            <span className="truncate">{p.name}</span>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
