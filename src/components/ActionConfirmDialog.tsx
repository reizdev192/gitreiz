import { useState } from 'react';
import { Terminal, ShieldAlert, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { useEscClose } from '../hooks/useEscClose';
import type { CustomAction } from '../store/useCustomActionsStore';

interface ActionConfirmDialogProps {
    action: CustomAction;
    renderedScript: string;
    onConfirm: () => void;
    onClose: () => void;
}

export function ActionConfirmDialog({ action, renderedScript, onConfirm, onClose }: ActionConfirmDialogProps) {
    useEscClose(onClose);
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="w-full max-w-lg rounded-xl shadow-2xl flex flex-col overflow-hidden border border-yellow-500/30"
                style={{ backgroundColor: 'var(--bg-panel)' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start gap-3 p-5" style={{ backgroundColor: 'var(--bg-sidebar)' }}>
                    <div className="p-2 rounded-full bg-yellow-500/20 text-yellow-500 shrink-0 mt-0.5">
                        <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-[var(--text-primary)]">Execute Custom Action</h2>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                            You are about to run <strong className="text-[var(--text-accent)]">{action.name}</strong>. Please confirm the script before execution.
                        </p>
                    </div>
                </div>

                <div className="p-4 space-y-4">
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-full flex items-center justify-between p-3 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)] transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-[var(--text-muted)]" />
                            <span className="text-sm font-medium text-[var(--text-primary)]">View Rendered Script</span>
                        </div>
                        {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                        )}
                    </button>

                    {isExpanded && (
                        <div className="p-3 rounded-lg bg-[var(--bg-app)] border border-[var(--border-default)] overflow-x-auto max-h-60">
                            <pre className="text-xs font-mono text-[var(--text-accent)] whitespace-pre-wrap">
                                {renderedScript}
                            </pre>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 p-4 border-t border-[var(--border-default)] bg-[var(--bg-sidebar)]">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-black bg-yellow-500 hover:bg-yellow-400 rounded-lg shadow-lg hover:shadow-yellow-500/20 transition-all">
                        <Check className="w-4 h-4" /> Run Action
                    </button>
                </div>
            </div>
        </div>
    );
}
