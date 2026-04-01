import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Settings, Bell } from 'lucide-react';
import { ConfigForm } from './ConfigForm';
import { WebhookTab } from './WebhookTab';
import { useProjectStore } from '../store/useProjectStore';
import type { ProjectConfig } from '../store/useProjectStore';
import { useI18n } from '../i18n/useI18n';
import { useEscClose } from '../hooks/useEscClose';

interface Props {
    onClose: () => void;
}

type SettingsTab = 'general' | 'webhooks';

export function ConfigModal({ onClose }: Props) {
    const { t } = useI18n();
    useEscClose(onClose);
    const { projects, selectedProjectId, updateProject } = useProjectStore();
    const isNew = selectedProjectId === 'NEW';
    const existingProject = projects.find(p => p.id === selectedProjectId);
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');

    const [formData, setFormData] = useState<ProjectConfig>({
        id: '',
        name: '',
        path: '',
        environments: [
            { name: 'staging', tag_format: 'v{version}-stg' },
            { name: 'uat', tag_format: 'v{version}-uat' },
            { name: 'master', tag_format: 'v{version}-prod' }
        ],
        hooks: []
    });

    useEffect(() => {
        if (existingProject) {
            setFormData(existingProject);
        } else if (isNew) {
            setFormData({
                id: crypto.randomUUID(),
                name: '',
                path: '',
                environments: [
                    { name: 'staging', tag_format: 'v{version}-stg' },
                    { name: 'uat', tag_format: 'v{version}-uat' },
                    { name: 'master', tag_format: 'v{version}-prod' }
                ],
                hooks: []
            });
        }
    }, [existingProject, isNew]);

    const handleSaveWebhooks = async () => {
        if (isNew) return;
        await updateProject(formData);
        onClose();
    };

    const tabs: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
        { key: 'general', label: 'General', icon: <Settings className="w-3.5 h-3.5" /> },
        { key: 'webhooks', label: 'Webhooks', icon: <Bell className="w-3.5 h-3.5" /> },
    ];

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center"
            onClick={onClose}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        >
            <div className="relative rounded-2xl shadow-2xl overflow-hidden w-[90%] max-w-2xl max-h-[85vh] flex flex-col"
                onClick={e => e.stopPropagation()}
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-3 shrink-0"
                    style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-tree-header)' }}
                >
                    <h2 className="text-lg font-semibold font-mono" style={{ color: 'var(--text-accent)' }}>
                        {t('app.projectSettings')}
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex px-4 gap-1 shrink-0" style={{ backgroundColor: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-default)' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all relative"
                            style={{
                                color: activeTab === tab.key ? 'var(--text-accent)' : 'var(--text-muted)',
                                borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
                                marginBottom: '-1px',
                            }}
                            onMouseEnter={e => { if (activeTab !== tab.key) e.currentTarget.style.color = 'var(--text-primary)'; }}
                            onMouseLeave={e => { if (activeTab !== tab.key) e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'general' && (
                        <ConfigForm onClose={onClose} formData={formData} setFormData={setFormData} />
                    )}
                    {activeTab === 'webhooks' && (
                        <div className="flex flex-col h-full">
                            <WebhookTab formData={formData} setFormData={setFormData} />
                            <div className="px-6 pb-6 flex justify-end" style={{ borderTop: '1px solid var(--border-default)' }}>
                                <button
                                    onClick={handleSaveWebhooks}
                                    className="font-semibold px-6 py-2 mt-4 rounded text-sm transition-colors"
                                    style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
                                >
                                    {t('config.save')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
