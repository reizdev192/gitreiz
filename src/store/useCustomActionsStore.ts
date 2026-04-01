import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export type ActionContext = 'branch' | 'commit' | 'global';

export interface CustomAction {
    id: string;
    name: string;
    description?: string;
    script: string;
    context: ActionContext;
}

interface CustomActionsState {
    actions: CustomAction[];
    loading: boolean;
    loadActions: () => Promise<void>;
    saveActions: (actions: CustomAction[]) => Promise<void>;
    addAction: (action: CustomAction) => Promise<void>;
    updateAction: (id: string, action: Partial<CustomAction>) => Promise<void>;
    deleteAction: (id: string) => Promise<void>;
}

export const useCustomActionsStore = create<CustomActionsState>((set, get) => ({
    actions: [],
    loading: false,

    loadActions: async () => {
        set({ loading: true });
        try {
            const actions: CustomAction[] = await invoke('get_custom_actions');
            set({ actions, loading: false });
        } catch (e) {
            console.error('Failed to load custom actions:', e);
            set({ actions: [], loading: false });
        }
    },

    saveActions: async (newActions) => {
        try {
            await invoke('save_custom_actions', { actions: newActions });
            set({ actions: newActions });
        } catch (e) {
            console.error('Failed to save custom actions:', e);
            throw e;
        }
    },

    addAction: async (action) => {
        const { actions, saveActions } = get();
        await saveActions([...actions, action]);
    },

    updateAction: async (id, changes) => {
        const { actions, saveActions } = get();
        const newActions = actions.map(a => a.id === id ? { ...a, ...changes } : a);
        await saveActions(newActions);
    },

    deleteAction: async (id) => {
        const { actions, saveActions } = get();
        await saveActions(actions.filter(a => a.id !== id));
    }
}));
