import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useProjectStore } from '../store/useProjectStore';

export function useAutoFetch() {
    const { projects, selectedProjectId, bumpGitState } = useProjectStore();
    const project = projects.find(p => p.id === selectedProjectId);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (!project) return;

        const minutes = (project as any).autoFetchInterval || 0;
        if (minutes <= 0) return;

        const doFetch = async () => {
            try {
                await invoke<string>('fetch_all_cmd', { repoPath: project.path });
                bumpGitState();
            } catch { /* silent */ }
        };

        intervalRef.current = setInterval(doFetch, minutes * 60 * 1000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [project?.path, (project as any)?.autoFetchInterval, bumpGitState]);
}
