import { useState, useRef, useEffect } from 'react';
import { Lock, Eye, EyeOff, X } from 'lucide-react';
import { useEscClose } from '../hooks/useEscClose';

interface PasswordDialogProps {
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: (password: string) => void;
    onCancel: () => void;
}

export function PasswordDialog({ title, description, confirmLabel = 'Confirm', onConfirm, onCancel }: PasswordDialogProps) {
    useEscClose(onCancel);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length >= 4) {
            onConfirm(password);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-overlay)' }}>
            <div className="w-full max-w-sm rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-default)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center px-4 py-3" style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-sidebar)' }}>
                    <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4" style={{ color: 'var(--text-accent)' }} />
                        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                    </div>
                    <button onClick={onCancel} className="p-1 rounded-md transition-colors" style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{description}</p>
                    
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Enter password (min 4 chars)"
                            className="w-full px-3 py-2 pr-10 rounded-lg text-sm outline-none transition-colors"
                            style={{
                                backgroundColor: 'var(--bg-input)',
                                border: '1px solid var(--border-default)',
                                color: 'var(--text-primary)',
                            }}
                            onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                            onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
                            minLength={4}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                    </div>

                    {password.length > 0 && password.length < 4 && (
                        <p className="text-[10px] font-medium" style={{ color: '#ef4444' }}>
                            Password must be at least 4 characters
                        </p>
                    )}

                    <div className="flex gap-2 justify-end pt-1">
                        <button type="button" onClick={onCancel}
                            className="px-4 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-hover)' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-tree-header)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                        >
                            Cancel
                        </button>
                        <button type="submit" disabled={password.length < 4}
                            className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md"
                            style={{
                                backgroundColor: password.length >= 4 ? 'var(--accent)' : 'var(--bg-hover)',
                                color: password.length >= 4 ? 'var(--text-inverse)' : 'var(--text-muted)',
                                opacity: password.length >= 4 ? 1 : 0.6,
                                cursor: password.length >= 4 ? 'pointer' : 'not-allowed',
                            }}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
