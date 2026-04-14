import { invoke } from '@tauri-apps/api/core';
import { executableDir, join } from '@tauri-apps/api/path';
import YAML from 'yaml';
import type { ProjectConfig } from '../store/useProjectStore';

export interface WorkflowStep {
  type: string;
  args?: Record<string, any>;
}

export interface WorkflowContent {
  steps?: WorkflowStep[];
}

export interface GraphContent {
  nodes?: Array<any>;
  edges?: Array<any>;
}

export async function runGraphWorkflow(
  graphScript: string,
  project: ProjectConfig,
  currentBranch: string,
  targetBranch: string,
  appendLog: (msg: string) => void,
) {
  let payload: GraphContent;
  try {
    payload = JSON.parse(graphScript);
  } catch(e: any) {
    throw new Error(`Graph parsing failed: ${e.message}`);
  }

  const nodes = payload.nodes || [];
  const edges = payload.edges || [];

  if (nodes.length === 0) {
    appendLog(`[WORKFLOW] No nodes found in graph.\n`);
    return;
  }

  // 1. Build adjacency list and in-degree map
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  const nodeMap = new Map<string, any>();

  for (const n of nodes) {
    adj.set(n.id, []);
    inDegree.set(n.id, 0);
    nodeMap.set(n.id, n);
  }

  for (const e of edges) {
    if (adj.has(e.source) && inDegree.has(e.target)) {
      adj.get(e.source)!.push(e.target);
      inDegree.set(e.target, inDegree.get(e.target)! + 1);
    }
  }

  // 2. Topological Sort (Kahn's algorithm)
  const queue: string[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(id);
  }

  const sortedNodeIds: string[] = [];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    sortedNodeIds.push(cur);
    const neighbors = adj.get(cur) || [];
    for (const nxt of neighbors) {
      inDegree.set(nxt, inDegree.get(nxt)! - 1);
      if (inDegree.get(nxt) === 0) {
        queue.push(nxt);
      }
    }
  }

  if (sortedNodeIds.length !== nodes.length) {
    throw new Error("Graph contains cycles or disconnected inputs. Cannot execute safely.");
  }

  // 3. Pre-fetch tags
  let tags: Record<string, {latest_tag: string, next_tag: string}> = {};
  try {
    tags = await invoke('get_branch_tags_cmd', { project });
  } catch (e) {
    appendLog(`[WORKFLOW] Warning: Failed to fetch tags: ${e}\n`);
  }

  const matchingEnv = project.environments.find(e => e.name.toLowerCase() === targetBranch.toLowerCase());
  const ctxEnvName = matchingEnv ? matchingEnv.name : targetBranch;
  const targetTagInfo = tags[ctxEnvName] || Object.values(tags)[0] || { latest_tag: 'none', next_tag: '{NEXT_TAG}' };

  // Initialize Global Output Map
  const globalOutputs = new Map<string, any>();

  // 4. Execution loop
  appendLog(`[WORKFLOW] Starting graph execution... (${sortedNodeIds.length} nodes)\n`);
  
  for (let i = 0; i < sortedNodeIds.length; i++) {
    const nodeId = sortedNodeIds[i];
    const node = nodeMap.get(nodeId);
    
    appendLog(`[WORKFLOW]  -> Node ${i + 1}/${sortedNodeIds.length}: ${node.type} (${nodeId.slice(0,6)})\n`);

    // Map node.data to args
    // Replace `{Node_ID}` with actual outputs dynamically before passing
    let replacedArgs = JSON.stringify(node.data || {});
    for (const [srcId, outputValue] of globalOutputs.entries()) {
       // Allow referencing other node outputs using {Output_NodeId}
       const alias = `{OUTPUT_${srcId}}`;
       replacedArgs = replacedArgs.replace(new RegExp(alias, 'g'), String(outputValue));
    }

    const stepArgs = JSON.parse(replacedArgs);

    // Prepare a virtual WorkflowStep to reuse `executeStep`
    const vStep: WorkflowStep = {
       type: node.type === 'tag' ? 'create_tag' : node.type === 'script' ? 'run_script' : node.type,
       args: stepArgs
    };

    try {
      const output = await executeStep(vStep, project, currentBranch, targetBranch, targetTagInfo, tags, appendLog);
      if (output !== undefined) {
         globalOutputs.set(nodeId, output);
      }
    } catch (e: any) {
      appendLog(`[ERROR] Node '${node.type}' failed: ${e}\n`);
      throw new Error(`Node '${node.type}' failed: ${e}`);
    }
  }

  appendLog(`[WORKFLOW] Completed successfully.\n`);
}

