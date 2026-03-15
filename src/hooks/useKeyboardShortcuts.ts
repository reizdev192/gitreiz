import { useEffect } from 'react';
import { useProjectStore } from '../store/useProjectStore';

interface ShortcutActions {
    focusSearch?: () => void;
    openSettings?: () => void;
}

export function useKeyboardShortcuts(actions: ShortcutActions = {}) {
    const { bumpGitState, toggleTerminalBar } = useProjectStore();

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const ctrl = e.ctrlKey || e.metaKey;
            if (!ctrl) return;

            switch (e.key.toLowerCase()) {
                case 'r':
                    if (!e.shiftKey) {
                        e.preventDefault();
                        bumpGitState();
                    }
                    break;
                case 't':
                    if (!e.shiftKey) {
                        e.preventDefault();
                        toggleTerminalBar();
                    }
                    break;
                case 'f':
                    if (!e.shiftKey) {
                        e.preventDefault();
                        actions.focusSearch?.();
                    }
                    break;
                case 'p':
                    if (e.shiftKey) {
                        e.preventDefault();
                        actions.openSettings?.();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [bumpGitState, toggleTerminalBar, actions]);
}
