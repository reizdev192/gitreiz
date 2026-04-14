import { type NodeProps } from '@xyflow/react';
import { ActionNodeWrapper } from './ActionNodeWrapper';
import { GitCommit, GitMerge, GitBranch, TerminalSquare, UploadCloud, Tag } from 'lucide-react';



export function CheckCleanNode(props: NodeProps) {
  return (
    <ActionNodeWrapper title="Check Clean" icon={<GitCommit size={16} />} isConnectable={props.isConnectable}>
      <div className="text-xs opacity-80">
        Kiểm tra xem working directory đã được commit hết chưa. Nếu chưa commit sẽ dừng workflow.
      </div>
    </ActionNodeWrapper>
  );
}

export function GitCheckoutNode({ data, isConnectable, id }: NodeProps) {
  const { handleEditNode } = data as any;
  const branch = (data.branch as string) || '{CURRENT_BRANCH}';
  
  return (
    <ActionNodeWrapper title="Checkout" icon={<GitBranch size={16} />} isConnectable={isConnectable} onEdit={() => handleEditNode?.(id)}>
      <div className="text-xs">
        <span className="opacity-70">Branch: </span>
        <span className="font-mono bg-base-300 px-1 rounded truncate block mt-1">{branch}</span>
      </div>
    </ActionNodeWrapper>
  );
}

export function GitMergeNode({ data, isConnectable, id }: NodeProps) {
  const { handleEditNode } = data as any;
  const fromBranch = (data.from as string) || '{TARGET_BRANCH}';
  
  return (
    <ActionNodeWrapper title="Merge" icon={<GitMerge size={16} />} isConnectable={isConnectable} onEdit={() => handleEditNode?.(id)}>
      <div className="text-xs">
        <span className="opacity-70">From: </span>
        <span className="font-mono bg-base-300 px-1 rounded truncate block mt-1">{fromBranch}</span>
      </div>
    </ActionNodeWrapper>
  );
}

export function GitCommitNode({ data, isConnectable, id }: NodeProps) {
  const { handleEditNode } = data as any;
  const message = (data.message as string) || 'merge {TARGET_BRANCH} into deploy';
  
  return (
    <ActionNodeWrapper title="Commit" icon={<GitCommit size={16} />} isConnectable={isConnectable} onEdit={() => handleEditNode?.(id)}>
      <div className="text-xs">
        <span className="opacity-70">Message: </span>
        <span className="font-mono bg-base-300 px-1 rounded truncate block mt-1">{message}</span>
      </div>
    </ActionNodeWrapper>
  );
}

export function GitTagNode({ data, isConnectable, id }: NodeProps) {
  const { handleEditNode } = data as any;
  const tagName = (data.tagName as string) || '{NEXT_TAG}';
  
  return (
    <ActionNodeWrapper title="Create Tag" icon={<Tag size={16} />} isConnectable={isConnectable} onEdit={() => handleEditNode?.(id)}>
      <div className="text-xs">
        <span className="opacity-70">Tag Name: </span>
        <span className="font-mono bg-base-300 px-1 rounded truncate block mt-1">{tagName}</span>
      </div>
    </ActionNodeWrapper>
  );
}

export function GitPushNode({ data, isConnectable, id }: NodeProps) {
  const { handleEditNode } = data as any;
  const target = (data.target as string) || 'origin {CURRENT_BRANCH}';
  const pushTags = (data.pushTags as boolean) ?? true;
  
  return (
    <ActionNodeWrapper title="Push" icon={<UploadCloud size={16} />} isConnectable={isConnectable} onEdit={() => handleEditNode?.(id)}>
      <div className="text-xs flex flex-col gap-1">
        <div>
          <span className="opacity-70">Target: </span>
          <span className="font-mono bg-base-300 px-1 rounded truncate block">{target}</span>
        </div>
        <div>
          <span className="opacity-70">Push Tags: </span>
          <span className="font-mono">{pushTags ? 'Yes' : 'No'}</span>
        </div>
      </div>
    </ActionNodeWrapper>
  );
}

export function ScriptNode({ data, isConnectable, id }: NodeProps) {
  const { handleEditNode } = data as any;
  const scriptFile = (data.script as string) || 'incTag.js';
  
  return (
    <ActionNodeWrapper title="Execute Script" icon={<TerminalSquare size={16} />} isConnectable={isConnectable} onEdit={() => handleEditNode?.(id)}>
      <div className="text-xs">
        <span className="opacity-70">File: </span>
        <span className="font-mono bg-base-300 px-1 rounded truncate block mt-1 text-primary">{scriptFile}</span>
      </div>
    </ActionNodeWrapper>
  );
}

// Export a mapping object for React Flow
export const nodeTypes = {
  check_clean: CheckCleanNode,
  checkout: GitCheckoutNode,
  merge: GitMergeNode,
  commit: GitCommitNode,
  tag: GitTagNode,
  push: GitPushNode,
  script: ScriptNode
};
