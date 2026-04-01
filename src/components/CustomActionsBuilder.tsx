import { useState, useEffect, useRef } from 'react';
import { useCustomActionsStore, type CustomAction } from '../store/useCustomActionsStore';
import { useI18n } from '../i18n/useI18n';
import { X, Plus, Trash2, Edit2, Check, TerminalSquare, Variable } from 'lucide-react';
import { useEscClose } from '../hooks/useEscClose';
import { useConfirmStore } from '../store/useConfirmStore';
import { SyntaxEditor } from './SyntaxEditor';

// Mapping variables by context
const CONTEXT_VARIABLES: Record<string, { label: string, title: string }[]> = {
    'commit': [
        { label: '{TARGET_COMMIT}', title: 'The commit hash you right-clicked on.' },
        { label: '{TARGET_BRANCH}', title: 'The branch of the commit (if any).' },
        { label: '{CURRENT_BRANCH}', title: 'The checked out branch globally.' },
        { label: '{REPO_PATH}', title: 'Absolute repository path.' }
    ],
    'branch': [
        { label: '{TARGET_BRANCH}', title: 'The branch you right-clicked on.' },
        { label: '{CURRENT_BRANCH}', title: 'The checked out branch globally.' },
        { label: '{REPO_PATH}', title: 'Absolute repository path.' }
    ],
    'global': [
        { label: '{CURRENT_BRANCH}', title: 'The checked out branch globally.' },
        { label: '{REPO_PATH}', title: 'Absolute repository path.' }
    ]
};

interface CustomActionsBuilderProps {
    onClose: () => void;
}

