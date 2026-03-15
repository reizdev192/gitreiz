import { useState, useEffect, useRef, useCallback } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { useI18n } from '../i18n/useI18n';
import { Terminal, Pin, PinOff, Copy, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

export function TerminalBar() {
    const { terminalLogs, terminalBarOpen, terminalBarPinned, toggleTerminalBar, toggleTerminalBarPin, setTerminalLogs } = useProjectStore();
    const { t } = useI18n();
    const logEndRef = useRef<HTMLDivElement>(null);
    const isResizing = useRef(false);

    const [height, setHeight] = useState(() => {
        const saved = localStorage.getItem('terminal-bar-height');
        return saved ? Number(saved) : 200;
    });

    useEffect(() => {
        if (terminalBarOpen && logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [terminalLogs, terminalBarOpen]);

    const startResize = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isResizing.current = true;
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
        const startY = e.clientY;
        const startH = height;

        const onMouseMove = (ev: MouseEvent) => {
            if (!isResizing.current) return;
            const delta = startY - ev.clientY;
            const newH = Math.min(window.innerHeight * 0.5, Math.max(120, startH + delta));
            setHeight(newH);
            localStorage.setItem('terminal-bar-height', String(Math.round(newH)));
        };
        const onMouseUp = () => {
            isResizing.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }, [height]);

    const handleCopy = () => {
        if (terminalLogs) navigator.clipboard.writeText(terminalLogs);
    };

    const iconBtn = "p-1 rounded transition-colors";

    return (
        <div className="shrink-0 flex flex-col" style={{ borderTop: '1px solid var(--border-default)', backgroundColor: 'var(--bg-panel)' }}>
            {/* Header bar - always visible */}
            <div
                className="flex items-center gap-2 px-3 py-1.5 cursor-pointer select-none"
                style={{ backgroundColor: 'var(--bg-tree-header)' }}
                onClick={toggleTerminalBar}
            >
                <Terminal className="w-3.5 h-3.5" style={{ color: 'var(--text-accent)' }} />
                <span className="text-[11px] font-semibold uppercase tracking-wider flex-1" style={{ color: 'var(--text-muted)' }}>
                    {t('terminal.title')}
                </span>

                <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                    {terminalBarOpen && (
                        <>
                            <button onClick={handleCopy} className={iconBtn} style={{ color: 'var(--text-muted)' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                title={t('terminal.copy')}>
                                <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setTerminalLogs('')} className={iconBtn} style={{ color: 'var(--text-muted)' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                title={t('terminal.clear')}>
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </>
                    )}
                    <button onClick={toggleTerminalBarPin} className={iconBtn}
                        style={{ color: terminalBarPinned ? 'var(--text-accent)' : 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        title={terminalBarPinned ? t('terminal.unpin') : t('terminal.pin')}>
                        {terminalBarPinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={toggleTerminalBar} className={iconBtn} style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        {terminalBarOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>

            {/* Terminal content */}
            {terminalBarOpen && (
                <div style={{ height: `${height}px` }} className="flex flex-col min-h-0">
                    {/* Resize handle */}
                    <div
                        className="h-[3px] cursor-row-resize shrink-0 transition-colors"
                        style={{ backgroundColor: 'var(--border-default)' }}
                        onMouseDown={startResize}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent)'}
                        onMouseLeave={e => { if (!isResizing.current) e.currentTarget.style.backgroundColor = 'var(--border-default)'; }}
                    />
                    <div className="flex-1 overflow-y-auto p-3 font-mono text-xs" style={{ backgroundColor: 'var(--bg-tree)' }}>
                        {terminalLogs ? (
                            <pre className="whitespace-pre-wrap flex flex-col gap-0.5 leading-relaxed m-0" style={{ color: 'var(--text-secondary)' }}>
                                {terminalLogs.split('\n').map((line, i) => (
                                    <span key={i} style={
                                        line.includes('[ERROR]') ? { color: '#ef4444', fontWeight: 'bold' } :
                                            line.includes('[SUCCESS]') ? { color: '#2dd4bf', fontWeight: 'bold' } :
                                                line.startsWith('Initialization:') || line.startsWith('Executing') ? { color: 'var(--text-accent)' } :
                                                    {}
                                    }>{line}</span>
                                ))}
                                <div ref={logEndRef} />
                            </pre>
                        ) : (
                            <div className="flex items-center justify-center h-full italic text-xs" style={{ color: 'var(--text-muted)' }}>
                                {t('deploy.ready')}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
