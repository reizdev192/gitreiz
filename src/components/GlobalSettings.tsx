import { useState } from 'react';
import { useProjectStore, type Integration } from '../store/useProjectStore';
import { useConfirmStore } from '../store/useConfirmStore';
import { useI18n } from '../i18n/useI18n';
import { X, Plus, Trash2, Edit2, Check, Network } from 'lucide-react';
import { useEscClose } from '../hooks/useEscClose';

interface GlobalSettingsProps {
    onClose: () => void;
}

export function GlobalSettings({ onClose }: GlobalSettingsProps) {
    const { integrations, addIntegration, updateIntegration, deleteIntegration } = useProjectStore();
    const { t } = useI18n();
    useEscClose(onClose);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Integration> | null>(null);

    const handleAdd = () => {
        const newId = crypto.randomUUID();
        const empty: Integration = {
            id: newId,
            name: 'New Integration',
            type: 'telegram',
            webhookUrl: '',
            botToken: '',
            chatId: ''
        };
        addIntegration(empty);
        setEditingId(newId);
        setEditForm(empty);
    };

    const handleEdit = (integration: Integration) => {
        setEditingId(integration.id);
        setEditForm({ ...integration });
    };

    const handleSave = () => {
        if (!editForm || !editingId) return;
        updateIntegration(editForm as Integration);
        setEditingId(null);
        setEditForm(null);
    };

    const handleDelete = async (id: string, name: string) => {
        const confirmed = await useConfirmStore.getState().confirm({
            title: t('common.warning') || 'Warning',
            message: `Delete integration "${name}"? This may break project webhooks that depend on it.`
        });
        if (confirmed) {
            deleteIntegration(id);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-overlay)' }}>
            <div className="w-full max-w-2xl rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-default)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-sidebar)' }}>
                    <div className="flex items-center gap-2 font-mono">
                        <Network className="w-4 h-4" style={{ color: 'var(--text-accent)' }} />
                        <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--text-accent)' }}>
                            Global Integrations
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-md transition-colors" style={{ color: 'var(--text-muted)' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 overflow-y-auto space-y-4 max-h-[70vh]">
                    <div className="flex justify-between items-center">
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            Configure your notification channels (Slack, Telegram, HTTP endpoints) here. They can be selected when configuring Webhooks for individual projects.
                        </p>
                        <button onClick={handleAdd} className="shrink-0 ml-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md" style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>
                            <Plus className="w-3.5 h-3.5" /> Thêm Integration
                        </button>
                    </div>

                    <div className="space-y-3 mt-4">
                        {integrations.length === 0 && (
                            <div className="text-center p-6 border border-dashed rounded-lg text-sm italic" style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}>
                                Không có integration nào. Hãy tạo một cái mới!
                            </div>
                        )}

                        {integrations.map(cfg => (
                            <div key={cfg.id} className="p-4 rounded-lg border transition-colors shadow-sm" style={{ backgroundColor: editingId === cfg.id ? 'var(--bg-hover)' : 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
                                {editingId === cfg.id ? (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] uppercase font-bold tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>Name</label>
                                                <input type="text" className="w-full text-xs p-1.5 outline-none rounded" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                                                    value={editForm?.name || ''}
                                                    onChange={e => setEditForm(prev => prev ? { ...prev, name: e.target.value } : null)}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase font-bold tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>Type</label>
                                                <select className="w-full text-xs p-1.5 outline-none rounded" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                                                    value={editForm?.type || 'telegram'}
                                                    onChange={e => setEditForm(prev => prev ? { ...prev, type: e.target.value as 'telegram' | 'slack' | 'http' } : null)}
                                                >
                                                    <option value="telegram">Telegram Bot</option>
                                                    <option value="slack">Slack Webhook</option>
                                                    <option value="http">Custom HTTP JSON</option>
                                                </select>
                                            </div>
                                        </div>

                                        {(editForm?.type === 'slack' || editForm?.type === 'http') && (
                                            <div>
                                                <label className="text-[10px] uppercase font-bold tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>Webhook URL</label>
                                                <input type="text" className="w-full text-xs p-1.5 outline-none rounded font-mono" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                                                    value={editForm?.webhookUrl || ''}
                                                    placeholder="https://..."
                                                    onChange={e => setEditForm(prev => prev ? { ...prev, webhookUrl: e.target.value } : null)}
                                                />
                                            </div>
                                        )}

                                        {editForm?.type === 'telegram' && (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[10px] uppercase font-bold tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>Bot Token</label>
                                                    <input type="text" className="w-full text-xs p-1.5 outline-none rounded font-mono" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                                                        value={editForm?.botToken || ''}
                                                        placeholder="123456:ABC-DEF..."
                                                        onChange={e => setEditForm(prev => prev ? { ...prev, botToken: e.target.value } : null)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] uppercase font-bold tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>Chat ID</label>
                                                    <input type="text" className="w-full text-xs p-1.5 outline-none rounded font-mono" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                                                        value={editForm?.chatId || ''}
                                                        placeholder="-100123456"
                                                        onChange={e => setEditForm(prev => prev ? { ...prev, chatId: e.target.value } : null)}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex justify-end gap-2 pt-2">
                                            <button onClick={() => { setEditingId(null); setEditForm(null); }} className="px-3 py-1.5 text-xs rounded hover:opacity-80 transition-colors" style={{ color: 'var(--text-muted)' }}>
                                                Cancel
                                            </button>
                                            <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded hover:opacity-90 transition-colors" style={{ backgroundColor: 'var(--accent-muted)', color: 'var(--text-accent)' }}>
                                                <Check className="w-3.5 h-3.5" /> Save
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1 min-w-0 pr-4">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{cfg.name}</h3>
                                                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full outline outline-1 outline-offset-[-1px]"
                                                    style={{ 
                                                        color: cfg.type === 'telegram' ? '#3b82f6' : cfg.type === 'slack' ? '#eab308' : '#10b981',
                                                        outlineColor: cfg.type === 'telegram' ? 'rgba(59,130,246,0.3)' : cfg.type === 'slack' ? 'rgba(234,179,8,0.3)' : 'rgba(16,185,129,0.3)'
                                                    }}>
                                                    {cfg.type}
                                                </span>
                                            </div>
                                            <div className="text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                                                {cfg.type === 'telegram' ? `Chat ID: ${cfg.chatId || 'N/A'}` : cfg.webhookUrl || 'No URL configured'}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button onClick={() => handleEdit(cfg)} className="p-1.5 rounded transition-colors" style={{ color: 'var(--text-secondary)' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'} title="Edit">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(cfg.id, cfg.name)} className="p-1.5 rounded transition-colors" style={{ color: '#ef4444' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'} title="Delete">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
