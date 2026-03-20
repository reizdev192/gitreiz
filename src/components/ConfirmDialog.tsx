import { useConfirmStore } from '../store/useConfirmStore';
import { AlertTriangle, X } from 'lucide-react';
import { useI18n } from '../i18n/useI18n';
import { useEscClose } from '../hooks/useEscClose';

export function ConfirmDialog() {
    const { isOpen, title, message, confirmText, cancelText, close } = useConfirmStore();
    const { t } = useI18n();
    useEscClose(() => close(false));

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div 
                className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-default)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-sidebar)' }}>
                    <div className="flex items-center gap-2 font-medium" style={{ color: 'var(--text-primary)' }}>
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        <span>{title || t('common.warning')}</span>
                    </div>
                    <button 
                        onClick={() => close(false)}
                        className="p-1 rounded opacity-70 hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-6 text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                    {message}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-4 py-3" style={{ borderTop: '1px solid var(--border-default)', backgroundColor: 'var(--bg-sidebar)' }}>
                    <button
                        onClick={() => close(false)}
                        className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border"
                        style={{ 
                            color: 'var(--text-primary)', 
                            backgroundColor: 'transparent',
                            borderColor: 'var(--border-default)'
                        }}
                    >
                        {cancelText || t('common.cancel')}
                    </button>
                    <button
                        onClick={() => close(true)}
                        className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors text-white"
                        style={{ backgroundColor: 'var(--accent)' }}
                    >
                        {confirmText || t('common.confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
}