export async function runCompositeWorkflow(
  yamlScript: string,
  project: ProjectConfig,
  currentBranch: string,
  targetBranch: string,
  appendLog: (msg: string) => void,
) {
  let workflow: WorkflowContent;
  try {
    workflow = YAML.parse(yamlScript);
  } catch (e: any) {
    throw new Error(`YAML parsing failed: ${e.message}`);
  }

  if (!workflow.steps || !Array.isArray(workflow.steps)) {
    throw new Error("Invalid workflow: 'steps' array is missing.");
  }

  appendLog(`[WORKFLOW] Starting composite workflow... (${workflow.steps.length} steps)\n`);

  // Pre-fetch all tags to provide context variables BEFORE steps run
  let tags: Record<string, {latest_tag: string, next_tag: string}> = {};
  try {
    tags = await invoke('get_branch_tags_cmd', { project });
  } catch (e) {
    appendLog(`[WORKFLOW] Warning: Failed to fetch tags: ${e}\n`);
  }

  const matchingEnv = project.environments.find(e => e.name.toLowerCase() === targetBranch.toLowerCase());
  const ctxEnvName = matchingEnv ? matchingEnv.name : targetBranch;
  const targetTagInfo = tags[ctxEnvName] || Object.values(tags)[0] || { latest_tag: 'none', next_tag: '{NEXT_TAG}' };

  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    appendLog(`[WORKFLOW]  -> Step ${i + 1}/${workflow.steps.length}: ${step.type}\n`);
    
    try {
      await executeStep(step, project, currentBranch, targetBranch, targetTagInfo, tags, appendLog);
    } catch (e: any) {
      appendLog(`[ERROR] Step '${step.type}' failed: ${e}\n`);
      throw new Error(`Step '${step.type}' failed: ${e}`);
    }
  }

  appendLog(`[WORKFLOW] Completed successfully.\n`);
}

