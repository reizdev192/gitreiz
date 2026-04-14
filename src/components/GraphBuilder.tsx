import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from './nodes/GitNodes';
import { NodeEditorPopup } from './nodes/NodeEditorPopup';
import { v4 as uuidv4 } from 'uuid';
import { Search } from 'lucide-react';

interface GraphBuilderProps {
  initialScript: string;
  onChange: (script: string) => void;
}

const SIDEBAR_NODES = [
  { type: 'check_clean', label: 'Check Clean Git' },
  { type: 'checkout', label: 'Checkout Branch' },
  { type: 'merge', label: 'Merge Branch' },
  { type: 'commit', label: 'Commit Changes' },
  { type: 'tag', label: 'Create Tag' },
  { type: 'push', label: 'Push to Remote' },
  { type: 'script', label: 'Exec JavaScript' }
];

let draggedType: string | null = null;

const GraphBuilderContent = ({ initialScript, onChange }: GraphBuilderProps) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  
  // Parse initial state from script
  let initialNodes: Node[] = [];
  let initialEdges: Edge[] = [];
  
  try {
    if (initialScript.trim().startsWith('{')) {
      const parsed = JSON.parse(initialScript);
      initialNodes = parsed.nodes || [];
      initialEdges = parsed.edges || [];
    }
  } catch (e) {
    console.error("Failed to parse graph script", e);
  }

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // Custom node data updater
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  const updateNodeData = useCallback((id: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      })
    );
  }, [setNodes]);

  const handleEditNode = useCallback((id: string) => {
    setEditingNodeId(id);
  }, []);

  // Inject update function into nodes
  useEffect(() => {
    setNodes((nds) => 
      nds.map(n => ({
        ...n,
        data: { ...n.data, updateNodeData, handleEditNode }
      }))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastPayload = useRef<string>('');

  // Save changes back
  useEffect(() => {
    // Strip functions before saving
    const cleanNodes = nodes.map(n => {
      const { updateNodeData: _, handleEditNode: __, ...cleanData } = n.data || ({} as any);
      return { ...n, data: cleanData };
    });
    
    const payload = JSON.stringify({ nodes: cleanNodes, edges });
    
    if (payload !== lastPayload.current) {
        lastPayload.current = payload;
        onChange(payload);
    }
  }, [nodes, edges, onChange]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      console.log("DROP EVENT TRIGGERED!", event);
      event.preventDefault();

      if (!reactFlowWrapper.current) {
        console.error("reactFlowWrapper.current is missing");
        return;
      }
      
      const type = event.dataTransfer.getData('application/reactflow') || event.dataTransfer.getData('text/plain') || draggedType;
      console.log("DROP type resolved to:", type);
      if (typeof type === 'undefined' || !type) {
        console.error("Type is missing or undefined");
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      console.log("DROP position computed:", position);

      const newNode: Node = {
        id: uuidv4(),
        type,
        position,
        data: { updateNodeData, handleEditNode },
      };

      console.log("DROP newNode created:", newNode);

      setNodes((nds) => {
         const next = nds.concat(newNode);
         console.log("DROP SetNodes next state length:", next.length);
         return next;
      });
    },
    [setNodes, updateNodeData, screenToFlowPosition, handleEditNode],
  );

  return (
    <div className="flex w-full h-full border border-[var(--border-default)] rounded-lg overflow-hidden bg-[var(--bg-panel)]">
      {/* Sidebar Tool Palette */}
      <div className="w-64 border-r border-base-300 bg-base-200 p-4 flex flex-col gap-4 overflow-y-auto">
        <div>
          <h3 className="font-bold text-sm mb-2">Node Library</h3>
          <p className="text-xs opacity-70 mb-4">Click or Drag nodes to add them to your deployment workflow.</p>
          
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-2 top-2 opacity-50" />
            <input type="text" placeholder="Search nodes..." className="input input-bordered input-sm w-full pl-8" />
          </div>
          
          <div className="flex flex-col gap-2">
            {SIDEBAR_NODES.map(node => (
              <div 
                key={node.type}
                className="bg-base-100 p-3 rounded border border-[var(--border-default)] shadow-sm cursor-pointer hover:border-primary text-sm font-medium transition-colors hover:bg-[var(--bg-hover)]"
                draggable
                onClick={() => {
                  console.log("CLICK TO ADD:", node.type);
                  const newNode: Node = {
                    id: uuidv4(),
                    type: node.type,
                    // Center roughly based on viewport
                    position: { 
                      x: 100 + Math.random() * 50, 
                      y: 100 + Math.random() * 50 
                    },
                    data: { updateNodeData, handleEditNode },
                  };
                  setNodes((nds) => nds.concat(newNode));
                }}
                onDragStart={(e) => {
                  console.log("DRAG START:", node.type);
                  draggedType = node.type;
                  e.dataTransfer.setData('application/reactflow', node.type);
                  e.dataTransfer.setData('text/plain', node.type);
                  e.dataTransfer.effectAllowed = 'move';
                }}
              >
                {node.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Canvas */}
      <div 
        className="flex-1 relative w-full h-full" 
        ref={reactFlowWrapper}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-[var(--bg-panel)]"
        >
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
      </div>

      {editingNodeId && (
        <NodeEditorPopup 
          node={nodes.find(n => n.id === editingNodeId)!}
          onClose={() => setEditingNodeId(null)}
          onSave={updateNodeData}
        />
      )}
    </div>
  );
};

export function GraphBuilder(props: GraphBuilderProps) {
  return (
    <ReactFlowProvider>
      <GraphBuilderContent {...props} />
    </ReactFlowProvider>
  );
}
