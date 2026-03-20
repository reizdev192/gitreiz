import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export interface DeployEnvironment {
    name: string;
    tag_format: string;
}

export interface Integration {
    id: string;
    name: string;
    type: 'telegram' | 'slack' | 'http';
    webhookUrl?: string;
    botToken?: string;
    chatId?: string;
}

export type WebhookEvent = 'push' | 'commit' | 'create_branch' | 'merge' | 'tag';

export interface ProjectWebhook {
    id: string;
    integrationId: string;
    events: WebhookEvent[];
}

export interface ProjectConfig {
    id: string;
    name: string;
    path: string;
    environments: DeployEnvironment[];
    autoConfirmDeploy?: boolean;
    protectedBranches?: string[];
    favoriteBranches?: string[];
    hooks?: ProjectWebhook[];
}

interface AppConfig {
    projects: ProjectConfig[];
    integrations?: Integration[];
}

interface ProjectState {
    projects: ProjectConfig[];
    integrations: Integration[];
    selectedProjectId: string | null;
    openProjectIds: string[];
    activeProjectId: string | null;

    // Shared deploy trigger: GitTab sets this, DeployPanel picks it up
    pendingDeployTarget: string | null;
    triggerDeploy: (target: string) => void;
    clearPendingDeploy: () => void;

    // Shared terminal logs
    terminalLogs: string;
    appendLog: (msg: string) => void;
    setTerminalLogs: (logs: string) => void;

    // Terminal bar state
    terminalBarOpen: boolean;
    terminalBarPinned: boolean;
    openTerminalBar: () => void;
    closeTerminalBar: () => void;
    toggleTerminalBar: () => void;
    toggleTerminalBarPin: () => void;

    // Git state sync (GitTab bumps → CommitPanel re-fetches)
    gitStateVersion: number;
    bumpGitState: () => void;

    loadConfig: () => Promise<void>;
    saveConfig: (projects: ProjectConfig[], newIntegrations?: Integration[]) => Promise<void>;
    selectProject: (id: string | null) => void;
    openProject: (id: string) => void;
    closeProject: (id: string) => void;
    addProject: (p: ProjectConfig) => Promise<void>;
    updateProject: (p: ProjectConfig) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
    toggleFavoriteBranch: (projectId: string, branchName: string) => Promise<void>;

    addIntegration: (i: Integration) => Promise<void>;
    updateIntegration: (i: Integration) => Promise<void>;
    deleteIntegration: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
    projects: [],
    integrations: [],
    selectedProjectId: null,
    openProjectIds: [],
    activeProjectId: null,
    pendingDeployTarget: null,
    terminalLogs: '',
    terminalBarOpen: false,
    terminalBarPinned: false,
    gitStateVersion: 0,

    triggerDeploy: (target) => set({ pendingDeployTarget: target }),
    clearPendingDeploy: () => set({ pendingDeployTarget: null }),

    appendLog: (msg) => {
        set({ terminalLogs: get().terminalLogs + msg, terminalBarOpen: true });
    },
    setTerminalLogs: (logs) => {
        set({ terminalLogs: logs, terminalBarOpen: true });
    },

    openTerminalBar: () => set({ terminalBarOpen: true }),
    closeTerminalBar: () => {
        if (!get().terminalBarPinned) set({ terminalBarOpen: false });
    },
    toggleTerminalBar: () => set({ terminalBarOpen: !get().terminalBarOpen }),
    toggleTerminalBarPin: () => {
        const pinned = !get().terminalBarPinned;
        set({ terminalBarPinned: pinned });
        if (pinned) set({ terminalBarOpen: true });
    },
    bumpGitState: () => set({ gitStateVersion: get().gitStateVersion + 1 }),

    loadConfig: async () => {
        try {
            const config: AppConfig = await invoke('load_config');
            set({ 
                projects: config.projects || [],
                integrations: config.integrations || []
            });
        } catch (e) {
            console.error('Failed to load config:', e);
        }
    },

    saveConfig: async (newProjects, newIntegrations?: Integration[]) => {
        try {
            const integrationsToSave = newIntegrations ?? get().integrations;
            await invoke('save_config', { config: { projects: newProjects, integrations: integrationsToSave } });
            set({ projects: newProjects, integrations: integrationsToSave });
        } catch (e) {
            console.error('Failed to save config:', e);
        }
    },

    selectProject: (id) => {
        if (!id || id === '') {
            set({ selectedProjectId: null, activeProjectId: null });
        } else {
            set({ selectedProjectId: id, activeProjectId: id });
            // Also open the project tab if not already open
            const openIds = get().openProjectIds;
            if (id !== 'NEW' && !openIds.includes(id)) {
                set({ openProjectIds: [...openIds, id] });
            }
        }
    },

    openProject: (id) => {
        const openIds = get().openProjectIds;
        if (!openIds.includes(id)) {
            set({ openProjectIds: [...openIds, id] });
        }
        set({ selectedProjectId: id, activeProjectId: id });
    },

    closeProject: (id) => {
        const openIds = get().openProjectIds.filter(pid => pid !== id);
        set({ openProjectIds: openIds });
        if (get().activeProjectId === id) {
            const next = openIds.length > 0 ? openIds[openIds.length - 1] : null;
            set({ selectedProjectId: next, activeProjectId: next });
        }
    },

    addProject: async (project) => {
        const newProjects = [...get().projects, project];
        await get().saveConfig(newProjects);
        set({ selectedProjectId: project.id });
    },

    updateProject: async (project) => {
        const newProjects = get().projects.map(p => p.id === project.id ? project : p);
        await get().saveConfig(newProjects);
    },

    deleteProject: async (id) => {
        const newProjects = get().projects.filter(p => p.id !== id);
        await get().saveConfig(newProjects);
        if (get().selectedProjectId === id) {
            set({ selectedProjectId: null });
        }
    },

    toggleFavoriteBranch: async (projectId: string, branchName: string) => {
        const p = get().projects.find(p => p.id === projectId);
        if (!p) return;
        
        const favs = p.favoriteBranches || [];
        const isFav = favs.includes(branchName);
        
        const newFavs = isFav 
            ? favs.filter(b => b !== branchName)
            : [...favs, branchName];
            
        await get().updateProject({ ...p, favoriteBranches: newFavs });
    },

    addIntegration: async (integration) => {
        const newIntegrations = [...get().integrations, integration];
        await get().saveConfig(get().projects, newIntegrations);
    },

    updateIntegration: async (integration) => {
        const newIntegrations = get().integrations.map(p => p.id === integration.id ? integration : p);
        await get().saveConfig(get().projects, newIntegrations);
    },

    deleteIntegration: async (id) => {
        const newIntegrations = get().integrations.filter(p => p.id !== id);
        await get().saveConfig(get().projects, newIntegrations);
    }
}));
