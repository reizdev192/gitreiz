import { useState, useEffect } from 'react';
import { ConfigForm } from './ConfigForm';
import { GitTab } from './GitTab';
import { Settings, GitBranch } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import type { ProjectConfig } from '../store/useProjectStore';

export function ProjectWorkspace() {
    const [activeTab, setActiveTab] = useState<'git' | 'config'>('git');
    const { projects, selectedProjectId } = useProjectStore();
    const existingProject = projects.find(p => p.id === selectedProjectId);

    const [formData, setFormData] = useState<ProjectConfig>({
        id: '', name: '', path: '', environments: [], hooks: []
    });

    useEffect(() => {
        if (existingProject) setFormData(existingProject);
    }, [existingProject]);

    const tabStyle = (isActive: boolean) => ({
        borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
        color: isActive ? 'var(--text-accent)' : 'var(--text-muted)',
        backgroundColor: isActive ? 'var(--accent-muted)' : 'transparent',
    });

    return (
        <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-card)' }}>
            {/* Tabs Header */}
            <div className="flex font-mono text-sm shrink-0" style={{ borderBottom: '1px solid var(--border-default)' }}>
                <button
                    onClick={() => setActiveTab('git')}
                    className="flex-1 flex items-center justify-center gap-2 py-3 transition-colors"
                    style={tabStyle(activeTab === 'git')}
                >
                    <GitBranch className="w-4 h-4" /> Git
                </button>
                <button
                    onClick={() => setActiveTab('config')}
                    className="flex-1 flex items-center justify-center gap-2 py-3 transition-colors"
                    style={tabStyle(activeTab === 'config')}
                >
                    <Settings className="w-4 h-4" /> Config
                </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto min-h-0">
                {activeTab === 'git' ? <GitTab /> : <ConfigForm formData={formData} setFormData={setFormData} />}
            </div>
        </div>
    );
}
