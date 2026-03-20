import { Plus, Trash2 } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import type { ProjectConfig, WebhookEvent } from '../store/useProjectStore';

interface Props {
    formData: ProjectConfig;
    setFormData: React.Dispatch<React.SetStateAction<ProjectConfig>>;
}

export function WebhookTab({ formData, setFormData }: Props) {
    const { integrations } = useProjectStore();

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

    const handleAddWebhook = () => {
        if (integrations.length === 0) {
            alert('Please configure Global Integrations first!');
            return;
        }
        setFormData(prev => ({
            ...prev,
            hooks: [...(prev.hooks || []), {
                id: crypto.randomUUID(),
                integrationId: integrations[0].id,
                events: ['push']
            }]
        }));
    };

    const handleRemoveWebhook = (index: number) => {
        setFormData(prev => ({
            ...prev,
            hooks: (prev.hooks || []).filter((_, i) => i !== index)
        }));
    };

    const handleWebhookChange = (index: number, integrationId: string) => {
        const newHooks = [...(formData.hooks || [])];
        newHooks[index] = { ...newHooks[index], integrationId };
        setFormData({ ...formData, hooks: newHooks });
    };

    const handleWebhookEventToggle = (index: number, event: WebhookEvent) => {
        const newHooks = [...(formData.hooks || [])];
        const hook = newHooks[index];
        if (hook.events.includes(event)) {
            hook.events = hook.events.filter(e => e !== event);
        } else {
            hook.events = [...hook.events, event];
        }
        setFormData({ ...formData, hooks: newHooks });
    };

    return (
        <div className="p-6 space-y-5" style={{ color: 'var(--text-primary)' }}>
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Webhooks & Notifications</h3>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                        Configure notifications for this project's Git events. Requires Global Integrations to be set up first.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleAddWebhook}
                    className="shrink-0 ml-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
                >
                    <Plus className="w-3.5 h-3.5" /> Add Webhook
                </button>
            </div>

            <div className="space-y-3">
                {(formData.hooks || []).map((hook, idx) => (
                    <div key={hook.id} className="p-3 rounded-lg space-y-3" style={{ backgroundColor: 'var(--bg-tree)', border: '1px solid var(--border-default)' }}>
                        <div className="flex gap-3 items-center">
                            <div className="flex-1 space-y-1.5">
                                <label style={{ ...labelStyle, fontSize: '10px' }}>Integration Target</label>
                                <select
                                    style={inputStyle}
                                    value={hook.integrationId}
                                    onChange={e => handleWebhookChange(idx, e.target.value)}
                                >
                                    {integrations.map(ig => (
                                        <option key={ig.id} value={ig.id}>{ig.name} ({ig.type})</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleRemoveWebhook(idx)}
                                className="mt-6 p-1.5 rounded transition-colors text-rose-500 hover:bg-rose-500/10"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        <div>
                            <label style={{ ...labelStyle, fontSize: '10px', display: 'block', marginBottom: '4px' }}>Triggers</label>
                            <div className="flex flex-wrap gap-2">
                                {(['push', 'commit', 'create_branch', 'merge', 'tag'] as WebhookEvent[]).map(ev => (
                                    <label key={ev} className="flex items-center gap-1.5 cursor-pointer rounded px-2.5 py-1.5 transition-colors"
                                        style={{ 
                                            backgroundColor: hook.events.includes(ev) ? 'var(--accent-muted)' : 'var(--bg-input)',
                                            border: '1px solid',
                                            borderColor: hook.events.includes(ev) ? 'var(--accent)' : 'var(--border-default)',
                                            color: hook.events.includes(ev) ? 'var(--text-accent)' : 'var(--text-muted)'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            className="w-3 h-3"
                                            checked={hook.events.includes(ev)}
                                            onChange={() => handleWebhookEventToggle(idx, ev)}
                                            style={{ display: 'none' }}
                                        />
                                        <span className="text-[10px] uppercase font-bold tracking-wider">{ev.replace('_', ' ')}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
                {(formData.hooks || []).length === 0 && (
                    <div className="text-center py-10 rounded-lg" style={{ border: '1px dashed var(--border-default)' }}>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No webhooks configured for this project.</p>
                        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Click "Add Webhook" to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
