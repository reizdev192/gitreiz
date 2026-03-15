import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { ConfigForm } from './ConfigForm';
import { useI18n } from '../i18n/useI18n';

interface Props {
    onClose: () => void;
}

export function ConfigModal({ onClose }: Props) {
    const { t } = useI18n();
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
                <div className="flex items-center justify-between px-6 py-4 shrink-0"
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

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto">
                    <ConfigForm onClose={onClose} />
                </div>
            </div>
        </div>,
        document.body
    );
}
