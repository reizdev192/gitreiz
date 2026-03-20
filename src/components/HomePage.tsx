import { useProjectStore } from '../store/useProjectStore';
import { useI18n } from '../i18n/useI18n';
import { FolderGit2, Plus, ArrowRight } from 'lucide-react';

export function HomePage() {
    const { projects, selectProject } = useProjectStore();
    const { t } = useI18n();

    const handleNewProject = () => {
        selectProject('NEW');
    };

    return (
        <div className="flex-1 flex flex-col items-center p-8 overflow-y-auto" style={{ backgroundColor: 'var(--bg-app)' }}>
            {/* The top spacing is dynamic to perfectly center or place near top if many items */}
            <div className="w-full max-w-5xl space-y-16 mt-8 mb-12">
                
                {/* Hero Section */}
                <div className="flex flex-col items-center text-center space-y-6">
                    <div className="w-28 h-28 relative mb-2">
                        {/* Glow effect */}
                        <div className="absolute inset-0 blur-3xl opacity-30 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
                        <img src="/logo.png" alt="ReizGit Logo" className="w-full h-full object-contain relative z-10 drop-shadow-2xl hover:scale-110 transition-transform duration-500" />
                    </div>
                    
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 drop-shadow-sm">
                        Welcome to ReizGit
                    </h1>
                    
                    <p className="text-sm md:text-base max-w-xl mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        Elevate your development workflow. ReizGit delivers powerful Git integrations, seamless deployment automation, and unified project management in one sleek workspace.
                    </p>

                    <div className="flex justify-center pt-4">
                        <button 
                            onClick={handleNewProject}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all hover:-translate-y-1 active:translate-y-0"
                            style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
                        >
                            <Plus className="w-5 h-5" /> 
                            {t('app.newProject')}
                        </button>
                    </div>
                </div>

                {/* Recent Projects Section */}
                {projects.length > 0 && (
                    <div className="space-y-6 pt-10 border-t" style={{ borderColor: 'var(--border-default)' }}>
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                                Recent Projects
                            </h2>
                            <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                                {projects.length}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {projects.map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => selectProject(p.id)}
                                    className="flex flex-col text-left p-5 rounded-2xl border border-transparent hover:border-emerald-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1 group"
                                    style={{ backgroundColor: 'var(--bg-panel)' }}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300 shadow-sm">
                                            <FolderGit2 className="w-6 h-6" />
                                        </div>
                                        <div className="p-1.5 rounded-full bg-transparent group-hover:bg-emerald-500/10 transition-colors duration-300">
                                            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0 text-emerald-500" />
                                        </div>
                                    </div>
                                    
                                    <h3 className="font-bold text-[16px] mb-1.5 truncate w-full" style={{ color: 'var(--text-primary)' }}>
                                        {p.name}
                                    </h3>
                                    
                                    <p className="text-[12px] font-mono truncate w-full opacity-70 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }} title={p.path}>
                                        {p.path}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
