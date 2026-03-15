import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export interface DeployEnvironment {
    name: string;
    tag_format: string;
}

export interface ProjectConfig {
    id: string;
    name: string;
    path: string;
    environments: DeployEnvironment[];
    autoConfirmDeploy?: boolean;
    protectedBranches?: string[];
}

interface AppConfig {
    projects: ProjectConfig[];
}

interface ProjectState {
    projects: ProjectConfig[];
    selectedProjectId: string | null;

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
    saveConfig: (projects: ProjectConfig[]) => Promise<void>;
    selectProject: (id: string | null) => void;
    addProject: (p: ProjectConfig) => Promise<void>;
    updateProject: (p: ProjectConfig) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
    projects: [],
    selectedProjectId: null,
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
            set({ projects: config.projects });
        } catch (e) {
            console.error('Failed to load config:', e);
        }
    },

    saveConfig: async (newProjects) => {
        try {
            await invoke('save_config', { config: { projects: newProjects } });
            set({ projects: newProjects });
        } catch (e) {
            console.error('Failed to save config:', e);
        }
    },

    selectProject: (id) => set({ selectedProjectId: id }),

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
    }
}));
