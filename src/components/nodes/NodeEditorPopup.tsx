import React, { useState, useEffect } from 'react';
import type { Node } from '@xyflow/react';
import { X } from 'lucide-react';

interface NodeEditorPopupProps {
  node: Node;
  onClose: () => void;
  onSave: (id: string, data: any) => void;
}

export function NodeEditorPopup({ node, onClose, onSave }: NodeEditorPopupProps) {
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    // Strip functions before populating local form state
    const { updateNodeData, handleEditNode, ...cleanData } = node.data || {};
    setFormData(cleanData);
  }, [node]);

  const handleChange = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(node.id, formData);
    onClose();
  };

  const insertVariable = (key: string, variable: string) => {
    const currentVal = formData[key] || '';
    handleChange(key, currentVal + variable);
  };

  const VariableBadge = ({ variable, fieldKey }: { variable: string, fieldKey: string }) => (
    <span 
      className="badge badge-outline cursor-pointer hover:bg-base-300 ml-1 badge-sm font-mono text-[10px]"
      onClick={() => insertVariable(fieldKey, variable)}
      title="Click to insert"
    >
      {variable}
    </span>
  );

  const renderFields = () => {
    switch (node.type) {
      case 'checkout':
        return (
          <label className="form-control w-full">
            <div className="label"><span className="label-text font-semibold">Branch to checkout</span></div>
            <input type="text" className="input input-bordered w-full font-mono text-sm" value={formData.branch || ''} onChange={e => handleChange('branch', e.target.value)} />
            <div className="label pb-0 flex flex-wrap gap-1">
              <span className="label-text-alt opacity-70">Variables:</span>
              <VariableBadge fieldKey="branch" variable="{CURRENT_BRANCH}" />
              <VariableBadge fieldKey="branch" variable="{TARGET_BRANCH}" />
            </div>
          </label>
        );
      case 'merge':
        return (
          <label className="form-control w-full">
            <div className="label"><span className="label-text font-semibold">Merge FROM Branch</span></div>
            <input type="text" className="input input-bordered w-full font-mono text-sm" value={formData.from || ''} onChange={e => handleChange('from', e.target.value)} />
            <div className="label pb-0 flex flex-wrap gap-1">
              <span className="label-text-alt opacity-70">Variables:</span>
              <VariableBadge fieldKey="from" variable="{CURRENT_BRANCH}" />
              <VariableBadge fieldKey="from" variable="{TARGET_BRANCH}" />
            </div>
            <div className="text-xs mt-3 opacity-70 italic rounded bg-base-200 p-2 border border-info/20 text-info">
              💡 Action will execute <span className="font-mono">git merge [from]</span> into the active loaded branch.
            </div>
          </label>
        );
      case 'commit':
        return (
          <label className="form-control w-full">
            <div className="label"><span className="label-text font-semibold">Commit Message</span></div>
            <input type="text" className="input input-bordered w-full font-mono text-sm" value={formData.message || ''} onChange={e => handleChange('message', e.target.value)} />
            <div className="label pb-0 flex flex-wrap gap-1">
              <span className="label-text-alt opacity-70">Variables:</span>
              <VariableBadge fieldKey="message" variable="{CURRENT_BRANCH}" />
              <VariableBadge fieldKey="message" variable="{TARGET_BRANCH}" />
              <VariableBadge fieldKey="message" variable="{NEXT_TAG}" />
            </div>
          </label>
        );
      case 'tag':
        return (
          <div className="flex flex-col gap-4">
            <label className="form-control w-full">
               <div className="label"><span className="label-text font-semibold">Tag Name</span></div>
               <input type="text" className="input input-bordered w-full font-mono text-sm" value={formData.tagName || ''} onChange={e => handleChange('tagName', e.target.value)} />
               <div className="label pb-0 flex flex-wrap gap-1">
                 <span className="label-text-alt opacity-70">Variables:</span>
                 <VariableBadge fieldKey="tagName" variable="{NEXT_TAG}" />
               </div>
            </label>
             <label className="form-control w-full">
               <div className="label"><span className="label-text font-semibold">Tag Message</span></div>
               <input type="text" className="input input-bordered w-full font-mono text-sm" value={formData.message || ''} onChange={e => handleChange('message', e.target.value)} />
               <div className="label pb-0 flex flex-wrap gap-1">
                  <span className="label-text-alt opacity-70">Variables:</span>
                  <VariableBadge fieldKey="message" variable="{NEXT_TAG}" />
               </div>
            </label>
          </div>
        );
      case 'push':
        return (
          <div className="flex flex-col gap-4">
            <label className="form-control w-full">
               <div className="label"><span className="label-text font-semibold">Target Repository/Branch</span></div>
               <input type="text" className="input input-bordered w-full font-mono text-sm" placeholder="e.g. origin main" value={formData.target || ''} onChange={e => handleChange('target', e.target.value)} />
               <div className="label pb-0 flex flex-wrap gap-1">
                  <span className="label-text-alt opacity-70">Variables:</span>
                  <VariableBadge fieldKey="target" variable="origin {CURRENT_BRANCH}" />
                  <VariableBadge fieldKey="target" variable="origin {TARGET_BRANCH}" />
               </div>
            </label>
            <div className="bg-base-200 rounded-lg p-3 border border-base-300">
              <label className="label cursor-pointer justify-start gap-4 p-0">
                 <input type="checkbox" className="toggle toggle-primary" checked={formData.pushTags ?? true} onChange={e => handleChange('pushTags', e.target.checked)} />
                 <span className="label-text font-medium">Push tags to remote</span>
              </label>
            </div>
          </div>
        );
      case 'script':
         return (
            <label className="form-control w-full">
               <div className="label"><span className="label-text font-semibold">Extension Script Filename</span></div>
               <input type="text" className="input input-bordered w-full font-mono text-sm" placeholder="e.g. incTag.js" value={formData.script || ''} onChange={e => handleChange('script', e.target.value)} />
               <div className="text-xs mt-3 opacity-70 italic rounded bg-warning/10 p-2 border border-warning/20 text-warning-content">
                  ⚠️ This file must exist in the <span className="font-mono">/extension</span> directory next to the application binary.
               </div>
            </label>
         );
      default:
        return <div className="p-4 bg-base-200 rounded text-center opacity-60 italic border border-dashed border-base-300">No editable properties for node type "{node.type}"</div>;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-base-100 rounded-xl shadow-2xl w-full max-w-lg border border-base-300 flex flex-col max-h-full animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-base-300 flex justify-between items-center bg-base-200/50 rounded-t-xl">
          <h2 className="font-bold text-lg flex items-center gap-2">
            Configure Node 
            <span className="badge badge-secondary badge-sm font-mono">{node.type}</span>
          </h2>
          <button onClick={onClose} className="btn btn-sm btn-ghost btn-circle">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          {renderFields()}
        </div>

        <div className="p-4 border-t border-base-300 flex justify-end gap-3 bg-base-200/50 rounded-b-xl">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={handleSave} className="btn btn-primary">Save Changes</button>
        </div>
      </div>
    </div>
  );
}