export function CustomActionsBuilder({ onClose }: CustomActionsBuilderProps) {
    const { actions, loadActions, addAction, updateAction, deleteAction } = useCustomActionsStore();
    const { t } = useI18n();
    useEscClose(onClose);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<CustomAction> | null>(null);
    const editorRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        loadActions();
    }, [loadActions]);

    const handleAdd = () => {
        const newId = crypto.randomUUID();
        const empty: CustomAction = {
            id: newId,
            name: 'New Action',
            description: '',
            script: 'echo "Running custom action on {CURRENT_BRANCH}"\n',
            context: 'global'
        };
        addAction(empty);
        setEditingId(newId);
        setEditForm(empty);
    };

    const handleEdit = (action: CustomAction) => {
        setEditingId(action.id);
        setEditForm({ ...action });
    };

    const handleSave = () => {
        if (!editForm || !editingId) return;
        updateAction(editingId, editForm);
        setEditingId(null);
        setEditForm(null);
    };

    const handleDelete = async (id: string, name: string) => {
        const confirmed = await useConfirmStore.getState().confirm({
            title: t('common.warning') || 'Warning',
            message: `Delete custom action "${name}"?`
        });
        if (confirmed) {
            deleteAction(id);
        }
    };

    const handleInsertVariable = (variable: string) => {
        if (!editorRef.current || !editForm) return;
        const textarea = editorRef.current;
        
        // If textarea is not focused or we don't know the cursor position, append to the end
        const insertAt = textarea.selectionStart ?? (editForm.script || '').length;
        const script = editForm.script || '';
        const newScript = script.substring(0, insertAt) + variable + script.substring(textarea.selectionEnd ?? insertAt);
        
        setEditForm({ ...editForm, script: newScript });
        
        setTimeout(() => {
             textarea.focus();
             textarea.setSelectionRange(insertAt + variable.length, insertAt + variable.length);
        }, 10);
    };

    const activeVariables = CONTEXT_VARIABLES[editForm?.context || 'global'] || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-4xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-default)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-sidebar)' }}>
                    <div className="flex items-center gap-2 font-mono">
                        <TerminalSquare className="w-4 h-4" style={{ color: 'var(--text-accent)' }} />
                        <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--text-accent)' }}>
                            Custom Actions Builder
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-md transition-colors hover:bg-gray-500/20 text-gray-400 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content - Full Width */}
                <div className="w-full p-6 flex flex-col flex-1 overflow-hidden">
                    <div className="flex justify-between items-center mb-4 shrink-0">
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">Your Action Scripts</h3>
                        <button onClick={handleAdd} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-white text-xs font-bold transition-all shadow-md hover:brightness-110" style={{ backgroundColor: 'var(--accent)' }}>
                            <Plus className="w-3.5 h-3.5" /> Thêm Action
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                        {actions.length === 0 && (
                            <div className="text-center p-6 border border-dashed border-[var(--border-default)] rounded-lg text-sm italic text-[var(--text-muted)]">
                                Không có action nào. Hãy tự tạo một command theo ý Sếp!
                            </div>
                        )}

                        {actions.map(action => (
                            <div key={action.id} className={`p-4 rounded-lg border transition-colors shadow-sm ${editingId === action.id ? 'bg-[var(--bg-active)] border-[var(--accent)]' : 'bg-[var(--bg-card)] border-[var(--border-default)]'}`}>
                                {editingId === action.id ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)] block mb-1">Action Name</label>
                                                <input type="text" className="w-full text-xs p-2.5 outline-none rounded bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] focus:border-[var(--accent)] transition-colors"
                                                    value={editForm?.name || ''}
                                                    onChange={e => setEditForm(prev => prev ? { ...prev, name: e.target.value } : null)}
                                                    placeholder="e.g. 🚀 Auto Tag Release"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)] block mb-1">Description (Optional)</label>
                                                <input type="text" className="w-full text-xs p-2.5 outline-none rounded bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] focus:border-[var(--accent)] transition-colors"
                                                    value={editForm?.description || ''}
                                                    onChange={e => setEditForm(prev => prev ? { ...prev, description: e.target.value } : null)}
                                                    placeholder="Displays in menu tooltip..."
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)] block mb-2">Triggers On (Context)</label>
                                            <div className="flex items-center gap-6 bg-[var(--bg-input)] p-3 rounded border border-[var(--border-default)]">
                                                {(['branch', 'commit', 'global'] as const).map(ctx => (
                                                    <label key={ctx} className="flex items-center gap-2 cursor-pointer hover:text-[var(--text-accent)] transition-colors text-xs text-[var(--text-secondary)] font-medium">
                                                        <input 
                                                            type="radio" 
                                                            name={`context-${action.id}`} 
                                                            value={ctx}
                                                            checked={(editForm?.context || 'global') === ctx}
                                                            onChange={() => setEditForm(prev => prev ? { ...prev, context: ctx } : null)}
                                                            className="w-4 h-4 cursor-pointer"
                                                            style={{ accentColor: 'var(--accent)' }}
                                                        />
                                                        <span className="capitalize">{ctx}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Dynamic Variables */}
                                        <div className="pt-2">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Variable className="w-3.5 h-3.5 text-[var(--text-accent)]" />
                                                <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)] block">Available Variables (Click to insert)</label>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {activeVariables.map(v => (
                                                    <button 
                                                        key={v.label} 
                                                        onClick={() => handleInsertVariable(v.label)}
                                                        title={v.title}
                                                        className="px-2 py-1 text-[10px] font-mono rounded bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-accent)] hover:border-[var(--accent)] hover:bg-[var(--accent-muted)] transition-colors"
                                                    >
                                                        {v.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex flex-col h-[280px]">
                                            <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)] block mb-2">Shell Script</label>
                                            <SyntaxEditor
                                                editorRef={editorRef}
                                                value={editForm?.script || ''}
                                                onChange={(script: string) => setEditForm(prev => prev ? { ...prev, script } : null)}
                                                language="javascript"
                                                placeholder={`echo "Hello {CURRENT_BRANCH}"`}
                                            />
                                        </div>

                                        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-default)]">
                                            <button onClick={() => { setEditingId(null); setEditForm(null); }} className="px-4 py-2 text-xs font-medium rounded hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                                                Cancel
                                            </button>
                                            <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded text-white transition-colors hover:brightness-110 shadow-md" style={{ backgroundColor: 'var(--accent)' }}>
                                                <Check className="w-4 h-4" /> Save Action
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-3 min-w-0 pr-4 w-full">
                                            <h3 className="text-sm font-bold text-[var(--text-primary)] truncate flex items-center gap-2">
                                                {action.name}
                                                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded text-[var(--text-accent)] border" style={{ backgroundColor: 'var(--accent-muted)', borderColor: 'var(--accent)' }}>
                                                    {action.context || 'global'}
                                                </span>
                                            </h3>
                                            {action.description && <p className="text-xs text-[var(--text-secondary)] truncate">{action.description}</p>}
                                            <div className="bg-[#0d1117] p-3 rounded border border-[var(--border-subtle)]">
                                                <pre className="text-[11px] font-mono text-[var(--text-muted)] whitespace-pre-wrap max-h-24 overflow-hidden line-clamp-4">
                                                    {action.script}
                                                </pre>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center gap-2 shrink-0">
                                            <button onClick={() => handleEdit(action)} className="p-2 rounded transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]" title="Edit">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(action.id, action.name)} className="p-2 rounded transition-colors text-red-500 hover:bg-red-500/10" title="Delete">
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