async function executeStep(
  step: WorkflowStep,
  project: ProjectConfig,
  currentBranch: string,
  targetBranch: string,
  targetTagInfo: {latest_tag: string, next_tag: string},
  allTags: Record<string, {latest_tag: string, next_tag: string}>,
  appendLog: (msg: string) => void
) {
  const parseArg = (val: string) => {
    if (typeof val !== 'string') return val;
    let replaced = val
      .replace(/{CURRENT_BRANCH}/g, currentBranch)
      .replace(/{TARGET_BRANCH}/g, targetBranch)
      .replace(/{REPO_PATH}/g, project.path)
      .replace(/{NEXT_TAG}/g, targetTagInfo.next_tag)
      .replace(/{LATEST_TAG}/g, targetTagInfo.latest_tag);

    for (const [env, tagInfo] of Object.entries(allTags)) {
      const safeEnv = env.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      replaced = replaced.replace(new RegExp(`{NEXT_TAG_${safeEnv}}`, 'g'), tagInfo.next_tag);
      replaced = replaced.replace(new RegExp(`{LATEST_TAG_${safeEnv}}`, 'g'), tagInfo.latest_tag);
    }
    
    return replaced;
  };

  switch (step.type) {
    case 'check_clean': {
      const clean = await invoke<boolean>('check_uncommitted_cmd', { repoPath: project.path });
      if (!clean) throw new Error('Working directory is not clean. Uncommitted changes exist.');
      break;
    }
    case 'checkout': {
      const branchName = parseArg(step.args?.branch || '');
      if (!branchName) throw new Error('checkout requires "branch" arg.');
      await invoke('checkout_branch_cmd', { repoPath: project.path, branch: branchName });
      break;
    }
    case 'merge': {
      const fromBranch = parseArg(step.args?.from || '');
      if (!fromBranch) throw new Error('merge requires "from" arg.');
      const result = await invoke<string>('merge_cmd', { repoPath: project.path, fromBranch });
      appendLog(`[GIT] ${result}\n`);
      break;
    }
    case 'commit': {
      const message = parseArg(step.args?.message || 'Auto commit');
      try {
        const clean = await invoke<boolean>('check_uncommitted_cmd', { repoPath: project.path });
        if (!clean) {
          // If not clean (e.g. from merge conflict or unstaged changes), we should stage and commit.
          await invoke('stage_all_cmd', { repoPath: project.path });
          const result = await invoke<string>('commit_cmd', { repoPath: project.path, message });
          appendLog(`[GIT] ${result}\n`);
        } else {
            appendLog(`[GIT] Working directory is clean, skipping commit.\n`);
        }
      } catch (e: any) {
         // Some merges auto-commit, if working tree clean, commit throws "nothing to commit"
         if (!e.toString().includes('nothing to commit')) throw e;
      }
      break;
    }
    case 'create_tag': {
      const newTag = parseArg(step.args?.name || targetTagInfo.next_tag);
      if (!newTag || newTag === '{NEXT_TAG}') throw new Error('create_tag requires a valid "name" arg or matching environment.');
      
      const msg = parseArg(step.args?.message || `Release ${newTag}`);
      appendLog(`[GIT] Creating tag: ${newTag}\n`);
      const result = await invoke<string>('create_tag_cmd', { repoPath: project.path, name: newTag, message: msg });
      appendLog(`[GIT] ${result}\n`);
      break;
    }
    case 'push': {
      const target = parseArg(step.args?.remote || 'origin');
      const branch = parseArg(step.args?.branch || targetBranch || currentBranch);
      appendLog(`[GIT] Pushing ${branch} + tags to ${target}...\n`);
      const result = await invoke<string>('push_cmd', { repoPath: project.path });
      appendLog(`[GIT] ${result}\n`);
      break;
    }
    case 'run_script': {
      const scriptInput = parseArg(step.args?.script || '');
      if (!scriptInput) throw new Error('run_script requires "script" arg.');

      const firstSpaceIdx = scriptInput.indexOf(' ');
      let filename = scriptInput;
      let restArgs = '';
      if (firstSpaceIdx !== -1) {
        filename = scriptInput.substring(0, firstSpaceIdx);
        restArgs = scriptInput.substring(firstSpaceIdx + 1);
      }

      const extFolder = await join(await executableDir(), 'extension');
      const fullPath = await join(extFolder, filename);

      let cmdToRun = '';
      if (filename.endsWith('.js')) {
        cmdToRun = `node "${fullPath}" ${restArgs}`;
      } else if (filename.endsWith('.sh')) {
        cmdToRun = `bash "${fullPath}" ${restArgs}`;
      } else if (filename.endsWith('.ps1')) {
        cmdToRun = `powershell -ExecutionPolicy Bypass -File "${fullPath}" ${restArgs}`;
      } else {
        cmdToRun = `"${fullPath}" ${restArgs}`;
      }

      appendLog(`[GIT] Executing extension script: ${filename}\n`);
      const result = await invoke<string>('execute_custom_action', { cwd: project.path, script: cmdToRun });
      appendLog(`[GIT] Script output:\n${result}\n`);
      return result.trim();
    }
    default:
      throw new Error(`Unknown step type: ${step.type}`);
  }
}
