import React from 'react';
import { Settings } from 'lucide-react';
import { Handle, Position } from '@xyflow/react';

interface ActionNodeWrapperProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  isConnectable?: boolean;
  onEdit?: () => void;
}

export function ActionNodeWrapper({ title, icon, children, isConnectable = true, onEdit }: ActionNodeWrapperProps) {
  return (
    <div className="bg-base-100 border border-base-300 rounded-lg shadow-lg w-64 text-sm overflow-hidden group">
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="w-3 h-3 bg-primary" />
      
      <div className="bg-base-200 px-3 py-2 font-bold flex items-center justify-between text-base-content border-b border-base-300">
        <div className="flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </div>
        {onEdit && (
          <button 
            type="button" 
            onClick={onEdit}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-base-300 transition-all text-primary"
            title="Edit Settings"
          >
            <Settings size={14} />
          </button>
        )}
      </div>

      <div className="p-3 py-2 flex flex-col gap-2">
        {children}
      </div>
      
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="w-3 h-3 bg-secondary" />
    </div>
  );
}
