import { FolderOpen, Plus, Trash2 } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { useProjectStore } from '../store/useProjectStore';
import type { ProjectConfig, DeployEnvironment } from '../store/useProjectStore';
import { useI18n } from '../i18n/useI18n';

interface ConfigFormProps {
    onClose?: () => void;
    formData: ProjectConfig;
    setFormData: React.Dispatch<React.SetStateAction<ProjectConfig>>;
}

export function ConfigForm({ onClose, formData, setFormData }: ConfigFormProps) {
    const { selectedProjectId, addProject, updateProject, deleteProject } = useProjectStore();
    const { t } = useI18n();
    const isNew = selectedProjectId === 'NEW';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isNew) {
            await addProject(formData);
        } else {
            await updateProject(formData);
        }
        onClose?.();
    };

    const handleSelectFolder = async () => {
        try {
            const selectedPath = await open({
                directory: true,
                multiple: false,
                title: 'Select Repository Folder'
            });
            if (selectedPath && typeof selectedPath === 'string') {
                const folderName = selectedPath.split(/[\\/]/).pop() || '';
                setFormData(prev => ({
                    ...prev,
                    path: selectedPath,
                    name: prev.name.trim() === '' ? folderName : prev.name
                }));
            }
        } catch (error) {
            console.error('Failed to open dialog:', error);
        }
    };

    const handleAddEnv = () => {
        setFormData(prev => ({
            ...prev,
            environments: [...prev.environments, { name: '', tag_format: '' }]
        }));
    };

    const handleRemoveEnv = (index: number) => {
        setFormData(prev => ({
            ...prev,
            environments: prev.environments.filter((_, i) => i !== index)
        }));
    };

    const handleEnvChange = (index: number, field: keyof DeployEnvironment, value: string) => {
        const newEnvs = [...formData.environments];
        newEnvs[index] = { ...newEnvs[index], [field]: value };
        setFormData({ ...formData, environments: newEnvs });
    };

    if (!selectedProjectId) return null;

    const inputStyle: React.CSSProperties = {
        backgroundColor: 'var(--bg-input)',
        border: '1px solid var(--border-default)',
        color: 'var(--text-primary)',
        borderRadius: '6px',
        padding: '8px 10px',
        fontSize: '13px',
        outline: 'none',
        width: '100%',
        transition: 'border-color 0.2s',
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '11px',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        fontWeight: 600,
    };

    return (
        <div className="p-6 max-w-2xl" style={{ color: 'var(--text-primary)' }}>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-1.5 col-span-2">
                        <label style={labelStyle}>{t('config.projectName')}</label>
                        <input
                            required
                            style={inputStyle}
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. My Awesome Startup"
                        />
                    </div>

                    <div className="space-y-1.5 col-span-2">
                        <label style={labelStyle}>{t('config.repoPath')}</label>
                        <div className="relative">
                            <input
                                required
                                style={{ ...inputStyle, fontFamily: 'monospace', paddingRight: '36px', color: 'var(--text-accent)' }}
                                value={formData.path}
                                onChange={e => setFormData({ ...formData, path: e.target.value })}
                                placeholder="C:\\Users\\...\\project"
                            />
                            <button
                                type="button"
                                onClick={handleSelectFolder}
                                title={t('config.browse')}
                                className="absolute inset-y-0 right-0 flex items-center pr-2 transition-colors"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                <FolderOpen className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="col-span-2 pt-4" style={{ borderTop: '1px solid var(--border-default)' }}>
                        <div className="flex justify-between items-center mb-4">
                            <label style={labelStyle}>{t('config.environments')}</label>
                            <button
                                type="button"
                                onClick={handleAddEnv}
                                className="text-xs flex items-center gap-1 transition-colors"
                                style={{ color: 'var(--text-accent)' }}
                            >
                                <Plus className="w-3 h-3" /> {t('config.addEnv')}
                            </button>
                        </div>

                        <div className="space-y-3">
                            {formData.environments.map((env, idx) => (
                                <div key={idx} className="flex gap-3 items-start p-3 rounded group" style={{ backgroundColor: 'var(--bg-tree)', border: '1px solid var(--border-default)' }}>
                                    <div className="flex-1 space-y-1.5">
                                        <label style={{ ...labelStyle, fontSize: '10px' }}>{t('config.envName')}</label>
                                        <input
                                            required
                                            style={{ ...inputStyle, fontFamily: 'monospace' }}
                                            value={env.name}
                                            onChange={e => handleEnvChange(idx, 'name', e.target.value)}
                                            placeholder="e.g. staging"
                                        />
                                    </div>
                                    <div className="w-1/2 space-y-1.5">
                                        <label style={{ ...labelStyle, fontSize: '10px' }}>{t('config.tagFormat')}</label>
                                        <input
                                            required
                                            style={{ ...inputStyle, fontFamily: 'monospace' }}
                                            value={env.tag_format}
                                            onChange={e => handleEnvChange(idx, 'tag_format', e.target.value)}
                                            placeholder="e.g. v{version}-stg"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveEnv(idx)}
                                        className="mt-6 p-1.5 rounded transition-colors text-rose-500 hover:bg-rose-500/10"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {formData.environments.length === 0 && (
                                <div className="text-sm italic text-center py-4 rounded" style={{ color: 'var(--text-muted)', border: '1px dashed var(--border-default)' }}>
                                    {t('config.noEnvs')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Deploy Settings */}
                <div className="pt-4" style={{ borderTop: '1px solid var(--border-default)' }}>
                    <label style={labelStyle} className="mb-3 block">{t('config.deploySettings')}</label>
                    <label className="flex items-center gap-3 cursor-pointer px-3 py-2.5 rounded transition-colors"
                        style={{ backgroundColor: 'var(--bg-tree)', border: '1px solid var(--border-default)' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-tree)'}
                    >
                        <input
                            type="checkbox"
                            checked={formData.autoConfirmDeploy ?? false}
                            onChange={e => setFormData({ ...formData, autoConfirmDeploy: e.target.checked })}
                            className="w-4 h-4 rounded"
                            style={{ accentColor: 'var(--accent)' }}
                        />
                        <div>
                            <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t('deploy.autoConfirm')}</div>
                            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{t('config.autoConfirmHint')}</div>
                        </div>
                    </label>
                </div>

                {/* Branch Protection */}
                <div className="pt-4" style={{ borderTop: '1px solid var(--border-default)' }}>
                    <label style={labelStyle} className="mb-3 block">{t('config.protectedBranches')}</label>
                    <input
                        style={{ ...inputStyle, fontFamily: 'monospace' }}
                        value={(formData.protectedBranches || []).join(', ')}
                        onChange={e => setFormData({ ...formData, protectedBranches: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                        placeholder="main, master, prod"
                    />
                    <div className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>{t('config.protectedHint')}</div>
                </div>

                <div className="pt-6 flex justify-between" style={{ borderTop: '1px solid var(--border-default)' }}>
                    {!isNew ? (
                        <button
                            type="button"
                            onClick={() => deleteProject(formData.id)}
                            className="px-4 py-2 rounded text-sm transition-colors border"
                            style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.05)' }}
                        >
                            {t('config.delete')}
                        </button>
                    ) : <div></div>}
                    <button
                        type="submit"
                        className="font-semibold px-6 py-2 rounded text-sm transition-colors"
                        style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
                    >
                        {t('config.save')}
                    </button>
                </div>
            </form>
        </div>
    );
}
