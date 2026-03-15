import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { useI18n } from '../i18n/useI18n';
import { motion, AnimatePresence } from 'framer-motion';

interface DeployPlan {
    target_branch: string;
    current_branch: string;
    new_tag: string;
    commands_preview: string[];
}

export function DeployPanel() {
    const { projects, selectedProjectId, pendingDeployTarget, clearPendingDeploy, appendLog, setTerminalLogs } = useProjectStore();
    const project = projects.find(p => p.id === selectedProjectId);
    const { t } = useI18n();

    const [isDeploying, setIsDeploying] = useState(false);
    const [target, setTarget] = useState('');
    const [pendingPlan, setPendingPlan] = useState<DeployPlan | null>(null);

    useEffect(() => {
        if (pendingDeployTarget && project) {
            setTarget(pendingDeployTarget);
            clearPendingDeploy();
            handleDeploy(pendingDeployTarget);
        }
    }, [pendingDeployTarget]);

    if (!project) return null;

    const handleDeploy = async (tgt: string) => {
        setIsDeploying(true);
        setTerminalLogs(`Initialization: Planning ${tgt} deployment for ${project.name}...\n`);

        try {
            const plan: DeployPlan = await invoke('get_deploy_plan', { project, target: tgt });

            if (project.autoConfirmDeploy) {
                await executeDeployment(tgt);
            } else {
                setPendingPlan(plan);
                setIsDeploying(false);
            }
        } catch (err: any) {
            appendLog('\n[ERROR] ' + err + '\n');
            setIsDeploying(false);
        }
    };

    const executeDeployment = async (tgt: string) => {
        setIsDeploying(true);
        setPendingPlan(null);
        setTerminalLogs(`Executing ${tgt} deployment for ${project.name}...\n`);

        try {
            await new Promise(r => setTimeout(r, 600));
            const res: string = await invoke('begin_deployment', { project, target: tgt });
            appendLog(res + '\n[SUCCESS] Deployment complete!\n');
        } catch (err: any) {
            appendLog('\n[ERROR] ' + err + '\n');
        } finally {
            setIsDeploying(false);
        }
    };

    // Only render when there's a pending plan confirmation
    if (!pendingPlan && !isDeploying) return null;

    return (
        <AnimatePresence>
            {pendingPlan && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                    style={{ borderBottom: '1px solid var(--border-default)' }}
                >
                    <div className="rounded-lg p-4 m-3"
                        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
                    >
                        <h4 className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{t('deploy.planTitle')} ({target})</h4>
                        <div className="space-y-1 mb-4 p-3 rounded font-mono text-xs" style={{ backgroundColor: 'var(--bg-tree)', border: '1px solid var(--border-default)' }}>
                            {pendingPlan.commands_preview.map((cmd, idx) => (
                                <div key={idx} className="flex gap-2" style={{ color: 'var(--text-primary)' }}>
                                    <span style={{ color: 'var(--text-muted)' }} className="select-none">${idx + 1}</span>
                                    <span style={cmd.startsWith('git tag') || cmd.startsWith('git push') ? { color: 'var(--text-accent)', fontWeight: 'bold' } : {}}>{cmd}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setPendingPlan(null)} className="px-3 py-1.5 flex items-center gap-1.5 rounded text-xs transition-colors" style={{ color: 'var(--text-secondary)' }}>
                                <XCircle className="w-3.5 h-3.5" /> {t('deploy.cancel')}
                            </button>
                            <button onClick={() => executeDeployment(target)} className="px-4 py-1.5 flex items-center gap-1.5 rounded text-xs font-bold transition-colors" style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>
                                <CheckCircle2 className="w-3.5 h-3.5" /> {t('deploy.confirm')}
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
